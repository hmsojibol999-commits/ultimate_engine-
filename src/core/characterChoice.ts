import { create } from 'zustand';

/**
 * Which helper character the visitor picked (C-01). Small on purpose: it lives in the shell bundle,
 * while the art and the picker dialog (src/character/) are lazy-loaded only when needed (addendum B.8).
 */
export const CHARACTER_STYLES = ['anime', 'robot', 'cartoon', 'human'] as const;
export type CharacterStyle = (typeof CHARACTER_STYLES)[number];
/** Three looks per style (one masculine-looking, one feminine-looking, one neutral). The UI never labels them by gender. */
export const CHARACTER_VARIANTS = ['a', 'b', 'c'] as const;
export type CharacterVariant = (typeof CHARACTER_VARIANTS)[number];
export type CharacterId = `${CharacterStyle}-${CharacterVariant}`;
export const CHARACTER_IDS: CharacterId[] = CHARACTER_STYLES.flatMap((s) => CHARACTER_VARIANTS.map((v) => `${s}-${v}` as CharacterId));

/** 'none' = the visitor chose to work without a character. */
export type CharacterChoice = CharacterId | 'none';
export const CHARACTER_KEY = 'sg.character';

interface KeyValueStore { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export const isCharacterId = (v: unknown): v is CharacterId => typeof v === 'string' && (CHARACTER_IDS as string[]).includes(v);

/** Read a stored value. Anything unknown or corrupt counts as "never chose" (null), never throws. */
export function parseChoice(raw: string | null): CharacterChoice | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { v?: unknown; id?: unknown } | null;
    if (!data || typeof data !== 'object' || data.v !== 1) return null;
    if (data.id === 'none') return 'none';
    return isCharacterId(data.id) ? data.id : null;
  } catch {
    return null;
  }
}

export function loadChoice(store: KeyValueStore | undefined): CharacterChoice | null {
  try { return store ? parseChoice(store.getItem(CHARACTER_KEY)) : null; } catch { return null; }
}

/** Returns false when the browser refused to store it (the choice then only lasts for this visit). */
export function saveChoice(store: KeyValueStore | undefined, choice: CharacterChoice): boolean {
  try {
    if (!store) return false;
    store.setItem(CHARACTER_KEY, JSON.stringify({ v: 1, id: choice }));
    return true;
  } catch {
    return false;
  }
}

/** Can this browser remember anything? Checked with a throwaway key. */
export function canPersist(store: KeyValueStore | undefined): boolean {
  if (!store) return false;
  try {
    const probe = 'sg.probe';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Show the picker on its own only on a first visit: nothing chosen yet AND the choice can be remembered.
 * With blocked storage it would come back on every load, so we stay quiet (Settings still works for this visit).
 */
export function shouldShowPicker(store: KeyValueStore | undefined): boolean {
  return canPersist(store) && loadChoice(store) === null;
}

const storage = (): KeyValueStore | undefined => (typeof localStorage === 'undefined' ? undefined : localStorage);

interface CharacterState {
  choice: CharacterChoice | null;
  pickerOpen: boolean;
  /** Save a choice, close the picker. Returns false if it could not be remembered. */
  choose: (c: CharacterChoice) => boolean;
  openPicker: () => void;
  closePicker: () => void;
}

export const useCharacter = create<CharacterState>((set) => ({
  choice: loadChoice(storage()),
  pickerOpen: false,
  choose: (c) => {
    const saved = saveChoice(storage(), c);
    set({ choice: c, pickerOpen: false });
    return saved;
  },
  openPicker: () => set({ pickerOpen: true }),
  closePicker: () => set({ pickerOpen: false }),
}));
