import { useSyncExternalStore } from 'react';
import { en, type StringKey } from '../content/strings.en';
import { bn } from '../content/strings.bn';

export type Lang = 'en' | 'bn';
const tables: Record<Lang, Record<StringKey, string>> = { en, bn };

let current: Lang = 'en';
const listeners = new Set<() => void>();

export function detectLang(nav: { language?: string } | undefined = typeof navigator !== 'undefined' ? navigator : undefined): Lang {
  return nav?.language?.toLowerCase().startsWith('bn') ? 'bn' : 'en';
}

export function getLang(): Lang { return current; }

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

/** Translate a key. {placeholders} are replaced from vars. Falls back to English, then the key. */
export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  const raw = tables[lang][key] ?? en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export const t = (key: StringKey, vars?: Record<string, string | number>): string => translate(current, key, vars);

/** React hook: re-renders instantly when the language changes. */
export function useT(): { t: typeof t; lang: Lang } {
  const lang = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    getLang,
    getLang,
  );
  return { t: (key, vars) => translate(lang, key, vars), lang };
}
