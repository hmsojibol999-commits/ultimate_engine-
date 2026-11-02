import { fuzzyScore } from './fuzzy';

export type SearchKind = 'command' | 'app' | 'file';

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  keywords?: string[];
}
export interface SearchResult extends SearchItem { score: number }

const KIND_ORDER: Record<SearchKind, number> = { command: 0, app: 1, file: 2 };

/**
 * Rank items for a query. Title matches count fully, keywords 80%, subtitle 40%.
 * An empty query returns the first `limit` items in the given order (the default palette view).
 * Ties keep command before app before file, then the original order.
 */
export function rankItems(query: string, items: SearchItem[], limit = 8): SearchResult[] {
  const q = query.trim();
  if (q === '') return items.slice(0, limit).map((it) => ({ ...it, score: 0 }));
  const out: Array<SearchResult & { order: number }> = [];
  items.forEach((it, order) => {
    const cands: number[] = [];
    const a = fuzzyScore(q, it.title); if (a !== null) cands.push(a);
    for (const k of it.keywords ?? []) { const b = fuzzyScore(q, k); if (b !== null) cands.push(b * 0.8); }
    if (it.subtitle) { const c = fuzzyScore(q, it.subtitle); if (c !== null) cands.push(c * 0.4); }
    if (cands.length > 0) out.push({ ...it, score: Math.max(...cands), order });
  });
  out.sort((x, y) => y.score - x.score || KIND_ORDER[x.kind] - KIND_ORDER[y.kind] || x.order - y.order);
  return out.slice(0, limit).map(({ order: _o, ...rest }) => { void _o; return rest; });
}
