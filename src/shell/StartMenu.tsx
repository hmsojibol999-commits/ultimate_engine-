import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { motion } from 'motion/react';
import type { StringKey } from '../content/strings.en';
import { PROFILE, isPlaceholder } from '../config/profile';
import { SITE } from '../config/site';
import { contactLinks } from '../core/contact';
import { useT } from '../core/i18n';
import { useNotices } from '../core/notifications';
import { appForExtension, getApp, listApps } from '../core/registry';
import { extname, getVfs } from '../core/vfs';
import { getIcon } from '../design/icons';
import { transition } from '../design/motion';
import {
  CATEGORY_LABEL, agoParts, buildAboutCard, groupApps, hasHireContacts, moveIndex, pickRecentFiles, trapTab,
  type AgoUnit, type ContactKind, type RecentFile,
} from './startMenuLogic';
import { useWindows } from './windowStore';

const AGO_KEY: Record<AgoUnit, StringKey> = { now: 'start.ago.now', min: 'start.ago.min', hour: 'start.ago.hour', day: 'start.ago.day' };
const CONTACT_KEY: Record<ContactKind, StringKey> = {
  whatsapp: 'start.contact.whatsapp', telegram: 'start.contact.telegram', email: 'start.contact.email', github: 'start.contact.github',
};

type RecentState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; files: RecentFile[]; at: number };

const itemStyle: CSSProperties = { width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' };
const headingStyle: CSSProperties = { margin: 0, padding: 'var(--sp-2) var(--sp-2) var(--sp-1)', fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--text-dim)' };
const dimStyle: CSSProperties = { fontSize: 12, color: 'var(--text-dim)' };
const noteStyle: CSSProperties = { ...dimStyle, margin: 0, padding: 'var(--sp-2)' };

/**
 * Start menu (F-08): apps by category, recent files, About/Hire card (F-26), Help and Privacy links.
 * Keyboard (F-28): focus moves into the menu on open, Up/Down/Home/End move between items, Tab wraps (focus trap),
 * Esc closes and hands focus back to the Start button. The body scrolls; the About card stays pinned at the bottom.
 */
export function StartMenu({ onClose, mobile }: { onClose: () => void; mobile: boolean }) {
  const { t, lang } = useT();
  const open = useWindows((s) => s.open);
  const push = useNotices((s) => s.push);
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const [recent, setRecent] = useState<RecentState>({ status: 'loading' });

  useEffect(() => { closeRef.current = onClose; });

  const groups = useMemo(() => groupApps(listApps(), lang), [lang]);
  const card = useMemo(() => buildAboutCard(PROFILE, contactLinks(), isPlaceholder), []);
  const helpApp = getApp('help');
  const legalApp = getApp('legal');

  const items = (): HTMLElement[] => Array.from(ref.current?.querySelectorAll<HTMLElement>('[data-start-item]') ?? []);

  // Recent files: read once per open (same cost as global search). Folders are ignored.
  useEffect(() => {
    let cancelled = false;
    getVfs().allFiles()
      .then((recs) => { if (!cancelled) setRecent({ status: 'ready', files: pickRecentFiles(recs), at: Date.now() }); })
      .catch(() => { if (!cancelled) setRecent({ status: 'error' }); });
    return () => { cancelled = true; };
  }, []);

  // Focus the first item on open; Esc closes and returns focus to the Start button; a click outside closes.
  useEffect(() => {
    items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      closeRef.current();
      document.querySelector<HTMLElement>('[data-start-button]')?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(target) && !target.closest('[data-start-button]')) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, []);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    const list = items();
    const active = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Tab') {
      const target = trapTab(active, list.length, e.shiftKey);
      if (target !== null) { e.preventDefault(); list[target]?.focus(); }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      list[moveIndex(active, list.length, e.key)]?.focus();
    }
  };

  const openApp = (id: string) => { open(id); onClose(); };
  const openFile = (path: string) => {
    const app = appForExtension(extname(path));
    if (app) { open(app.id, path); onClose(); } else push('info', t('search.noApp'));
  };

  return (
    <motion.div ref={ref} role="dialog" aria-label={t('taskbar.start')} className="sg-glass" onKeyDown={onKeyDown}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: transition.base }} exit={{ opacity: 0, y: 8, transition: transition.fast }}
      style={{
        position: 'absolute', zIndex: 100000, left: 8, bottom: `calc(${mobile ? 'var(--switcher-h)' : 'var(--taskbar-h)'} + 8px)`,
        width: mobile ? 'calc(100% - 16px)' : 340, maxHeight: mobile ? '70%' : '60%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'var(--r-3)',
      }}>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: 'var(--sp-2)' }}>
        {groups.map((g) => (
          <section key={g.category} aria-labelledby={`start-cat-${g.category}`}>
            <h2 id={`start-cat-${g.category}`} style={headingStyle}>{t(CATEGORY_LABEL[g.category])}</h2>
            {g.apps.map((a) => {
              const Icon = getIcon(a.icon);
              return (
                <button key={a.id} data-start-item className="sg-btn" style={itemStyle} onClick={() => openApp(a.id)}>
                  <Icon size={18} aria-hidden />
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontWeight: 600 }}>{a.names[lang]}</span>
                    <span style={{ display: 'block', ...dimStyle }}>{a.description[lang]}</span>
                  </span>
                </button>
              );
            })}
          </section>
        ))}

        <section aria-labelledby="start-recent">
          <h2 id="start-recent" style={headingStyle}>{t('start.recent')}</h2>
          {recent.status === 'loading' && <p role="status" style={noteStyle}>{t('start.recent.loading')}</p>}
          {recent.status === 'error' && <p role="alert" style={noteStyle}>{t('start.recent.error')}</p>}
          {recent.status === 'ready' && recent.files.length === 0 && <p style={noteStyle}>{t('start.recent.empty')}</p>}
          {recent.status === 'ready' && recent.files.map((f) => {
            const Icon = getIcon(appForExtension(extname(f.path))?.icon ?? 'AppWindow');
            const ago = agoParts(f.mtime, recent.at);
            return (
              <button key={f.path} data-start-item className="sg-btn" style={itemStyle} title={f.path} onClick={() => openFile(f.path)}>
                <Icon size={18} aria-hidden />
                <span style={{ textAlign: 'left', minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ display: 'block', ...dimStyle }}>{f.dir} · {t(AGO_KEY[ago.unit], { n: ago.n })}</span>
                </span>
              </button>
            );
          })}
        </section>
      </div>

      <div style={{ flex: '0 0 auto', borderTop: '1px solid var(--border)', padding: 'var(--sp-3)', display: 'grid', gap: 'var(--sp-2)' }}>
        <section aria-label={t('start.about.label')} style={{ display: 'grid', gap: 2 }}>
          <div style={{ fontWeight: 600 }}>{card.name ? t('boot.credit', { name: card.name }) : t('app.name')}</div>
          <div style={dimStyle}>{card.tagline ?? t('start.about.tagline')}</div>
          <div style={{ ...dimStyle, fontSize: 11 }}>{t('start.about.version', { v: SITE.VERSION })}</div>
          {card.buttons.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
              {hasHireContacts(card) && <div style={{ fontSize: 13 }}>{t('start.hire.title')}</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                {card.buttons.map((b) => (
                  <a key={b.kind} data-start-item className="sg-btn" href={b.href} style={{ textDecoration: 'none' }}
                    {...(b.href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {t(CONTACT_KEY[b.kind])}
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
        {(helpApp?.enabled || legalApp?.enabled) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            {helpApp?.enabled && <button data-start-item className="sg-btn" onClick={() => openApp('help')}>{t('help.title')}</button>}
            {legalApp?.enabled && <button data-start-item className="sg-btn" onClick={() => openApp('legal')}>{t('legal.title')}</button>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
