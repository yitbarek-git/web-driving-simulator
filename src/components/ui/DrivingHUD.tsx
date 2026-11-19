import { Camera, HelpCircle, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  CAMERA_LABELS,
  type CameraMode,
  type VehicleTelemetry,
} from '../../game/types';
import {
  CAREER_LEVELS,
  getStationDistance,
  getStationPosition,
  type CareerSave,
} from '../../game/career';
import { HIGHWAY_TRACK } from '../../game/track';
import { Minimap } from './Minimap';
import type { CareerMissionState } from '../../game/useCareerMission';

interface DrivingHUDProps {
  telemetry: VehicleTelemetry;
  cameraMode: CameraMode;
  selectedLevel: number;
  careerSave: CareerSave;
  mission: CareerMissionState;
  interactionPrompt: string;
  audioEnabled: boolean;
  showHints: boolean;
  onCycleCamera: () => void;
  onReset: () => void;
  onPause: () => void;
  onToggleHints: () => void;
  onInteract: () => void;
  onNextLevel: () => void;
  onToggleAudio: () => void;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function DrivingHUD({
  telemetry,
  cameraMode,
  selectedLevel,
  careerSave,
  mission,
  interactionPrompt,
  audioEnabled,
  showHints,
  onCycleCamera,
  onReset,
  onPause,
  onToggleHints,
  onInteract,
  onNextLevel,
  onToggleAudio,
}: DrivingHUDProps) {
  const rpmNorm = Math.min(Math.max((telemetry.rpm - 800) / 7000, 0), 1);
  const speedNorm = Math.min(Math.max(telemetry.speedKmh / 260, 0), 1);

  // SVG arc gauge constants (240-degree sweep)
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 240 / 360;
  const totalArcLength = circumference * arcFraction;
  const rpmDash = totalArcLength * rpmNorm;
  const speedDash = totalArcLength * speedNorm;
  const level = CAREER_LEVELS[selectedLevel - 1];
  const step = level.steps[mission.stepIndex];
  const timeRemaining =
    level.timeLimitSeconds === undefined
      ? null
      : Math.max(0, level.timeLimitSeconds - mission.elapsedSeconds);
  const passengersOnBoard =
    level.steps
      .slice(0, mission.stepIndex)
      .filter((item) => item.kind === 'pickup').length -
    level.steps
      .slice(0, mission.stepIndex)
      .filter((item) => item.kind === 'dropoff').length;
  let destinationDistance: number | null = null;
  let destination: { x: number; z: number } | undefined;
  if (step?.kind === 'checkpoint') {
    destinationDistance =
      ((step.progress - telemetry.trackProgress + 1) % 1) *
      HIGHWAY_TRACK.totalLength;
    const sample =
      HIGHWAY_TRACK.samples[
        Math.round(step.progress * HIGHWAY_TRACK.samples.length) %
          HIGHWAY_TRACK.samples.length
      ];
    destination = { x: sample.point.x, z: sample.point.z };
  } else if (step?.kind === 'pickup' || step?.kind === 'dropoff') {
    const station = getStationPosition(step.station);
    destination = { x: station.x, z: station.z };
    destinationDistance = getStationDistance(
      telemetry.x,
      telemetry.z,
      telemetry.trackProgress,
      step.station,
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Bar: Trip Info & Actions (left) + Minimap (right) */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto flex min-w-0 max-w-[calc(100vw-9.5rem)] flex-col gap-2 sm:max-w-none">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/85 px-3.5 py-2 shadow-lg">
            <div className="flex items-center gap-4 pr-2 text-xs">
              <div>
                <div className="text-[10px] font-medium text-zinc-400">Distance</div>
                <div className="font-mono-tabular text-sm font-semibold text-white">
                  {formatDistance(telemetry.distanceMeters)}
                </div>
              </div>
              <div className="h-6 w-px bg-white/10" aria-hidden="true" />
              <div>
                <div className="text-[10px] font-medium text-zinc-400">Time</div>
                <div className="font-mono-tabular text-sm font-semibold text-white">
                  {formatElapsed(telemetry.elapsedSeconds)}
                </div>
              </div>
              <div className="mobile-driving-speed">
                <div className="text-[10px] font-medium text-zinc-400">Speed</div>
                <div className="font-mono-tabular text-sm font-semibold text-white">
                  {telemetry.speedKmh} km/h · {telemetry.gear}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2.5">
              <button
                type="button"
                onClick={onCycleCamera}
                aria-label={`Camera: ${CAMERA_LABELS[cameraMode]} (C)`}
                title="Cycle Camera (C)"
                className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                <Camera className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">{CAMERA_LABELS[cameraMode]}</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                title="Reset Vehicle (R)"
                className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <button
                type="button"
                onClick={onPause}
                title="Pause (Esc)"
                className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                <Pause className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </button>
              <button
                type="button"
                onClick={onToggleAudio}
                aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
                title={audioEnabled ? 'Mute audio' : 'Enable audio'}
                className="flex min-h-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                {audioEnabled ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="max-w-[min(31rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-zinc-950/85 px-3.5 py-2.5 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-400">
                  Career · Level {selectedLevel} · {level.name}
                </div>
                <div className="mt-1 truncate text-xs font-medium text-white">
                  {mission.status === 'complete'
                    ? 'Mission complete'
                    : mission.status === 'failed'
                      ? 'Mission failed'
                      : step?.label ?? 'Route complete'}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono-tabular text-[10px] text-zinc-300">
                  {mission.stepIndex}/{level.steps.length} · {careerSave.xp} XP
                </div>
                {destinationDistance !== null && mission.status === 'active' && (
                  <div className="font-mono-tabular text-[10px] text-amber-300">
                    {formatDistance(destinationDistance)} to go
                  </div>
                )}
                {timeRemaining !== null && mission.status === 'active' && (
                  <div className="font-mono-tabular text-[10px] text-red-300">
                    {formatElapsed(timeRemaining)} left
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber-400 transition-[width]"
                style={{
                  width: `${Math.min(100, (mission.stepIndex / level.steps.length) * 100)}%`,
                }}
              />
            </div>
            {(interactionPrompt || mission.message || mission.status !== 'active') && (
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                <span
                  className={
                    mission.status === 'failed'
                      ? 'text-red-300'
                      : mission.status === 'complete'
                        ? 'text-emerald-300'
                        : passengersOnBoard > 0
                          ? 'text-sky-300'
                          : 'text-zinc-300'
                  }
                >
                  {mission.status === 'complete'
                    ? `+$${level.rewardCredits} · +${level.rewardXp} XP`
                    : mission.status === 'failed'
                      ? mission.message
                      : passengersOnBoard > 0
                        ? `Passenger aboard · ${mission.message || interactionPrompt}`
                        : interactionPrompt || mission.message}
                </span>
                {interactionPrompt.startsWith('Press E') && (
                  <button
                    type="button"
                    onClick={onInteract}
                    className="shrink-0 rounded border border-amber-300/40 bg-amber-400/15 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-400/25"
                  >
                    Interact · E
                  </button>
                )}
                {mission.status === 'complete' && selectedLevel < 10 && (
                  <button
                    type="button"
                    onClick={onNextLevel}
                    className="shrink-0 rounded border border-emerald-300/40 bg-emerald-400/15 px-2 py-1 font-semibold text-emerald-200 hover:bg-emerald-400/25"
                  >
                    Next level
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="driving-minimap pointer-events-auto ml-auto">
          <Minimap
            carX={telemetry.x}
            carZ={telemetry.z}
            carYaw={telemetry.yaw}
            target={mission.status === 'active' ? destination : undefined}
          />
        </div>
      </div>

      {/* Bottom Bar: Compact Key Hints (left) + Speedometer & Gear Cluster (right) */}
      <div className="flex items-end justify-between gap-4">
        <div className="pointer-events-auto hidden sm:block">
          {showHints ? (
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-950/85 px-3.5 py-2 text-xs text-zinc-300 shadow-lg">
              <span>
                <strong className="font-mono-tabular text-white">WASD</strong> /
                Arrows Drive
              </span>
              <span className="text-zinc-600" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="font-mono-tabular text-white">Space</strong>{' '}
                Handbrake
              </span>
              <span className="text-zinc-600" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="font-mono-tabular text-white">E</strong>{' '}
                Interact
              </span>
              <span className="text-zinc-600" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="font-mono-tabular text-white">C</strong>{' '}
                Camera
              </span>
              <span className="text-zinc-600" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="font-mono-tabular text-white">R</strong>{' '}
                Reset
              </span>
              <button
                type="button"
                onClick={onToggleHints}
                className="ml-1 cursor-pointer text-[11px] font-medium text-zinc-400 underline-offset-2 hover:text-white hover:underline"
              >
                Hide (H)
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleHints}
              className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-950/85 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Controls (H)</span>
            </button>
          )}
        </div>

        {/* Speedometer, Tachometer & Gear Cluster */}
        <div className="vehicle-status-cluster pointer-events-auto ml-auto flex items-center gap-2 rounded-xl border border-white/12 bg-zinc-950/88 px-2.5 py-2 shadow-xl sm:gap-4 sm:px-4 sm:py-3">
          {/* Active Vehicle State Text Indicators (never color-only) */}
          <div className="flex flex-col items-end gap-1.5 text-[11px] font-medium">
            <span
              className={
                telemetry.isBraking
                  ? 'text-red-400'
                  : 'text-zinc-600'
              }
            >
              BRAKE
            </span>
            <span
              className={
                telemetry.isHandbrake
                  ? 'text-amber-400'
                  : 'text-zinc-600'
              }
            >
              PARK
            </span>
            <span
              className={
                telemetry.isOffRoad
                  ? 'text-amber-300'
                  : 'text-zinc-600'
              }
            >
              SHOULDER
            </span>
          </div>

          {/* Gear Readout */}
          <div className="flex flex-col items-center justify-center border-x border-white/10 px-2 sm:px-4">
            <span className="text-[10px] font-medium text-zinc-400">GEAR</span>
            <span
              className={`font-display text-3xl font-bold leading-none mt-1 ${
                telemetry.gear === 'R'
                  ? 'text-amber-400'
                  : telemetry.gear === 'N'
                    ? 'text-zinc-300'
                    : 'text-white'
              }`}
            >
              {telemetry.gear}
            </span>
            <span className="font-mono-tabular mt-1.5 text-[11px] text-zinc-400">
              {telemetry.rpm} rpm
            </span>
          </div>

          {/* Dial Speedometer + Outer RPM Arc */}
          <div className="relative flex h-24 w-24 items-center justify-center sm:h-32 sm:w-32">
            <svg
              viewBox="0 0 140 140"
              className="h-full w-full -rotate-[210deg]"
              aria-hidden="true"
            >
              {/* Background Track */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.09)"
                strokeWidth="8"
                strokeDasharray={`${totalArcLength} ${circumference}`}
                strokeLinecap="round"
              />
              {/* Speed Arc */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="8"
                strokeDasharray={`${speedDash} ${circumference}`}
                strokeLinecap="round"
              />
              {/* Inner RPM Ring */}
              <circle
                cx="70"
                cy="70"
                r={47}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 47 * arcFraction} ${2 * Math.PI * 47}`}
              />
              <circle
                cx="70"
                cy="70"
                r={47}
                fill="none"
                stroke={rpmNorm > 0.85 ? '#ef4444' : '#38bdf8'}
                strokeWidth="3"
                strokeDasharray={`${(2 * Math.PI * 47 * arcFraction) * (rpmDash / totalArcLength)} ${2 * Math.PI * 47}`}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
              <span className="font-display font-mono-tabular text-3xl font-bold leading-none text-white">
                {telemetry.speedKmh}
              </span>
              <span className="mt-1 text-[11px] font-medium text-zinc-400">
                km/h
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
