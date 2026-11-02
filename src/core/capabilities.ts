// Feature detection. UI hides or disables features with a friendly reason when false.
export interface Capabilities {
  opfs: boolean;
  indexedDB: boolean;
  vibrate: boolean;
  fileSystemAccess: boolean;
  barcodeDetector: boolean;
  serviceWorker: boolean;
  storagePersist: boolean;
  speechSynthesis: boolean;
}

export function detectCapabilities(env: Record<string, unknown> = globalThis as unknown as Record<string, unknown>): Capabilities {
  const nav = (env.navigator ?? {}) as Record<string, unknown>;
  const storage = (nav.storage ?? {}) as Record<string, unknown>;
  return {
    opfs: typeof storage.getDirectory === 'function',
    indexedDB: typeof env.indexedDB !== 'undefined',
    vibrate: typeof nav.vibrate === 'function',
    fileSystemAccess: typeof env.showOpenFilePicker === 'function',
    barcodeDetector: typeof env.BarcodeDetector !== 'undefined',
    serviceWorker: 'serviceWorker' in nav,
    storagePersist: typeof storage.persist === 'function',
    speechSynthesis: typeof env.speechSynthesis !== 'undefined',
  };
}

let cached: Capabilities | null = null;
export const capabilities = (): Capabilities => (cached ??= detectCapabilities());
