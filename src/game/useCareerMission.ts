import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getStationDistance,
  getStationName,
  type CareerLevel,
  type MissionStep,
} from './career';
import type { VehicleTelemetry } from './types';

export type MissionStatus = 'active' | 'complete' | 'failed';

export interface CareerMissionState {
  stepIndex: number;
  status: MissionStatus;
  message: string;
  elapsedSeconds: number;
}

interface MissionCompletion {
  level: CareerLevel;
  elapsedSeconds: number;
  deliveries: number;
  distanceMeters: number;
}

function crossedCheckpoint(previous: number, current: number, target: number) {
  if (current >= previous) return previous < target && current >= target;
  return target > previous || target <= current;
}

function stationDistance(telemetry: VehicleTelemetry, stationIndex: number) {
  return getStationDistance(
    telemetry.x,
    telemetry.z,
    telemetry.trackProgress,
    stationIndex,
  );
}

export function useCareerMission(
  level: CareerLevel,
  resetCounter: number,
  onComplete: (completion: MissionCompletion) => void,
) {
  const [mission, setMission] = useState<CareerMissionState>({
    stepIndex: 0,
    status: 'active',
    message: '',
    elapsedSeconds: 0,
  });
  const [interactionPrompt, setInteractionPrompt] = useState('');
  const sessionRef = useRef({
    stepIndex: 0,
    status: 'active' as MissionStatus,
    startDistance: 0,
    startTime: 0,
    startCollisions: 0,
  });
  const previousProgressRef = useRef<number | null>(null);
  const latestTelemetryRef = useRef<VehicleTelemetry | null>(null);
  const completionRef = useRef(onComplete);
  completionRef.current = onComplete;

  const reset = useCallback(() => {
    const telemetry = latestTelemetryRef.current;
    sessionRef.current = {
      stepIndex: 0,
      status: 'active',
      startDistance: telemetry?.distanceMeters ?? 0,
      startTime: telemetry?.elapsedSeconds ?? 0,
      startCollisions: 0,
    };
    previousProgressRef.current = telemetry?.trackProgress ?? null;
    setMission({ stepIndex: 0, status: 'active', message: '', elapsedSeconds: 0 });
    setInteractionPrompt('');
  }, []);

  useEffect(() => {
    reset();
  }, [level.id, resetCounter, reset]);

  const advance = useCallback(
    (telemetry: VehicleTelemetry) => {
      const session = sessionRef.current;
      if (session.status !== 'active') return;

      const nextIndex = session.stepIndex + 1;
      if (nextIndex >= level.steps.length) {
        const elapsedSeconds = Math.max(0, telemetry.elapsedSeconds - session.startTime);
        session.status = 'complete';
        setMission({
          stepIndex: nextIndex,
          status: 'complete',
          message: 'Route complete',
          elapsedSeconds,
        });
        setInteractionPrompt('');
        completionRef.current({
          level,
          elapsedSeconds,
          deliveries: level.steps.filter((step) => step.kind === 'dropoff').length,
          distanceMeters: Math.max(
            0,
            telemetry.distanceMeters - session.startDistance,
          ),
        });
        return;
      }

      session.stepIndex = nextIndex;
      setMission((current) => ({
        ...current,
        stepIndex: nextIndex,
        message: '',
      }));
    },
    [level],
  );

  const observe = useCallback(
    (telemetry: VehicleTelemetry) => {
      latestTelemetryRef.current = telemetry;
      const session = sessionRef.current;
      if (session.status !== 'active') return;

      const elapsedSeconds = Math.max(0, telemetry.elapsedSeconds - session.startTime);
      const displayedElapsed = Math.floor(elapsedSeconds);
      if (level.timeLimitSeconds && elapsedSeconds > level.timeLimitSeconds) {
        session.status = 'failed';
        setMission({
          stepIndex: session.stepIndex,
          status: 'failed',
          message: 'Time limit exceeded. Reset the car to retry.',
          elapsedSeconds,
        });
        setInteractionPrompt('');
        return;
      }
      if (
        level.maxCollisions !== undefined &&
        telemetry.collisionCount - session.startCollisions > level.maxCollisions
      ) {
        session.status = 'failed';
        setMission({
          stepIndex: session.stepIndex,
          status: 'failed',
          message: 'Too many collisions. Reset the car to retry.',
          elapsedSeconds,
        });
        setInteractionPrompt('');
        return;
      }
      setMission((current) =>
        current.elapsedSeconds === displayedElapsed
          ? current
          : { ...current, elapsedSeconds: displayedElapsed },
      );

      const step = level.steps[session.stepIndex];
      if (step?.kind === 'drive') {
        if (telemetry.distanceMeters - session.startDistance >= step.meters) {
          advance(telemetry);
        }
      } else if (step?.kind === 'checkpoint') {
        const previous = previousProgressRef.current;
        if (
          previous !== null &&
          crossedCheckpoint(previous, telemetry.trackProgress, step.progress)
        ) {
          advance(telemetry);
        }
      }

      previousProgressRef.current = telemetry.trackProgress;

      const currentStep = level.steps[sessionRef.current.stepIndex];
      let prompt = '';
      if (currentStep?.kind === 'pickup' || currentStep?.kind === 'dropoff') {
        const distance = stationDistance(telemetry, currentStep.station);
        if (distance < 32) {
          prompt =
            distance > 14
              ? `Stop at ${getStationName(currentStep.station)} · ${Math.round(distance)} m`
              : telemetry.speedKmh > 4
                ? 'Brake to a stop, then press E'
                : `Press E to ${currentStep.kind === 'pickup' ? 'pick up passenger' : 'drop off passenger'}`;
        }
      }
      setInteractionPrompt((current) => (current === prompt ? current : prompt));
    },
    [advance, level],
  );

  const interact = useCallback(() => {
    const telemetry = latestTelemetryRef.current;
    const session = sessionRef.current;
    if (!telemetry || session.status !== 'active') return false;

    const step: MissionStep | undefined = level.steps[session.stepIndex];
    if (step?.kind !== 'pickup' && step?.kind !== 'dropoff') {
      setMission((current) => ({ ...current, message: 'No stop interaction is needed here.' }));
      return false;
    }

    const distance = stationDistance(telemetry, step.station);
    if (distance > 14) {
      setMission((current) => ({ ...current, message: 'Move into the marked stop to interact.' }));
      return false;
    }
    if (telemetry.speedKmh > 4) {
      setMission((current) => ({ ...current, message: 'Come to a complete stop first.' }));
      return false;
    }

    setMission((current) => ({
      ...current,
      message: step.kind === 'pickup' ? 'Passenger on board' : 'Passenger delivered',
    }));
    advance(telemetry);
    return true;
  }, [advance, level]);

  return { mission, interactionPrompt, observe, interact };
}
