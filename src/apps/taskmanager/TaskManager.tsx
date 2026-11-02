import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useT } from '../../core/i18n';
import { getApp, type AppProps } from '../../core/registry';
import { useSettings } from '../../core/settings';
import { FpsMeter, fpsLevel, formatBytes, readMemory, readStorage, shouldSample, type MemoryInfo, type StorageInfo } from '../../core/taskStats';
import { getVfs } from '../../core/vfs';
import { useIsMobile } from '../../shell/useIsMobile';
import { useWindows } from '../../shell/windowStore';
import type { StringKey } from '../../content/strings.en';

const dim = { color: 'var(--text-dim)', fontSize: 13 } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} style={{ display: 'grid', gap: 'var(--sp-1)' }}>
      <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
      {children}
    </section>
  );
}

/** Task manager (F-23). Every number comes from a real measurement; anything the browser hides says so. */
export default function TaskManager({ windowId }: AppProps) {
  const { t, lang } = useT();
  const windows = useWindows((s) => s.windows);
  const focusedId = useWindows((s) => s.focusedId);
  const close = useWindows((s) => s.close);
  const lowPower = useSettings((s) => s.lowPower);
  const update = useSettings((s) => s.update);
  const mobile = useIsMobile();

  const me = windows.find((w) => w.id === windowId);
  const [fps, setFps] = useState<number | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [filesBytes, setFilesBytes] = useState<number | null>(null);
  const [filesError, setFilesError] = useState(false);
  const [tabHidden, setTabHidden] = useState(() => (typeof document === 'undefined' ? false : document.hidden));
  const meter = useRef(new FpsMeter());

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const vis = () => setTabHidden(document.hidden);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); document.removeEventListener('visibilitychange', vis); };
  }, []);

  const running = shouldSample({ minimized: me?.minimized ?? false, hiddenOnMobile: mobile && focusedId !== windowId, tabHidden });

  // Frame rate: one rAF loop, state updated once per second (not every frame).
  useEffect(() => {
    if (!running) { meter.current.reset(); return; }
    let raf = 0;
    const loop = (now: number) => { meter.current.push(now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const tick = window.setInterval(() => setFps(meter.current.fps()), 1000);
    return () => { cancelAnimationFrame(raf); window.clearInterval(tick); };
  }, [running]);

  // Memory, browser storage and file size: every 3 seconds while visible.
  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const read = async () => {
      setMemory(readMemory(performance));
      try { const est = await navigator.storage?.estimate?.(); if (!cancelled) setStorage(readStorage(est)); } catch { if (!cancelled) setStorage(null); }
      try { const n = await getVfs().usage(); if (!cancelled) { setFilesBytes(n); setFilesError(false); } } catch { if (!cancelled) setFilesError(true); }
    };
    void read();
    const id = window.setInterval(() => { void read(); }, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [running]);

  const level = fpsLevel(fps);
  const showLowHint = level === 'low' && !lowPower;

  return (
    <div style={{ padding: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-4)', alignContent: 'start' }}>
      <Section title={t('tm.fps')}>
        <div role="status" aria-live="polite" style={{ fontSize: 22, fontWeight: 700 }}>
          {fps === null ? t('tm.fps.measuring') : t('tm.fps.value', { n: fps })}
          {level && <span style={{ ...dim, marginInlineStart: 'var(--sp-2)' }}>{t(`tm.level.${level}` as StringKey)}</span>}
        </div>
        {showLowHint && (
          <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            <span style={{ color: 'var(--warning)' }}>{t('tm.lowPowerHint')}</span>
            <button className="sg-btn" onClick={() => update({ lowPower: true })} style={{ justifySelf: 'start' }}>{t('tm.lowPowerOn')}</button>
          </div>
        )}
      </Section>

      <Section title={t('tm.storage')}>
        <span>{filesError ? t('tm.storage.filesError') : filesBytes === null ? t('tm.fps.measuring') : t('tm.storage.files', { size: formatBytes(filesBytes) })}</span>
        <span style={dim}>
          {storage
            ? t('tm.storage.browser', { used: formatBytes(storage.used), quota: formatBytes(storage.quota), pct: storage.percent ?? 0 })
            : t('tm.storage.unavailable')}
        </span>
      </Section>

      <Section title={t('tm.connection')}>
        <span role="status" style={{ color: online ? 'var(--success)' : 'var(--warning)' }}>{online ? t('tm.online') : t('tm.offline')}</span>
      </Section>

      <Section title={t('tm.memory')}>
        <span style={memory ? undefined : dim}>
          {memory ? t('tm.memory.value', { used: formatBytes(memory.used), limit: formatBytes(memory.limit) }) : t('tm.memory.unavailable')}
        </span>
      </Section>

      <Section title={t('tm.windows', { n: windows.length })}>
        {windows.length === 0 ? (
          <span style={dim}>{t('tm.windows.empty')}</span>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-1)' }}>
            {windows.map((w) => (
              <li key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', justifyContent: 'space-between', minHeight: 44 }}>
                <span>
                  {getApp(w.appId)?.names[lang] ?? w.appId}
                  <span style={{ ...dim, marginInlineStart: 'var(--sp-2)' }}>{w.minimized ? t('tm.windows.minimized') : t('tm.windows.running')}</span>
                </span>
                <button className="sg-btn" onClick={() => close(w.id)}>{t('tm.windows.end')}</button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
