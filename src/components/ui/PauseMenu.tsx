import { Home, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { CAR_COLORS, type CarColorOption } from '../../game/types';
import type { GameSettings } from '../../game/settings';

interface PauseMenuProps {
  selectedColor: CarColorOption;
  distanceMeters: number;
  settings: GameSettings;
  audioEnabled: boolean;
  onSelectColor: (color: CarColorOption) => void;
  onSettingsChange: (settings: GameSettings) => void;
  onToggleAudio: () => void;
  onResume: () => void;
  onReset: () => void;
  onReturnToMenu: () => void;
}

export function PauseMenu({
  selectedColor,
  distanceMeters,
  settings,
  audioEnabled,
  onSelectColor,
  onSettingsChange,
  onToggleAudio,
  onResume,
  onReset,
  onReturnToMenu,
}: PauseMenuProps) {
  const formattedDistance =
    distanceMeters < 1000
      ? `${Math.round(distanceMeters)} m`
      : `${(distanceMeters / 1000).toFixed(2)} km`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-3 sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-xl border border-white/12 bg-zinc-950/95 p-5 shadow-2xl sm:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold text-white">
            Taking a break
          </h2>
          <span className="font-mono-tabular text-xs text-zinc-400">
            {formattedDistance} driven
          </span>
        </div>

        <section className="mt-5 border-t border-white/10 pt-4">
          <h3 className="text-xs font-semibold text-zinc-200">Driving settings</h3>
          <label className="mt-3 block text-xs text-zinc-300">
            <span className="flex items-center justify-between">
              <span>Steering sensitivity</span>
              <span className="font-mono-tabular text-amber-300">
                {Math.round(settings.steeringSensitivity * 100)}%
              </span>
            </span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={settings.steeringSensitivity}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  steeringSensitivity: Number(event.currentTarget.value),
                })
              }
              className="mt-2 w-full accent-amber-400"
            />
          </label>
          <label className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-300">
            <span>Graphics</span>
            <select
              value={settings.graphicsQuality}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  graphicsQuality:
                    event.currentTarget.value === 'performance'
                      ? 'performance'
                      : 'quality',
                })
              }
              className="rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
            >
              <option value="quality">Quality</option>
              <option value="performance">Performance</option>
            </select>
          </label>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-300">
            <span>Audio</span>
            <button
              type="button"
              onClick={onToggleAudio}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-white hover:bg-zinc-800"
            >
              {audioEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              {audioEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </section>

        {/* Paint Quick Switch */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-200">Car color</span>
            <span>{selectedColor.name}</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            {CAR_COLORS.map((color) => {
              const active = color.id === selectedColor.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => onSelectColor(color)}
                  aria-label={`Select ${color.name} paint`}
                  aria-pressed={active}
                  className={`h-10 w-10 cursor-pointer rounded-md border transition-transform ${
                    active
                      ? 'scale-105 border-amber-400 ring-2 ring-amber-400/35'
                      : 'border-white/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Resume Driving</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onReset();
              onResume();
            }}
            className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/12 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Vehicle to Start</span>
          </button>

          <button
            type="button"
            onClick={onReturnToMenu}
            className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            <Home className="h-4 w-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
