import { useT } from '../../core/i18n';
import { useSettings, THEMES } from '../../core/settings';
import { shouldSuggestLowPower } from '../../design/motion';

const THEME_LABEL = { 'neon-cyan': 'Neon Cyan', 'deep-violet': 'Deep Violet', 'matrix-green': 'Matrix Green', 'high-contrast': 'High Contrast' } as const;

export default function Welcome() {
  const { t } = useT();
  const s = useSettings();
  const suggest = shouldSuggestLowPower() && !s.lowPower;
  return (
    <div style={{ padding: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-4)' }}>
      <p style={{ margin: 0, color: 'var(--text-dim)' }}>{t('app.welcome.body')}</p>
      <section aria-label={t('settings.language')}>
        <h3 style={{ margin: '0 0 var(--sp-2)' }}>{t('settings.language')}</h3>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          {(['en', 'bn'] as const).map((l) => (
            <button key={l} className="sg-btn" aria-pressed={s.lang === l} onClick={() => s.update({ lang: l })}
              style={s.lang === l ? { boxShadow: 'var(--glow)' } : undefined}>{l === 'en' ? 'English' : 'বাংলা'}</button>
          ))}
        </div>
      </section>
      <section aria-label={t('settings.theme')}>
        <h3 style={{ margin: '0 0 var(--sp-2)' }}>{t('settings.theme')}</h3>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {THEMES.map((id) => (
            <button key={id} className="sg-btn" aria-pressed={s.theme === id} onClick={() => s.update({ theme: id })}
              style={s.theme === id ? { boxShadow: 'var(--glow)' } : undefined}>{THEME_LABEL[id]}</button>
          ))}
        </div>
      </section>
      <section aria-label={t('settings.lowPower')}>
        <h3 style={{ margin: '0 0 var(--sp-2)' }}>{t('settings.lowPower')}</h3>
        {suggest && <p style={{ margin: '0 0 var(--sp-2)', color: 'var(--warning)' }}>{t('app.welcome.lowPowerHint')}</p>}
        <button className="sg-btn" role="switch" aria-checked={s.lowPower} onClick={() => s.update({ lowPower: !s.lowPower })}>
          {s.lowPower ? t('common.on') : t('common.off')}
        </button>
      </section>
    </div>
  );
}
