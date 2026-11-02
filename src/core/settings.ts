import { create } from 'zustand';
import { detectLang, setLang, type Lang } from './i18n';

export type ThemeId = 'neon-cyan' | 'deep-violet' | 'matrix-green' | 'high-contrast';
export const THEMES: ThemeId[] = ['neon-cyan', 'deep-violet', 'matrix-green', 'high-contrast'];

export type WallpaperId = 'grid' | 'particles' | 'none';
export const WALLPAPERS: WallpaperId[] = ['grid', 'particles', 'none'];

export interface Settings {
  version: 1;
  theme: ThemeId;
  wallpaper: WallpaperId;
  lang: Lang;
  lowPower: boolean;
  uiSounds: boolean; // off by default
  voiceEnabled: boolean; // optional character speech, off by default
  lastBackupAt: number | null;
}

export const SETTINGS_VERSION = 1;
const KEY = 'sg.settings';

export const defaultSettings = (lang: Lang = 'en'): Settings => ({
  version: 1, theme: 'neon-cyan', wallpaper: 'grid', lang, lowPower: false, uiSounds: false, voiceEnabled: false, lastBackupAt: null,
});

/** Versioned schema migration. Unknown or corrupt input falls back to defaults, never throws. */
export function migrateSettings(raw: unknown, lang: Lang = 'en'): Settings {
  const base = defaultSettings(lang);
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Record<string, unknown>;
  // v0 (unversioned) used `language` and `low_power`; v1 uses `lang` and `lowPower`.
  const langIn = (r.lang ?? r.language) as unknown;
  return {
    version: 1,
    theme: THEMES.includes(r.theme as ThemeId) ? (r.theme as ThemeId) : base.theme,
    wallpaper: WALLPAPERS.includes(r.wallpaper as WallpaperId) ? (r.wallpaper as WallpaperId) : base.wallpaper,
    lang: langIn === 'bn' || langIn === 'en' ? langIn : base.lang,
    lowPower: typeof (r.lowPower ?? r.low_power) === 'boolean' ? ((r.lowPower ?? r.low_power) as boolean) : base.lowPower,
    uiSounds: typeof r.uiSounds === 'boolean' ? r.uiSounds : base.uiSounds,
    voiceEnabled: typeof r.voiceEnabled === 'boolean' ? r.voiceEnabled : base.voiceEnabled,
    lastBackupAt: typeof r.lastBackupAt === 'number' ? r.lastBackupAt : null,
  };
}

function load(): Settings {
  try {
    const s = localStorage.getItem(KEY);
    return migrateSettings(s ? JSON.parse(s) : null, detectLang());
  } catch {
    return defaultSettings(detectLang());
  }
}

interface SettingsStore extends Settings {
  update: (patch: Partial<Omit<Settings, 'version'>>) => void;
  /** Reset every setting to its default (keeps the current language so the screen stays readable). */
  reset: () => void;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...load(),
  update: (patch) => {
    set(patch);
    persist(get());
  },
  reset: () => {
    set(defaultSettings(get().lang));
    persist(get());
  },
}));

function persist(state: SettingsStore): void {
  const { update: _u, reset: _r, ...data } = state;
  void _u; void _r;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage blocked */ }
  applySettings(data);
}

/** Push settings into the DOM (theme, low-power flag, language). */
export function applySettings(s: Settings): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.dataset.wallpaper = s.wallpaper;
  document.documentElement.dataset.lowpower = String(s.lowPower);
  setLang(s.lang);
}
