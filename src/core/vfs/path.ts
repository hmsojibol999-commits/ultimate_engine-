import { VfsError } from './types';

/** Normalize to an absolute path with no trailing slash, no '.' or '..' segments. Rejects escapes and NUL. */
export function normalize(input: string, cwd = '/'): string {
  if (typeof input !== 'string' || input.includes('\0')) throw new VfsError('EINVAL', 'Invalid path');
  const full = input.startsWith('/') ? input : `${cwd}/${input}`;
  const out: string[] = [];
  for (const seg of full.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; } // '..' at root stays at root; cannot escape
    out.push(seg);
  }
  return '/' + out.join('/');
}

export const dirname = (p: string): string => { const i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); };
export const basename = (p: string): string => p.slice(p.lastIndexOf('/') + 1);
export const extname = (p: string): string => { const b = basename(p); const i = b.lastIndexOf('.'); return i <= 0 ? '' : b.slice(i).toLowerCase(); };
export const join = (a: string, b: string): string => normalize(`${a}/${b}`);
