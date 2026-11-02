import { describe, it, expect } from 'vitest';
import { translate, detectLang } from './i18n';
import { detectCapabilities } from './capabilities';
import { getIdentity, makeDeviceId } from './identity';
import { en } from '../content/strings.en';
import { bn } from '../content/strings.bn';

describe('i18n', () => {
  it('has every English key in Bengali with non-empty text', () => {
    for (const k of Object.keys(en)) expect(typeof (bn as Record<string, string>)[k]).toBe('string');
    for (const v of Object.values(bn)) expect(v.length > 0).toBe(true);
  });
  it('replaces placeholders and keeps unknown ones visible', () => {
    expect(translate('en', 'boot.credit', { name: 'Ana' })).toBe('Built by Ana');
    expect(translate('en', 'boot.credit')).toBe('Built by {name}');
    expect(translate('bn', 'boot.credit', { name: 'আনা' })).toBe('তৈরি করেছেন আনা');
  });
  it('detects Bengali browsers', () => {
    expect(detectLang({ language: 'bn-BD' })).toBe('bn');
    expect(detectLang({ language: 'en-US' })).toBe('en');
    expect(detectLang(undefined)).toBe('en');
  });
});

describe('capabilities', () => {
  it('reports false for everything in an empty environment', () => {
    const c = detectCapabilities({});
    expect(Object.values(c).every((v) => v === false)).toBe(true);
  });
  it('detects present features', () => {
    const c = detectCapabilities({ navigator: { vibrate() {}, storage: { getDirectory() {}, persist() {} } }, indexedDB: {}, BarcodeDetector: class {} });
    expect(c).toMatchObject({ opfs: true, vibrate: true, indexedDB: true, barcodeDetector: true, fileSystemAccess: false });
  });
});

describe('identity', () => {
  it('creates a 32-hex id once and reuses it', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const a = getIdentity(storage); const b = getIdentity(storage);
    expect(/^[0-9a-f]{32}$/.test(a.id)).toBe(true);
    expect(a.id).toBe(b.id);
    expect(makeDeviceId() === makeDeviceId()).toBe(false);
  });
  it('still works when storage throws', () => {
    const bad = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(/^[0-9a-f]{32}$/.test(getIdentity(bad).id)).toBe(true);
  });
  it('replaces a corrupt stored id', () => {
    const s = { getItem: () => 'not-valid', setItem: () => {} };
    expect(getIdentity(s).id === 'not-valid').toBe(false);
  });
});
