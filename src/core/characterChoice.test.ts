import { describe, it, expect } from 'vitest';
import {
  CHARACTER_IDS, CHARACTER_KEY, CHARACTER_STYLES, CHARACTER_VARIANTS, canPersist, isCharacterId, loadChoice, parseChoice, saveChoice, shouldShowPicker, useCharacter,
} from './characterChoice';

const memoryStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, m };
};
/** A browser that blocks storage entirely (private mode, cookies off). */
const blockedStore = () => ({
  getItem: (): string | null => { throw new Error('blocked'); },
  setItem: (): void => { throw new Error('blocked'); },
  removeItem: (): void => { throw new Error('blocked'); },
});

describe('character ids', () => {
  it('are 4 styles x 3 looks, all different', () => {
    expect(CHARACTER_STYLES).toHaveLength(4);
    expect(CHARACTER_VARIANTS).toHaveLength(3);
    expect(CHARACTER_IDS).toHaveLength(12);
    expect(new Set(CHARACTER_IDS).size).toBe(12);
  });
  it('isCharacterId accepts only known ids', () => {
    expect(isCharacterId('anime-a')).toBe(true);
    expect(isCharacterId('human-c')).toBe(true);
    expect(isCharacterId('none')).toBe(false);
    expect(isCharacterId('anime-d')).toBe(false);
    expect(isCharacterId(7)).toBe(false);
  });
});

describe('parseChoice', () => {
  it('reads a saved character or "none"', () => {
    expect(parseChoice(JSON.stringify({ v: 1, id: 'robot-b' }))).toBe('robot-b');
    expect(parseChoice(JSON.stringify({ v: 1, id: 'none' }))).toBe('none');
  });
  it('treats empty, corrupt, unknown or wrong-version data as "never chose"', () => {
    expect(parseChoice(null)).toBeNull();
    expect(parseChoice('')).toBeNull();
    expect(parseChoice('not json')).toBeNull();
    expect(parseChoice('null')).toBeNull();
    expect(parseChoice('42')).toBeNull();
    expect(parseChoice(JSON.stringify({ v: 2, id: 'robot-b' }))).toBeNull();
    expect(parseChoice(JSON.stringify({ v: 1, id: 'dragon-z' }))).toBeNull();
    expect(parseChoice(JSON.stringify({ id: 'robot-b' }))).toBeNull();
  });
});

describe('save and load', () => {
  it('round trips every character and "none"', () => {
    for (const id of [...CHARACTER_IDS, 'none' as const]) {
      const store = memoryStore();
      expect(saveChoice(store, id)).toBe(true);
      expect(loadChoice(store)).toBe(id);
    }
  });
  it('never throws when storage is blocked or missing', () => {
    expect(saveChoice(blockedStore(), 'anime-a')).toBe(false);
    expect(saveChoice(undefined, 'anime-a')).toBe(false);
    expect(loadChoice(blockedStore())).toBeNull();
    expect(loadChoice(undefined)).toBeNull();
  });
});

describe('canPersist', () => {
  it('is true for working storage and leaves no probe key behind', () => {
    const store = memoryStore();
    expect(canPersist(store)).toBe(true);
    expect(store.m.size).toBe(0);
  });
  it('is false for blocked or missing storage', () => {
    expect(canPersist(blockedStore())).toBe(false);
    expect(canPersist(undefined)).toBe(false);
  });
});

describe('shouldShowPicker (first-visit rule)', () => {
  it('shows on a fresh device', () => {
    expect(shouldShowPicker(memoryStore())).toBe(true);
  });
  it('does not show again after a character or "none" was chosen', () => {
    const store = memoryStore();
    saveChoice(store, 'cartoon-c');
    expect(shouldShowPicker(store)).toBe(false);
    saveChoice(store, 'none');
    expect(shouldShowPicker(store)).toBe(false);
  });
  it('shows again if the saved value got corrupted', () => {
    const store = memoryStore();
    store.setItem(CHARACTER_KEY, '{oops');
    expect(shouldShowPicker(store)).toBe(true);
  });
  it('stays quiet when the browser cannot remember (it would come back on every load)', () => {
    expect(shouldShowPicker(blockedStore())).toBe(false);
    expect(shouldShowPicker(undefined)).toBe(false);
  });
});

describe('useCharacter store', () => {
  it('opens and closes the picker', () => {
    useCharacter.getState().openPicker();
    expect(useCharacter.getState().pickerOpen).toBe(true);
    useCharacter.getState().closePicker();
    expect(useCharacter.getState().pickerOpen).toBe(false);
  });
  it('choose() sets the choice and closes the picker', () => {
    useCharacter.getState().openPicker();
    useCharacter.getState().choose('robot-a');
    expect(useCharacter.getState().choice).toBe('robot-a');
    expect(useCharacter.getState().pickerOpen).toBe(false);
    useCharacter.getState().choose('none');
    expect(useCharacter.getState().choice).toBe('none');
  });
});
