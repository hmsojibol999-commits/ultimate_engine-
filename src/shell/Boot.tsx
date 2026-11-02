import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useT } from '../core/i18n';
import { getVfs } from '../core/vfs';
import { getApp, listApps } from '../core/registry';
import { useNotices } from '../core/notifications';
import { PROFILE, isPlaceholder } from '../config/profile';
import { SITE } from '../config/site';
import { BOOT_STEPS, bootDuration, bootFinished, hasBootedBefore, markBooted, stepSchedule, visibleSteps, type BootStepId } from '../core/boot';
import { transition } from '../design/motion';

/** Boot screen (F-21). Lines appear only after the real step finished: the VFS opens and the app list loads. */
export function Boot({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<ReadonlySet<BootStepId>>(new Set());

  const total = useMemo(() => {
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const repeat = hasBootedBefore(typeof localStorage === 'undefined' ? undefined : localStorage);
    return bootDuration(repeat, reduced);
  }, []);
  const schedule = useMemo(() => stepSchedule(total), [total]);

  // Real work: open the VFS and make sure the app list and the first app chunk load.
  useEffect(() => {
    let cancelled = false;
    const markDone = (id: BootStepId) => { if (!cancelled) setDone((d) => new Set(d).add(id)); };
    getVfs().stat('/')
      .catch(() => { useNotices.getState().push('warning', t('boot.vfsFailed')); })
      .finally(() => markDone('vfs'));
    Promise.resolve()
      .then(() => { listApps(); return getApp('welcome')?.load(); })
      .catch(() => undefined) // a failed preload only means the app loads later; it must not hang the boot
      .finally(() => markDone('modules'));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once at startup
  }, []);

  // Clock for the line schedule.
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - start), 50);
    return () => window.clearInterval(id);
  }, []);

  const finished = bootFinished(elapsed, total, done);
  const finish = useCallback(() => { markBooted(typeof localStorage === 'undefined' ? undefined : localStorage); onDone(); }, [onDone]);
  useEffect(() => { if (finished) finish(); }, [finished, finish]);

  const lines = visibleSteps(elapsed, schedule, done);
  const showCredit = !isPlaceholder(PROFILE.OWNER_NAME) && lines.length === BOOT_STEPS.length;

  return (
    <motion.div role="status" aria-live="polite" aria-label={t('app.name')}
      initial={{ opacity: 1 }} exit={{ opacity: 0, transition: transition.slow }}
      style={{ position: 'absolute', inset: 0, zIndex: 200000, background: 'var(--bg-0)', display: 'grid', placeItems: 'center', padding: 'var(--sp-4)' }}>
      <div style={{ width: '100%', maxWidth: 420, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
        <div style={{ color: 'var(--accent)', fontSize: 22, marginBottom: 'var(--sp-4)', textShadow: '0 0 12px var(--accent)' }}>{SITE.APP_NAME}</div>
        {lines.map((s) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: transition.fast }} style={{ color: s.id === 'ready' ? 'var(--success)' : 'var(--text-dim)', marginBottom: 'var(--sp-1)' }}>
            {'> '}{t(s.key)}
          </motion.div>
        ))}
        {showCredit && <div style={{ color: 'var(--text-dim)', marginTop: 'var(--sp-3)', fontSize: 12 }}>{t('boot.credit', { name: PROFILE.OWNER_NAME })}</div>}
        <button className="sg-btn" onClick={finish} style={{ marginTop: 'var(--sp-6)' }}>{t('boot.skip')}</button>
      </div>
    </motion.div>
  );
}
