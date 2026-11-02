import { useState } from 'react';
import { PROFILE } from '../../config/profile';
import { LEGAL_UPDATED, PRIVACY, TERMS, type LegalSection } from '../../content/legal';
import { contactLinks } from '../../core/contact';
import { useT, type Lang } from '../../core/i18n';
import { Tabs } from '../../design/Tabs';

function Sections({ list, lang }: { list: LegalSection[]; lang: Lang }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      {list.map((s) => (
        <section key={s.id} aria-labelledby={`legal-${s.id}`}>
          <h3 id={`legal-${s.id}`} style={{ margin: '0 0 var(--sp-2)', fontSize: 15 }}>{s.heading[lang]}</h3>
          {s.body[lang].length === 1
            ? <p style={{ margin: 0, lineHeight: 1.6 }}>{s.body[lang][0]}</p>
            : <ul style={{ margin: 0, paddingInlineStart: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-1)', lineHeight: 1.6 }}>{s.body[lang].map((p, i) => <li key={i}>{p}</li>)}</ul>}
        </section>
      ))}
    </div>
  );
}

/** Privacy and Terms (F-27). Text lives in content/legal.ts so both languages stay in step. */
export default function Legal() {
  const { t, lang } = useT();
  const [tab, setTab] = useState('privacy');
  const mail = contactLinks(PROFILE).email;
  const email = mail ? mail.replace(/^mailto:/, '').split('?')[0] ?? '' : '';

  const footer = (
    <div style={{ marginTop: 'var(--sp-4)', color: 'var(--text-dim)', fontSize: 13, display: 'grid', gap: 'var(--sp-1)' }}>
      <span>{t('legal.updated', { date: LEGAL_UPDATED })}</span>
      {mail && <a href={mail} style={{ color: 'var(--accent)' }}>{t('legal.contact', { email })}</a>}
    </div>
  );

  return (
    <Tabs
      label={t('legal.tabs')}
      value={tab}
      onChange={setTab}
      items={[
        { id: 'privacy', label: t('legal.privacy'), content: <><Sections list={PRIVACY} lang={lang} />{footer}</> },
        { id: 'terms', label: t('legal.terms'), content: <><Sections list={TERMS} lang={lang} />{footer}</> },
      ]}
    />
  );
}
