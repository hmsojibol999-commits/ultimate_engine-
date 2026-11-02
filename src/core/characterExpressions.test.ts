import { describe, it, expect } from 'vitest';
import { emit } from './eventBus';
import { characterExpressions, connectCharacterExpressionBus } from './characterExpressions';

describe('character expression event bus', () => {
  it('maps connected real UI cues into the shared expression controller', () => {
    const disconnect = connectCharacterExpressionBus();
    emit('character:cue', { cue: 'app-opened' });
    expect(characterExpressions.getSnapshot().mood).toBe('pointing');
    emit('character:cue', { cue: 'error' });
    expect(characterExpressions.getSnapshot().mood).toBe('worried');
    emit('character:cue', { cue: 'thinking' });
    expect(characterExpressions.getSnapshot().mood).toBe('thinking');
    emit('character:cue', { cue: 'answered' });
    expect(characterExpressions.getSnapshot().mood).toBe('happy');
    emit('character:cue', { cue: 'idle' });
    expect(characterExpressions.getSnapshot().mood).toBe('idle');
    disconnect();
  });

  it('does not receive further cues after disconnecting', () => {
    const disconnect = connectCharacterExpressionBus();
    disconnect();
    const before = characterExpressions.getSnapshot();
    emit('character:cue', { cue: 'success' });
    expect(characterExpressions.getSnapshot()).toBe(before);
  });
});
