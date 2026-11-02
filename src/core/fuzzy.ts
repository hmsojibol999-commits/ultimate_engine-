/**
 * Fuzzy scoring for the command palette and global search (F-09, F-11).
 * Returns a score (higher is better) or null when the query does not match.
 * Works on Unicode code points, so Bengali text matches correctly.
 */
const norm = (s: string): string => s.normalize('NFC').toLowerCase();

export function fuzzyScore(query: string, text: string): number | null {
  const q = Array.from(norm(query.trim()));
  const tStr = norm(text);
  const t = Array.from(tStr);
  if (q.length === 0) return 0;
  if (t.length === 0) return null;
  const qStr = q.join('');

  if (tStr === qStr) return 1000;
  if (tStr.startsWith(qStr)) return 800 - Math.min(t.length - q.length, 100);
  const wordAt = tStr.indexOf(` ${qStr}`);
  if (wordAt >= 0) return 600 - Math.min(wordAt, 100);
  const subAt = tStr.indexOf(qStr);
  if (subAt >= 0) return 400 - Math.min(subAt, 100);

  // Subsequence match: every query character appears in order. Reward consecutive runs and word starts.
  let score = 0;
  let ti = 0;
  let prev = -2;
  for (const ch of q) {
    let found = -1;
    for (; ti < t.length; ti++) { if (t[ti] === ch) { found = ti; break; } }
    if (found < 0) return null;
    score += 10;
    if (found === prev + 1) score += 15;
    if (found === 0 || t[found - 1] === ' ' || t[found - 1] === '-' || t[found - 1] === '/' || t[found - 1] === '.') score += 12;
    score -= Math.min(found - (prev + 1), 5);
    prev = found;
    ti = found + 1;
  }
  return Math.max(1, Math.min(score, 299));
}
