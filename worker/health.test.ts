import { describe, it, expect } from 'vitest';
import { healthPayload } from './index';

describe('worker health', () => {
  it('reports bindings but never secret values', () => {
    const p = healthPayload({ ASSETS: {} as Fetcher, ADMIN_TOKEN: 'super-secret' });
    expect(JSON.stringify(p).includes('super-secret')).toBe(false);
    expect(p).toMatchObject({ ok: true, secrets: { adminToken: true, turnstile: false } });
  });
});
