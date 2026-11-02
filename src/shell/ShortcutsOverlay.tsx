import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SHORTCUTS } from '../content/shortcuts';
import { useT } from '../core/i18n';
import { useShortcutsPanel } from '../core/shortcutsPanel';
import { X } from '../design/icons';
import { transition } from '../design/motion';
import { trapTabKey } from './focusTrap';

const kbd = { border: '1px solid var(--border)', borderRadius: 'var(--r-1)', padding: '2px 6px', fontSize: 12, fontFamily: 'var(--font-mono)' } as const;

/** Keyboard shortcuts overlay (F-28). Opens with "?" or the palette command; reads the one real list in content/shortcuts.ts. */
export function ShortcutsOverlay() {
  const open = useShortcutsPanel((s) => s.open);
  return <AnimatePresence>{open && <ShortcutsDialog key="shortcuts" />}</AnimatePresence>;
}

function ShortcutsDialog() {
  const { t } = useT();
  const hide = useShortcutsPanel((s) => s.hide);
  const ref = useRef<HTMLDivElement>(null);

  // Focus moves into the dialog on open and returns to where it was on close. Esc closes it ("?" toggles it in Desktop.tsx).
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); hide(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus(); };
  }, [hide]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1, transition: transition.fast }} exit={{ opacity: 0, transition: transition.fast }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) hide(); }}
      style={{ position: 'absolute', inset: 0, zIndex: 100010, display: 'grid', placeItems: 'center', padding: 'var(--sp-3)', background: 'rgba(0,0,0,0.5)' }}
    >
      <motion.div
        ref={ref} role="dialog" aria-modal="true" aria-labelledby="sg-shortcuts-title" className="sg-glass" tabIndex={-1}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: transition.base }} exit={{ opacity: 0, y: 8, transition: transition.fast }}
        onKeyDown={(e) => { if (ref.current) trapTabKey(e, ref.current); }}
        style={{ width: 'min(520px, 100%)', maxHeight: '80%', display: 'flex', flexDirection: 'column', borderRadius: 'var(--r-3)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3) var(--sp-2) var(--sp-4)', borderBottom: '1px solid var(--border)' }}>
          <h2 id="sg-shortcuts-title" style={{ margin: 0, fontSize: 17 }}>{t('shortcuts.title')}</h2>
          <button className="sg-btn" aria-label={t('window.close')} onClick={hide} style={{ padding: 0 }}><X size={16} aria-hidden /></button>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 'var(--sp-3) var(--sp-4)', display: 'grid', gap: 'var(--sp-3)', overflow: 'auto' }}>
          {SHORTCUTS.map((s) => (
            <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{t(s.label)}</span>
              <span style={{ display: 'flex', gap: 4 }}>{s.keys.map((k) => <kbd key={k} style={kbd}>{k}</kbd>)}</span>
            </li>
          ))}
        </ul>
        <p style={{ margin: 0, padding: 'var(--sp-2) var(--sp-4)', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-dim)' }}>{t('shortcuts.hint')}</p>
      </motion.div>
    </motion.div>
  );
}
