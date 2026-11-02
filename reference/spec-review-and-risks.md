# Shadow-Grid: spec review and phase prompts

## Part 1. Spec review

**Risks to fix before building**

1. **Scope vs. one developer.** P0 alone is about 15 major pieces. P1 adds roughly 30 more apps. Treat P0 as v1 and ship it before touching P1.
2. **Shell budget.** A 250 KB gzip shell with React, Motion, Zustand and Tailwind is tight. Motion alone is large. Use CSS transitions for windows and keep Motion for a few moments only, or drop it.
3. **Workers AI free allowance.** About 10,000 neurons a day is shared by every visitor. It can run out within minutes after one viral post. The rule-based fallback must be built first and treated as the primary experience.
4. **iOS Safari.** OPFS support is partial and storage can be evicted. Make IndexedDB the tested default and OPFS an optimization. The 7-day backup banner matters more than the spec suggests.
5. **Pyodide on phones.** The download is around 10 MB or more, and it is memory hungry on low-end Android. Gate it behind a clear size warning and a capability check.
6. **Turnstile on every assistant call.** This adds friction. Verify once, issue a short-lived signed token, and reuse it for a session.
7. **Share links and abuse.** KV values are capped at 25 MiB, and anonymous upload invites abuse. Set a small size cap (for example 1 MB text, 2 MB image), rate-limit per IP and device, and keep the delete token secret.
8. **Contradiction.** Section 15 says the shell's CSP is strict, but Pyodide, Tesseract and Mermaid load from CDNs. List the exact allowed hosts and record them in DECISIONS.md.
9. **Preview iframe.** `allow-popups` plus `allow-modals` lets previewed code open popups. Keep them, but add `allow-popups-to-escape-sandbox` only if needed.
10. **Out-of-scope vs. OCR/PDF/Git.** isomorphic-git needs a CORS proxy for most remotes. Without one, only local repos and zip-based flows are possible. State that honestly in the app.

**Suggested cuts for v1**

Remove: multi-desktop, widgets, social preview, favicon generator, Bangla date, pipeline canvas, time-travel slider. Keep them as P3.

**Suggested order inside P0**

Shell → VFS → editor → Live Preview → backup/restore → terminal → JSON graph → share links → GRID (rule-based first, AI second) → PWA → promotion layer.

---

## Part 2. How to use these prompts

1. Put the full spec in the repo as `SPEC.md`.
2. Run the prompts below one at a time in Claude Code. Do not start the next one until the previous one passes typecheck, lint, tests and build.
3. If a session gets long, start a fresh one and begin with the "Resume" line.

**Resume line (paste at the start of any new session)**

> Read SPEC.md, STATUS.md and docs/DECISIONS.md. Continue from the first unfinished item in STATUS.md. Do not redo finished work.

---

## Part 3. Phase prompts

### Phase 0: Scaffold

> Read SPEC.md fully. Do only Phase 0 (section 16): scaffold React 18 + Vite + TypeScript strict, Tailwind with the design tokens from section 7, Zustand, Vitest, ESLint, scripts for typecheck/lint/test/build, the folder structure from section 5, wrangler.jsonc with static assets and the SHARES KV and AI bindings, and empty docs/DECISIONS.md, STATUS.md, docs/ARCHITECTURE.md. Verify wrangler syntax against current Cloudflare docs if you have network access. Run all scripts and fix failures. Record every ambiguous choice in DECISIONS.md. Stop when done and update STATUS.md.

### Phase 1: Shell and core

> Do only Phase 1. Build the window manager with pointer events (touch-first, full-screen windows below 640 px), taskbar, start menu, command palette, notifications, settings with versioned schema and migrations, VFS (IndexedDB first, OPFS as an optimization), identity module, i18n (bn/en, every string), capabilities.ts, boot sequence, first-run tour, backup export/import as .sgrid, PWA with service worker, and the owner promotion layer with placeholders in config/profile.ts. Add an error boundary per window. Write unit tests for the VFS. Verify at 360x640. Update STATUS.md.

### Phase 2: Editor, preview, terminal, graph, sharing

> Do only Phase 2. Build the Files app, CodeMirror editor, Live Preview (sandboxed iframe, never allow-same-origin, relative CSS/JS/images rewritten to blob URLs, ZIP support), xterm terminal with the command parser and the about/projects/hire/demo commands, JSON graph, and the share-link system: worker/share.ts with KV, size caps, expiry, delete token, rate limits, Turnstile, reader page with raw parts, image links, extend, delete and expiry page. Share content is never rendered as HTML. Unit-test the command parser and share worker logic. Update STATUS.md.

### Phase 3: GRID, Learn, tips

> Do only Phase 3. Build the rule-based helper first (keyword intent matching over the app registry plus FAQ), then POST /api/assistant with Turnstile token reuse, per-device daily limits, the system prompt generated from the registry, and Workers AI with a model name kept in one constant (check current free models in the docs). Fall back to the rule-based helper on any error. Add the terminal-style panel, action buttons, Ask GRID in every window header, Learn lessons, the error explainer table and contextual tips. Do not store or log message content. Update STATUS.md.

### Phase 4: Tools (P1)

> Do only Phase 4. Implement P1 apps one at a time, finishing each with loading, empty (with sample data), error, success and offline states before the next: CSV dashboard, SQLite, Python (Pyodide in a worker, with size warning), Markdown, then the Group C/D/E/F tools in the order the spec lists them. Set enabled:false for anything unfinished. Write tests for the Bijoy converter, number-to-words, diff applier and project packer. Update STATUS.md after each app.

### Phase 5: P2, SEO, performance, accessibility

> Do only Phase 5. Build the P2 items only if the P1 list is fully finished. Then write scripts/generate-seo-pages.ts (EN and BN pages, sitemap, robots, hreflang, JSON-LD, OG image), run a performance pass against the budgets in section 15 and report real bundle sizes, run an accessibility pass (focus, contrast, reduced motion, screen reader labels) and QA at 360x640, tablet and desktop. Record results in docs/QA.md.

### Phase 6: Docs and delivery

> Do only Phase 6. Write README.md (English plus the short Bengali deployment section from section 18), finish docs/ and STATUS.md honestly (done, partial, not started), confirm there are no secrets in the repo and no out-of-scope features, run npm ci, typecheck, lint, test and build, then create shadow-grid-v1.zip excluding node_modules, dist, .wrangler and .env. Reply with the ZIP path, a 10-line summary, anything partial, and the exact deploy commands.
