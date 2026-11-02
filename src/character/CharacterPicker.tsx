import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useCharacter, type CharacterChoice, type CharacterId } from '../core/characterChoice';
import { useT } from '../core/i18n';
import { useNotices } from '../core/notifications';
import { transition } from '../design/motion';
import { trapTabKey } from '../shell/focusTrap';
import type { StringKey } from '../content/strings.en';
import { CharacterPortrait } from './CharacterPortrait';
import { CHARACTERS, charactersByStyle, getCharacter } from './characters';

const GROUPS = charactersByStyle();

/**
 * Character picker (C-01). Opens by itself on the first visit (after the boot screen, before the tour) and from
 * Settings / the palette later. On the first visit it can only be left by choosing a character or "continue without",
 * so Esc does nothing there; when opened later, Esc and Cancel close it without changing anything.
 */
export default function CharacterPicker() {
  const { t, lang } = useT();
  const current = useCharacter((s) => s.choice);
  const choose = useCharacter((s) => s.choose);
  const close = useCharacter((s) => s.closePicker);
  const firstVisit = current === null;
  const [selected, setSelected] = useState<CharacterId | null>(current && current !== 'none' ? current : null);
  const ref = useRef<HTMLDivElement>(null);

  // Focus moves into the dialog and returns to the opener on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    const target = root?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? root?.querySelector<HTMLElement>('button');
    target?.focus();
    return () => { if (opener && document.contains(opener)) opener.focus(); };
  }, []);

  // Esc closes only when the visitor already has a choice (opened from Settings / palette).
  useEffect(() => {
    if (firstVisit) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [firstVisit, close]);

  const confirm = (c: CharacterChoice) => {
    const push = useNotices.getState().push;
    const remembered = choose(c);
    push('success', c === 'none' ? t('character.savedNone') : t('character.saved', { name: getCharacter(c).name[lang] }));
    if (!remembered) push('warning', t('character.notRemembered'));
  };

  const selectedDef = selected ? CHARACTERS.find((c) => c.id === selected) : undefined;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100020, display: 'grid', placeItems: 'center', padding: 'var(--sp-3)', background: 'rgba(0,0,0,0.6)' }}>
      <motion.div
        ref={ref} role="dialog" aria-modal="true" aria-labelledby="sg-char-title" aria-describedby="sg-char-sub" className="sg-glass" tabIndex={-1}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: transition.base }}
        onKeyDown={(e) => { if (ref.current) trapTabKey(e, ref.current); }}
        style={{ width: 'min(560px, 100%)', maxHeight: 'min(92dvh, 760px)', display: 'flex', flexDirection: 'column', borderRadius: 'var(--r-3)', overflow: 'hidden' }}
      >
        <div style={{ padding: 'var(--sp-4) var(--sp-4) var(--sp-2)' }}>
          <h2 id="sg-char-title" style={{ margin: 0, fontSize: 20 }}>{t('character.pick.title')}</h2>
          <p id="sg-char-sub" style={{ margin: 'var(--sp-1) 0 0', color: 'var(--text-dim)', fontSize: 13 }}>{t('character.pick.subtitle')}</p>
        </div>

        <div style={{ overflow: 'auto', padding: 'var(--sp-2) var(--sp-4)', display: 'grid', gap: 'var(--sp-4)' }}>
          {GROUPS.map(({ style, items }) => {
            const styleName = t(`character.style.${style}` as StringKey);
            return (
              <section key={style} aria-labelledby={`sg-char-style-${style}`}>
                <h3 id={`sg-char-style-${style}`} style={{ margin: '0 0 var(--sp-2)', fontSize: 14, color: 'var(--accent)' }}>{styleName}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--sp-2)' }}>
                  {items.map((c) => {
                    const name = c.name[lang];
                    const on = selected === c.id;
                    return (
                      <button
                        key={c.id} className="sg-btn" aria-pressed={on} aria-label={t('character.card.label', { name, style: styleName })}
                        onClick={() => setSelected(c.id)}
                        style={{ flexDirection: 'column', gap: 'var(--sp-1)', padding: 'var(--sp-2) var(--sp-1)', height: 'auto', ...(on ? { boxShadow: 'var(--glow)' } : null) }}
                      >
                        <CharacterPortrait character={c} size={84} label={name} />
                        <span aria-hidden style={{ fontSize: 13 }}>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div style={{ padding: 'var(--sp-3) var(--sp-4) var(--sp-4)', borderTop: '1px solid var(--border)', display: 'grid', gap: 'var(--sp-2)' }}>
          {!selectedDef && <p role="status" style={{ margin: 0, color: 'var(--text-dim)', fontSize: 13 }}>{t('character.pick.hint')}</p>}
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {firstVisit
              ? <button className="sg-btn" onClick={() => confirm('none')}>{t('character.pick.none')}</button>
              : <>
                  <button className="sg-btn" onClick={close}>{t('common.cancel')}</button>
                  <button className="sg-btn" onClick={() => confirm('none')}>{t('character.pick.none')}</button>
                </>}
            <button className="sg-btn" disabled={!selectedDef} onClick={() => selected && confirm(selected)} style={selectedDef ? { boxShadow: 'var(--glow)' } : undefined}>
              {selectedDef ? t('character.pick.confirm', { name: selectedDef.name[lang] }) : t('settings.character.choose')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
