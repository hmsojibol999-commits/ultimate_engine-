import { create } from 'zustand';
import { emit, on } from './eventBus';
import { addNotice, dismissToast, markAllRead, pushToast, removeNotice, toastLifetimeMs, type Notice, type NoticeKind } from './notificationLogic';

interface NoticeStore {
  notices: Notice[];
  toasts: Notice[];
  push: (kind: NoticeKind, text: string) => void;
  dismissToast: (id: string) => void;
  remove: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

let seq = 0;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Notification history lives in memory for the session (not persisted on purpose: it may hold file names). */
export const useNotices = create<NoticeStore>((set, get) => ({
  notices: [], toasts: [],
  push: (kind, text) => {
    const { list, added } = addNotice(get().notices, { kind, text }, Date.now(), `n${++seq}`);
    if (!added) return;
    set({ notices: list, toasts: pushToast(get().toasts, added) });
    if (kind === 'success') emit('character:cue', { cue: 'success' });
    else if (kind === 'error') emit('character:cue', { cue: 'error' });
    else if (kind === 'warning') emit('character:cue', { cue: 'warning' });
    timers.set(added.id, setTimeout(() => get().dismissToast(added.id), toastLifetimeMs(kind)));
  },
  dismissToast: (id) => {
    const t = timers.get(id); if (t) { clearTimeout(t); timers.delete(id); }
    set({ toasts: dismissToast(get().toasts, id) });
  },
  remove: (id) => set({ notices: removeNotice(get().notices, id), toasts: dismissToast(get().toasts, id) }),
  markAllRead: () => set({ notices: markAllRead(get().notices) }),
  clear: () => { timers.forEach(clearTimeout); timers.clear(); set({ notices: [], toasts: [] }); },
}));

/** Anything can emit a 'toast' event on the bus; this turns it into a notification. Call once at startup. */
export function connectToastBus(): () => void {
  return on('toast', ({ kind, text }) => useNotices.getState().push(kind, text));
}
