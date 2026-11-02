// Cloudflare Worker entry. Part 1 only exposes /api/health. Share and assistant routes come in Parts 2 and 4.
export interface Env {
  ASSETS: Fetcher;
  SHARES?: KVNamespace;
  AI?: unknown;
  APP_NAME?: string;
  ADMIN_TOKEN?: string;
  TURNSTILE_SECRET?: string;
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
};

export function healthPayload(env: Env): Record<string, unknown> {
  // Reports only which bindings exist. Never returns secret values.
  return {
    ok: true,
    app: env.APP_NAME ?? 'Shadow-Grid',
    bindings: { shares: Boolean(env.SHARES), ai: Boolean(env.AI) },
    secrets: { adminToken: Boolean(env.ADMIN_TOKEN), turnstile: Boolean(env.TURNSTILE_SECRET) },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify(healthPayload(env)), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SECURITY_HEADERS },
      });
    }
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ ok: false, error: 'not_found' }), {
        status: 404, headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS },
      });
    }
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
    out.headers.set('Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
      "font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'");
    return out;
  },
};
