import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand } from 'lucide-react';
import type { InputState } from '../../game/types';

type MobileAction = 'left' | 'right' | 'throttle' | 'brake' | 'handbrake';

interface MobileControlsProps {
  inputRef: React.MutableRefObject<InputState>;
  interactionPrompt: string;
  onInteract: () => void;
}

const ACTION_LABELS: Record<MobileAction, string> = {
  left: 'Steer left',
  right: 'Steer right',
  throttle: 'Accelerate',
  brake: 'Brake',
  handbrake: 'Handbrake',
};

export function MobileControls({
  inputRef,
  interactionPrompt,
  onInteract,
}: MobileControlsProps) {
  const activePointers = useRef(new Map<number, MobileAction>());
  const [activeActions, setActiveActions] = useState<Set<MobileAction>>(new Set());

  const syncInput = (actions: Set<MobileAction>) => {
    inputRef.current.left = actions.has('left');
    inputRef.current.right = actions.has('right');
    inputRef.current.throttle = actions.has('throttle');
    inputRef.current.brake = actions.has('brake');
    inputRef.current.handbrake = actions.has('handbrake');
  };

  const clearControls = () => {
    activePointers.current.clear();
    setActiveActions(new Set());
    syncInput(new Set());
  };

  useEffect(() => {
    const handlePointerEnd = (event: PointerEvent) => {
      if (!activePointers.current.has(event.pointerId)) return;

      activePointers.current.delete(event.pointerId);
      const next = new Set(activePointers.current.values());
      setActiveActions(next);
      syncInput(next);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) clearControls();
    };

    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('blur', clearControls);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('blur', clearControls);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearControls();
    };
  }, []);

  const beginControl = (
    event: React.PointerEvent<HTMLButtonElement>,
    action: MobileAction,
  ) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events and a few embedded browsers cannot capture.
    }
    activePointers.current.set(event.pointerId, action);

    const next = new Set(activePointers.current.values());
    setActiveActions(next);
    syncInput(next);
  };

  const endControl = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    activePointers.current.delete(event.pointerId);

    const next = new Set(activePointers.current.values());
    setActiveActions(next);
    syncInput(next);
  };

  const controlButton = (
    action: MobileAction,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      aria-label={ACTION_LABELS[action]}
      data-action={action}
      data-active={activeActions.has(action)}
      onPointerDown={(event) => beginControl(event, action)}
      onPointerUp={endControl}
      onPointerCancel={endControl}
      onLostPointerCapture={endControl}
      onContextMenu={(event) => event.preventDefault()}
      className="mobile-control-button flex touch-none items-center justify-center rounded-full border border-white/20 bg-zinc-950/45 text-white shadow-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
    >
      {icon}
    </button>
  );

  return (
    <div
      className="mobile-controls pointer-events-none fixed inset-x-0 bottom-0 z-40 items-end justify-between px-3 pb-3 sm:px-5"
      aria-label="Touch driving controls"
    >
      <div className="pointer-events-auto flex gap-2.5">
        {controlButton('left', <ArrowLeft className="h-7 w-7" />)}
        {controlButton('right', <ArrowRight className="h-7 w-7" />)}
      </div>
      <div className="pointer-events-auto flex gap-2.5">
        {controlButton('brake', <ArrowDown className="h-7 w-7" />)}
        {controlButton('throttle', <ArrowUp className="h-7 w-7" />)}
      </div>
      <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2">
        {controlButton('handbrake', <Hand className="h-6 w-6" />)}
      </div>
      {interactionPrompt.startsWith('Press E') && (
        <button
          type="button"
          onClick={onInteract}
          className="pointer-events-auto absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full border border-amber-300/50 bg-zinc-950/75 px-4 py-2 text-xs font-semibold text-amber-100 shadow-lg"
        >
          {interactionPrompt.includes('drop off') ? 'Stop · Drop off' : 'Stop · Pick up'}
        </button>
      )}
    </div>
  );
}
