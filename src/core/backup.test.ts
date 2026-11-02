import { describe, it, expect } from 'vitest';
import { crc32, readZip, zipStore, ZipError } from './zip';
import {
  BACKUP_FORMAT, BackupError, backupFileName, backupReminderDue, createBackup, isSafeBackupPath, parseBackup, requestPersistence, restoreBackup, vfsBackupStats,
} from './backup';
import { MemoryAdapter, Vfs } from './vfs';

const enc = new TextEncoder();
const dec = new TextDecoder();
const mk = () => { let t = 1000; return new Vfs(new MemoryAdapter(), () => ++t); };
const settings = { theme: 'deep-violet', wallpaper: 'grid', lang: 'bn', lowPower: true };
const DAY = 86_400_000;

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
  });
  it('round-trips files, folders and unicode names', async () => {
    const zip = zipStore([
      { name: 'a.txt', data: enc.encode('hello') },
      { name: 'ফোল্ডার/ফাইল.txt', data: enc.encode('বাংলা') },
      { name: 'dir/', data: new Uint8Array() },
      { name: 'bin.dat', data: new Uint8Array([0, 255, 1, 2]) },
    ]);
    const back = await readZip(zip);
    expect(back.map((e) => e.name)).toEqual(['a.txt', 'ফোল্ডার/ফাইল.txt', 'dir/', 'bin.dat']);
    expect(dec.decode(back[1]!.data)).toBe('বাংলা');
    expect(Array.from(back[3]!.data)).toEqual([0, 255, 1, 2]);
  });
  it('reads deflate-compressed entries made by other tools', async () => {
    const text = enc.encode('abc'.repeat(500));
    const cs = new Blob([text as unknown as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const packed = new Uint8Array(await new Response(cs).arrayBuffer());
    // Take a stored zip and patch it into a deflate zip by hand.
    const stored = zipStore([{ name: 'x.txt', data: packed }]);
    const v = new DataView(stored.buffer);
    const nameLen = 5;
    const crc = crc32(text);
    v.setUint16(8, 8, true); v.setUint32(14, crc, true); v.setUint32(22, text.length, true); // local header
    const cen = 30 + nameLen + packed.length;
    v.setUint16(cen + 10, 8, true); v.setUint32(cen + 16, crc, true); v.setUint32(cen + 24, text.length, true); // central header
    const back = await readZip(stored);
    expect(dec.decode(back[0]!.data)).toBe('abc'.repeat(500));
  });
  it('rejects non-zip, truncated and tampered input', async () => {
    await expect(readZip(enc.encode('this is just text, not a zip file at all'))).rejects.toBeInstanceOf(ZipError);
    const zip = zipStore([{ name: 'a.txt', data: enc.encode('hello world') }]);
    await expect(readZip(zip.slice(0, zip.length - 10))).rejects.toBeInstanceOf(ZipError);
    const bad = zip.slice();
    bad[30 + 5] = (bad[30 + 5] ?? 0) ^ 0xff; // flip a data byte: CRC must catch it
    await expect(readZip(bad)).rejects.toMatchObject({ code: 'CORRUPT' });
  });
  it('refuses zips that declare too much data', async () => {
    const zip = zipStore([{ name: 'a.txt', data: enc.encode('hello world') }]);
    await expect(readZip(zip, { maxUnpackedBytes: 5 })).rejects.toMatchObject({ code: 'TOO_BIG' });
  });
});

describe('backup round-trip', () => {
  it('restores a whole workspace into an empty VFS, including empty folders and binary data', async () => {
    const a = mk();
    await a.writeFile('/projects/app/index.html', '<h1>হ্যালো</h1>');
    await a.writeFile('/notes.txt', 'note');
    await a.writeFile('/img.bin', new Uint8Array([9, 8, 7, 0, 255]));
    await a.mkdir('/empty/folder');
    const bytes = await createBackup(a, settings, 5000, '0.1.0');

    const parsed = await parseBackup(bytes);
    expect(parsed.manifest.format).toBe(BACKUP_FORMAT);
    expect(parsed.manifest.settings).toEqual(settings);
    expect(parsed.files.map((f) => f.path)).toEqual(['/img.bin', '/notes.txt', '/projects/app/index.html']);

    const b = mk();
    const res = await restoreBackup(b, parsed);
    expect(res).toEqual({ restored: 3, failed: [] });
    expect(await b.readText('/projects/app/index.html')).toBe('<h1>হ্যালো</h1>');
    expect(Array.from(await b.readFile('/img.bin'))).toEqual([9, 8, 7, 0, 255]);
    expect((await b.stat('/empty/folder')).kind).toBe('dir');
  });
  it('replaces same-path files and keeps the old content as a version', async () => {
    const a = mk();
    await a.writeFile('/a.txt', 'from backup');
    const parsed = await parseBackup(await createBackup(a, null, 1, '0.1.0'));
    const b = mk();
    await b.writeFile('/a.txt', 'current');
    await restoreBackup(b, parsed);
    expect(await b.readText('/a.txt')).toBe('from backup');
    expect(dec.decode((await b.versions('/a.txt'))[0]!.data)).toBe('current');
  });
  it('reports progress and failures without stopping', async () => {
    const a = mk();
    await a.writeFile('/ok.txt', '1');
    await a.writeFile('/bad.txt', '2');
    const parsed = await parseBackup(await createBackup(a, null, 1, '0.1.0'));
    const seen: number[] = [];
    const flaky = { mkdir: async () => {}, writeFile: async (p: string) => { if (p === '/bad.txt') throw new Error('disk full'); } };
    const res = await restoreBackup(flaky, parsed, (d) => seen.push(d));
    expect(res).toEqual({ restored: 1, failed: ['/bad.txt'] });
    expect(seen).toEqual([1, 2]);
  });
  it('handles an empty workspace', async () => {
    const parsed = await parseBackup(await createBackup(mk(), null, 1, '0.1.0'));
    expect(parsed.files).toEqual([]);
    expect(parsed.manifest.settings).toBeNull();
  });
});

describe('backup validation', () => {
  const withManifest = (manifest: unknown, extra: { name: string; data: Uint8Array }[] = []) =>
    zipStore([{ name: 'manifest.json', data: enc.encode(JSON.stringify(manifest)) }, ...extra]);
  const base = { magic: 'shadow-grid-backup', format: 1, createdAt: 1, appVersion: '0.1.0', settings: null, files: [], dirs: [] };

  it('rejects things that are not backups', async () => {
    await expect(parseBackup(enc.encode('hello'))).rejects.toMatchObject({ code: 'NOT_BACKUP' });
    await expect(parseBackup(zipStore([{ name: 'a.txt', data: enc.encode('x') }]))).rejects.toMatchObject({ code: 'NOT_BACKUP' });
    await expect(parseBackup(withManifest({ ...base, magic: 'something-else' }))).rejects.toMatchObject({ code: 'NOT_BACKUP' });
  });
  it('rejects a newer format with its own code', async () => {
    await expect(parseBackup(withManifest({ ...base, format: BACKUP_FORMAT + 1 }))).rejects.toMatchObject({ code: 'TOO_NEW' });
  });
  it('rejects unsafe paths before anything is written', async () => {
    const files = [{ path: '/../etc/passwd', size: 1, mtime: 1 }];
    await expect(parseBackup(withManifest({ ...base, files }, [{ name: 'files/../etc/passwd', data: enc.encode('x') }]))).rejects.toMatchObject({ code: 'UNSAFE_PATH' });
    await expect(parseBackup(withManifest({ ...base, dirs: ['relative/dir'] }))).rejects.toMatchObject({ code: 'UNSAFE_PATH' });
  });
  it('rejects missing files, wrong sizes and duplicates', async () => {
    await expect(parseBackup(withManifest({ ...base, files: [{ path: '/a.txt', size: 1, mtime: 1 }] }))).rejects.toMatchObject({ code: 'CORRUPT' });
    await expect(parseBackup(withManifest({ ...base, files: [{ path: '/a.txt', size: 5, mtime: 1 }] }, [{ name: 'files/a.txt', data: enc.encode('x') }]))).rejects.toMatchObject({ code: 'CORRUPT' });
    const dup = { path: '/a.txt', size: 1, mtime: 1 };
    await expect(parseBackup(withManifest({ ...base, files: [dup, dup] }, [{ name: 'files/a.txt', data: enc.encode('x') }]))).rejects.toBeInstanceOf(BackupError);
  });
  it('ignores a malformed settings block instead of failing', async () => {
    const parsed = await parseBackup(withManifest({ ...base, settings: { theme: 5 } }));
    expect(parsed.manifest.settings).toBeNull();
  });
  it('checks path safety', () => {
    expect(isSafeBackupPath('/a/b.txt')).toBe(true);
    for (const bad of ['/', 'a.txt', '/a/../b', '/a//b', '/a/', '/a\0b', 5, null]) expect(isSafeBackupPath(bad)).toBe(false);
  });
});

describe('backup helpers', () => {
  it('names files by local date', () => {
    expect(backupFileName(new Date(2026, 10, 2, 12).getTime())).toBe('shadow-grid-2026-11-02.sgrid');
  });
  it('shows the reminder only when there is something to lose', () => {
    const now = 100 * DAY;
    const s = { fileCount: 3, oldestMtime: now - 10 * DAY, newestMtime: now - DAY };
    expect(backupReminderDue({ ...s, lastBackupAt: null, now, days: 7 })).toBe(true);
    expect(backupReminderDue({ ...s, lastBackupAt: null, now, days: 7, oldestMtime: now - 2 * DAY })).toBe(false); // brand-new workspace
    expect(backupReminderDue({ ...s, fileCount: 0, lastBackupAt: null, now, days: 7 })).toBe(false);
    expect(backupReminderDue({ ...s, lastBackupAt: now - 8 * DAY, newestMtime: now - 9 * DAY, now, days: 7 })).toBe(false); // no change since backup
    expect(backupReminderDue({ ...s, lastBackupAt: now - 8 * DAY, now, days: 7 })).toBe(true);
    expect(backupReminderDue({ ...s, lastBackupAt: now - 3 * DAY, now, days: 7 })).toBe(false);
  });
  it('measures VFS stats', async () => {
    const v = mk();
    expect(await vfsBackupStats(v)).toEqual({ fileCount: 0, oldestMtime: Infinity, newestMtime: 0 });
    await v.writeFile('/a', '1'); await v.writeFile('/b', '2');
    const s = await vfsBackupStats(v);
    expect(s.fileCount).toBe(2);
    expect(s.newestMtime).toBeGreaterThan(s.oldestMtime);
  });
  it('requests persistent storage and never throws', async () => {
    expect(await requestPersistence(undefined)).toBe('unsupported');
    expect(await requestPersistence({ storage: {} })).toBe('unsupported');
    expect(await requestPersistence({ storage: { persist: async () => true } })).toBe('granted');
    expect(await requestPersistence({ storage: { persist: async () => false } })).toBe('denied');
    expect(await requestPersistence({ storage: { persisted: async () => true, persist: async () => false } })).toBe('granted');
    expect(await requestPersistence({ storage: { persist: async () => { throw new Error('x'); } } })).toBe('denied');
  });
});
