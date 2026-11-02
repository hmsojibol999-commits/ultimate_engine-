import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useT } from '../core/i18n';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { StartMenu } from './StartMenu';
import { CommandPalette, type OverlayMode } from './CommandPalette';
import { NotificationCenter, ToastHost } from './NotificationCenter';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { isShortcutsKey } from './shortcutsLogic';
import { useShortcutsPanel } from '../core/shortcutsPanel';
import { useTour } from '../core/tour';
import { Wallpaper } from '../design/Wallpaper';
import { useWindows } from './windowStore';
import { useIsMobile } from './useIsMobile';

export function Desktop() {
  const { t } = useT();
  const mobile = useIsMobile();
  const { windows, snapPreview, open, cycle } = useWindows();
  const [startOpen, setStartOpen] = useState(false);
  const [overlay, setOverlay] = useState<OverlayMode | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  // Only one popup at a time: opening one closes the others.
  const showOverlay = (m: OverlayMode) => { setStartOpen(false); setNotifOpen(false); setOverlay((cur) => (cur === m ? null : m)); };
  const closeOverlay = useCallback(() => setOverlay(null), []);
  const closeNotif = useCallback(() => setNotifOpen(false), []);

  // Keep the layout above the on-screen keyboard (visualViewport) and use dvh as a fallback.
  useEffect(() => {
    const vv = window.visualViewport;
    const set = () => document.documentElement.style.setProperty('--vvh', `${vv ? vv.height : window.innerHeight}px`);
    set(); vv?.addEventListener('resize', set);
    return () => vv?.removeEventListener('resize', set);
  }, []);

  // Alt+Tab-like cycling without clashing with browser shortcuts: Ctrl+Alt+Left/Right.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); cycle(e.key === 'ArrowRight' ? 1 : -1); }
      // Ctrl/Cmd+K opens the command palette; Ctrl/Cmd+Shift+K opens global search.
      else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); showOverlay(e.shiftKey ? 'search' : 'palette'); }
      // "?" toggles the shortcuts overlay (F-28), but never while typing text and never during the guided tour.
      else if (isShortcutsKey(e, e.target as HTMLElement | null) && !useTour.getState().active) { e.preventDefault(); useShortcutsPanel.getState().toggle(); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showOverlay only uses stable setState functions
  }, [cycle]);

  const visibleCount = windows.filter((w) => !w.minimized).length;

  return (
    <div style={{ position: 'relative', width: '100%', height: 'var(--vvh, 100dvh)', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)' }}>
      <Wallpaper />
      <main style={{ position: 'absolute', inset: 0 }}>
        {visibleCount === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 'var(--sp-4)', textAlign: 'center' }}>
            <div className="sg-glass" style={{ borderRadius: 'var(--r-3)', padding: 'var(--sp-6)', maxWidth: 360 }}>
              <h1 style={{ margin: '0 0 var(--sp-2)', fontSize: 22 }}>{t('desktop.empty.title')}</h1>
              <p style={{ margin: '0 0 var(--sp-4)', color: 'var(--text-dim)' }}>{t('desktop.empty.body')}</p>
              <button className="sg-btn" onClick={() => open('welcome')}>{t('desktop.empty.cta')}</button>
            </div>
          </div>
        )}
        <AnimatePresence>
          {windows.map((w) => <Window key={w.id} win={w} mobile={mobile} />)}
        </AnimatePresence>
        {snapPreview && !mobile && (
          <motion.div aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sg-glass"
            style={{ position: 'absolute', left: 0, top: 0, width: snapPreview.w, height: snapPreview.h, transform: `translate3d(${snapPreview.x}px, ${snapPreview.y}px, 0)`, zIndex: 99999, pointerEvents: 'none', borderRadius: 'var(--r-3)', boxShadow: 'var(--glow)' }} />
        )}
      </main>
      <AnimatePresence>{startOpen && <StartMenu key="start" mobile={mobile} onClose={() => setStartOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{notifOpen && <NotificationCenter key="notif" mobile={mobile} onClose={closeNotif} />}</AnimatePresence>
      <AnimatePresence>{overlay && <CommandPalette key={overlay} mode={overlay} mobile={mobile} onClose={closeOverlay} />}</AnimatePresence>
      <ShortcutsOverlay />
      <ToastHost mobile={mobile} />
      <Taskbar mobile={mobile} startOpen={startOpen} onToggleStart={() => { setNotifOpen(false); setStartOpen((v) => !v); }}
        onSearch={() => showOverlay('search')} onPalette={() => showOverlay('palette')}
        onNotifications={() => { setStartOpen(false); setOverlay(null); setNotifOpen((v) => !v); }} />
    </div>
  );
}
