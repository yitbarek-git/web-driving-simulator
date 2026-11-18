import { Home, Play, RotateCcw } from 'lucide-react';
import { CAR_COLORS, type CarColorOption } from '../../game/types';

interface PauseMenuProps {
  selectedColor: CarColorOption;
  distanceMeters: number;
  onSelectColor: (color: CarColorOption) => void;
  onResume: () => void;
  onReset: () => void;
  onReturnToMenu: () => void;
}

export function PauseMenu({
  selectedColor,
  distanceMeters,
  onSelectColor,
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
