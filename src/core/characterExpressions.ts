import { CharacterExpressionController } from './characterExpressionController';
import { on } from './eventBus';

/** Shared controller: event handling stays in the small shell bundle; the SVG art remains lazy-loaded. */
export const characterExpressions = new CharacterExpressionController();

export function connectCharacterExpressionBus(): () => void {
  return on('character:cue', ({ cue }) => characterExpressions.cue(cue));
}
