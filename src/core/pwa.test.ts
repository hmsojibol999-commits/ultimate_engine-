import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { shouldRegisterServiceWorker } from './pwa';

describe('shouldRegisterServiceWorker', () => {
  it('registers only in production, on a secure page, when supported', () => {
    expect(shouldRegisterServiceWorker({ prod: true, hasServiceWorker: true, secure: true })).toBe(true);
    expect(shouldRegisterServiceWorker({ prod: false, hasServiceWorker: true, secure: true })).toBe(false);
    expect(shouldRegisterServiceWorker({ prod: true, hasServiceWorker: false, secure: true })).toBe(false);
    expect(shouldRegisterServiceWorker({ prod: true, hasServiceWorker: true, secure: false })).toBe(false);
  });
});

describe('web app manifest', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  it('has the fields browsers need to offer install', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });
  it('points only at icon files that exist', () => {
    for (const icon of manifest.icons as { src: string }[]) {
      expect(existsSync('public' + icon.src)).toBe(true);
    }
  });
  it('has a maskable icon', () => {
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
  });
});

describe('service worker file', () => {
  const sw = readFileSync('public/sw.js', 'utf8');
  it('never caches live endpoints', () => {
    expect(sw).toContain("'/api/'");
    expect(sw).toContain("'/s/'");
  });
});
