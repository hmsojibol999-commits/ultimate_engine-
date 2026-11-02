import { describe, it, expect } from 'vitest';
import { fuzzyScore } from './fuzzy';
import { rankItems, type SearchItem } from './search';
import { registerCommand, listCommands, runCommand, commandItems } from './commands';

describe('fuzzyScore', () => {
  it('ranks exact > prefix > word start > substring > subsequence', () => {
    const exact = fuzzyScore('files', 'files')!;
    const prefix = fuzzyScore('fil', 'files')!;
    const word = fuzzyScore('man', 'task manager')!;
    const sub = fuzzyScore('ask', 'task manager')!;
    const subseq = fuzzyScore('tmg', 'task manager')!;
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(sub);
    expect(sub).toBeGreaterThan(subseq);
    expect(subseq).toBeGreaterThan(0);
  });
  it('returns null when letters are missing or out of order', () => {
    expect(fuzzyScore('xyz', 'files')).toBeNull();
    expect(fuzzyScore('sf', 'files')).toBeNull();
  });
  it('is case-insensitive, ignores outer spaces, and an empty query matches everything with 0', () => {
    expect(fuzzyScore('  FILES ', 'files')).toBe(1000);
    expect(fuzzyScore('', 'anything')).toBe(0);
    expect(fuzzyScore('a', '')).toBeNull();
  });
  it('matches Bengali text by code points', () => {
    expect(fuzzyScore('স্বা', 'স্বাগতম')).toBeGreaterThan(0);
    expect(fuzzyScore('গত', 'স্বাগতম')).toBeGreaterThan(0);
    expect(fuzzyScore('কখ', 'স্বাগতম')).toBeNull();
  });
});

const items: SearchItem[] = [
  { id: 'cmd:theme', kind: 'command', title: 'Change theme', keywords: ['color'] },
  { id: 'app:files', kind: 'app', title: 'Files', subtitle: 'Browse your files and folders' },
  { id: 'file:/notes/todo.md', kind: 'file', title: 'todo.md', subtitle: '/notes/todo.md' },
  { id: 'app:welcome', kind: 'app', title: 'Welcome', keywords: ['start'] },
];

describe('rankItems', () => {
  it('returns the first items in order for an empty query', () => {
    expect(rankItems('', items, 2).map((r) => r.id)).toEqual(['cmd:theme', 'app:files']);
  });
  it('puts title matches above subtitle-only matches', () => {
    const r = rankItems('files', items);
    expect(r[0]?.id).toBe('app:files');
  });
  it('matches keywords and file paths', () => {
    expect(rankItems('colour', items).length).toBe(0);
    expect(rankItems('color', items)[0]?.id).toBe('cmd:theme');
    expect(rankItems('notes', items)[0]?.id).toBe('file:/notes/todo.md');
  });
  it('returns nothing for a query that matches nothing and respects the limit', () => {
    expect(rankItems('qqqq', items)).toEqual([]);
    expect(rankItems('e', items, 1)).toHaveLength(1);
  });
  it('keeps command before app before file on equal scores', () => {
    const tie: SearchItem[] = [
      { id: 'f', kind: 'file', title: 'alpha' }, { id: 'a', kind: 'app', title: 'alpha' }, { id: 'c', kind: 'command', title: 'alpha' },
    ];
    expect(rankItems('alpha', tie).map((r) => r.id)).toEqual(['c', 'a', 'f']);
  });
});

describe('command registry', () => {
  it('registers, lists, runs and unregisters', async () => {
    let ran = 0;
    const off = registerCommand({ id: 't1', title: { en: 'Test one', bn: 'পরীক্ষা এক' }, run: () => { ran++; } });
    expect(listCommands().some((c) => c.id === 't1')).toBe(true);
    expect(commandItems('bn').find((i) => i.id === 't1')?.title).toBe('পরীক্ষা এক');
    expect(await runCommand('t1')).toEqual({ ok: true });
    expect(ran).toBe(1);
    off();
    expect(listCommands().some((c) => c.id === 't1')).toBe(false);
  });
  it('reports a failing or unknown command without throwing', async () => {
    registerCommand({ id: 'boom', title: { en: 'Boom', bn: 'বুম' }, run: () => { throw new Error('nope'); } });
    expect(await runCommand('boom')).toEqual({ ok: false, error: 'nope' });
    const r = await runCommand('missing');
    expect(r.ok).toBe(false);
  });
});
