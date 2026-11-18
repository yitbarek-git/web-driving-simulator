import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HighwayEnvironment } from './HighwayEnvironment';
import { SportsCarModel, type SportsCarHandle } from './SportsCarModel';
import { VehiclePhysicsEngine } from '../../game/vehiclePhysics';
import type {
  CameraMode,
  CarColorOption,
  GameStatus,
  InputState,
  VehicleTelemetry,
} from '../../game/types';

// Pre-allocated scratch vectors for zero-GC per-frame updates
const _camGoalPos = new THREE.Vector3();
const _camGoalLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3();
const _forwardVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) {
      return { supported: false, isSoftwareGl: true };
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const rendererStr = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl =
      /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

interface SceneContentProps {
  status: GameStatus;
  cameraMode: CameraMode;
  paintColor: CarColorOption;
  inputRef: React.MutableRefObject<InputState>;
  resetCounter: number;
  isSoftwareGl: boolean;
  onTelemetry: (telemetry: VehicleTelemetry) => void;
}

function SceneContent({
  status,
  cameraMode,
  paintColor,
  inputRef,
  resetCounter,
  isSoftwareGl,
  onTelemetry,
}: SceneContentProps) {
  const { gl, scene, camera } = useThree();
  const physics = useMemo(() => new VehiclePhysicsEngine(), []);
  const carRef = useRef<SportsCarHandle>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hudTimerRef = useRef(0);
  const menuOrbitAngleRef = useRef(0.55);
  const camInitializedRef = useRef(false);

  // Mandatory Studio Environment Reflection (RoomEnvironment + PMREM) & Horizon Fog
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.fog = new THREE.FogExp2('#cfdbe6', 0.00145);

    if (!isSoftwareGl) {
      gl.compile(scene, camera);
    }

    return () => {
      scene.environment = null;
      envTex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, camera, isSoftwareGl]);

  // Reset vehicle when resetCounter increments
  useEffect(() => {
    if (resetCounter > 0) {
      physics.reset();
      camInitializedRef.current = false;
      onTelemetry(physics.getTelemetry());
    }
  }, [resetCounter, physics, onTelemetry]);

  useEffect(() => {
    if (status === 'menu') {
      physics.resetStats();
      onTelemetry(physics.getTelemetry());
    }
  }, [status, physics, onTelemetry]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    if (status === 'driving') {
      physics.step(dt, inputRef.current, true);
    } else if (status === 'menu') {
      physics.step(dt, inputRef.current, false);
    }

    // Push transforms to 3D car model imperatively
    if (carRef.current) {
      carRef.current.setTransform(
        physics.position.x,
        physics.position.y,
        physics.position.z,
        physics.yaw,
        physics.bodyPitch,
        physics.bodyRoll,
        physics.steerAngle,
        physics.wheelSpin,
        physics.isBraking,
        physics.isReversing,
      );
    }

    // Move directional sun shadow frustum with the car for sharp shadows everywhere on the highway
    if (sunRef.current) {
      sunRef.current.position.set(
        physics.position.x + 36,
        physics.position.y + 52,
        physics.position.z - 42,
      );
      sunRef.current.target.position.copy(physics.position);
      sunRef.current.target.updateMatrixWorld();
    }

    // Compute forward & right vectors of the vehicle
    const sinY = Math.sin(physics.yaw);
    const cosY = Math.cos(physics.yaw);
    _forwardVec.set(-sinY, 0, -cosY);
    _rightVec.set(cosY, 0, -sinY);

    const perspCam = camera as THREE.PerspectiveCamera;
    const speedKmh = Math.hypot(physics.vx, physics.vz) * 3.6;

    if (status === 'menu') {
      // Smooth showcase orbit around parked sports car on the highway
      menuOrbitAngleRef.current += dt * 0.14;
      const dist = 6.8;
      _camGoalPos.set(
        physics.position.x + Math.sin(menuOrbitAngleRef.current) * dist,
        physics.position.y + 2.15,
        physics.position.z + Math.cos(menuOrbitAngleRef.current) * dist,
      );
      _camGoalLook.set(
        physics.position.x,
        physics.position.y + 0.72,
        physics.position.z,
      );

      if (!camInitializedRef.current) {
        camera.position.copy(_camGoalPos);
        _currentLook.copy(_camGoalLook);
        camInitializedRef.current = true;
      } else {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 4, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 4, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 4, dt);
        _currentLook.lerp(_camGoalLook, 1 - Math.exp(-5 * dt));
      }
      camera.lookAt(_currentLook);
      perspCam.fov = THREE.MathUtils.damp(perspCam.fov, 50, 5, dt);
      perspCam.updateProjectionMatrix();
    } else {
      // Active driving camera modes
      let backDist = 6.3;
      let upHeight = 2.35;
      let lookAhead = 6.5;
      let lookHeight = 0.95;
      let baseFov = 58;
      let posLambda = 9.0;
      let lookLambda = 13.0;

      if (cameraMode === 'far') {
        backDist = 9.2;
        upHeight = 3.4;
        lookAhead = 8.0;
        lookHeight = 1.1;
        baseFov = 60;
        posLambda = 7.5;
      } else if (cameraMode === 'hood') {
        backDist = -0.35;
        upHeight = 1.24;
        lookAhead = 18.0;
        lookHeight = 1.08;
        baseFov = 66;
        posLambda = 35.0;
        lookLambda = 35.0;
      } else if (cameraMode === 'orbit') {
        // Wide dynamic rear-quarter view
        backDist = 7.2;
        upHeight = 2.75;
        lookAhead = 5.0;
        lookHeight = 0.9;
        baseFov = 56;
        posLambda = 7.0;
      }

      const sideOffset =
        cameraMode === 'orbit' ? 1.85 : -physics.steerAngle * 0.65;

      _camGoalPos
        .copy(physics.position)
        .addScaledVector(_forwardVec, -backDist)
        .addScaledVector(_rightVec, sideOffset);
      _camGoalPos.y += upHeight;

      // Subtle collision shake
      if (physics.collisionFlash > 0.05) {
        _camGoalPos.x += (Math.random() - 0.5) * physics.collisionFlash * 0.28;
        _camGoalPos.y += (Math.random() - 0.5) * physics.collisionFlash * 0.18;
      }

      _camGoalLook
        .copy(physics.position)
        .addScaledVector(_forwardVec, lookAhead);
      _camGoalLook.y += lookHeight;

      if (!camInitializedRef.current || cameraMode === 'hood') {
        camera.position.copy(_camGoalPos);
        _currentLook.copy(_camGoalLook);
        camInitializedRef.current = true;
      } else {
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _camGoalPos.x,
          posLambda,
          dt,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _camGoalPos.y,
          posLambda,
          dt,
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _camGoalPos.z,
          posLambda,
          dt,
        );

        const lookAlpha = 1 - Math.exp(-lookLambda * dt);
        _currentLook.lerp(_camGoalLook, lookAlpha);
      }

      camera.lookAt(_currentLook);

      // Speed-responsive FOV widening for sense of velocity
      const targetFov =
        baseFov + THREE.MathUtils.clamp((speedKmh / 240) * 14, 0, 14);
      if (Math.abs(perspCam.fov - targetFov) > 0.05) {
        perspCam.fov = THREE.MathUtils.damp(perspCam.fov, targetFov, 5.5, dt);
        perspCam.updateProjectionMatrix();
      }
    }

    // Throttle HUD telemetry updates (~24 Hz) to keep React UI snappy and smooth
    hudTimerRef.current += dt;
    if (hudTimerRef.current >= 0.042) {
      hudTimerRef.current = 0;
      onTelemetry(physics.getTelemetry());
    }
  });

  return (
    <>
      {/* Warm/Cool Daylight Lighting Rig */}
      <hemisphereLight args={['#a9ccf0', '#4f5d42', 0.72]} />
      <directionalLight
        ref={sunRef}
        color="#fff6e6"
        intensity={2.1}
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={5}
        shadow-camera-far={160}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-bias={-0.0005}
        shadow-normalBias={0.025}
      />
      <directionalLight
        position={[-40, 22, 35]}
        color="#bcd4ee"
        intensity={0.45}
      />

      <HighwayEnvironment isSoftwareGl={isSoftwareGl} />
      <SportsCarModel
        ref={carRef}
        paintColor={paintColor}
        isSoftwareGl={isSoftwareGl}
      />
    </>
  );
}

interface SimulatorCanvasProps {
  status: GameStatus;
  cameraMode: CameraMode;
  paintColor: CarColorOption;
  inputRef: React.MutableRefObject<InputState>;
  resetCounter: number;
  onTelemetry: (telemetry: VehicleTelemetry) => void;
}

export function SimulatorCanvas({
  status,
  cameraMode,
  paintColor,
  inputRef,
  resetCounter,
  onTelemetry,
}: SimulatorCanvasProps) {
  const webglProbe = useMemo(() => detectSoftwareWebGL(), []);
  const [contextError, setContextError] = useState<string | null>(
    webglProbe.supported
      ? null
      : 'WebGL is unavailable in this browser. Enable hardware acceleration or switch to a WebGL2-capable browser to run Open Road Simulator.',
  );

  if (contextError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            3D Graphics Unavailable
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {contextError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Canvas
        shadows={!webglProbe.isSoftwareGl}
        dpr={webglProbe.isSoftwareGl ? 1 : [1, 2]}
        camera={{ fov: 56, near: 0.2, far: 1800, position: [6, 2.5, 6] }}
        gl={{
          antialias: !webglProbe.isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          const dom = gl.domElement;
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextError(
              'The 3D graphics context was lost. Reload the page to restore the driving simulator.',
            );
          });
          dom.addEventListener('webglcontextrestored', () => {
            setContextError(null);
          });
        }}
      >
        <SceneContent
          status={status}
          cameraMode={cameraMode}
          paintColor={paintColor}
          inputRef={inputRef}
          resetCounter={resetCounter}
          isSoftwareGl={webglProbe.isSoftwareGl}
          onTelemetry={onTelemetry}
        />
      </Canvas>
    </div>
  );
}
