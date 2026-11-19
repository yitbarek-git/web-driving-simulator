import { HIGHWAY_TRACK } from './track';

const TRAFFIC_STARTS = [0.08, 0.25, 0.43, 0.61, 0.78, 0.92];
const TRAFFIC_SPEEDS = [13, 15, 12, 16, 14, 12.5];

function getRawProgress(index: number, elapsedSeconds: number) {
  return (
    (TRAFFIC_STARTS[index] + (TRAFFIC_SPEEDS[index] * elapsedSeconds) / HIGHWAY_TRACK.totalLength) %
    1
  );
}

export interface TrafficPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export function getTrafficPose(
  index: number,
  elapsedSeconds: number,
  trafficCount = TRAFFIC_STARTS.length,
): TrafficPose {
  const length = HIGHWAY_TRACK.totalLength;
  let progress = getRawProgress(index, elapsedSeconds);
  if (trafficCount > 1) {
    const leaderIndex = (index + 1) % trafficCount;
    const leaderProgress = getRawProgress(leaderIndex, elapsedSeconds);
    const gap = ((leaderProgress - progress + 1) % 1) * length;
    if (gap < 26) {
      progress = (leaderProgress - 26 / length + 1) % 1;
    }
  }
  const sampleIndex = Math.floor(progress * HIGHWAY_TRACK.samples.length);
  const sample = HIGHWAY_TRACK.samples[sampleIndex];
  const laneOffset = 2.8;
  return {
    x: sample.point.x + sample.right.x * laneOffset,
    y: sample.point.y,
    z: sample.point.z + sample.right.z * laneOffset,
    yaw: Math.atan2(-sample.tangent.x, -sample.tangent.z),
  };
}
