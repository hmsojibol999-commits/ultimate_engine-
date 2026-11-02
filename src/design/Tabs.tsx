import { useId, useRef, type ReactNode } from 'react';
import { nextTabIndex } from './tabsLogic';

export interface TabItem { id: string; label: string; content: ReactNode }

/** Accessible tabs: roving tabindex, arrow/Home/End keys, 44px targets. Used by Help (F-31) and Legal (F-27). */
export function Tabs({ items, value, onChange, label }: { items: TabItem[]; value: string; onChange: (id: string) => void; label: string }) {
  const base = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(0, items.findIndex((i) => i.id === value));
  const active = items[index];

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = nextTabIndex(index, items.length, e.key);
    if (next === null) return;
    e.preventDefault();
    const target = items[next];
    if (target) { onChange(target.id); refs.current[next]?.focus(); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', minHeight: 0 }}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} style={{ display: 'flex', gap: 'var(--sp-1)', padding: 'var(--sp-2) var(--sp-4) 0', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
        {items.map((it, i) => {
          const selected = i === index;
          return (
            <button key={it.id} ref={(el) => { refs.current[i] = el; }} role="tab" id={`${base}-t-${it.id}`} aria-selected={selected} aria-controls={`${base}-p-${it.id}`}
              tabIndex={selected ? 0 : -1} className="sg-btn" onClick={() => onChange(it.id)}
              style={{ border: 'none', borderBottom: selected ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0, background: 'transparent', fontWeight: selected ? 700 : 500 }}>
              {it.label}
            </button>
          );
        })}
      </div>
      {active && (
        <div role="tabpanel" id={`${base}-p-${active.id}`} aria-labelledby={`${base}-t-${active.id}`} tabIndex={0} style={{ overflow: 'auto', padding: 'var(--sp-4)', minHeight: 0 }}>
          {active.content}
        </div>
      )}
    </div>
  );
}
