import { describe, it, expect } from 'vitest';
import { isEditableTarget, isShortcutsKey } from './shortcutsLogic';

const key = (over: Partial<{ key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({ key: '?', ctrlKey: false, metaKey: false, altKey: false, ...over });

describe('isEditableTarget', () => {
  it('is true for text fields and contenteditable (code editor, terminal)', () => {
    expect(isEditableTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'textarea' })).toBe(true);
    expect(isEditableTarget({ tagName: 'SELECT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });
  it('is false for buttons, the page body and missing targets', () => {
    expect(isEditableTarget({ tagName: 'BUTTON' })).toBe(false);
    expect(isEditableTarget({ tagName: 'BODY' })).toBe(false);
    expect(isEditableTarget({})).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(undefined)).toBe(false);
  });
});

describe('isShortcutsKey', () => {
  it('opens on a plain "?" outside text fields', () => {
    expect(isShortcutsKey(key(), { tagName: 'BODY' })).toBe(true);
    expect(isShortcutsKey(key(), { tagName: 'BUTTON' })).toBe(true);
    expect(isShortcutsKey(key(), null)).toBe(true);
  });
  it('does nothing while typing', () => {
    expect(isShortcutsKey(key(), { tagName: 'INPUT' })).toBe(false);
    expect(isShortcutsKey(key(), { tagName: 'DIV', isContentEditable: true })).toBe(false);
  });
  it('ignores other keys and Ctrl/Cmd/Alt combinations', () => {
    expect(isShortcutsKey(key({ key: '/' }), null)).toBe(false);
    expect(isShortcutsKey(key({ key: 'k' }), null)).toBe(false);
    expect(isShortcutsKey(key({ ctrlKey: true }), null)).toBe(false);
    expect(isShortcutsKey(key({ metaKey: true }), null)).toBe(false);
    expect(isShortcutsKey(key({ altKey: true }), null)).toBe(false);
  });
});
