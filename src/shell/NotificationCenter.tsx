import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useT } from '../core/i18n';
import { useNotices } from '../core/notifications';
import type { Notice, NoticeKind } from '../core/notificationLogic';
import { AlertTriangle, Bell, CheckCircle2, Info, Trash2, X, XCircle } from '../design/icons';
import { toastVariants, transition } from '../design/motion';
import { focusableIn, trapTabKey } from './focusTrap';

const KIND_ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle } as const;
const KIND_COLOR: Record<NoticeKind, string> = { info: 'var(--accent)', success: 'var(--success)', warning: 'var(--warning)', error: 'var(--danger)' };
const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Row({ n, onRemove }: { n: Notice; onRemove: () => void }) {
  const { t } = useT();
  const Icon = KIND_ICON[n.kind];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-2)', opacity: n.read ? 0.75 : 1 }}>
      <Icon size={18} aria-hidden style={{ color: KIND_COLOR[n.kind], flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ overflowWrap: 'anywhere' }}>{n.text}</div>
        <time dateTime={new Date(n.at).toISOString()} style={{ fontSize: 12, color: 'var(--text-dim)' }}>{time(n.at)}</time>
      </div>
      <button className="sg-btn" aria-label={t('notif.dismiss')} onClick={onRemove} style={{ border: 'none', background: 'transparent', padding: 0 }}><X size={16} aria-hidden /></button>
    </div>
  );
}

/** Notification history panel (F-10). Opening it marks everything as read. */
export function NotificationCenter({ onClose, mobile }: { onClose: () => void; mobile: boolean }) {
  const { t } = useT();
  const { notices, remove, markAllRead, clear } = useNotices();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markAllRead();
    // First enabled control, or the panel itself when it is empty ("Clear all" is disabled then).
    const panel = ref.current;
    if (panel) (focusableIn(panel)[0] ?? panel).focus();
    // Esc closes the panel and hands focus back to the taskbar button (F-28).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onClose();
      document.querySelector<HTMLElement>('[data-notif-button]')?.focus();
    };
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-notif-button]')) onClose(); };
    document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [onClose, markAllRead]);

  return (
    <motion.div ref={ref} role="dialog" aria-label={t('notif.title')} className="sg-glass" tabIndex={-1}
      onKeyDown={(e) => { if (ref.current) trapTabKey(e, ref.current); }}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: transition.base }} exit={{ opacity: 0, y: 8, transition: transition.fast }}
      style={{ position: 'absolute', zIndex: 100000, right: 8, bottom: `calc(${mobile ? 'var(--switcher-h)' : 'var(--taskbar-h)'} + 8px)`, width: mobile ? 'calc(100% - 16px)' : 360, maxHeight: '60%', display: 'flex', flexDirection: 'column', borderRadius: 'var(--r-3)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-2) var(--sp-3)', borderBottom: '1px solid var(--border)' }}>
        <strong>{t('notif.title')}</strong>
        <button className="sg-btn" onClick={clear} disabled={notices.length === 0} style={{ border: 'none', background: 'transparent', padding: '0 var(--sp-2)' }}><Trash2 size={16} aria-hidden />{t('notif.clear')}</button>
      </div>
      <div style={{ overflow: 'auto', padding: 'var(--sp-2)' }}>
        {notices.length === 0
          ? <p style={{ margin: 0, padding: 'var(--sp-6) var(--sp-4)', textAlign: 'center', color: 'var(--text-dim)' }}><Bell size={20} aria-hidden style={{ display: 'block', margin: '0 auto var(--sp-2)' }} />{t('notif.empty')}</p>
          : notices.map((n) => <Row key={n.id} n={n} onRemove={() => remove(n.id)} />)}
      </div>
    </motion.div>
  );
}

/** Short-lived toasts. Errors use role="alert"; everything else is a polite status. Never steals focus. */
export function ToastHost({ mobile }: { mobile: boolean }) {
  const { t } = useT();
  const { toasts, dismissToast } = useNotices();
  return (
    <div style={{ position: 'absolute', zIndex: 100003, top: 'calc(env(safe-area-inset-top) + 8px)', right: mobile ? 8 : 12, left: mobile ? 8 : undefined, width: mobile ? undefined : 340, display: 'grid', gap: 'var(--sp-2)', pointerEvents: 'none' }}>
      <AnimatePresence>
        {toasts.map((n) => {
          const Icon = KIND_ICON[n.kind];
          return (
            <motion.div key={n.id} layout variants={toastVariants} initial="hidden" animate="visible" exit="exit" role={n.kind === 'error' ? 'alert' : 'status'} className="sg-glass"
              style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-3)', borderLeft: `3px solid ${KIND_COLOR[n.kind]}` }}>
              <Icon size={18} aria-hidden style={{ color: KIND_COLOR[n.kind], flexShrink: 0 }} />
              <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{n.text}</span>
              <button className="sg-btn" aria-label={t('notif.dismiss')} onClick={() => dismissToast(n.id)} style={{ border: 'none', background: 'transparent', padding: 0 }}><X size={16} aria-hidden /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
