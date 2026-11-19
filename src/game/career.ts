import { HIGHWAY_TRACK } from './track';

export const STATION_NAMES = [
  'Pine Ridge Stop',
  'Eagle Pass Lookout',
  'Bluewater Rest',
  'Switchback Stop',
  'Alpine Viewpoint',
  'Cedar Gorge Stop',
  'Summit Rest',
  'Valley Junction',
];

export type MissionStep =
  | { kind: 'drive'; meters: number; label: string }
  | { kind: 'checkpoint'; progress: number; label: string }
  | { kind: 'pickup'; station: number; label: string }
  | { kind: 'dropoff'; station: number; label: string };

export interface CareerLevel {
  id: number;
  name: string;
  description: string;
  steps: MissionStep[];
  rewardCredits: number;
  rewardXp: number;
  timeLimitSeconds?: number;
  maxCollisions?: number;
  trafficCount: number;
  conditions: string;
}

export interface CareerSave {
  unlockedLevel: number;
  completedLevels: number[];
  credits: number;
  xp: number;
  deliveries: number;
  distanceMeters: number;
  bestTimes: Record<number, number>;
}

export const CAREER_LEVELS: CareerLevel[] = [
  {
    id: 1,
    name: 'First Light',
    description: 'Get comfortable with the car on a quiet stretch.',
    steps: [{ kind: 'drive', meters: 450, label: 'Drive 450 m' }],
    rewardCredits: 100,
    rewardXp: 100,
    trafficCount: 0,
    conditions: 'Clear skies · No traffic',
  },
  {
    id: 2,
    name: 'Valley Run',
    description: 'Follow the road through two sweeping bends.',
    steps: [
      { kind: 'checkpoint', progress: 0.14, label: 'Reach checkpoint 1' },
      { kind: 'checkpoint', progress: 0.27, label: 'Reach checkpoint 2' },
    ],
    rewardCredits: 150,
    rewardXp: 150,
    trafficCount: 1,
    conditions: 'Clear skies · Light traffic',
  },
  {
    id: 3,
    name: 'A Passenger Awaits',
    description: 'Collect your first fare and deliver them safely.',
    steps: [
      { kind: 'pickup', station: 0, label: `Pick up at ${STATION_NAMES[0]}` },
      { kind: 'dropoff', station: 2, label: `Deliver to ${STATION_NAMES[2]}` },
    ],
    rewardCredits: 250,
    rewardXp: 220,
    trafficCount: 1,
    conditions: 'Passenger service · Light traffic',
  },
  {
    id: 4,
    name: 'High Pass',
    description: 'Climb above the valley and descend to the overlook.',
    steps: [
      { kind: 'checkpoint', progress: 0.42, label: 'Reach the high pass' },
      { kind: 'checkpoint', progress: 0.68, label: 'Reach the overlook' },
    ],
    rewardCredits: 300,
    rewardXp: 280,
    trafficCount: 2,
    conditions: 'Elevation changes · Moderate traffic',
  },
  {
    id: 5,
    name: 'Clock Is Ticking',
    description: 'Cover ground efficiently without losing control.',
    steps: [{ kind: 'drive', meters: 1250, label: 'Drive 1.25 km' }],
    rewardCredits: 400,
    rewardXp: 360,
    timeLimitSeconds: 115,
    maxCollisions: 2,
    trafficCount: 2,
    conditions: 'Timed · 1:55 · 2 collision limit',
  },
  {
    id: 6,
    name: 'Switchback Line',
    description: 'Link four checkpoints through the tight mountain turns.',
    steps: [0.12, 0.21, 0.31, 0.42].map((progress, index) => ({
      kind: 'checkpoint' as const,
      progress,
      label: `Reach switchback ${index + 1}`,
    })),
    rewardCredits: 500,
    rewardXp: 450,
    maxCollisions: 2,
    trafficCount: 3,
    conditions: 'Tight curves · 2 collision limit',
  },
  {
    id: 7,
    name: 'Two Fares',
    description: 'Complete two pickups and drop-offs in one run.',
    steps: [
      { kind: 'pickup', station: 1, label: `Pick up at ${STATION_NAMES[1]}` },
      { kind: 'dropoff', station: 3, label: `Deliver to ${STATION_NAMES[3]}` },
      { kind: 'pickup', station: 4, label: `Pick up at ${STATION_NAMES[4]}` },
      { kind: 'dropoff', station: 6, label: `Deliver to ${STATION_NAMES[6]}` },
    ],
    rewardCredits: 650,
    rewardXp: 550,
    maxCollisions: 2,
    trafficCount: 4,
    conditions: 'Two passengers · Busy traffic',
  },
  {
    id: 8,
    name: 'Cloudline',
    description: 'Deliver a passenger through mountain fog.',
    steps: [
      { kind: 'pickup', station: 2, label: `Pick up at ${STATION_NAMES[2]}` },
      { kind: 'dropoff', station: 6, label: `Deliver to ${STATION_NAMES[6]}` },
    ],
    rewardCredits: 750,
    rewardXp: 650,
    timeLimitSeconds: 210,
    maxCollisions: 1,
    trafficCount: 4,
    conditions: 'Low visibility · 3:30 · 1 collision limit',
  },
  {
    id: 9,
    name: 'The Long Haul',
    description: 'Navigate a long route with dense traffic and little margin.',
    steps: [
      { kind: 'checkpoint', progress: 0.18, label: 'Pass checkpoint 1' },
      { kind: 'checkpoint', progress: 0.36, label: 'Pass checkpoint 2' },
      { kind: 'checkpoint', progress: 0.54, label: 'Pass checkpoint 3' },
      { kind: 'checkpoint', progress: 0.72, label: 'Pass checkpoint 4' },
    ],
    rewardCredits: 900,
    rewardXp: 800,
    timeLimitSeconds: 230,
    maxCollisions: 1,
    trafficCount: 6,
    conditions: 'Heavy traffic · 3:50 · 1 collision limit',
  },
  {
    id: 10,
    name: 'Summit Express',
    description: 'One final passenger run across the mountain highway.',
    steps: [
      { kind: 'pickup', station: 0, label: `Pick up at ${STATION_NAMES[0]}` },
      { kind: 'checkpoint', progress: 0.3, label: 'Cross the upper pass' },
      { kind: 'checkpoint', progress: 0.58, label: 'Cross the valley' },
      { kind: 'dropoff', station: 7, label: `Deliver to ${STATION_NAMES[7]}` },
    ],
    rewardCredits: 1500,
    rewardXp: 1200,
    timeLimitSeconds: 270,
    maxCollisions: 1,
    trafficCount: 6,
    conditions: 'Final route · 4:30 · 1 collision limit',
  },
];

export const STATION_PROGRESS = [0.09, 0.2, 0.32, 0.44, 0.56, 0.68, 0.81, 0.93];
export const CAREER_SAVE_KEY = 'open-road-career-v1';

export function createCareerSave(): CareerSave {
  return {
    unlockedLevel: 1,
    completedLevels: [],
    credits: 0,
    xp: 0,
    deliveries: 0,
    distanceMeters: 0,
    bestTimes: {},
  };
}

export function loadCareerSave(): CareerSave {
  try {
    const raw = localStorage.getItem(CAREER_SAVE_KEY);
    if (!raw) return createCareerSave();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createCareerSave();
    const save = parsed as Partial<CareerSave>;
    if (
      !Number.isInteger(save.unlockedLevel) ||
      !Array.isArray(save.completedLevels) ||
      typeof save.credits !== 'number' ||
      typeof save.xp !== 'number' ||
      typeof save.deliveries !== 'number'
    ) {
      return createCareerSave();
    }
    return {
      unlockedLevel: Math.min(CAREER_LEVELS.length, Math.max(1, save.unlockedLevel!)),
      completedLevels: save.completedLevels.filter(
        (level): level is number =>
          Number.isInteger(level) && level >= 1 && level <= CAREER_LEVELS.length,
      ),
      credits: Math.max(0, save.credits),
      xp: Math.max(0, save.xp),
      deliveries: Math.max(0, save.deliveries),
      distanceMeters:
        typeof save.distanceMeters === 'number' ? Math.max(0, save.distanceMeters) : 0,
      bestTimes:
        save.bestTimes && typeof save.bestTimes === 'object'
          ? save.bestTimes
          : {},
    };
  } catch (error) {
    console.warn('Career progress could not be loaded.', error);
    return createCareerSave();
  }
}

export function saveCareerSave(save: CareerSave): void {
  try {
    localStorage.setItem(CAREER_SAVE_KEY, JSON.stringify(save));
  } catch (error) {
    console.warn('Career progress could not be saved.', error);
  }
}

export function getStationPosition(stationIndex: number) {
  const t = STATION_PROGRESS[stationIndex];
  const sample = HIGHWAY_TRACK.samples[
    Math.round(t * HIGHWAY_TRACK.samples.length) % HIGHWAY_TRACK.samples.length
  ];
  return {
    x: sample.point.x + sample.right.x * 8.1,
    y: sample.point.y,
    z: sample.point.z + sample.right.z * 8.1,
    yaw: Math.atan2(-sample.tangent.x, -sample.tangent.z),
  };
}

export function getStationName(stationIndex: number) {
  return STATION_NAMES[stationIndex];
}

export function getStationDistance(
  x: number,
  z: number,
  trackProgress: number,
  stationIndex: number,
) {
  const station = getStationPosition(stationIndex);
  const delta = Math.abs(trackProgress - STATION_PROGRESS[stationIndex]);
  const alongTrack = Math.min(delta, 1 - delta) * HIGHWAY_TRACK.totalLength;
  const straightLine = Math.hypot(x - station.x, z - station.z);
  return Math.max(alongTrack, straightLine);
}
