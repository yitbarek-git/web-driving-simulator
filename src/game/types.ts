export type GameStatus = 'menu' | 'driving' | 'paused';

export type CameraMode = 'chase' | 'far' | 'hood' | 'orbit';

export type GearLabel = 'R' | 'N' | '1' | '2' | '3' | '4' | '5' | '6';

export interface CarColorOption {
  id: string;
  name: string;
  hex: string;
  metalness: number;
  roughness: number;
}

export const CAR_COLORS: CarColorOption[] = [
  { id: 'alpine-silver', name: 'Alpine Silver', hex: '#d4d8df', metalness: 0.78, roughness: 0.22 },
  { id: 'guards-red', name: 'Carmine Red', hex: '#b91c1c', metalness: 0.55, roughness: 0.2 },
  { id: 'sapphire-blue', name: 'Midnight Blue', hex: '#1d4ed8', metalness: 0.72, roughness: 0.2 },
  { id: 'british-green', name: 'Racing Green', hex: '#14532d', metalness: 0.65, roughness: 0.22 },
  { id: 'obsidian-grey', name: 'Graphite Metallic', hex: '#272a30', metalness: 0.8, roughness: 0.24 },
];

export const CAMERA_LABELS: Record<CameraMode, string> = {
  chase: 'Chase Cam',
  far: 'Far Chase',
  hood: 'Hood Cam',
  orbit: 'Wide Rear',
};

export interface InputState {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
}

export interface VehicleTelemetry {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speedKmh: number;
  forwardSpeedMs: number;
  gear: GearLabel;
  rpm: number;
  steerAngle: number;
  distanceMeters: number;
  elapsedSeconds: number;
  isBraking: boolean;
  isReversing: boolean;
  isHandbrake: boolean;
  isOffRoad: boolean;
  collisionFlash: number;
  trackProgress: number;
}
