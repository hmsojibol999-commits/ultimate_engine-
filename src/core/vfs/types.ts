export type NodeKind = 'file' | 'dir';

export interface Version { at: number; data: Uint8Array }

/** One stored record. Directories have no data. */
export interface VfsRecord {
  path: string;      // normalized absolute path, e.g. /projects/app/index.html
  kind: NodeKind;
  data?: Uint8Array; // files only
  mtime: number;
  versions?: Version[]; // files only, newest last, max MAX_VERSIONS
}

export interface VfsStat { path: string; kind: NodeKind; size: number; mtime: number; name: string }

/** Storage backends implement this. IndexedDB for browsers, memory for tests. OPFS can be added later. */
export interface StorageAdapter {
  get(path: string): Promise<VfsRecord | undefined>;
  put(rec: VfsRecord): Promise<void>;
  remove(path: string): Promise<void>;
  all(): Promise<VfsRecord[]>;
}

export const MAX_VERSIONS = 20;

export class VfsError extends Error {
  constructor(public code: 'ENOENT' | 'EEXIST' | 'ENOTDIR' | 'EISDIR' | 'EINVAL' | 'ENOTEMPTY', message: string) {
    super(message);
    this.name = 'VfsError';
  }
}
