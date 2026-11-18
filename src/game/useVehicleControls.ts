import { useEffect, useRef } from 'react';
import type { GameStatus, InputState } from './types';

interface ControlCallbacks {
  onReset: () => void;
  onCycleCamera: () => void;
  onTogglePause: () => void;
  onToggleHelp: () => void;
}

export function useVehicleControls(
  status: GameStatus,
  callbacks: ControlCallbacks,
): React.MutableRefObject<InputState> {
  const inputRef = useRef<InputState>({
    throttle: false,
    brake: false,
    left: false,
    right: false,
    handbrake: false,
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const clearInputs = () => {
      inputRef.current.throttle = false;
      inputRef.current.brake = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.handbrake = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space'
      ) {
        e.preventDefault();
      }

      if (e.repeat) {
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (statusRef.current !== 'menu') {
          clearInputs();
          callbacksRef.current.onTogglePause();
        }
        return;
      }

      if (statusRef.current !== 'driving') {
        return;
      }

      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          inputRef.current.throttle = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputRef.current.brake = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputRef.current.right = true;
          break;
        case 'Space':
          inputRef.current.handbrake = true;
          break;
        case 'KeyR':
          callbacksRef.current.onReset();
          break;
        case 'KeyC':
          callbacksRef.current.onCycleCamera();
          break;
        case 'KeyH':
          callbacksRef.current.onToggleHelp();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputRef.current.throttle = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputRef.current.brake = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputRef.current.right = false;
          break;
        case 'Space':
          inputRef.current.handbrake = false;
          break;
      }
    };

    const handleBlur = () => {
      clearInputs();
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (status !== 'driving') {
      inputRef.current.throttle = false;
      inputRef.current.brake = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.handbrake = false;
    }
  }, [status]);

  return inputRef;
}
