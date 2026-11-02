import { Suspense, useRef } from 'react';
import { motion } from 'motion/react';
import { useT } from '../core/i18n';
import { getApp, getAppComponent } from '../core/registry';
import { getIcon, X, Minus, Square, Copy, PanelLeft, PanelRight } from '../design/icons';
import { windowVariants } from '../design/motion';
import { ErrorBoundary } from './ErrorBoundary';
import { snapZone, snapRect, resizeRect, keyboardRect, snapAction, showSnapButtons, type Rect } from './windowLogic';
import { useWindows, viewport, type Win } from './windowStore';
import { swipeHandlers } from './useIsMobile';

const HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;
// Desktop title-bar buttons are 36px wide (WCAG 2.5.8 needs 24px) so five of them fit in the narrowest window; phones keep 44px.
const titleBtn: React.CSSProperties = { padding: 0, minWidth: 36 };
const CURSOR: Record<string, string> = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };

export function Window({ win, mobile }: { win: Win; mobile: boolean }) {
  const { t, lang } = useT();
  const store = useWindows();
  const focused = store.focusedId === win.id;
  const app = getApp(win.appId);
  const App = getAppComponent(win.appId);
  const drag = useRef<{ px: number; py: number; start: Rect } | null>(null);
  if (!app || !App) return null;
  const Icon = getIcon(app.icon);
  const title = app.names[lang];

  // On phones only the focused, non-minimized card is shown; others stay mounted to keep their state.
  const hiddenOnMobile = mobile && (!focused || win.minimized);
  const animate = win.minimized ? 'minimized' : 'visible';

  const onTitleDown = (e: React.PointerEvent) => {
    store.focus(win.id);
    if (mobile || win.maximized || (e.target as HTMLElement).closest('button')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, start: win.rect };
  };
  const onTitleMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    store.setRect(win.id, { ...d.start, x: d.start.x + e.clientX - d.px, y: d.start.y + e.clientY - d.py });
    const zone = snapZone(e.clientX, e.clientY, viewport());
    store.setSnapPreview(zone ? snapRect(zone, viewport()) : null);
  };
  const onTitleUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    const zone = snapZone(e.clientX, e.clientY, viewport());
    if (zone) store.snap(win.id, zone); else store.setSnapPreview(null);
  };

  // Keyboard (F-05, F-28): with the title bar itself focused, arrows move the window and Shift + arrows resize it.
  // A maximized window ignores the keys, like dragging does; the restore button brings it back.
  const onTitleKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (mobile || win.maximized || e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    const next = keyboardRect(win.rect, e.key, e.shiftKey, viewport());
    if (!next) return;
    e.preventDefault();
    store.setRect(win.id, next);
  };
  const snapButton = (side: 'left' | 'right') => {
    if (snapAction(win, side) === 'restore') store.toggleMaximize(win.id); else store.snap(win.id, side);
  };

  const startResize = (handle: string) => (e: React.PointerEvent) => {
    e.stopPropagation(); store.focus(win.id);
    const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId);
    const px = e.clientX, py = e.clientY, start = win.rect;
    const move = (ev: PointerEvent) => store.setRect(win.id, resizeRect(start, handle, ev.clientX - px, ev.clientY - py));
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  };

  const swipe = swipeHandlers(() => store.cycle(1), () => store.cycle(-1));
  const frame: React.CSSProperties = mobile
    ? { position: 'absolute', inset: `0 0 var(--switcher-h) 0`, zIndex: win.z, display: hiddenOnMobile ? 'none' : 'block' }
    : { position: 'absolute', left: 0, top: 0, width: win.rect.w, height: win.rect.h, transform: `translate3d(${win.rect.x}px, ${win.rect.y}px, 0)`, zIndex: win.z, pointerEvents: win.minimized ? 'none' : 'auto' };

  return (
    <div style={frame} aria-hidden={win.minimized || hiddenOnMobile}>
      <motion.section
        role="dialog" aria-label={title} aria-modal={false}
        className="sg-glass"
        style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: mobile ? 0 : 'var(--r-3)', overflow: 'hidden', boxShadow: focused ? 'var(--glow)' : 'none' }}
        variants={windowVariants} initial="hidden" animate={animate} exit="exit"
        onPointerDownCapture={() => { if (!focused) store.focus(win.id); }}
      >
        <header
          onPointerDown={onTitleDown} onPointerMove={onTitleMove} onPointerUp={onTitleUp}
          {...(mobile ? {} : { tabIndex: 0, role: 'group', 'aria-label': t('window.titleBar', { title }), onKeyDown: onTitleKey })}
          onDoubleClick={() => !mobile && store.toggleMaximize(win.id)}
          {...(mobile ? swipe : {})}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minHeight: 44, padding: '0 var(--sp-2) 0 var(--sp-3)', touchAction: 'none', userSelect: 'none', cursor: mobile ? 'default' : 'grab', opacity: focused ? 1 : 0.7, borderBottom: '1px solid var(--border)' }}
        >
          <Icon size={16} aria-hidden />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{title}</span>
          {!mobile && <>
            {showSnapButtons(win.rect.w) && <>
              <button className="sg-btn" aria-label={t('window.snapLeft')} aria-pressed={win.snapped === 'left'} onClick={() => snapButton('left')} style={titleBtn}><PanelLeft size={16} aria-hidden /></button>
              <button className="sg-btn" aria-label={t('window.snapRight')} aria-pressed={win.snapped === 'right'} onClick={() => snapButton('right')} style={titleBtn}><PanelRight size={16} aria-hidden /></button>
            </>}
            <button className="sg-btn" aria-label={t('window.minimize')} onClick={() => store.minimize(win.id)} style={titleBtn}><Minus size={16} /></button>
            <button className="sg-btn" aria-label={win.maximized ? t('window.restore') : t('window.maximize')} onClick={() => store.toggleMaximize(win.id)} style={titleBtn}>
              {win.maximized ? <Copy size={14} /> : <Square size={14} />}
            </button>
          </>}
          <button className="sg-btn" aria-label={t('window.close')} onClick={() => store.close(win.id)} style={mobile ? { padding: 0 } : titleBtn}><X size={16} /></button>
        </header>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', opacity: focused ? 1 : 0.9 }}>
          <ErrorBoundary title={t('window.error.title')} body={t('window.error.body')} reloadLabel={t('window.error.reload')}>
            <Suspense fallback={<div style={{ padding: 'var(--sp-4)', color: 'var(--text-dim)' }} role="status">{t('window.loading')}</div>}>
              <App windowId={win.id} file={win.file} />
            </Suspense>
          </ErrorBoundary>
        </div>
        {!mobile && !win.maximized && HANDLES.map((h) => (
          <div key={h} onPointerDown={startResize(h)} aria-hidden
            style={{ position: 'absolute', cursor: CURSOR[h], touchAction: 'none',
              ...(h.includes('n') ? { top: 0 } : h.includes('s') ? { bottom: 0 } : { top: 10, bottom: 10 }),
              ...(h.includes('w') ? { left: 0 } : h.includes('e') ? { right: 0 } : { left: 10, right: 10 }),
              width: h.length === 2 || h === 'e' || h === 'w' ? 8 : undefined, height: h.length === 2 || h === 'n' || h === 's' ? 8 : undefined }} />
        ))}
      </motion.section>
    </div>
  );
}
