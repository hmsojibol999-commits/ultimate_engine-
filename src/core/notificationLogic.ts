/** Pure notification logic (F-10). The Zustand store in notifications.ts wraps these functions. */
export type NoticeKind = 'info' | 'success' | 'warning' | 'error';

export interface Notice { id: string; kind: NoticeKind; text: string; at: number; read: boolean }

export const MAX_NOTICES = 50;
export const MAX_TOASTS = 3;
export const DEDUPE_MS = 3000;

const clean = (text: string): string => text.trim().slice(0, 300);

/** Newest first. An identical notice (same kind and text) within DEDUPE_MS is ignored. Capped at MAX_NOTICES. Empty text is ignored. */
export function addNotice(list: Notice[], input: { kind: NoticeKind; text: string }, now: number, id: string): { list: Notice[]; added: Notice | null } {
  const text = clean(input.text);
  if (text === '') return { list, added: null };
  const dup = list.find((n) => n.kind === input.kind && n.text === text && now - n.at < DEDUPE_MS);
  if (dup) return { list, added: null };
  const added: Notice = { id, kind: input.kind, text, at: now, read: false };
  return { list: [added, ...list].slice(0, MAX_NOTICES), added };
}

export const markAllRead = (list: Notice[]): Notice[] => (list.some((n) => !n.read) ? list.map((n) => (n.read ? n : { ...n, read: true })) : list);
export const removeNotice = (list: Notice[], id: string): Notice[] => list.filter((n) => n.id !== id);
export const unreadCount = (list: Notice[]): number => list.filter((n) => !n.read).length;

/** Visible toasts, oldest first. When more than MAX_TOASTS arrive, the oldest toast is dropped from view. */
export const pushToast = (toasts: Notice[], n: Notice): Notice[] => [...toasts, n].slice(-MAX_TOASTS);
export const dismissToast = (toasts: Notice[], id: string): Notice[] => toasts.filter((t) => t.id !== id);

/** How long a toast stays on screen. Errors stay longer so they can be read. */
export const toastLifetimeMs = (kind: NoticeKind): number => (kind === 'error' ? 8000 : kind === 'warning' ? 6000 : 4000);
