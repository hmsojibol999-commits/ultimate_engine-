import { useState } from 'react';
import { PROFILE } from '../../config/profile';
import { CHANGELOG } from '../../content/changelog';
import { SHORTCUTS } from '../../content/shortcuts';
import { contactLinks } from '../../core/contact';
import { useT } from '../../core/i18n';
import { useTour } from '../../core/tour';
import { Tabs } from '../../design/Tabs';

const kbd = { border: '1px solid var(--border)', borderRadius: 'var(--r-1)', padding: '2px 6px', fontSize: 12, fontFamily: 'var(--font-mono)' } as const;

/** Help (F-31): shortcuts that really exist, the What's new log, and a feedback link built only from real owner details. */
export default function Help() {
  const { t, lang } = useT();
  const [tab, setTab] = useState('shortcuts');
  const links = contactLinks(PROFILE);

  const shortcuts = (
    <div style={{ display: 'grid', gap: 'var(--sp-4)', justifyItems: 'start' }}>
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-3)' }}>
      {SHORTCUTS.map((s) => (
        <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{t(s.label)}</span>
          <span style={{ display: 'flex', gap: 4 }}>{s.keys.map((k) => <kbd key={k} style={kbd}>{k}</kbd>)}</span>
        </li>
      ))}
    </ul>
    <button className="sg-btn" onClick={() => useTour.getState().start()}>{t('tour.replay')}</button>
    </div>
  );

  const whatsNew = (
    <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      {CHANGELOG.map((e) => (
        <section key={e.version} aria-label={t('help.whatsNew.version', { v: e.version, date: e.date })}>
          <h3 style={{ margin: '0 0 var(--sp-2)', fontSize: 15 }}>{t('help.whatsNew.version', { v: e.version, date: e.date })}</h3>
          <ul style={{ margin: 0, paddingInlineStart: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-1)', lineHeight: 1.6 }}>
            {e.items[lang].map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );

  const feedback = (
    <div style={{ display: 'grid', gap: 'var(--sp-3)', justifyItems: 'start' }}>
      <p style={{ margin: 0 }}>{t('help.feedback.body')}</p>
      {links.feedback
        ? <a className="sg-btn" href={links.feedback} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{t('help.feedback.send')}</a>
        : <p style={{ margin: 0, color: 'var(--text-dim)' }}>{t('help.feedback.none')}</p>}
      {(links.repo ?? links.github) && (
        <a href={links.repo ?? links.github} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{t('help.github')}</a>
      )}
    </div>
  );

  return (
    <Tabs
      label={t('help.tabs')}
      value={tab}
      onChange={setTab}
      items={[
        { id: 'shortcuts', label: t('help.shortcuts'), content: shortcuts },
        { id: 'whatsnew', label: t('help.whatsNew'), content: whatsNew },
        { id: 'feedback', label: t('help.feedback'), content: feedback },
      ]}
    />
  );
}
