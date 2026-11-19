import { Lock, Play, RotateCcw } from 'lucide-react';
import { CAR_COLORS, type CarColorOption } from '../../game/types';
import { CAREER_LEVELS, type CareerSave } from '../../game/career';

interface MainMenuProps {
  selectedColor: CarColorOption;
  selectedLevel: number;
  careerSave: CareerSave;
  onSelectColor: (color: CarColorOption) => void;
  onSelectLevel: (level: number) => void;
  onStartDriving: () => void;
}

const CONTROL_ROWS: { key: string; action: string }[] = [
  { key: 'W / Up', action: 'Accelerate' },
  { key: 'S / Down', action: 'Brake & Reverse' },
  { key: 'A / D or Left / Right', action: 'Steer' },
  { key: 'Space', action: 'Handbrake' },
  { key: 'E', action: 'Stop interaction' },
  { key: 'C', action: 'Camera View' },
  { key: 'R', action: 'Reset Vehicle' },
];

export function MainMenu({
  selectedColor,
  selectedLevel,
  careerSave,
  onSelectColor,
  onSelectLevel,
  onStartDriving,
}: MainMenuProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-start p-3 sm:items-center sm:p-10">
      <div className="pointer-events-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-white/12 bg-zinc-950/88 p-4 shadow-2xl sm:p-7">
        <p className="text-xs font-medium tracking-wide text-amber-400">
            Your next drive starts here
        </p>
        <h1 className="font-display mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Open Road Simulator
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
          Take on a 10-level mountain career, collect passengers, and earn
          rewards as the roads get tougher.
        </p>

        <section className="mt-5 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold text-zinc-200">Career</h2>
              <p className="mt-1 text-[11px] text-zinc-400">
                {careerSave.completedLevels.length}/10 complete · {careerSave.deliveries} delivered · {careerSave.distanceMeters >= 1000 ? `${(careerSave.distanceMeters / 1000).toFixed(1)} km` : `${Math.round(careerSave.distanceMeters)} m`} · {careerSave.xp} XP · ${careerSave.credits}
              </p>
            </div>
            <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
              Level {careerSave.unlockedLevel} unlocked
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CAREER_LEVELS.map((level) => {
              const locked = level.id > careerSave.unlockedLevel;
              const completed = careerSave.completedLevels.includes(level.id);
              const active = selectedLevel === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  disabled={locked}
                  onClick={() => onSelectLevel(level.id)}
                  aria-pressed={active}
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                    active
                      ? 'border-amber-400/70 bg-amber-400/10'
                      : locked
                        ? 'border-white/5 bg-zinc-900/35 text-zinc-600'
                        : 'border-white/10 bg-zinc-900/70 hover:bg-zinc-800'
                  }`}
                >
                  <span className="w-5 shrink-0 font-mono-tabular text-[10px] text-amber-300">
                    {String(level.id).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-200">
                    {level.name}
                  </span>
                  {locked ? (
                    <Lock className="h-3 w-3 shrink-0 text-zinc-600" />
                  ) : completed ? (
                    <span className="text-[9px] font-bold text-emerald-400">DONE</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-zinc-400">
            {CAREER_LEVELS[selectedLevel - 1].conditions}
            {careerSave.bestTimes[selectedLevel] !== undefined &&
              ` · Best ${Math.floor(careerSave.bestTimes[selectedLevel] / 60)}:${String(Math.floor(careerSave.bestTimes[selectedLevel] % 60)).padStart(2, '0')}`}
          </p>
          <p className="mt-1 text-[10px] text-zinc-300">
            {CAREER_LEVELS[selectedLevel - 1].description} · Reward $
            {CAREER_LEVELS[selectedLevel - 1].rewardCredits} /{' '}
            {CAREER_LEVELS[selectedLevel - 1].rewardXp} XP
          </p>
        </section>

        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium text-zinc-200">Car color</span>
            <span>{selectedColor.name}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            {CAR_COLORS.map((color) => {
              const active = color.id === selectedColor.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => onSelectColor(color)}
                  aria-label={`Select ${color.name} paint`}
                  aria-pressed={active}
                  title={color.name}
                  className={`h-10 w-10 cursor-pointer rounded-lg border transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
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

        <div className="mt-6 border-t border-white/10 pt-5">
          <h2 className="text-xs font-semibold text-zinc-200">Controls</h2>
          <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {CONTROL_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5"
              >
                <dt className="font-mono-tabular text-zinc-400">{row.key}</dt>
                <dd className="text-right font-medium text-zinc-200">
                  {row.action}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onStartDriving}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Start Level {selectedLevel}</span>
          </button>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
          <RotateCcw className="h-3 w-3 shrink-0" />
          <span>
            Press Esc to pause, change your car's color, or return to the menu.
          </span>
        </p>
      </div>
    </div>
  );
}
