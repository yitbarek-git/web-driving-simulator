import * as THREE from 'three';

export interface TrackSample {
  index: number;
  t: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
}

export interface ClosestTrackInfo {
  sampleIndex: number;
  t: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  lateralOffset: number;
  distanceFromCenter: number;
}

export const ROAD_WIDTH = 14.0;
export const SHOULDER_WIDTH = 2.6;
export const GUARDRAIL_OFFSET = ROAD_WIDTH / 2 + SHOULDER_WIDTH - 0.35; // 9.25m from centerline
export const TRACK_SAMPLE_COUNT = 720;

/**
 * Generates a scenic ~3 km closed highway loop with fast straights,
 * sweeping valley curves, and subtle elevation undulations.
 */
function buildHighwaySpline(): THREE.CatmullRomCurve3 {
  const waypoints: [number, number, number][] = [
    [0, 0, 0],
    [0, 0.5, -240],
    [35, 2.2, -460],
    [140, 4.5, -620],
    [310, 6.0, -680],
    [490, 4.8, -610],
    [620, 2.4, -440],
    [660, 1.0, -210],
    [590, 0.4, 30],
    [450, 1.5, 220],
    [290, 3.2, 340],
    [130, 2.4, 390],
    [-40, 1.0, 350],
    [-160, 0.2, 230],
    [-120, 0.0, 110],
    [-25, 0.0, 45],
  ];

  const vectors = waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  return new THREE.CatmullRomCurve3(vectors, true, 'catmullrom', 0.45);
}

export class HighwayTrack {
  readonly curve: THREE.CatmullRomCurve3;
  readonly samples: TrackSample[];
  readonly totalLength: number;
  readonly minimapPoints: { x: number; z: number }[];
  readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  constructor() {
    this.curve = buildHighwaySpline();
    this.totalLength = this.curve.getLength();
    this.samples = [];
    this.minimapPoints = [];

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < TRACK_SAMPLE_COUNT; i++) {
      const t = i / TRACK_SAMPLE_COUNT;
      const point = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      this.samples.push({
        index: i,
        t,
        point,
        tangent,
        right,
      });

      if (i % 4 === 0) {
        this.minimapPoints.push({ x: point.x, z: point.z });
      }

      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.z < minZ) minZ = point.z;
      if (point.z > maxZ) maxZ = point.z;
    }

    this.bounds = { minX, maxX, minZ, maxZ };
  }

  /**
   * Returns initial spawn transform at the start of the main straight facing -Z.
   */
  getSpawnTransform(): { position: THREE.Vector3; yaw: number } {
    const sample = this.samples[0];
    // Spawn on right-hand lane (+2.8m right of center) facing forward along tangent
    const pos = sample.point.clone().addScaledVector(sample.right, 2.8);
    const yaw = Math.atan2(-sample.tangent.x, -sample.tangent.z);
    return { position: pos, yaw };
  }

  /**
   * Finds closest track sample and lateral offset relative to the highway centerline.
   * Uses a fast local window search when hintIndex is provided.
   */
  findClosest(x: number, z: number, hintIndex?: number): ClosestTrackInfo {
    const count = this.samples.length;
    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < count) {
      const windowRadius = 28;
      for (let offset = -windowRadius; offset <= windowRadius; offset++) {
        const idx = (hintIndex + offset + count) % count;
        const p = this.samples[idx].point;
        const dx = x - p.x;
        const dz = z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
    }

    // Fallback full scan if far from hint or no hint
    if (bestDistSq > 1600 || hintIndex === undefined) {
      bestDistSq = Infinity;
      for (let i = 0; i < count; i++) {
        const p = this.samples[i].point;
        const dx = x - p.x;
        const dz = z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
    }

    const s = this.samples[bestIdx];
    const dx = x - s.point.x;
    const dz = z - s.point.z;
    // Project onto local tangent/right plane for accurate continuous interpolation
    const along = dx * s.tangent.x + dz * s.tangent.z;
    const lateral = dx * s.right.x + dz * s.right.z;

    const interpPoint = s.point.clone().addScaledVector(s.tangent, along);

    return {
      sampleIndex: bestIdx,
      t: s.t,
      point: interpPoint,
      tangent: s.tangent,
      right: s.right,
      lateralOffset: lateral,
      distanceFromCenter: Math.abs(lateral),
    };
  }

  /**
   * Computes deterministic terrain height at any world (x, z),
   * smoothly blending road corridor elevation into surrounding hills & distant mountains.
   */
  getTerrainHeight(x: number, z: number): number {
    // Find nearest coarse sample (step by 3 for speed during terrain generation)
    let bestDistSq = Infinity;
    let roadY = 0;
    for (let i = 0; i < this.samples.length; i += 3) {
      const p = this.samples[i].point;
      const dx = x - p.x;
      const dz = z - p.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        roadY = p.y;
      }
    }

    const dist = Math.sqrt(bestDistSq);

    // Keep roadbed and shoulder corridor flat relative to the road surface
    if (dist <= ROAD_WIDTH / 2 + SHOULDER_WIDTH + 4) {
      return roadY - 0.14;
    }

    // Natural rolling meadow & distant mountain ridges outside the highway corridor
    const hillBlend = THREE.MathUtils.smoothstep(dist, 14, 75);
    const mountainBlend = THREE.MathUtils.smoothstep(dist, 90, 340);

    const rolling =
      Math.sin(x * 0.008) * Math.cos(z * 0.008) * 6.5 +
      Math.sin(x * 0.021 + 1.4) * Math.sin(z * 0.017) * 3.0;

    const ridges =
      (Math.abs(Math.sin(x * 0.0045 + z * 0.0032)) * 44 +
        Math.cos(x * 0.009 - z * 0.007) * 18 +
        14) *
      mountainBlend;

    // Gentle ditch right off the shoulder, then hills and mountains
    const baseTerrain = roadY - 0.35 + rolling * hillBlend + ridges;
    return baseTerrain;
  }
}

export const HIGHWAY_TRACK = new HighwayTrack();
