import { describe, it, expect } from 'vitest';
import {
  CUE_DURATION_MS,
  CUE_MOODS,
  MOOD_FACES,
  MOOD_MOTION,
  blinkExpression,
  expireExpression,
  expressionForCue,
  idleExpression,
  unblinkExpression,
  type CharacterCue,
} from './characterExpressionLogic';

const cues: CharacterCue[] = ['idle', 'answered', 'thinking', 'warning', 'error', 'success', 'app-opened'];

describe('character expression mapping', () => {
  it('maps every supported real event to a mood and a valid face', () => {
    for (const cue of cues) {
      const state = expressionForCue(cue, 100);
      expect(state.mood).toBe(CUE_MOODS[cue]);
      expect(state.face).toEqual(MOOD_FACES[state.mood]);
      expect(state.changedAt).toBe(100);
      expect(state.expiresAt).toBe(CUE_DURATION_MS[cue] === null || cue === 'idle' ? null : 100 + CUE_DURATION_MS[cue]!);
    }
  });

  it('keeps GRID thinking until an answer or error event arrives', () => {
    const thinking = expressionForCue('thinking', 10);
    expect(thinking.mood).toBe('thinking');
    expect(thinking.expiresAt).toBeNull();
    expect(expressionForCue('answered', 20).mood).toBe('happy');
    expect(expressionForCue('error', 20).mood).toBe('worried');
  });

  it('uses restrained transform-only motion values for every mood', () => {
    for (const value of Object.values(MOOD_MOTION)) {
      expect(Object.keys(value).sort()).toEqual(['rotate', 'scale', 'y']);
      expect(Math.abs(value.rotate)).toBeLessThanOrEqual(3);
      expect(value.scale).toBeGreaterThan(0.9);
      expect(value.scale).toBeLessThan(1.1);
    }
  });
});

describe('idle blink helpers', () => {
  it('blinks only from idle and restores open eyes', () => {
    const idle = idleExpression(0);
    const blink = blinkExpression(idle, 5);
    expect(blink.blinking).toBe(true);
    expect(blink.face.eyes).toBe('blink');
    const open = unblinkExpression(blink, 145);
    expect(open.blinking).toBe(false);
    expect(open.face.eyes).toBe('open');
  });

  it('does not alter an active expression or blink twice', () => {
    const proud = expressionForCue('success', 0);
    expect(blinkExpression(proud, 1)).toBe(proud);
    const blink = blinkExpression(idleExpression(0), 1);
    expect(blinkExpression(blink, 2)).toBe(blink);
    expect(unblinkExpression(proud, 3)).toBe(proud);
  });

  it('expires only when the current reaction deadline has passed', () => {
    const state = expressionForCue('error', 100);
    expect(expireExpression(state, 2699)).toBe(state);
    expect(expireExpression(state, 2700)).toEqual(idleExpression(2700));
    expect(expireExpression(expressionForCue('thinking', 10), 100000).mood).toBe('thinking');
  });
});
