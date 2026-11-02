import { describe, expect, it, vi } from 'vitest';
import { createCharacterVoice, VOICE_PHRASES } from './characterVoice';

describe('character voice', () => {
  it('does not speak before a user gesture', () => {
    const speak = vi.fn();
    const voice = createCharacterVoice({ speak, cancel: vi.fn() }, () => true);
    expect(voice.speak('help')).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });
  it('speaks only after unlock and only when enabled', () => {
    const speak = vi.fn();
    let enabled = false;
    const voice = createCharacterVoice({ speak, cancel: vi.fn() }, () => enabled);
    voice.unlock();
    expect(voice.speak('help')).toBe(false);
    enabled = true;
    expect(voice.speak('help')).toBe(true);
    expect(speak).toHaveBeenCalledWith(VOICE_PHRASES.help);
  });
  it('greets once, and retries if muted on the first tap', () => {
    const speak = vi.fn();
    let enabled = false;
    const voice = createCharacterVoice({ speak, cancel: vi.fn() }, () => enabled);
    voice.unlock();
    expect(voice.greetAfterGesture()).toBe(false);
    enabled = true;
    expect(voice.greetAfterGesture()).toBe(true);
    expect(voice.greetAfterGesture()).toBe(false);
    expect(speak).toHaveBeenCalledTimes(1);
  });
  it('cancels prior speech before speaking and can stop', () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    const voice = createCharacterVoice({ speak, cancel }, () => true);
    voice.unlock(); voice.speak('success'); voice.stop();
    expect(cancel).toHaveBeenCalledTimes(2);
  });
  it('never speaks when the browser adapter is unavailable', () => {
    const voice = createCharacterVoice(null, () => true);
    voice.unlock();
    expect(voice.speak('greeting')).toBe(false);
  });
});
