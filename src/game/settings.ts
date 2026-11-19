import type { GraphicsQuality } from './types';

export interface GameSettings {
  steeringSensitivity: number;
  graphicsQuality: GraphicsQuality;
}

const SETTINGS_KEY = 'open-road-settings-v1';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  steeringSensitivity: 0.8,
  graphicsQuality: 'quality',
};

export function loadGameSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_GAME_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_GAME_SETTINGS;
    const settings = parsed as Partial<GameSettings>;
    return {
      steeringSensitivity:
        typeof settings.steeringSensitivity === 'number' &&
        Number.isFinite(settings.steeringSensitivity)
          ? Math.min(1.5, Math.max(0.5, settings.steeringSensitivity))
          : DEFAULT_GAME_SETTINGS.steeringSensitivity,
      graphicsQuality:
        settings.graphicsQuality === 'performance' ||
        settings.graphicsQuality === 'quality'
          ? settings.graphicsQuality
          : DEFAULT_GAME_SETTINGS.graphicsQuality,
    };
  } catch (error) {
    console.warn('Game settings could not be loaded.', error);
    return DEFAULT_GAME_SETTINGS;
  }
}

export function saveGameSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Game settings could not be saved.', error);
  }
}
