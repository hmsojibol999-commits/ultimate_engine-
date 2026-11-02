/** Small, fixed-phrase English voice layer. No user text is ever spoken. */
export type VoicePhrase = 'greeting' | 'help' | 'success' | 'error' | 'thinking';
export const VOICE_PHRASES: Readonly<Record<VoicePhrase, string>> = {
  greeting: "Hi, I'm your assistant. Tap me if you need help.",
  help: 'I can guide you to the right tool.',
  success: 'Nice work. Task complete.',
  error: 'Something went wrong. Let us take a look.',
  thinking: 'Give me a moment to think.',
};

export interface SpeechPort {
  speak: (text: string) => void;
  cancel: () => void;
}

export function createCharacterVoice(port: SpeechPort | null, isEnabled: () => boolean) {
  let unlocked = false;
  let greeted = false;
  return {
    /** Call only directly from a real user gesture (tap/click/key). */
    unlock: (): void => { unlocked = true; },
    speak: (phrase: VoicePhrase): boolean => {
      if (!unlocked || !isEnabled() || !port) return false;
      port.cancel();
      port.speak(VOICE_PHRASES[phrase]);
      return true;
    },
    greetAfterGesture: (): boolean => {
      if (greeted) return false;
      const spoken = (() => {
        if (!unlocked || !isEnabled() || !port) return false;
        port.cancel();
        port.speak(VOICE_PHRASES.greeting);
        return true;
      })();
      if (spoken) greeted = true;
      return spoken;
    },
    stop: (): void => { port?.cancel(); },
  };
}

/** Browser adapter. SpeechSynthesis is feature-detected and never assumed. */
export function createBrowserSpeechPort(): SpeechPort | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return null;
  return {
    speak: (text) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.96;
      utterance.pitch = 1.04;
      window.speechSynthesis.speak(utterance);
    },
    cancel: () => window.speechSynthesis.cancel(),
  };
}
