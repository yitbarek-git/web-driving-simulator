import { Camera, HelpCircle, Pause, RotateCcw } from 'lucide-react';
import {
  CAMERA_LABELS,
  type CameraMode,
  type VehicleTelemetry,
} from '../../game/types';
import { Minimap } from './Minimap';

interface DrivingHUDProps {
  telemetry: VehicleTelemetry;
  cameraMode: CameraMode;
  showHints: boolean;
  onCycleCamera: () => void;
  onReset: () => void;
  onPause: () => void;
  onToggleHints: () => void;
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
  showHints,
  onCycleCamera,
  onReset,
  onPause,
  onToggleHints,
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

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Bar: Trip Info & Actions (left) + Minimap (right) */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/85 px-3.5 py-2 shadow-lg">
          <div className="flex items-center gap-4 pr-2 text-xs">
            <div>
              <div className="text-[10px] font-medium text-zinc-400">
                Distance
              </div>
              <div className="font-mono-tabular text-sm font-semibold text-white">
                {formatDistance(telemetry.distanceMeters)}
              </div>
            </div>
            <div className="h-6 w-px bg-white/10" aria-hidden="true" />
            <div>
              <div className="text-[10px] font-medium text-zinc-400">
                Time
              </div>
              <div className="font-mono-tabular text-sm font-semibold text-white">
                {formatElapsed(telemetry.elapsedSeconds)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-2.5">
            <button
              type="button"
              onClick={onCycleCamera}
              aria-label={`Camera: ${CAMERA_LABELS[cameraMode]} (C)`}
              title="Cycle Camera (C)"
              className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              <Camera className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">{CAMERA_LABELS[cameraMode]}</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              title="Reset Vehicle (R)"
              className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              type="button"
              onClick={onPause}
              title="Pause (Esc)"
              className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              <Pause className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          </div>
        </div>

        <div className="pointer-events-auto">
          <Minimap
            carX={telemetry.x}
            carZ={telemetry.z}
            carYaw={telemetry.yaw}
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
