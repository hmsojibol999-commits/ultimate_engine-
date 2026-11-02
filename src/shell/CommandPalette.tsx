import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { commandItems, runCommand } from '../core/commands';
import { useT } from '../core/i18n';
import { useNotices } from '../core/notifications';
import { appForExtension, listApps } from '../core/registry';
import { rankItems, type SearchItem } from '../core/search';
import { extname, getVfs } from '../core/vfs';
import { Command as CommandIcon, getIcon, Search } from '../design/icons';
import { transition } from '../design/motion';
import { useWindows } from './windowStore';

export type OverlayMode = 'palette' | 'search';
const MAX_FILES = 500;
const KIND_KEY = { command: 'palette.kind.command', app: 'palette.kind.app', file: 'palette.kind.file' } as const;

/**
 * One overlay, two modes. Palette (F-09): commands + apps. Search (F-11): commands + apps + files from the VFS.
 * Keyboard: type, Up/Down, Enter runs, Esc closes. Focus returns to the previously focused element on close.
 */
export function CommandPalette({ mode, onClose, mobile }: { mode: OverlayMode; onClose: () => void; mobile: boolean }) {
  const { t, lang } = useT();
  const open = useWindows((s) => s.open);
  const push = useNotices((s) => s.push);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [files, setFiles] = useState<SearchItem[]>([]);
  const [filesState, setFilesState] = useState<'idle' | 'loading' | 'error'>(mode === 'search' ? 'loading' : 'idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<Element | null>(typeof document !== 'undefined' ? document.activeElement : null);

  // Focus the input now; hand focus back when the overlay closes.
  useEffect(() => {
    inputRef.current?.focus();
    const prev = returnFocus.current;
    return () => { if (prev instanceof HTMLElement) prev.focus(); };
  }, []);

  // Files are read from the VFS only in search mode, once per open.
  useEffect(() => {
    if (mode !== 'search') return;
    let cancelled = false;
    getVfs().allFiles().then((recs) => {
      if (cancelled) return;
      setFiles(recs.filter((r) => r.kind === 'file').slice(0, MAX_FILES).map((r) => ({ id: `file:${r.path}`, kind: 'file' as const, title: r.path.slice(r.path.lastIndexOf('/') + 1), subtitle: r.path })));
      setFilesState('idle');
    }).catch(() => { if (!cancelled) setFilesState('error'); });
    return () => { cancelled = true; };
  }, [mode]);

  const items = useMemo<SearchItem[]>(() => [
    ...commandItems(lang),
    ...listApps().map((a) => ({ id: `app:${a.id}`, kind: 'app' as const, title: a.names[lang], subtitle: a.description[lang], keywords: [...a.keywords, a.names.en, a.names.bn] })),
    ...files,
  ], [lang, files]);

  const results = useMemo(() => rankItems(query, items, 8), [query, items]);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const choose = (id: string, kind: SearchItem['kind']) => {
    if (kind === 'app') { open(id.slice(4)); onClose(); return; }
    if (kind === 'file') {
      const path = id.slice(5);
      const app = appForExtension(extname(path));
      if (app) { open(app.id, path); onClose(); } else push('info', t('search.noApp'));
      return;
    }
    onClose();
    void runCommand(id).then((r) => { if (!r.ok) push('error', r.error); });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (results.length ? (i + 1) % results.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0)); }
    else if (e.key === 'Enter') { const r = results[active]; if (r) { e.preventDefault(); choose(r.id, r.kind); } }
    else if (e.key === 'Tab') { e.preventDefault(); } // simple focus trap: the input is the only tab stop
  };

  const title = t(mode === 'search' ? 'search.title' : 'palette.title');
  const HeadIcon = mode === 'search' ? Search : CommandIcon;

  return (
    <div onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'absolute', inset: 0, zIndex: 100002, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: mobile ? 'calc(env(safe-area-inset-top) + 8px)' : '12vh', background: 'rgba(0,0,0,0.45)' }}>
      <motion.div role="dialog" aria-modal="true" aria-label={title} className="sg-glass"
        initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1, transition: transition.base }} exit={{ opacity: 0, transition: transition.fast }}
        style={{ width: mobile ? 'calc(100% - 16px)' : 560, maxHeight: mobile ? '70%' : '60%', display: 'flex', flexDirection: 'column', borderRadius: 'var(--r-3)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: '0 var(--sp-3)', borderBottom: '1px solid var(--border)' }}>
          <HeadIcon size={18} aria-hidden />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
            role="combobox" aria-expanded="true" aria-controls="sg-palette-list" aria-autocomplete="list"
            aria-activedescendant={results[active] ? `sg-opt-${active}` : undefined}
            aria-label={title} placeholder={t(mode === 'search' ? 'search.placeholder' : 'palette.placeholder')}
            autoComplete="off" autoCapitalize="off" spellCheck={false}
            style={{ flex: 1, minHeight: 48, background: 'transparent', border: 'none', color: 'var(--text)', font: 'inherit', fontSize: 16, outline: 'none' }} />
        </div>
        <ul id="sg-palette-list" ref={listRef} role="listbox" aria-label={title} style={{ listStyle: 'none', margin: 0, padding: 'var(--sp-2)', overflow: 'auto' }}>
          {results.map((r, i) => {
            const Icon = r.kind === 'app' ? getIcon(listApps().find((a) => `app:${a.id}` === r.id)?.icon ?? '') : r.kind === 'command' ? CommandIcon : Search;
            return (
              <li key={r.id} id={`sg-opt-${i}`} role="option" aria-selected={i === active}
                onPointerMove={() => setActive(i)} onClick={() => choose(r.id, r.kind)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minHeight: 44, padding: '0 var(--sp-3)', borderRadius: 'var(--r-2)', cursor: 'pointer', background: i === active ? 'var(--bg-2)' : 'transparent', boxShadow: i === active ? 'var(--glow)' : undefined }}>
                <Icon size={16} aria-hidden />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                  {r.subtitle && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subtitle}</span>}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t(KIND_KEY[r.kind])}</span>
              </li>
            );
          })}
          {results.length === 0 && <li role="presentation" style={{ padding: 'var(--sp-4)', color: 'var(--text-dim)', textAlign: 'center' }}>{t('palette.empty')}</li>}
        </ul>
        <div aria-live="polite" style={{ padding: 'var(--sp-2) var(--sp-3)', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-dim)' }}>
          {filesState === 'loading' ? t('search.loadingFiles') : filesState === 'error' ? t('search.filesError') : mobile ? '' : t('palette.hint')}
        </div>
      </motion.div>
    </div>
  );
}
