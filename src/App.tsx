import { useCallback, useState } from 'react';
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
  trackProgress: 0,
};

export default function App() {
  const [status, setStatus] = useState<GameStatus>('menu');
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [paintColor, setPaintColor] = useState<CarColorOption>(CAR_COLORS[0]);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>(INITIAL_TELEMETRY);
  const [resetCounter, setResetCounter] = useState(0);
  const [showHints, setShowHints] = useState(true);

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

  const inputRef = useVehicleControls(status, {
    onReset: handleReset,
    onCycleCamera: handleCycleCamera,
    onTogglePause: handleTogglePause,
    onToggleHelp: handleToggleHints,
  });

  const handleStartDriving = useCallback(() => {
    setResetCounter((c) => c + 1);
    setStatus('driving');
  }, []);

  const handleReturnToMenu = useCallback(() => {
    setResetCounter((c) => c + 1);
    setStatus('menu');
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-zinc-950">
      <SimulatorCanvas
        status={status}
        cameraMode={cameraMode}
        paintColor={paintColor}
        inputRef={inputRef}
        resetCounter={resetCounter}
        onTelemetry={setTelemetry}
      />

      {status === 'menu' && (
        <MainMenu
          selectedColor={paintColor}
          onSelectColor={setPaintColor}
          onStartDriving={handleStartDriving}
        />
      )}

      {status !== 'menu' && (
        <DrivingHUD
          telemetry={telemetry}
          cameraMode={cameraMode}
          showHints={showHints}
          onCycleCamera={handleCycleCamera}
          onReset={handleReset}
          onPause={handleTogglePause}
          onToggleHints={handleToggleHints}
        />
      )}

      {status === 'driving' && (
        <MobileControls inputRef={inputRef} />
      )}

      {status === 'paused' && (
        <PauseMenu
          selectedColor={paintColor}
          distanceMeters={telemetry.distanceMeters}
          onSelectColor={setPaintColor}
          onResume={() => setStatus('driving')}
          onReset={handleReset}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </main>
  );
}
