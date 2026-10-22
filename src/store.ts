import { create } from 'zustand';

export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export type Weather = 'clear' | 'cloudy' | 'rain';
export type Screen = 'menu' | 'playing' | 'paused';

export interface Settings {
  quality: Quality;
  sensitivity: number;
  invertY: boolean;
  /** game minutes that pass per real second */
  timeSpeed: number;
  weather: Weather | 'auto';
  showFps: boolean;
  charSeed: number;
  charSex: 'm' | 'f';
  /** lower the quality by itself when the frame rate is too low */
  autoQuality: boolean;
}

export interface Dialog { name: string; de: string; en: string }

interface GameState {
  screen: Screen;
  panel: null | 'settings' | 'controls' | 'map' | 'sbahn';
  settings: Settings;
  prompt: string | null;
  driving: boolean;
  speedKmh: number;
  gear: string;
  hour: number;
  weather: Weather;
  district: string;
  street: string;
  toast: string | null;
  dialog: Dialog | null;
  inside: string | null;
  fps: number;
  loading: string | null;
  setScreen: (s: Screen) => void;
  setPanel: (p: GameState['panel']) => void;
  setSettings: (s: Partial<Settings>) => void;
  set: (s: Partial<GameState>) => void;
  showToast: (t: string) => void;
}

const DEFAULTS: Settings = { quality: 'medium', sensitivity: 1, invertY: false, timeSpeed: 2, weather: 'auto', showFps: false, charSeed: 3, charSex: 'm', autoQuality: true };

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem('berlin3d.settings') || 'null');
    const touchOrWeak = (navigator.hardwareConcurrency || 8) <= 4;
    return { ...DEFAULTS, ...(touchOrWeak ? { quality: 'low' as Quality } : {}), ...(s || {}) };
  } catch {
    return DEFAULTS;
  }
}

let toastTimer = 0;
export const useGame = create<GameState>((set, get) => ({
  screen: 'menu',
  panel: null,
  settings: loadSettings(),
  prompt: null,
  driving: false,
  speedKmh: 0,
  gear: 'N',
  hour: 9.5,
  weather: 'clear',
  district: 'Mitte',
  street: '',
  toast: null,
  dialog: null,
  inside: null,
  fps: 0,
  loading: 'Building Berlin…',
  setScreen: (screen) => set({ screen, panel: null }),
  setPanel: (panel) => set({ panel }),
  setSettings: (s) => {
    const settings = { ...get().settings, ...s };
    try { localStorage.setItem('berlin3d.settings', JSON.stringify(settings)); } catch { /* storage blocked */ }
    set({ settings });
  },
  set: (s) => set(s),
  showToast: (toast) => {
    set({ toast });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => set({ toast: null }), 3200);
  },
}));
