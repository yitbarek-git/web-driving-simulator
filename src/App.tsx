import { useCallback, useEffect, useState } from 'react';
import { SimulatorCanvas } from './components/scene/SimulatorCanvas';
import { DrivingHUD } from './components/ui/DrivingHUD';
import { MainMenu } from './components/ui/MainMenu';
import { PauseMenu } from './components/ui/PauseMenu';
import { MobileControls } from './components/ui/MobileControls';
import {
  CAR_COLORS,
  type CameraMode,
  type CarColorOption,
  type GameStatus,
  type VehicleTelemetry,
} from './game/types';
import { useVehicleControls } from './game/useVehicleControls';
import {
  CAREER_LEVELS,
  loadCareerSave,
  saveCareerSave,
  type CareerSave,
} from './game/career';
import { useCareerMission } from './game/useCareerMission';
import { useEngineAudio } from './game/useEngineAudio';
import { loadGameSettings, saveGameSettings } from './game/settings';
import type { GameSettings } from './game/settings';

const CAMERA_SEQUENCE: CameraMode[] = ['chase', 'far', 'hood', 'orbit'];

const INITIAL_TELEMETRY: VehicleTelemetry = {
  x: 2.8,
  y: 0,
  z: 0,
  yaw: 0,
  speedKmh: 0,
  forwardSpeedMs: 0,
  gear: 'N',
  rpm: 900,
  steerAngle: 0,
  distanceMeters: 0,
  elapsedSeconds: 0,
  isBraking: false,
  isReversing: false,
  isHandbrake: false,
  isOffRoad: false,
  collisionFlash: 0,
  collisionCount: 0,
  trackProgress: 0,
};

export default function App() {
  const [status, setStatus] = useState<GameStatus>('menu');
  const [careerSave, setCareerSave] = useState<CareerSave>(loadCareerSave);
  const [settings, setSettings] = useState<GameSettings>(loadGameSettings);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [paintColor, setPaintColor] = useState<CarColorOption>(CAR_COLORS[0]);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>(INITIAL_TELEMETRY);
  const [resetCounter, setResetCounter] = useState(0);
  const [showHints, setShowHints] = useState(true);

  useEffect(() => {
    saveCareerSave(careerSave);
  }, [careerSave]);

  useEffect(() => {
    saveGameSettings(settings);
  }, [settings]);

  const handleReset = useCallback(() => {
    setResetCounter((c) => c + 1);
  }, []);

  const handleCycleCamera = useCallback(() => {
    setCameraMode((prev) => {
      const idx = CAMERA_SEQUENCE.indexOf(prev);
      return CAMERA_SEQUENCE[(idx + 1) % CAMERA_SEQUENCE.length];
    });
  }, []);

  const handleTogglePause = useCallback(() => {
    setStatus((prev) => {
      if (prev === 'driving') return 'paused';
      if (prev === 'paused') return 'driving';
      return prev;
    });
  }, []);

  const handleToggleHints = useCallback(() => {
    setShowHints((prev) => !prev);
  }, []);

  const handleMissionComplete = useCallback(
    ({
      level,
      elapsedSeconds,
      deliveries,
      distanceMeters,
    }: {
      level: (typeof CAREER_LEVELS)[number];
      elapsedSeconds: number;
      deliveries: number;
      distanceMeters: number;
    }) => {
      setCareerSave((previous) => {
        const completedLevels = previous.completedLevels.includes(level.id)
          ? previous.completedLevels
          : [...previous.completedLevels, level.id];
        const bestTime = previous.bestTimes[level.id];
        return {
          ...previous,
          unlockedLevel: Math.max(
            previous.unlockedLevel,
            Math.min(CAREER_LEVELS.length, level.id + 1),
          ),
          completedLevels,
          credits: previous.credits + level.rewardCredits,
          xp: previous.xp + level.rewardXp,
          deliveries: previous.deliveries + deliveries,
          distanceMeters: previous.distanceMeters + distanceMeters,
          bestTimes: {
            ...previous.bestTimes,
            [level.id]:
              bestTime === undefined
                ? elapsedSeconds
                : Math.min(bestTime, elapsedSeconds),
          },
        };
      });
    },
    [],
  );
  const mission = useCareerMission(
    CAREER_LEVELS[selectedLevel - 1],
    resetCounter,
    handleMissionComplete,
  );
  const engineAudio = useEngineAudio(status, telemetry);
  const handleMissionInteract = useCallback(() => {
    if (mission.interact()) {
      engineAudio.playInteraction();
    }
  }, [engineAudio.playInteraction, mission.interact]);
  const handleTelemetry = useCallback(
    (nextTelemetry: VehicleTelemetry) => {
      setTelemetry(nextTelemetry);
      mission.observe(nextTelemetry);
    },
    [mission.observe],
  );

  const inputRef = useVehicleControls(status, {
    onReset: handleReset,
    onCycleCamera: handleCycleCamera,
    onTogglePause: handleTogglePause,
    onToggleHelp: handleToggleHints,
    onInteract: handleMissionInteract,
  });

  const handleStartDriving = useCallback(() => {
    engineAudio.activate();
    setResetCounter((c) => c + 1);
    setStatus('driving');
  }, [engineAudio.activate]);

  const handleReturnToMenu = useCallback(() => {
    setResetCounter((c) => c + 1);
    setStatus('menu');
  }, []);
  const missionLevel = CAREER_LEVELS[selectedLevel - 1];
  const currentStep = missionLevel.steps[mission.mission.stepIndex];
  const waitingStation =
    currentStep?.kind === 'pickup' ? currentStep.station : undefined;
  const passengerOnBoard =
    missionLevel.steps
      .slice(0, mission.mission.stepIndex)
      .filter((step) => step.kind === 'pickup').length >
    missionLevel.steps
      .slice(0, mission.mission.stepIndex)
      .filter((step) => step.kind === 'dropoff').length;

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-zinc-950">
      <SimulatorCanvas
        status={status}
        cameraMode={cameraMode}
        paintColor={paintColor}
        selectedLevel={selectedLevel}
        waitingStation={waitingStation}
        passengerOnBoard={passengerOnBoard}
        steeringSensitivity={settings.steeringSensitivity}
        graphicsQuality={settings.graphicsQuality}
        inputRef={inputRef}
        resetCounter={resetCounter}
        onTelemetry={handleTelemetry}
      />

      {status === 'menu' && (
        <MainMenu
          selectedColor={paintColor}
          selectedLevel={selectedLevel}
          careerSave={careerSave}
          onSelectColor={setPaintColor}
          onSelectLevel={setSelectedLevel}
          onStartDriving={handleStartDriving}
        />
      )}

      {status !== 'menu' && (
        <DrivingHUD
          telemetry={telemetry}
          cameraMode={cameraMode}
          selectedLevel={selectedLevel}
          careerSave={careerSave}
          mission={mission.mission}
          interactionPrompt={mission.interactionPrompt}
          audioEnabled={engineAudio.enabled}
          showHints={showHints}
          onCycleCamera={handleCycleCamera}
          onReset={handleReset}
          onPause={handleTogglePause}
          onToggleHints={handleToggleHints}
          onInteract={handleMissionInteract}
          onToggleAudio={engineAudio.toggle}
          onNextLevel={() => {
            setSelectedLevel((current) => Math.min(current + 1, careerSave.unlockedLevel));
            setResetCounter((current) => current + 1);
          }}
        />
      )}

      {status === 'driving' && (
        <MobileControls
          inputRef={inputRef}
          interactionPrompt={mission.interactionPrompt}
          onInteract={handleMissionInteract}
        />
      )}

      {status === 'paused' && (
        <PauseMenu
          selectedColor={paintColor}
          distanceMeters={telemetry.distanceMeters}
          settings={settings}
          audioEnabled={engineAudio.enabled}
          onSelectColor={setPaintColor}
          onSettingsChange={setSettings}
          onToggleAudio={engineAudio.toggle}
          onResume={() => setStatus('driving')}
          onReset={handleReset}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </main>
  );
}
