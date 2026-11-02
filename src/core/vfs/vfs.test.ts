import { describe, it, expect } from 'vitest';
import { Vfs, MAX_VERSIONS, normalize, MemoryAdapter } from './index';
import { migrateSettings } from '../settings';

const mk = () => { let t = 1000; return new Vfs(new MemoryAdapter(), () => ++t); };

describe('path', () => {
  it('normalizes and cannot escape root', () => {
    expect(normalize('/a/./b//c/')).toBe('/a/b/c');
    expect(normalize('../../etc')).toBe('/etc');
    expect(normalize('x', '/home')).toBe('/home/x');
  });
  it('rejects NUL', () => { expect(() => normalize('a\0b')).toThrow(); });
});

describe('Vfs', () => {
  it('writes, reads and creates parents', async () => {
    const v = mk();
    await v.writeFile('/p/app/index.html', '<h1>hi</h1>');
    expect(await v.readText('/p/app/index.html')).toBe('<h1>hi</h1>');
    expect((await v.stat('/p/app')).kind).toBe('dir');
  });
  it('lists direct children, folders first', async () => {
    const v = mk();
    await v.writeFile('/b.txt', 'b'); await v.writeFile('/a/x.txt', 'x'); await v.writeFile('/a/deep/y.txt', 'y');
    expect((await v.list('/')).map((s) => s.name)).toEqual(['a', 'b.txt']);
    expect((await v.list('/a')).map((s) => s.name)).toEqual(['deep', 'x.txt']);
  });
  it('errors: missing file, file as dir, dir as file', async () => {
    const v = mk();
    await expect(v.readFile('/nope')).rejects.toMatchObject({ code: 'ENOENT' });
    await v.writeFile('/f', '1');
    await expect(v.mkdir('/f/sub')).rejects.toMatchObject({ code: 'ENOTDIR' });
    await v.mkdir('/d');
    await expect(v.writeFile('/d', 'x')).rejects.toMatchObject({ code: 'EISDIR' });
    await expect(v.readFile('/d')).rejects.toMatchObject({ code: 'EISDIR' });
  });
  it('remove needs recursive for non-empty dirs', async () => {
    const v = mk();
    await v.writeFile('/d/a', '1');
    await expect(v.remove('/d')).rejects.toMatchObject({ code: 'ENOTEMPTY' });
    await v.remove('/d', { recursive: true });
    expect(await v.exists('/d/a')).toBe(false);
    expect(await v.exists('/d')).toBe(false);
  });
  it('moves and copies folders with contents', async () => {
    const v = mk();
    await v.writeFile('/src/a.txt', 'A'); await v.writeFile('/src/sub/b.txt', 'B');
    await v.copy('/src', '/copy');
    await v.move('/src', '/dst/moved');
    expect(await v.readText('/dst/moved/sub/b.txt')).toBe('B');
    expect(await v.readText('/copy/a.txt')).toBe('A');
    expect(await v.exists('/src')).toBe(false);
    await expect(v.move('/copy', '/copy/inside')).rejects.toMatchObject({ code: 'EINVAL' });
    await expect(v.move('/copy', '/dst')).rejects.toMatchObject({ code: 'EEXIST' });
  });
  it('keeps versions only on change, caps at MAX_VERSIONS, and restores', async () => {
    const v = mk();
    await v.writeFile('/n.txt', 'v0');
    await v.writeFile('/n.txt', 'v0'); // same content: no new version
    expect((await v.versions('/n.txt')).length).toBe(0);
    for (let i = 1; i <= MAX_VERSIONS + 5; i++) await v.writeFile('/n.txt', `v${i}`);
    const vs = await v.versions('/n.txt');
    expect(vs.length).toBe(MAX_VERSIONS);
    await v.restoreVersion('/n.txt', 0);
    expect(await v.readText('/n.txt')).toBe(new TextDecoder().decode(vs[0]!.data));
  });
  it('reports usage in bytes', async () => {
    const v = mk();
    await v.writeFile('/a', '12345'); await v.writeFile('/b/c', new Uint8Array(10));
    expect(await v.usage()).toBe(15);
  });
});

describe('settings migration', () => {
  it('falls back to defaults on junk', () => {
    expect(migrateSettings(null).theme).toBe('neon-cyan');
    expect(migrateSettings('x').lang).toBe('en');
  });
  it('migrates v0 keys and validates values', () => {
    const s = migrateSettings({ language: 'bn', low_power: true, theme: 'nope' });
    expect(s).toMatchObject({ lang: 'bn', lowPower: true, theme: 'neon-cyan', version: 1 });
  });
  it('keeps valid v1 data', () => {
    const s = migrateSettings({ version: 1, theme: 'matrix-green', lang: 'en', lowPower: false, uiSounds: true, lastBackupAt: 5 });
    expect(s).toMatchObject({ theme: 'matrix-green', uiSounds: true, lastBackupAt: 5 });
  });
  it('adds the wallpaper default to older saved settings and rejects bad values', () => {
    expect(migrateSettings({ version: 1, theme: 'neon-cyan', lang: 'en' }).wallpaper).toBe('grid');
    expect(migrateSettings({ wallpaper: 'particles' }).wallpaper).toBe('particles');
    expect(migrateSettings({ wallpaper: 'video' }).wallpaper).toBe('grid');
  });
});
