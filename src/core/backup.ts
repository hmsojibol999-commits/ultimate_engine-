// Workspace backup and restore (F-24). Pure logic, no React, no Zustand (D-012).
// A `.sgrid` file is a plain ZIP: `manifest.json` + `files/<path>` for every VFS file.
// Version history of files is NOT included (D-020); restoring keeps the replaced content in the file's own history.
import { readZip, zipStore, ZipError, type ZipEntry } from './zip';
import { normalize } from './vfs/path';
import type { Vfs } from './vfs/vfs';

export const BACKUP_MAGIC = 'shadow-grid-backup';
export const BACKUP_FORMAT = 1;
export const BACKUP_EXT = '.sgrid';
const MANIFEST = 'manifest.json';
const FILES_DIR = 'files';

export interface BackupSettings { theme: string; wallpaper: string; lang: string; lowPower: boolean }
export interface BackupManifest {
  magic: typeof BACKUP_MAGIC;
  format: number;
  createdAt: number;
  appVersion: string;
  settings: BackupSettings | null;
  files: { path: string; size: number; mtime: number }[];
  dirs: string[];
}
export interface ParsedBackup { manifest: BackupManifest; files: { path: string; data: Uint8Array; mtime: number }[] }

export type BackupErrorCode = 'NOT_BACKUP' | 'TOO_NEW' | 'CORRUPT' | 'UNSAFE_PATH' | 'TOO_BIG';
export class BackupError extends Error {
  constructor(public code: BackupErrorCode, message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
export function backupFileName(now: number): string {
  const d = new Date(now);
  return `shadow-grid-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${BACKUP_EXT}`;
}

/** A path is safe only if it is already normalized, absolute and not the root. */
export function isSafeBackupPath(p: unknown): p is string {
  if (typeof p !== 'string' || p === '/' || !p.startsWith('/') || p.includes('\0')) return false;
  try { return normalize(p) === p; } catch { return false; }
}

export async function createBackup(
  vfs: Pick<Vfs, 'allEntries'>,
  settings: BackupSettings | null,
  now: number,
  appVersion: string,
): Promise<Uint8Array> {
  const entries = await vfs.allEntries();
  const files = entries.filter((r) => r.kind === 'file');
  const dirs = entries.filter((r) => r.kind === 'dir').map((r) => r.path);
  const manifest: BackupManifest = {
    magic: BACKUP_MAGIC,
    format: BACKUP_FORMAT,
    createdAt: now,
    appVersion,
    settings,
    files: files.map((f) => ({ path: f.path, size: f.data?.byteLength ?? 0, mtime: f.mtime })),
    dirs,
  };
  const zipEntries: ZipEntry[] = [{ name: MANIFEST, data: new TextEncoder().encode(JSON.stringify(manifest)), mtime: now }];
  for (const f of files) zipEntries.push({ name: FILES_DIR + f.path, data: f.data ?? new Uint8Array(), mtime: f.mtime });
  try {
    return zipStore(zipEntries, now);
  } catch (e) {
    if (e instanceof ZipError) throw new BackupError('TOO_BIG', e.message);
    throw e;
  }
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Validate a backup before anything is written. Throws BackupError with a code the UI turns into a friendly message. */
export async function parseBackup(bytes: Uint8Array): Promise<ParsedBackup> {
  let entries: ZipEntry[];
  try {
    entries = await readZip(bytes);
  } catch (e) {
    if (e instanceof ZipError) {
      if (e.code === 'NOT_ZIP') throw new BackupError('NOT_BACKUP', e.message);
      if (e.code === 'TOO_BIG') throw new BackupError('TOO_BIG', e.message);
      throw new BackupError('CORRUPT', e.message);
    }
    throw e;
  }
  const byName = new Map(entries.map((e) => [e.name, e]));
  const mEntry = byName.get(MANIFEST);
  if (!mEntry) throw new BackupError('NOT_BACKUP', 'manifest.json is missing');
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder().decode(mEntry.data)); } catch { throw new BackupError('NOT_BACKUP', 'manifest.json is not valid JSON'); }
  if (!isRecord(raw) || raw.magic !== BACKUP_MAGIC) throw new BackupError('NOT_BACKUP', 'Not a Shadow-Grid backup');
  if (!isNum(raw.format) || !Number.isInteger(raw.format) || raw.format < 1) throw new BackupError('CORRUPT', 'Bad format number');
  if (raw.format > BACKUP_FORMAT) throw new BackupError('TOO_NEW', 'Backup was made by a newer version');
  if (!isNum(raw.createdAt) || !Array.isArray(raw.files) || !Array.isArray(raw.dirs)) throw new BackupError('CORRUPT', 'Manifest is incomplete');

  const files: ParsedBackup['files'] = [];
  const seen = new Set<string>();
  const listed: BackupManifest['files'] = [];
  for (const f of raw.files) {
    if (!isRecord(f) || !isNum(f.size) || !isNum(f.mtime)) throw new BackupError('CORRUPT', 'Manifest file entry is invalid');
    if (!isSafeBackupPath(f.path)) throw new BackupError('UNSAFE_PATH', 'Unsafe path in backup');
    if (seen.has(f.path)) throw new BackupError('CORRUPT', 'Duplicate path in backup');
    seen.add(f.path);
    const entry = byName.get(FILES_DIR + f.path);
    if (!entry || entry.data.length !== f.size) throw new BackupError('CORRUPT', `File missing or wrong size: ${f.path}`);
    files.push({ path: f.path, data: entry.data, mtime: f.mtime });
    listed.push({ path: f.path, size: f.size, mtime: f.mtime });
  }
  const dirs: string[] = [];
  for (const d of raw.dirs) {
    if (!isSafeBackupPath(d)) throw new BackupError('UNSAFE_PATH', 'Unsafe folder path in backup');
    dirs.push(d);
  }
  const s = raw.settings;
  const settings: BackupSettings | null = isRecord(s) && typeof s.theme === 'string' && typeof s.wallpaper === 'string' && typeof s.lang === 'string' && typeof s.lowPower === 'boolean'
    ? { theme: s.theme, wallpaper: s.wallpaper, lang: s.lang, lowPower: s.lowPower }
    : null;
  return {
    manifest: { magic: BACKUP_MAGIC, format: raw.format, createdAt: raw.createdAt, appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : '', settings, files: listed, dirs },
    files,
  };
}

export interface RestoreResult { restored: number; failed: string[] }

/** Write every file of a validated backup into the VFS. Same-path files are replaced (old content becomes a version). */
export async function restoreBackup(
  vfs: Pick<Vfs, 'writeFile' | 'mkdir'>,
  backup: ParsedBackup,
  onProgress?: (done: number, total: number) => void,
): Promise<RestoreResult> {
  const failed: string[] = [];
  let restored = 0;
  for (const d of backup.manifest.dirs) {
    try { await vfs.mkdir(d); } catch { failed.push(d); }
  }
  const total = backup.files.length;
  for (const f of backup.files) {
    try { await vfs.writeFile(f.path, f.data); restored++; } catch { failed.push(f.path); }
    onProgress?.(restored + failed.length, total);
  }
  return { restored, failed };
}

const DAY_MS = 86_400_000;
export interface BackupStats { fileCount: number; oldestMtime: number; newestMtime: number }

export async function vfsBackupStats(vfs: Pick<Vfs, 'allFiles'>): Promise<BackupStats> {
  const files = await vfs.allFiles();
  return {
    fileCount: files.length,
    oldestMtime: files.reduce((m, f) => Math.min(m, f.mtime), Infinity),
    newestMtime: files.reduce((m, f) => Math.max(m, f.mtime), 0),
  };
}

/**
 * Show the reminder only when there is something to lose:
 * - never backed up: files exist and the oldest file is at least `days` old;
 * - backed up before: `days` have passed AND a file changed after that backup.
 */
export function backupReminderDue(o: { lastBackupAt: number | null; now: number; days: number } & BackupStats): boolean {
  if (o.fileCount === 0) return false;
  const span = o.days * DAY_MS;
  if (o.lastBackupAt === null) return o.now - o.oldestMtime >= span;
  return o.now - o.lastBackupAt >= span && o.newestMtime > o.lastBackupAt;
}

export type PersistStatus = 'granted' | 'denied' | 'unsupported';
/** Ask the browser to keep our storage (navigator.storage.persist). Never throws. */
export async function requestPersistence(nav: { storage?: { persist?: () => Promise<boolean>; persisted?: () => Promise<boolean> } } | undefined = typeof navigator !== 'undefined' ? navigator : undefined): Promise<PersistStatus> {
  const st = nav?.storage;
  if (!st || typeof st.persist !== 'function') return 'unsupported';
  try {
    if (typeof st.persisted === 'function' && (await st.persisted())) return 'granted';
    return (await st.persist()) ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}
