import { MAX_VERSIONS, VfsError, type StorageAdapter, type VfsRecord, type VfsStat, type Version } from './types';
import { basename, dirname, normalize } from './path';

const enc = new TextEncoder();
const dec = new TextDecoder();

export class Vfs {
  constructor(private store: StorageAdapter, private now: () => number = Date.now) {}

  private async ensureRoot() {
    if (!(await this.store.get('/'))) await this.store.put({ path: '/', kind: 'dir', mtime: this.now() });
  }

  private stat_(r: VfsRecord): VfsStat {
    return { path: r.path, kind: r.kind, size: r.data?.byteLength ?? 0, mtime: r.mtime, name: basename(r.path) || '/' };
  }

  async exists(path: string): Promise<boolean> {
    const p = normalize(path);
    if (p === '/') return true;
    return (await this.store.get(p)) !== undefined;
  }

  async stat(path: string): Promise<VfsStat> {
    const p = normalize(path);
    await this.ensureRoot();
    const r = await this.store.get(p);
    if (!r) throw new VfsError('ENOENT', `No such file or directory: ${p}`);
    return this.stat_(r);
  }

  /** Create a directory and any missing parents (like mkdir -p). */
  async mkdir(path: string): Promise<void> {
    const p = normalize(path);
    await this.ensureRoot();
    const parts = p.split('/').filter(Boolean);
    let cur = '';
    for (const part of parts) {
      cur += '/' + part;
      const r = await this.store.get(cur);
      if (r && r.kind === 'file') throw new VfsError('ENOTDIR', `Not a directory: ${cur}`);
      if (!r) await this.store.put({ path: cur, kind: 'dir', mtime: this.now() });
    }
  }

  async writeFile(path: string, content: string | Uint8Array): Promise<void> {
    const p = normalize(path);
    if (p === '/') throw new VfsError('EISDIR', 'Cannot write to root');
    await this.mkdir(dirname(p));
    const data = typeof content === 'string' ? enc.encode(content) : content;
    const prev = await this.store.get(p);
    if (prev?.kind === 'dir') throw new VfsError('EISDIR', `Is a directory: ${p}`);
    let versions: Version[] = prev?.versions ?? [];
    // Keep the previous content as a version only when it actually changes.
    if (prev?.data && !bytesEqual(prev.data, data)) {
      versions = [...versions, { at: prev.mtime, data: prev.data }].slice(-MAX_VERSIONS);
    }
    await this.store.put({ path: p, kind: 'file', data, mtime: this.now(), versions });
  }

  async readFile(path: string): Promise<Uint8Array> {
    const p = normalize(path);
    const r = await this.store.get(p);
    if (!r) throw new VfsError('ENOENT', `No such file: ${p}`);
    if (r.kind === 'dir') throw new VfsError('EISDIR', `Is a directory: ${p}`);
    return r.data ?? new Uint8Array();
  }

  async readText(path: string): Promise<string> { return dec.decode(await this.readFile(path)); }

  /** Direct children of a directory, folders first then by name. */
  async list(path = '/'): Promise<VfsStat[]> {
    const p = normalize(path);
    await this.ensureRoot();
    if (p !== '/') {
      const d = await this.store.get(p);
      if (!d) throw new VfsError('ENOENT', `No such directory: ${p}`);
      if (d.kind !== 'dir') throw new VfsError('ENOTDIR', `Not a directory: ${p}`);
    }
    const prefix = p === '/' ? '/' : p + '/';
    const out = (await this.store.all())
      .filter((r) => r.path !== '/' && r.path.startsWith(prefix) && !r.path.slice(prefix.length).includes('/'))
      .map((r) => this.stat_(r));
    return out.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1));
  }

  /** Every file and folder under a path (inclusive), used by move/copy/remove/zip. */
  private async subtree(p: string): Promise<VfsRecord[]> {
    const prefix = p === '/' ? '/' : p + '/';
    return (await this.store.all()).filter((r) => r.path === p || r.path.startsWith(prefix));
  }

  async remove(path: string, opts: { recursive?: boolean } = {}): Promise<void> {
    const p = normalize(path);
    if (p === '/') throw new VfsError('EINVAL', 'Cannot remove root');
    const r = await this.store.get(p);
    if (!r) throw new VfsError('ENOENT', `No such file or directory: ${p}`);
    const nodes = await this.subtree(p);
    if (r.kind === 'dir' && nodes.length > 1 && !opts.recursive) throw new VfsError('ENOTEMPTY', `Directory not empty: ${p}`);
    for (const n of nodes) await this.store.remove(n.path);
  }

  async move(from: string, to: string): Promise<void> {
    const a = normalize(from), b = normalize(to);
    if (a === '/' || b === '/') throw new VfsError('EINVAL', 'Cannot move root');
    if (b === a) return;
    if (b.startsWith(a + '/')) throw new VfsError('EINVAL', 'Cannot move a folder into itself');
    if (!(await this.store.get(a))) throw new VfsError('ENOENT', `No such file or directory: ${a}`);
    if (await this.store.get(b)) throw new VfsError('EEXIST', `Already exists: ${b}`);
    await this.mkdir(dirname(b));
    for (const n of await this.subtree(a)) {
      await this.store.put({ ...n, path: b + n.path.slice(a.length) });
      await this.store.remove(n.path);
    }
  }

  async copy(from: string, to: string): Promise<void> {
    const a = normalize(from), b = normalize(to);
    if (b === a || b.startsWith(a + '/')) throw new VfsError('EINVAL', 'Cannot copy a folder into itself');
    if (!(await this.store.get(a))) throw new VfsError('ENOENT', `No such file or directory: ${a}`);
    if (await this.store.get(b)) throw new VfsError('EEXIST', `Already exists: ${b}`);
    await this.mkdir(dirname(b));
    for (const n of await this.subtree(a)) {
      await this.store.put({ ...n, path: b + n.path.slice(a.length), mtime: this.now() });
    }
  }

  async versions(path: string): Promise<Version[]> {
    const r = await this.store.get(normalize(path));
    if (!r) throw new VfsError('ENOENT', `No such file: ${path}`);
    return [...(r.versions ?? [])];
  }

  /** Restore version `index` (0 = oldest kept). The current content becomes a new version first. */
  async restoreVersion(path: string, index: number): Promise<void> {
    const p = normalize(path);
    const r = await this.store.get(p);
    if (!r || r.kind !== 'file') throw new VfsError('ENOENT', `No such file: ${p}`);
    const v = r.versions?.[index];
    if (!v) throw new VfsError('EINVAL', `No version ${index} for ${p}`);
    await this.writeFile(p, v.data);
  }

  /** Every file and folder except the root, sorted by path; used by workspace backup. */
  async allEntries(): Promise<VfsRecord[]> {
    return (await this.store.all()).filter((r) => r.path !== '/').sort((x, y) => x.path.localeCompare(y.path));
  }

  /** All files as a flat list; used by zip export and workspace backup. */
  async allFiles(): Promise<VfsRecord[]> {
    return (await this.store.all()).filter((r) => r.kind === 'file').sort((x, y) => x.path.localeCompare(y.path));
  }

  /** Total bytes of file data (for the storage meter and task manager). */
  async usage(): Promise<number> {
    return (await this.allFiles()).reduce((n, r) => n + (r.data?.byteLength ?? 0), 0);
  }
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}
