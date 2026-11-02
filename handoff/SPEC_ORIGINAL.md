# Shadow-Grid — Master Build Prompt

A complete specification for an autonomous AI coding agent. Give the agent this entire document as one prompt.

## 0. Operating instructions

You are a senior full-stack engineer working autonomously. This document is the full specification. Read all of it before writing any code. Do not ask the owner questions: when something is ambiguous, pick the simplest option that satisfies the rules below and record it in docs/DECISIONS.md. Build, run and test your own work. Never fake data, metrics or capabilities inside the product. Your final output is one ZIP file (section 18).

## 1. Mission

Build Shadow-Grid (working name, kept in one config constant): a browser-based developer workspace that looks and behaves like a futuristic operating system. It is free to use, runs on zero-cost infrastructure, and is built by a solo developer to showcase his skill and attract clients.

- Primary users: people who code or work with AI tools on a phone, many of them beginners who find Termux hard. Secondary: desktop users.
- Positioning: zero-setup, phone-friendly coding and AI-helper workspace, easier than Termux. It is not a Linux replacement; be honest about limits.
- Emotional goal: a first-time visitor thinks 'this was built by a funded team'. Achieve it through consistency, polish, speed and clear guidance, never through fake numbers or inflated claims.
- Owner promotion is a feature (section 13).

## 2. Non-negotiable rules

1. Zero cost. Free tiers only; no credit card needed to run or deploy. Hosting: one Cloudflare Worker with Static Assets (frontend plus API in one deployment). Server storage: Workers KV only. Do not use R2 (needs a card), paid APIs or paid services.
2. Client-first. Do everything in the browser unless it truly needs a server. The backend only does three things: share links, the GRID assistant, and a health/config endpoint.
3. No login in v1. Use an anonymous device ID. Keep identity behind one small module so GitHub/Google sign-in can be added later without rewrites.
4. Honesty. No fake loading, fake stats, or claims like '100% secure' or 'unlimited'. Features the user's browser cannot support are hidden or disabled with a clear, friendly reason. Raw stack traces are never shown to users.
5. Never run user code in the shell's origin (section 15).
6. Quality over quantity. A smaller set of fully finished apps beats many half-working ones (section 16).
7. Every user-visible string exists in Bengali (bn) and English (en) through i18n.
8. Obey the out-of-scope list (section 3).

## 3. Out of scope: do NOT build

Proxy checkers or proxy tools, packet analysis, web scrapers, media or video downloaders, any server-side URL fetching or redirect inspection (SSRF risk), FFmpeg or video conversion, server-side code execution or containers, full Linux emulation, anything needing paid APIs, live ads (only a disabled placeholder slot, section 13). Reason: free hosts ban abuse-prone services, and these features would hurt the project's reputation.

## 4. Tech stack

React 18 + Vite + TypeScript (strict); Zustand for state; Motion (Framer Motion) for animation; Tailwind CSS plus CSS variables for design tokens; Lucide icons; a custom pointer-event window manager (must work with touch); CodeMirror 6 (editor, mobile friendly); xterm.js (terminal); a canvas or d3-force graph for JSON; fflate (zip); idb; marked and mermaid; Chart.js or uPlot; sql.js or the official SQLite WASM; Pyodide inside a Web Worker; isomorphic-git; pdf-lib and pdfjs-dist; tesseract.js; a QR generator plus BarcodeDetector/jsQR scanner; Prettier (standalone); Vitest.

Backend: Cloudflare Worker (TypeScript), wrangler.jsonc with static assets, a KV binding named SHARES, an AI binding named AI, Cloudflare Turnstile verification. Use current stable versions and verify configuration syntax against the official docs if network access is available, because platform syntax changes. Heavy runtimes (Pyodide, Tesseract language data) may load from their official CDNs on first use; show size and progress, and cache them with the service worker.

## 5. Repository structure

```
shadow-grid/
  src/
    shell/      windows, taskbar, start menu, palette, notifications, widgets, desktops
    core/       vfs, eventBus, workers, settings, identity, i18n, capabilities, registry
    apps/       one folder per app: manifest.ts plus a lazy entry
    design/     tokens.css, themes, motion.ts, icons, wallpapers
    config/     profile.ts (owner details, placeholders), site.ts
    content/    lessons, command help, error-explainer table, sample data, pattern library
  worker/       index.ts, share.ts, assistant.ts, security.ts
  public/       manifest, icons, robots.txt
  scripts/      generate-seo-pages.ts
  docs/         DECISIONS.md, QA.md, ARCHITECTURE.md
  STATUS.md  README.md  wrangler.jsonc  .env.example
```

## 6. Architecture

- Shell: window manager (drag, resize, minimize to taskbar, maximize, snap left/right/top, focus order, z-index), taskbar, start menu, command palette, notification center and toasts, desktop widgets, multi-desktop, global search (files, apps, commands), theme and wallpaper manager, an error boundary around every window.
- Core services shared by all apps: VFS (OPFS with IndexedDB fallback; folders, files, versions, zip import/export); event bus (apps open files in other apps); worker pool (Python, SQL, OCR, compression, graph layout); settings and workspace persistence with a versioned schema and migrations; identity (anonymous device id); i18n; capability detection.
- Apps are plugins. Each has manifest.ts with: id, names (bn/en), description, icon, category, defaultSize, opens (file extensions), keywords, enabled flag, lazy import. Adding an app means adding one folder.
- File associations: .json graph, .csv dashboard, .py Python, .sql SQLite, .md markdown, .html and .zip live preview, images image tools, .pdf PDF tools, .txt editor.
- Heavy modules load only when their app opens.

## 7. Design system

Tokens: bg-0 #05070d, bg-1 #0b0f19, bg-2 #111827, glass surface rgba(15,23,42,0.62) with backdrop blur, border rgba(0,243,255,0.18), accent #00f3ff, accent-2 #3b82f6, accent-3 #a78bfa (rare), success #34d399, warning #fbbf24, danger #f87171, text #e6f1ff, text-dim #8aa0b8. Text contrast at least 4.5:1. Four themes: Neon Cyan (default), Deep Violet, Matrix Green, High Contrast. Glow only on focus, active states and key accents, never everywhere.

Typography: system UI stack with Bengali-capable fallbacks (self-host Noto Sans Bengali if the build can fetch it); a monospace stack for code. One icon set (Lucide), one radius scale, one 4px spacing scale.

Motion system (CSS variables plus one motion.ts file used everywhere): durations 120ms (hover, press), 220ms (windows, menus, tabs), 420ms (boot, large transitions); two easings: out cubic-bezier(0.22,1,0.36,1) and in-out cubic-bezier(0.65,0,0.35,1). Animate only transform and opacity. Every interactive element has four states: default, hover (soft glow), pressed (scale 0.97), disabled. Animation is required on: window open, close, minimize-to-taskbar and restore; focus change (unfocused windows dim slightly); tab switches; menus and tooltips; toasts; loading (skeletons, progress); empty and error states; file drag-over drop zones; terminal output; JSON graph node entrance and selection; every button. Do not add more than a subtle cue to things users do dozens of times a minute (typing, scrolling, saving). Animation never blocks input. Respect prefers-reduced-motion and provide an in-app Low-power mode that reduces wallpaper and effects (suggest it automatically on slow devices).

Mobile: below 768px each window becomes a full-screen card with a bottom app switcher and swipe to switch; use dvh and safe-area insets; handle the on-screen keyboard with visualViewport; touch targets at least 44px; nothing depends on hover. Editor and terminal get an extra-key bar (Tab, Ctrl, Esc, arrows, brackets, quotes, pipe).

Accessibility: roles and labels on windows, visible focus rings, full keyboard navigation, focus trap in dialogs, a shortcuts overlay (press ?).

## 8. Shell features

- Boot sequence (about 2 seconds): terminal-style lines such as 'Initializing Shadow-Grid...', 'Mounting virtual file system...', 'Loading modules...' that reflect real steps, plus 'Built by OWNER\_NAME'. Skippable, shortened on repeat visits.
- Guided tour (about 60 seconds, spotlight style, skippable, replayable from Help).
- Start menu: apps by category, recent files, About card (section 13).
- Command palette (Ctrl+K; a visible button on phones) for apps, files, commands, settings.
- Task manager window with real data only: measured FPS, storage usage, online/offline, open windows, memory if the browser exposes it.
- Widgets: clock, storage meter, quick note, recent files. Multi-desktop. Snap layouts on desktop. Notification center.
- Settings: theme, wallpaper (animated particles or grid), language, low-power mode, UI sounds (off by default), reset, backup and restore.
- Workspace restore: windows, positions, open files.
- The `demo` command and a Start-menu entry run a 30-second scripted showcase (windows open, JSON blooms into a graph, OCR extracts text, a share link appears). Deterministic and skippable. This is the owner's recording tool for promotion.

## 9. Apps

### Group A: Workspace

1. Files: VFS explorer with folders, rename, move, drag and drop between windows, import and export, last 20 versions per file with restore, multi-select, search.
2. Code editor: CodeMirror 6, multi-file tabs, highlighting (HTML, CSS, JS/TS, JSON, Python, Markdown, SQL), mobile extra-key bar, format and minify, find and replace, autosave to VFS, 'Ask GRID' about the selection.
3. Live Preview (flagship): editor and preview side by side (stacked on phones) with instant update. Inputs: paste or type HTML/CSS/JS, open a VFS project, or upload a ZIP of a static site (build output such as dist). Render in a sandboxed iframe (section 15) by resolving relative assets from the ZIP or VFS into blob URLs. Include device frames (phone, tablet, desktop, custom size), rotate, zoom-to-fit, reload, a console panel (log, warn, error via postMessage), error line highlighting with a plain-language explanation. If a project needs a Node server, PHP, a database or a build step (package.json without dist), explain clearly what to do. Stretch only: a virtual server through a Service Worker on a separate preview origin.
4. Terminal: xterm.js over the VFS with a simulated shell (not real Linux). Commands: help, ls, cd, pwd, cat, mkdir, touch, rm, cp, mv, echo, grep, tree, open, run, preview, share, pack, format, tokens, explain, tutorial, theme, clear, history, about, projects, hire, demo. Provide 'Did you mean...' suggestions, tab completion, history, and `explain COMMAND` in plain language. Above the keyboard show ready-made action chips (Compress image, Format JSON, Pack project for AI, Share file) that insert or run the command and display the exact command used so the user learns it. The help text states honestly what a browser terminal cannot do.

### Group B: Data

5. JSON graph (flagship visual): paste or open JSON; layout in a Web Worker; neon glowing nodes with animated entrance; touch pan and zoom; search; collapse and expand; selecting a node shows its path and value with copy-path; large-data protection (auto-collapse beyond a node limit, with a warning); export PNG or SVG.
6. CSV dashboard: detect column types, suggest charts (bar, line, pie, histogram), filter and sort a virtualized table, export PNG.
7. SQLite: import CSV or JSON into tables, run SQL, results table, simple chart, export DB or CSV.
8. Python: Pyodide in a Worker, lazy load with progress, stdout/stderr console, supported-package loader, run and stop buttons (terminate the worker), friendly messages for unsupported things (input(), sockets).
9. Markdown preview with Mermaid diagrams.

### Group C: Developer tools

Regex tester with a ready-made pattern library (email, phone, URL, date) and an explanation; cron explainer; timestamp and timezone converter; px to rem; curl to fetch; text and JSON diff; JSON/YAML/CSV converter; JSON to TypeScript types; mock data generator; SVG viewer and optimizer; favicon and app-icon generator (ZIP of all sizes); social preview (OG tags) simulator; color tools (palette from an image, contrast checker, gradient, glass, neon and shadow generators with live preview and copy CSS); accessibility and performance checker for the previewed page (alt text, contrast, heading order, size); hash, UUID, Base64, JWT decode and HS256 sign, AES-256-GCM encrypt and decrypt (Web Crypto), password generator. P2: API tester with a clear CORS explanation; Git (isomorphic-git on the VFS: init, status, commit, branch, diff, log, push and pull to GitHub with the user's own token stored locally and a clear warning).

### Group D: Media and documents

Image tool: resize, crop, compress, convert to WebP/JPEG/PNG, strip EXIF and location data with a visible before/after. OCR: English and Bengali, lazy-loaded with progress, best effort with confidence shown. Table image to CSV (best effort, labelled approximate). PDF tools: merge, split, images to PDF, PDF to text or markdown. QR generator and scanner.

### Group E: AI helper tools

- Project packer: choose a folder or ZIP and get one text file with the file tree plus every file under a header; respects an ignore list (node\_modules, .git, binaries, lockfiles); shows size and approximate tokens; optional split into parts; one-click share link or copy.
- Diff applier: paste an AI answer as a unified diff, search/replace blocks, or full-file blocks with filename headers; preview per-file diffs; apply with undo (VFS versions).
- Token counter: approximate (labelled as such) plus a trimmer that removes comments and blank lines (best effort for JS, CSS, HTML, Python).
- Long-text splitter: parts of a chosen size labelled 'Part 1/N' with an instruction line and a copy button per part.
- Log summarizer: dedupe repeated lines, collapse stack traces, highlight errors and warnings, export a short version.
- Prompt builder: a guided form (goal, context, constraints, output format) that produces a well-structured prompt, plus a local prompt library.
- Document and PDF to clean text.

### Group F: Everyday and Bangla

Notes, to-do, Pomodoro, calculator, unit converter, text tools (case, word count). Bangla tools: Bijoy to Unicode and back (tested mapping table; say in the UI if rare conjuncts may convert imperfectly), numbers to Bangla digits and to Bangla words including taka amounts (Bangla number words 0-99 are irregular, so use a complete table and unit tests), Bangla date converter (Bangladesh revised calendar rules; document the rule used; P2).

### Group G: Learn and guidance

A Learn window with interactive lessons (Regex, Git basics, HTTP status codes, JSON, terminal basics, CSS flex and grid), each with runnable examples and locally saved progress. A rule-based plain-language error explainer (table of common JS, Python and CSS errors with cause and fix) applied automatically in the editor, preview and Python consoles. A contextual tips engine (rule-based, dismissible, rate-limited, for example suggesting compression for a large image). A 'Try with sample data' button in every empty state. 'Did you mean' for commands. A What's new log and a feedback button.

## 10. Share links (AI Share)

Purpose: people cannot paste huge text or unlimited images into AI chats. They upload here and give any AI or person a link.

- Types: image, long text, ZIP or project bundle, code file. Upload from the app or from any file via a Share action.
- Images are compressed in the browser first (about 2000px maximum, WebP or JPEG), with EXIF stripping on by default. ZIPs are opened in the browser: the file tree plus text contents become one readable bundle; binary files are listed but not stored.
- Retention: default 10 minutes; selectable 10 min, 1 hour, 24 hours. Show a countdown. 'Extend' (maximum 3 times) and 'Delete now'. Expiry uses KV expirationTtl (minimum 60 seconds). Creation returns a secret delete token; only its hash is stored.
- URLs: /s/{id} reader page (HTML); /s/{id}/raw plain text with ?part=N pagination (about 20,000 characters per part; the header states total parts and how to request the next); /s/{id}/image direct image (images only). Every page carries a short 'how to read this' note for AI tools. Provide a 'Copy message for your AI' button that produces a ready sentence containing the link and reading instructions.
- Image pages show the image, the OCR text extracted in the browser before upload (optional), and size and type. Be honest in the UI: some AI tools cannot open links or view images; in that case use the text link.
- Limits: per-item cap (default 5 MB; verify the KV value limit in the docs). The daily KV write allowance on the free plan is small, so catch KV errors and show a friendly 'daily limit reached, try tomorrow'. Do not spend KV writes on rate-limit counters: use Turnstile plus Cloudflare's rate limiting binding if it is available on the free plan, otherwise Turnstile only, and document the choice.
- Safety: random 128-bit ids; validate type by magic bytes (png, jpeg, webp, gif; no SVG); text served as text/plain with nosniff; never render uploaded HTML; X-Robots-Tag noindex; Referrer-Policy no-referrer; takedown through an admin endpoint protected by the ADMIN\_TOKEN secret; a visible Report link on every share page (opens a prefilled contact link, no extra storage). The upload screen warns: anyone with the link can view it, do not upload sensitive items.
- Expired or missing links show a friendly page explaining expiry, with a link back to the app. KV is eventually consistent, so show a short 'preparing link' state and retry the first fetch.
- Every share page has the branding footer (section 13).

## 11. GRID assistant

- A small in-app helper, not a chatbot product: short answers, short memory (last 4 messages), capped output (about 300 tokens), no long conversations. It guides use of the OS, suggests and opens the right tool, explains errors, summarizes short text, writes regex, and answers simple everyday questions. For medical, legal or financial questions it gives general information only and recommends a professional.
- Backend POST /api/assistant: validate the Turnstile token, validate and trim input, call env.AI.run with a small free text-generation model. Look up currently available models in the Cloudflare docs instead of hard-coding old ones, and keep the model name in one config constant. The system prompt is generated from the app registry so GRID knows every app, command and how-to. It replies in the user's language (bn or en), concisely, and may return an action such as open-app:ID.
- Budget: the free allowance is shared by all visitors (about 10,000 neurons per day; verify), so enforce per-device daily limits and, when the shared budget runs out or any error occurs, fall back to a rule-based helper (keyword intent matching over the app registry, FAQ answers) with a friendly 'assistant is resting, try later' note. Every feature of the OS works without AI.
- Presentation: a terminal-style panel (status lines like \[GRID\] analyzing..., typewriter text that is instant under reduced motion), action buttons under answers (for example Open Regex Tester), an 'Ask GRID' button in every app window header, and contextual tips that are never intrusive.
- Do not store or log message content.

## 12. Identity, privacy, backup

- Anonymous device id in local storage. No cookies.
- Export workspace as one .sgrid file (zip of VFS plus settings plus manifest version); import validates the version. Request navigator.storage.persist(). Browser storage can be evicted (especially Safari), so show a backup reminder banner if there has been no backup in 7 days.
- Privacy page: data stays on the device; the server holds share content only until expiry; assistant messages are not stored. Terms and abuse-policy page.
- Future, behind disabled flags only: GitHub/Google sign-in, sync to the user's own Gist or Drive, live collaboration.

## 13. Owner promotion layer

- config/profile.ts holds OWNER\_NAME, TAGLINE, WHATSAPP, TELEGRAM, EMAIL, GITHUB\_URL, REPO\_URL as clearly marked TODO placeholders. Never invent real contact details.
- Placements: boot credit; Start-menu About/Hire card with contact buttons; terminal commands about, projects, hire; footer on every share page ('Shared via Shadow-Grid · built by OWNER\_NAME' plus 'Need a tool or app built? Contact me'); a small CTA on tool landing pages; feedback button; GitHub link. Unobtrusive: no popups, no nagging.
- An AdSlot component exists but is disabled by a config flag. It is intended only for share pages and tool landing pages, never the desktop. Do not integrate any ad network.

## 14. SEO and static landing pages

scripts/generate-seo-pages.ts creates a static page per app: English at /tools/SLUG/ and Bengali at /bn/tools/SLUG/, each with a unique title, meta description, OG and Twitter tags, JSON-LD, a short helpful explanation, and a button that opens the app inside the OS (/#open=SLUG). Also sitemap.xml, robots.txt and hreflang. The home page has proper meta tags and an OG image generated at build time. Share pages are noindex.

## 15. Performance, compatibility, security

- Performance: shell JavaScript budget about 250 KB gzip; lazy-load every app; Web Workers for heavy work; virtualized lists; LCP under 2.5 s on a mid-range phone over 4G; 60 fps window dragging; report bundle sizes in the README.
- Compatibility: test matrix iOS Safari, Android Chrome, desktop Chrome and Firefox. A capabilities.ts feature-detection module (OPFS, vibrate, File System Access, BarcodeDetector); OPFS falls back to IndexedDB; vibration only where supported. Test at 360x640.
- Security: strict CSP on the shell. User-code preview runs in a sandboxed iframe (sandbox='allow-scripts allow-forms allow-modals allow-popups', never allow-same-origin) with HTML and CSS rewritten to blob URLs. Share content is never rendered as HTML on the main origin, only as escaped text or validated images. nosniff and Referrer-Policy no-referrer everywhere. Secrets only as Worker secrets (ADMIN\_TOKEN, TURNSTILE\_SECRET); none in the repository. User API tokens (such as GitHub) live only in local storage with a clear warning. Analytics must not need cookies (an optional Cloudflare Web Analytics snippet behind config).

## 16. Workflow and priorities

Priorities. P0 (must ship): shell, design system, VFS, boot, tour, Files, editor, Live Preview, terminal, JSON graph, AI Share, GRID assistant, owner promotion, backup and restore, PWA, i18n, demo command. P1: CSV dashboard, SQLite, Python, Markdown, Group C core tools, Group D, Group E, Group F (except Bangla date), Learn, error explainer, tips. P2: Git, API tester, Bangla date, QR, widgets, multi-desktop, social preview, a11y and performance checker, favicon generator. P3 stretch (only after everything else is polished): pipeline canvas that chains tools, file time-travel slider, Service Worker virtual server, live collaboration, Gist sync, GitHub sign-in.

Phases:

1. Phase 0: scaffold, tooling, scripts (typecheck, lint, test, build), wrangler config, design tokens.
2. Phase 1: shell, window manager (desktop and mobile), VFS, boot, tour, start menu, palette, settings, backup and restore, PWA, i18n, promotion layer.
3. Phase 2: editor and Live Preview, terminal, JSON graph, share links (backend and UI), demo.
4. Phase 3: GRID assistant, AI helper tools, Learn, error explainer, tips.
5. Phase 4: data and developer tools, image, PDF and OCR, Bangla and everyday tools.
6. Phase 5: P2 items, SEO pages, performance pass, accessibility pass, QA across viewports.
7. Phase 6: README, docs, STATUS.md, final verification, ZIP.

Rules: after each phase run typecheck, lint, tests and build, and fix failures before moving on. Finish each app completely, with loading, empty, error, success and offline states, before starting the next. Hide unfinished apps with enabled:false so users never see a broken app. If you are running low on budget, finish the current app, stop adding features and record the rest in STATUS.md. Write unit tests for the VFS, command parser, share worker logic, Bijoy converter, number-to-words, diff applier and project packer.

## 17. Definition of done

1. A fresh phone-size load shows boot, tour and desktop with no console errors.
2. Every enabled app has loading, empty (with a sample-data button), error and success states.
3. Every clickable element uses the shared hover, press and focus states and motion tokens.
4. Both languages are complete and switching is instant.
5. Backup export and import round-trip a whole workspace.
6. The share-link round trip works: upload, reader page, raw parts, image link, extend, delete, expiry page.
7. Live Preview renders a pasted page and a ZIP with relative CSS, JS and images correctly, inside the sandbox.
8. GRID answers and can open apps, and the fallback works when AI is unavailable.
9. Owner promotion appears in every place listed in section 13, with placeholders documented.
10. SEO pages and a valid sitemap are generated.
11. typecheck, lint, tests and build pass, and bundle sizes are reported.
12. No out-of-scope feature exists, no fake data, no secrets in the repository.

## 18. Final deliverable

When everything is finished and verified (npm ci, typecheck, lint, test and build all pass), create shadow-grid-v1.zip containing the full source (exclude node\_modules, dist, .wrangler and .env). Include README.md (English plus a short Bengali deployment section covering: create a Cloudflare account, create the KV namespace, add the secrets, set the Turnstile keys, wrangler deploy, connect the GitHub repository for automatic deploys, and how to edit config/profile.ts), docs/, STATUS.md (done, partial, not started, stated honestly) and .env.example.

Then reply with: the path of the ZIP, a summary of about 10 lines, anything partial, and the exact deploy commands. If you cannot create a ZIP with your tools, say so plainly and output the complete file tree and all files in as few messages as possible. Do not stop before the ZIP exists, and do not ask the owner for input along the way.
