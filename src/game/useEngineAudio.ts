import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameStatus, VehicleTelemetry } from './types';

interface EngineAudioController {
  update: (status: GameStatus, telemetry: VehicleTelemetry, enabled: boolean) => void;
  playInteraction: () => void;
  close: () => void;
}

function createEngineAudio(): EngineAudioController | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;

  try {
    const context = new window.AudioContext();
    const master = context.createGain();
    const engineGain = context.createGain();
    const engineFilter = context.createBiquadFilter();
    const engine = context.createOscillator();
    const engineHarmonic = context.createOscillator();
    const harmonicGain = context.createGain();
    const tireTone = context.createOscillator();
    const tireGain = context.createGain();
    const brakeTone = context.createOscillator();
    const brakeGain = context.createGain();
    const windFilter = context.createBiquadFilter();
    const windGain = context.createGain();
    const noise = context.createBufferSource();

    master.gain.value = 0;
    engine.type = 'sawtooth';
    engine.frequency.value = 78;
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 740;
    engineGain.gain.value = 0.12;
    engineHarmonic.type = 'triangle';
    engineHarmonic.frequency.value = 39;
    harmonicGain.gain.value = 0.13;
    tireTone.type = 'triangle';
    tireTone.frequency.value = 560;
    tireGain.gain.value = 0;
    brakeTone.type = 'sine';
    brakeTone.frequency.value = 175;
    brakeGain.gain.value = 0;
    windFilter.type = 'highpass';
    windFilter.frequency.value = 420;
    windGain.gain.value = 0;

    const noiseBuffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;
    noise.loop = true;

    engine.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineHarmonic.connect(harmonicGain);
    harmonicGain.connect(master);
    tireTone.connect(tireGain);
    tireGain.connect(master);
    brakeTone.connect(brakeGain);
    brakeGain.connect(master);
    noise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    master.connect(context.destination);
    engine.start();
    engineHarmonic.start();
    tireTone.start();
    brakeTone.start();
    noise.start();

    const playImpact = () => {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(115, now);
      oscillator.frequency.exponentialRampToValueAtTime(48, now + 0.22);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(now);
      oscillator.stop(now + 0.23);
    };
    let previousCollisionCount = 0;

    return {
      update(status, telemetry, enabled) {
        const now = context.currentTime;
        const active = status === 'driving' && enabled ? 1 : 0;
        if (telemetry.collisionCount > previousCollisionCount) playImpact();
        previousCollisionCount = telemetry.collisionCount;
        const engineHz = 38 + telemetry.rpm * 0.045;
        master.gain.setTargetAtTime(active * 0.48, now, 0.16);
        engine.frequency.setTargetAtTime(engineHz, now, 0.09);
        engineHarmonic.frequency.setTargetAtTime(engineHz * 0.5, now, 0.09);
        engineFilter.frequency.setTargetAtTime(
          560 + telemetry.rpm * 0.11,
          now,
          0.16,
        );
        engineGain.gain.setTargetAtTime(
          telemetry.gear === 'N' ? 0.065 : 0.12,
          now,
          0.2,
        );
        windGain.gain.setTargetAtTime(
          active * Math.min(0.1, telemetry.speedKmh / 2100),
          now,
          0.25,
        );
        tireGain.gain.setTargetAtTime(
          active && telemetry.isHandbrake && telemetry.speedKmh > 18
            ? Math.min(0.055, telemetry.speedKmh / 1800)
            : 0,
          now,
          0.12,
        );
        brakeGain.gain.setTargetAtTime(
          active && telemetry.isBraking && telemetry.speedKmh > 5 ? 0.012 : 0,
          now,
          0.1,
        );
      },
      playInteraction() {
        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(680, now);
        oscillator.frequency.setValueAtTime(920, now + 0.075);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(now);
        oscillator.stop(now + 0.19);
      },
      close() {
        engine.stop();
        engineHarmonic.stop();
        tireTone.stop();
        brakeTone.stop();
        noise.stop();
        void context.close();
      },
    };
  } catch (error) {
    console.warn('Procedural engine audio could not be initialized.', error);
    return null;
  }
}

export function useEngineAudio(
  status: GameStatus,
  telemetry: VehicleTelemetry,
) {
  const [enabled, setEnabled] = useState(true);
  const controllerRef = useRef<EngineAudioController | null>(null);

  const activate = useCallback(() => {
    if (!controllerRef.current) {
      controllerRef.current = createEngineAudio();
    }
    if (controllerRef.current) {
      controllerRef.current.update(status, telemetry, enabled);
    }
  }, [enabled, status, telemetry]);

  const toggle = useCallback(() => {
    setEnabled((current) => !current);
  }, []);

  const playInteraction = useCallback(() => {
    controllerRef.current?.playInteraction();
  }, []);

  useEffect(() => {
    controllerRef.current?.update(status, telemetry, enabled);
  }, [status, telemetry, enabled]);

  useEffect(
    () => () => {
      controllerRef.current?.close();
      controllerRef.current = null;
    },
    [],
  );

  return { enabled, activate, toggle, playInteraction };
}
