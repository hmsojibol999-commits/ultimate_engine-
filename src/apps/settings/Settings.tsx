import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { useT } from '../../core/i18n';
import { useNotices } from '../../core/notifications';
import { THEMES, WALLPAPERS, migrateSettings, useSettings } from '../../core/settings';
import { BackupError, backupFileName, createBackup, parseBackup, requestPersistence, restoreBackup, type ParsedBackup, type PersistStatus } from '../../core/backup';
import { useInstall, promptInstall } from '../../core/install';
import { getVfs } from '../../core/vfs';
import { SITE } from '../../config/site';
import { shouldSuggestLowPower } from '../../design/motion';
import { useCharacter } from '../../core/characterChoice';
import { CharacterPortrait } from '../../character/CharacterPortrait';
import { getCharacter } from '../../character/characters';
import type { StringKey } from '../../content/strings.en';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 style={{ margin: '0 0 var(--sp-2)', fontSize: 15 }}>{title}</h3>
      {children}
    </section>
  );
}

const row = { display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' } as const;
const picked = { boxShadow: 'var(--glow)' } as const;

/** Settings app (F-13): language, theme, wallpaper, Low-power mode, backup/restore (F-24), install (F-25), reset. UI sounds are not built yet (no sound system). */
export default function Settings() {
  const { t } = useT();
  const s = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const suggest = shouldSuggestLowPower() && !s.lowPower;
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const [withSettings, setWithSettings] = useState(true);
  const [persist, setPersist] = useState<PersistStatus | null>(null);
  const push = useNotices.getState().push;
  const install = useInstall((st) => st.state);
  const doInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'dismissed') push('info', t('install.dismissed'));
    else if (outcome === 'unavailable') push('warning', t('install.unavailable'));
  };
  const character = useCharacter((st) => st.choice);
  const openPicker = useCharacter((st) => st.openPicker);
  const dateText = (ms: number) => new Date(ms).toLocaleDateString(s.lang === 'bn' ? 'bn-BD' : 'en-GB');

  useEffect(() => { void requestPersistence().then(setPersist); }, []);

  const errorKey = (e: unknown): StringKey => {
    if (e instanceof BackupError) {
      if (e.code === 'NOT_BACKUP') return 'backup.error.notBackup';
      if (e.code === 'TOO_NEW') return 'backup.error.tooNew';
      if (e.code === 'UNSAFE_PATH') return 'backup.error.unsafe';
      if (e.code === 'TOO_BIG') return 'backup.error.tooBig';
    }
    return 'backup.error.corrupt';
  };

  const doBackup = async () => {
    setBusy(true);
    try {
      const now = Date.now();
      const bytes = await createBackup(getVfs(), { theme: s.theme, wallpaper: s.wallpaper, lang: s.lang, lowPower: s.lowPower }, now, SITE.VERSION);
      const name = backupFileName(now);
      const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      s.update({ lastBackupAt: now });
      push('success', t('backup.done', { name }));
    } catch (e) {
      push('error', t(e instanceof BackupError && e.code === 'TOO_BIG' ? 'backup.error.tooBig' : 'backup.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 500 * 1024 * 1024) throw new BackupError('TOO_BIG', 'File too large');
      setPending(await parseBackup(new Uint8Array(await file.arrayBuffer())));
    } catch (err) {
      setPending(null);
      push('error', t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await restoreBackup(getVfs(), pending);
      if (withSettings && pending.manifest.settings) {
        const m = migrateSettings(pending.manifest.settings, s.lang);
        s.update({ theme: m.theme, wallpaper: m.wallpaper, lang: m.lang, lowPower: m.lowPower });
      }
      push(res.failed.length ? 'warning' : 'success', res.failed.length ? t('backup.restore.partial', { files: res.restored, failed: res.failed.length }) : t('backup.restore.done', { files: res.restored }));
      setPending(null);
    } catch {
      push('error', t('backup.error.corrupt'));
    } finally {
      setBusy(false);
    }
  };

  const doReset = () => {
    s.reset();
    setConfirmReset(false);
    useNotices.getState().push('success', t('settings.reset.done'));
  };

  return (
    <div style={{ padding: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-4)', alignContent: 'start' }}>
      <Section title={t('settings.language')}>
        <div style={row}>
          {(['en', 'bn'] as const).map((l) => (
            <button key={l} className="sg-btn" aria-pressed={s.lang === l} onClick={() => s.update({ lang: l })} style={s.lang === l ? picked : undefined}>
              {l === 'en' ? 'English' : 'বাংলা'}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('settings.theme')}>
        <div style={row}>
          {THEMES.map((id) => (
            <button key={id} className="sg-btn" aria-pressed={s.theme === id} onClick={() => s.update({ theme: id })} style={s.theme === id ? picked : undefined}>
              {t(`theme.${id}` as StringKey)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('settings.wallpaper')}>
        <div style={row}>
          {WALLPAPERS.map((id) => (
            <button key={id} className="sg-btn" aria-pressed={s.wallpaper === id} onClick={() => s.update({ wallpaper: id })} style={s.wallpaper === id ? picked : undefined}>
              {t(`wallpaper.${id}` as StringKey)}
            </button>
          ))}
        </div>
        {s.wallpaper === 'particles' && s.lowPower && <p style={{ margin: 'var(--sp-2) 0 0', color: 'var(--text-dim)', fontSize: 13 }}>{t('settings.wallpaper.lowPowerNote')}</p>}
      </Section>

      <Section title={t('settings.character')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {character && character !== 'none' && <CharacterPortrait character={getCharacter(character)} size={56} label={getCharacter(character).name[s.lang]} />}
          <span>{character && character !== 'none' ? t('settings.character.current', { name: getCharacter(character).name[s.lang] }) : t('settings.character.none')}</span>
          <button className="sg-btn" onClick={openPicker}>{character && character !== 'none' ? t('settings.character.change') : t('settings.character.choose')}</button>
        </div>
      </Section>

      <Section title={t('settings.voice')}>
        <p style={{ margin: '0 0 var(--sp-2)', color: 'var(--text-dim)', fontSize: 13 }}>{t('settings.voice.note')}</p>
        <button className="sg-btn" role="switch" aria-checked={s.voiceEnabled} onClick={() => s.update({ voiceEnabled: !s.voiceEnabled })}>
          {s.voiceEnabled ? t('common.on') : t('common.off')}
        </button>
      </Section>

      <Section title={t('settings.lowPower')}>
        {suggest && <p style={{ margin: '0 0 var(--sp-2)', color: 'var(--warning)' }}>{t('app.welcome.lowPowerHint')}</p>}
        <button className="sg-btn" role="switch" aria-checked={s.lowPower} onClick={() => s.update({ lowPower: !s.lowPower })}>
          {s.lowPower ? t('common.on') : t('common.off')}
        </button>
      </Section>

      <Section title={t('backup.title')}>
        <p style={{ margin: '0 0 var(--sp-2)', color: 'var(--text-dim)', fontSize: 13 }}>{t('backup.note')}</p>
        <p style={{ margin: '0 0 var(--sp-2)', fontSize: 13 }}>{s.lastBackupAt ? t('backup.last', { date: dateText(s.lastBackupAt) }) : t('backup.never')}</p>
        <div style={row}>
          <button className="sg-btn" disabled={busy} onClick={() => void doBackup()}>{busy ? t('backup.working') : t('backup.download')}</button>
          <label className="sg-btn" aria-disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', opacity: busy ? 0.45 : 1 }}>
            {t('backup.restore')}
            <input type="file" accept=".sgrid,application/zip" disabled={busy} onChange={(e) => void onPick(e)} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }} />
          </label>
        </div>
        {pending && (
          <div role="alertdialog" aria-label={t('backup.restore')} style={{ display: 'grid', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            <span>{t('backup.restore.summary', { files: pending.files.length, date: dateText(pending.manifest.createdAt) })}</span>
            {pending.manifest.settings && (
              <label style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                <input type="checkbox" checked={withSettings} onChange={(e) => setWithSettings(e.target.checked)} />
                {t('backup.restore.settings')}
              </label>
            )}
            <div style={row}>
              <button className="sg-btn" disabled={busy} onClick={() => void doRestore()}>{busy ? t('backup.working') : t('backup.restore.confirm')}</button>
              <button className="sg-btn" disabled={busy} onClick={() => setPending(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
        {persist && <p style={{ margin: 'var(--sp-2) 0 0', color: 'var(--text-dim)', fontSize: 13 }}>{t(`backup.persist.${persist}` as StringKey)}</p>}
      </Section>

      <Section title={t('install.title')}>
        <p style={{ margin: '0 0 var(--sp-2)', color: 'var(--text-dim)', fontSize: 13 }}>{t(`install.note.${install}` as StringKey)}</p>
        {install === 'promptable' && <button className="sg-btn" onClick={() => void doInstall()}>{t('install.button')}</button>}
      </Section>

      <Section title={t('settings.reset')}>
        <p style={{ margin: '0 0 var(--sp-2)', color: 'var(--text-dim)', fontSize: 13 }}>{t('settings.reset.note')}</p>
        {confirmReset ? (
          <div role="alertdialog" aria-label={t('settings.reset.confirm')} style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            <span>{t('settings.reset.confirm')}</span>
            <div style={row}>
              <button className="sg-btn" onClick={doReset} style={{ borderColor: 'var(--danger)' }}>{t('settings.reset.yes')}</button>
              <button className="sg-btn" onClick={() => setConfirmReset(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <button className="sg-btn" onClick={() => setConfirmReset(true)}>{t('settings.reset')}</button>
        )}
      </Section>
    </div>
  );
}
