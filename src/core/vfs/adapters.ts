import { openDB, type IDBPDatabase } from 'idb';
import type { StorageAdapter, VfsRecord } from './types';

export class MemoryAdapter implements StorageAdapter {
  private m = new Map<string, VfsRecord>();
  async get(path: string) { return this.m.get(path); }
  async put(rec: VfsRecord) { this.m.set(rec.path, rec); }
  async remove(path: string) { this.m.delete(path); }
  async all() { return [...this.m.values()]; }
}

/** IndexedDB backend (default store; OPFS is a later optimization, see DECISIONS D-004). */
export class IdbAdapter implements StorageAdapter {
  private db: Promise<IDBPDatabase>;
  constructor(name = 'shadow-grid-vfs') {
    this.db = openDB(name, 1, {
      upgrade(db) { db.createObjectStore('nodes', { keyPath: 'path' }); },
    });
  }
  async get(path: string) { return (await this.db).get('nodes', path) as Promise<VfsRecord | undefined>; }
  async put(rec: VfsRecord) { await (await this.db).put('nodes', rec); }
  async remove(path: string) { await (await this.db).delete('nodes', path); }
  async all() { return (await (await this.db).getAll('nodes')) as VfsRecord[]; }
}
