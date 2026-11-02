/** Semantic state for the helper character. Cues describe real UI events, not arbitrary animations. */
export type CharacterMood = 'idle' | 'happy' | 'thinking' | 'surprised' | 'worried' | 'proud' | 'pointing';
export type CharacterCue = 'idle' | 'answered' | 'thinking' | 'warning' | 'error' | 'success' | 'app-opened';

/** Kept in core so the character SVG stays in its own lazy-loaded chunk. */
export interface CharacterFace {
  eyes: 'open' | 'blink' | 'happy' | 'wide' | 'up';
  mouth: 'smile' | 'grin' | 'open' | 'flat' | 'frown';
  brows: 'neutral' | 'raised' | 'worried';
  hands: 'down' | 'wave' | 'point' | 'chin' | 'cheer';
}

/** Every mood uses the renderer's supported face parts (C-02). */
export const MOOD_FACES: Readonly<Record<CharacterMood, CharacterFace>> = {
  idle: { eyes: 'open', mouth: 'smile', brows: 'neutral', hands: 'down' },
  happy: { eyes: 'happy', mouth: 'grin', brows: 'raised', hands: 'wave' },
  thinking: { eyes: 'up', mouth: 'flat', brows: 'raised', hands: 'chin' },
  surprised: { eyes: 'wide', mouth: 'open', brows: 'raised', hands: 'cheer' },
  worried: { eyes: 'wide', mouth: 'frown', brows: 'worried', hands: 'chin' },
  proud: { eyes: 'happy', mouth: 'grin', brows: 'raised', hands: 'cheer' },
  pointing: { eyes: 'open', mouth: 'smile', brows: 'neutral', hands: 'point' },
};

/** Body movement is deliberately small; motion components animate transform only. */
export const MOOD_MOTION: Readonly<Record<CharacterMood, { y: number; rotate: number; scale: number }>> = {
  idle: { y: 0, rotate: 0, scale: 1 },
  happy: { y: -2, rotate: 2, scale: 1.025 },
  thinking: { y: 0, rotate: -2, scale: 1 },
  surprised: { y: -3, rotate: 0, scale: 1.04 },
  worried: { y: 1, rotate: -1, scale: 0.985 },
  proud: { y: -3, rotate: 1, scale: 1.035 },
  pointing: { y: -2, rotate: -2, scale: 1.02 },
};

/** Short reactions return to idle; GRID thinking remains until a reply/error arrives. */
export const CUE_MOODS: Readonly<Record<CharacterCue, CharacterMood>> = {
  idle: 'idle',
  answered: 'happy',
  thinking: 'thinking',
  warning: 'surprised',
  error: 'worried',
  success: 'proud',
  'app-opened': 'pointing',
};

export const CUE_DURATION_MS: Readonly<Record<CharacterCue, number | null>> = {
  idle: null,
  answered: 1800,
  thinking: null,
  warning: 1500,
  error: 2600,
  success: 2100,
  'app-opened': 1400,
};

export interface CharacterExpressionSnapshot {
  mood: CharacterMood;
  face: CharacterFace;
  blinking: boolean;
  changedAt: number;
  expiresAt: number | null;
}

const idleFace = (): CharacterFace => ({ ...MOOD_FACES.idle });

export function idleExpression(now: number): CharacterExpressionSnapshot {
  return { mood: 'idle', face: idleFace(), blinking: false, changedAt: now, expiresAt: null };
}

export function expressionForCue(cue: CharacterCue, now: number): CharacterExpressionSnapshot {
  const mood = CUE_MOODS[cue];
  const duration = CUE_DURATION_MS[cue];
  return {
    mood,
    face: { ...MOOD_FACES[mood] },
    blinking: false,
    changedAt: now,
    expiresAt: duration === null || cue === 'idle' ? null : now + duration,
  };
}

/** Expiry is guarded so an old timer cannot clear a newer reaction. */
export function expireExpression(state: CharacterExpressionSnapshot, now: number): CharacterExpressionSnapshot {
  return state.expiresAt !== null && now >= state.expiresAt ? idleExpression(now) : state;
}

export function blinkExpression(state: CharacterExpressionSnapshot, now: number): CharacterExpressionSnapshot {
  if (state.mood !== 'idle' || state.blinking) return state;
  return { ...state, face: { ...state.face, eyes: 'blink' }, blinking: true, changedAt: now };
}

export function unblinkExpression(state: CharacterExpressionSnapshot, now: number): CharacterExpressionSnapshot {
  if (state.mood !== 'idle' || !state.blinking) return state;
  return { ...state, face: { ...state.face, eyes: 'open' }, blinking: false, changedAt: now };
}
