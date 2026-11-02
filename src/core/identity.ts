// Anonymous device identity. No cookies. All identity access goes through this module
// so GitHub/Google sign-in can replace it later without rewrites.
const KEY = 'sg.deviceId';

export interface Identity {
  kind: 'anonymous';
  id: string;
}

export function makeDeviceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getIdentity(storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocalStorage()): Identity {
  let id: string | null = null;
  try { id = storage?.getItem(KEY) ?? null; } catch { /* storage blocked */ }
  if (!id || !/^[0-9a-f]{32}$/.test(id)) {
    id = makeDeviceId();
    try { storage?.setItem(KEY, id); } catch { /* storage blocked: id lasts for this session only */ }
  }
  return { kind: 'anonymous', id };
}

function safeLocalStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}
