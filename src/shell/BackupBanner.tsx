import { useEffect, useState } from 'react';
import { useT } from '../core/i18n';
import { useSettings } from '../core/settings';
import { backupReminderDue, vfsBackupStats } from '../core/backup';
import { getVfs } from '../core/vfs';
import { SITE } from '../config/site';
import { useWindows } from './windowStore';
import { useIsMobile } from './useIsMobile';

/** 7-day backup reminder (F-24). Shown only when there are files that changed since the last backup. 'Later' hides it until the next page load. */
export function BackupBanner() {
  const { t } = useT();
  const mobile = useIsMobile();
  const lastBackupAt = useSettings((s) => s.lastBackupAt);
  const [due, setDue] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    vfsBackupStats(getVfs())
      .then((st) => { if (alive) setDue(backupReminderDue({ ...st, lastBackupAt, now: Date.now(), days: SITE.BACKUP_REMINDER_DAYS })); })
      .catch(() => { /* storage unavailable: no reminder */ });
    return () => { alive = false; };
  }, [lastBackupAt]);

  if (!due || hidden) return null;
  const barH = mobile ? 'var(--switcher-h)' : 'var(--taskbar-h)';
  return (
    <div role="status" className="sg-glass"
      style={{ position: 'fixed', zIndex: 99998, left: 8, right: 8, bottom: `calc(${barH} + env(safe-area-inset-bottom) + 8px)`, margin: '0 auto', maxWidth: 520, display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-3)' }}>
      <span style={{ flex: '1 1 200px', fontSize: 14 }}>{t('backup.banner.text')}</span>
      <button className="sg-btn" onClick={() => { useWindows.getState().open('settings'); setHidden(true); }}>{t('backup.banner.now')}</button>
      <button className="sg-btn" onClick={() => setHidden(true)}>{t('backup.banner.later')}</button>
    </div>
  );
}
