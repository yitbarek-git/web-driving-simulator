import * as THREE from 'three';
import {
  GUARDRAIL_OFFSET,
  HIGHWAY_TRACK,
  ROAD_WIDTH,
} from './track';
import { getTrafficPose } from './traffic';
import type { GearLabel, InputState, VehicleTelemetry } from './types';

const GEAR_SPEED_THRESHOLDS_KMH = [0, 42, 82, 126, 172, 218, 265];
const MAX_FORWARD_SPEED_MS = 1000 / 3.6;
const MAX_REVERSE_SPEED_MS = 50 / 3.6;

export class VehiclePhysicsEngine {
  position = new THREE.Vector3();
  yaw = 0;
  vx = 0;
  vz = 0;
  steerAngle = 0;
  wheelSpin = 0;
  roadPitch = 0;
  bodyPitch = 0;
  bodyRoll = 0;
  distanceMeters = 0;
  elapsedSeconds = 0;
  rpm = 900;
  gear: GearLabel = 'N';
  isBraking = false;
  isReversing = false;
  isHandbrake = false;
  isOffRoad = false;
  collisionFlash = 0;
  collisionCount = 0;
  trackProgress = 0;

  private lastTrackIndex = 0;
  private prevForwardSpeed = 0;
  private collisionCooldown = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    const spawn = HIGHWAY_TRACK.getSpawnTransform();
    this.position.copy(spawn.position);
    this.yaw = spawn.yaw;
    this.vx = 0;
    this.vz = 0;
    this.steerAngle = 0;
    this.wheelSpin = 0;
    this.roadPitch = 0;
    this.bodyPitch = 0;
    this.bodyRoll = 0;
    this.rpm = 900;
    this.gear = 'N';
    this.isBraking = false;
    this.isReversing = false;
    this.isHandbrake = false;
    this.isOffRoad = false;
    this.collisionFlash = 0;
    this.collisionCount = 0;
    this.prevForwardSpeed = 0;
    this.collisionCooldown = 0;
    this.lastTrackIndex = 0;
    this.trackProgress = 0;
  }

  resetStats(): void {
    this.distanceMeters = 0;
    this.elapsedSeconds = 0;
  }

  step(
    dt: number,
    input: InputState,
    isActiveDriving: boolean,
    trafficCount = 0,
    steeringSensitivity = 1,
  ): void {
    const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
    this.collisionCooldown = Math.max(
      0,
      this.collisionCooldown - clampedDt,
    );
    if (isActiveDriving) {
      this.elapsedSeconds += clampedDt;
    }

    // Forward & right unit vectors in XZ plane (car faces -Z at yaw = 0)
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const fwdX = -sinY;
    const fwdZ = -cosY;
    const rightX = cosY;
    const rightZ = -sinY;

    // Decompose velocity into car-local longitudinal and lateral components
    let vForward = this.vx * fwdX + this.vz * fwdZ;
    let vLateral = this.vx * rightX + this.vz * rightZ;
    const speedAbs = Math.hypot(vForward, vLateral);
    const speedKmh = speedAbs * 3.6;

    // Active input gating (idle coasting when in menu)
    const throttle = isActiveDriving && input.throttle ? 1 : 0;
    const brakeInput = isActiveDriving && input.brake ? 1 : 0;
    const handbrake = isActiveDriving && input.handbrake;
    const steerInput = isActiveDriving
      ? (input.left ? 1 : 0) - (input.right ? 1 : 0)
      : 0;

    // 1. Speed-dependent steering geometry
    // Max steering angle shrinks smoothly at highway speeds for composed stability
    const maxSteer = 0.0013 + 0.42 / (1 + Math.pow(speedKmh / 11, 2));
    const targetSteer =
      steerInput *
      maxSteer *
      THREE.MathUtils.clamp(steeringSensitivity, 0.5, 1.5);
    const steerRate = steerInput !== 0 ? 2.4 : 4.2;
    this.steerAngle = THREE.MathUtils.damp(
      this.steerAngle,
      targetSteer,
      steerRate,
      clampedDt,
    );

    // 2. Longitudinal drive, braking, and reverse transition
    let longAccel = 0;
    let brakingActive = false;
    let reversingActive = false;

    if (throttle > 0) {
      if (vForward < -1.0) {
        // Braking from reverse motion before launching forward
        longAccel += 12.0;
        brakingActive = true;
      } else {
        // Realistic torque curve: strong low-end launch, tapering at top speed
        const speedRatio = THREE.MathUtils.clamp(
          vForward / MAX_FORWARD_SPEED_MS,
          0,
          1,
        );
        const engineForce =
          15.5 * (1 - 0.58 * Math.pow(speedRatio, 1.35)) + 2.2;
        longAccel += engineForce;
      }
    }

    if (brakeInput > 0) {
      if (vForward > 1.2) {
        // Service brakes
        longAccel -= 11.0;
        brakingActive = true;
      } else if (vForward > -MAX_REVERSE_SPEED_MS) {
        // Reverse gear engagement once nearly stopped
        longAccel -= 4.5;
        reversingActive = true;
      }
    } else if (vForward < -0.5) {
      reversingActive = true;
    }

    if (handbrake) {
      brakingActive = true;
      if (Math.abs(vForward) > 0.3) {
        longAccel -= Math.sign(vForward) * 14.0;
      } else {
        vForward = 0;
      }
    }

    // Aerodynamic drag + rolling resistance + off-road grass drag
    const dragCoeff = this.isOffRoad ? 0.011 : 0.0028;
    const rollingCoeff = this.isOffRoad ? 2.4 : 0.48;
    const aeroDrag = -dragCoeff * vForward * Math.abs(vForward);
    const rollingDrag =
      Math.abs(vForward) > 0.05
        ? -Math.sign(vForward) * rollingCoeff
        : 0;
    const hillHold = throttle === 0 && brakeInput === 0 && Math.abs(vForward) < 0.4;

    const roadGrade = HIGHWAY_TRACK.findClosest(
      this.position.x,
      this.position.z,
      this.lastTrackIndex,
    ).tangent.y;
    longAccel +=
      aeroDrag +
      rollingDrag -
      (isActiveDriving && !hillHold ? 9.81 * roadGrade : 0);
    vForward += longAccel * clampedDt;

    // Prevent micro-creep when coasting at standstill
    if (
      throttle === 0 &&
      brakeInput === 0 &&
      Math.abs(vForward) < 0.8
    ) {
      vForward = 0;
    }

    vForward = THREE.MathUtils.clamp(
      vForward,
      -MAX_REVERSE_SPEED_MS,
      MAX_FORWARD_SPEED_MS,
    );

    // 3. Bicycle-model yaw rotation & lateral tire grip
    const wheelbase = 2.72;
    if (Math.abs(vForward) > 0.2) {
      const turnRate = (vForward / wheelbase) * Math.tan(this.steerAngle);
      // Handbrake gives extra rotation authority for controlled oversteer
      const handbrakeYawBoost = handbrake ? 1.28 : 1.0;
      this.yaw += turnRate * handbrakeYawBoost * clampedDt;
    }

    // Recompute local axes after yaw update
    const nSinY = Math.sin(this.yaw);
    const nCosY = Math.cos(this.yaw);
    const nFwdX = -nSinY;
    const nFwdZ = -nCosY;
    const nRightX = nCosY;
    const nRightZ = -nSinY;

    // Lateral grip scrubs side-slip velocity; lower grip during handbrake or off-road
    const lateralGrip = handbrake ? 2.1 : this.isOffRoad ? 3.8 : 8.0;
    vLateral = THREE.MathUtils.damp(vLateral, 0, lateralGrip, clampedDt);

    // Reconstruct world XZ velocity
    this.vx = nFwdX * vForward + nRightX * vLateral;
    this.vz = nFwdZ * vForward + nRightZ * vLateral;

    // Integrate position
    const prevX = this.position.x;
    const prevZ = this.position.z;
    this.position.x += this.vx * clampedDt;
    this.position.z += this.vz * clampedDt;

    // 4. Track alignment, elevation & guardrail collision detection
    const trackInfo = HIGHWAY_TRACK.findClosest(
      this.position.x,
      this.position.z,
      this.lastTrackIndex,
    );
    this.lastTrackIndex = trackInfo.sampleIndex;
    this.trackProgress = trackInfo.t;
    this.isOffRoad = trackInfo.distanceFromCenter > ROAD_WIDTH * 0.5;
    this.roadPitch = THREE.MathUtils.damp(
      this.roadPitch,
      Math.asin(THREE.MathUtils.clamp(trackInfo.tangent.y, -0.5, 0.5)),
      10,
      clampedDt,
    );

    // Guardrail collision boundary at ±GUARDRAIL_OFFSET
    const carHalfWidth = 0.98;
    const maxLateral = GUARDRAIL_OFFSET - carHalfWidth;

    if (trackInfo.distanceFromCenter > maxLateral) {
      const sign = Math.sign(trackInfo.lateralOffset);
      const excess = trackInfo.distanceFromCenter - maxLateral;

      // Push car back inside guardrail along road normal
      this.position.x -= trackInfo.right.x * sign * excess;
      this.position.z -= trackInfo.right.z * sign * excess;

      // Compute velocity along outward normal
      const vNormal =
        this.vx * trackInfo.right.x * sign +
        this.vz * trackInfo.right.z * sign;

      if (vNormal > 0) {
        // Reflect/damp outward component + wall scrape friction
        this.vx -= trackInfo.right.x * sign * vNormal * 1.25;
        this.vz -= trackInfo.right.z * sign * vNormal * 1.25;
        this.vx *= 0.86;
        this.vz *= 0.86;

        if (vNormal > 2.2) {
          this.collisionFlash = Math.min(1, vNormal / 14);
          if (this.collisionCooldown === 0) {
            this.collisionCount += 1;
            this.collisionCooldown = 0.85;
          }
        }
      }
    }

    for (let i = 0; i < (isActiveDriving ? trafficCount : 0); i++) {
      const traffic = getTrafficPose(i, this.elapsedSeconds, trafficCount);
      const dx = this.position.x - traffic.x;
      const dz = this.position.z - traffic.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 4.2 && distance > 0.001) {
        if (this.collisionCooldown === 0) {
          const impact = Math.hypot(this.vx, this.vz);
          const nx = dx / distance;
          const nz = dz / distance;
          const overlap = 4.2 - distance;
          this.position.x += nx * overlap;
          this.position.z += nz * overlap;
          this.vx = (this.vx + nx * 2.8) * 0.56;
          this.vz = (this.vz + nz * 2.8) * 0.56;
          this.collisionFlash = Math.min(1, Math.max(0.35, impact / 18));
          this.collisionCount += 1;
          this.collisionCooldown = 0.85;
        }
        break;
      }
    }

    this.collisionFlash = THREE.MathUtils.damp(
      this.collisionFlash,
      0,
      7.0,
      clampedDt,
    );

    // Conform vertical position smoothly to road elevation
    const targetY = trackInfo.point.y;
    this.position.y =
      this.position.y === 0 && targetY === 0
        ? 0
        : THREE.MathUtils.damp(this.position.y, targetY, 22, clampedDt);

    // Track distance traveled
    const stepDist = Math.hypot(
      this.position.x - prevX,
      this.position.z - prevZ,
    );
    if (isActiveDriving) {
      this.distanceMeters += stepDist;
    }

    // 5. Wheel spin & suspension pitch/roll
    const wheelRadius = 0.34;
    this.wheelSpin += (vForward / wheelRadius) * clampedDt;

    const measuredAccel = (vForward - this.prevForwardSpeed) / clampedDt;
    this.prevForwardSpeed = vForward;

    // Squat on acceleration (+pitch nose up), dive on brake (-pitch nose down)
    const targetPitch = THREE.MathUtils.clamp(measuredAccel * 0.0022, -0.04, 0.035);
    this.bodyPitch = THREE.MathUtils.damp(this.bodyPitch, targetPitch, 9.0, clampedDt);

    // Body roll proportional to lateral cornering force
    const lateralTurnG =
      Math.abs(vForward) > 1
        ? (vForward * Math.tan(this.steerAngle) * vForward) / 42
        : 0;
    const targetRoll = THREE.MathUtils.clamp(-lateralTurnG * 0.0045, -0.06, 0.06);
    this.bodyRoll = THREE.MathUtils.damp(this.bodyRoll, targetRoll, 9.5, clampedDt);

    // 6. Automatic 6-speed gearbox & RPM synthesis
    const absKmh = Math.abs(vForward) * 3.6;
    let currentGear: GearLabel = 'N';
    let targetRpm = 900;

    if (vForward < -0.4 || (reversingActive && absKmh > 0.2)) {
      currentGear = 'R';
      targetRpm = 1150 + (absKmh / 55) * 5200;
    } else if (absKmh < 1.2 && throttle === 0) {
      currentGear = 'N';
      targetRpm = 880 + (throttle > 0 ? 1200 : 0);
    } else {
      let gearIndex = 1;
      for (let g = 1; g <= 6; g++) {
        if (absKmh >= GEAR_SPEED_THRESHOLDS_KMH[g - 1]) {
          gearIndex = g;
        }
      }
      currentGear = String(gearIndex) as GearLabel;
      const low = GEAR_SPEED_THRESHOLDS_KMH[gearIndex - 1];
      const high = GEAR_SPEED_THRESHOLDS_KMH[gearIndex];
      const gearRatio = THREE.MathUtils.clamp(
        (absKmh - low) / Math.max(1, high - low),
        0,
        1,
      );
      const baseGearRpm = gearIndex === 1 ? 1400 : 2400;
      targetRpm = baseGearRpm + gearRatio * (7300 - baseGearRpm) + throttle * 350;
    }

    this.gear = currentGear;
    this.rpm = THREE.MathUtils.damp(
      this.rpm,
      THREE.MathUtils.clamp(targetRpm, 850, 7800),
      8.5,
      clampedDt,
    );

    this.isBraking = brakingActive;
    this.isReversing = reversingActive;
    this.isHandbrake = handbrake;
  }

  getTelemetry(): VehicleTelemetry {
    const speedMs = Math.hypot(this.vx, this.vz);
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const forwardSpeedMs = this.vx * -sinY + this.vz * -cosY;

    return {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      yaw: this.yaw,
      speedKmh: Math.round(speedMs * 3.6),
      forwardSpeedMs,
      gear: this.gear,
      rpm: Math.round(this.rpm),
      steerAngle: this.steerAngle,
      distanceMeters: this.distanceMeters,
      elapsedSeconds: this.elapsedSeconds,
      isBraking: this.isBraking,
      isReversing: this.isReversing,
      isHandbrake: this.isHandbrake,
      isOffRoad: this.isOffRoad,
      collisionFlash: this.collisionFlash,
      collisionCount: this.collisionCount,
      trackProgress: this.trackProgress,
    };
  }
}
