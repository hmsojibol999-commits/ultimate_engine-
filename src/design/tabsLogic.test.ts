import { describe, it, expect } from 'vitest';
import { nextTabIndex } from './tabsLogic';

describe('nextTabIndex', () => {
  it('moves right and wraps', () => {
    expect(nextTabIndex(0, 3, 'ArrowRight')).toBe(1);
    expect(nextTabIndex(2, 3, 'ArrowRight')).toBe(0);
  });
  it('moves left and wraps', () => {
    expect(nextTabIndex(1, 3, 'ArrowLeft')).toBe(0);
    expect(nextTabIndex(0, 3, 'ArrowLeft')).toBe(2);
  });
  it('supports Home and End', () => {
    expect(nextTabIndex(1, 4, 'Home')).toBe(0);
    expect(nextTabIndex(1, 4, 'End')).toBe(3);
  });
  it('swaps arrows for right-to-left', () => {
    expect(nextTabIndex(0, 3, 'ArrowLeft', true)).toBe(1);
  });
  it('ignores other keys and empty lists', () => {
    expect(nextTabIndex(0, 3, 'a')).toBeNull();
    expect(nextTabIndex(0, 0, 'ArrowRight')).toBeNull();
  });
});
