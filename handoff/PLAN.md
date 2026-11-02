# PLAN: 7 parts

All item IDs and statuses live in STATUS.md. Section numbers refer to SPEC_ORIGINAL.md. Do parts in order. A part is finished only when every item in it is DONE (or DISABLED with a reason in DECISIONS.md and owner approval).

## Part 1: Foundation (prefix F-)
Scaffold, tooling, wrangler, design tokens and themes, motion system, window manager (desktop and mobile), taskbar, start menu, command palette, notifications, global search, settings, VFS, identity, i18n, capabilities, boot, tour, task manager, backup/restore, PWA, owner promotion layer, privacy and terms pages, accessibility basics, security headers, health endpoint.
Spec: sections 4 to 8, 12, 13, 15.

## Part 2: Character and GRID assistant (prefix C-)
Character picker, character art and expressions, English voice, hint bubbles, rule-based GRID, GRID panel, Ask GRID buttons, /api/assistant with Workers AI and fallback, daily limits, error explainer, tips engine.
Spec: section 11 and SPEC_ADDENDUM section B, plus the error explainer and tips from section 9 Group G.

## Part 3: Core workspace apps (prefix W-)
Files, code editor, Live Preview (flagship), terminal, JSON graph (flagship), file associations, mobile extra-key bar.
Spec: section 9 Group A and item 5 of Group B, plus section 15 (preview sandbox).

## Part 4: Share links and AI helper tools (prefix S-)
Worker share API, reader pages, raw and image endpoints, retention and extend/delete, security, admin takedown, Turnstile, plus project packer, diff applier, token counter, splitter, log summarizer, prompt builder, document-to-text.
Spec: section 10 and section 9 Group E.

## Part 5: Data and developer tools (prefix D-)
CSV dashboard, SQLite, Python (Pyodide), Markdown with Mermaid, and all P1 developer tools of Group C.
Spec: section 9 Groups B (items 6 to 9) and C.

## Part 6: Media, documents, everyday, Bangla, Learn (prefix M-)
Image tool, OCR (English and Bengali), table-image-to-CSV, PDF tools, QR, notes/to-do/Pomodoro/calculator/converters/text tools, Bijoy converter, Bangla numbers and taka words, Learn lessons, sample-data buttons in every empty state.
Spec: section 9 Groups D, F (except Bangla date) and G.

## Part 7: P2, polish, SEO, delivery (prefix Z-)
Favicon generator, social preview, accessibility and performance checker, API tester, Git, Bangla date, widgets, multi-desktop and snap layouts, the `demo` command, SEO pages and sitemap, performance pass, accessibility pass, QA matrix, README (with Bengali deployment section), docs, final verification, `shadow-grid-v1.zip`. P3 stretch items only after everything else is DONE.
Spec: sections 14, 16, 17, 18.

## Cross-cutting rules (apply in every part)
- Every app: loading, empty (with sample-data button), error, success and offline states; both languages; shared hover/press/focus states and motion tokens.
- Unfinished apps are hidden with enabled:false, never shown broken.
- Tests required for: VFS, command parser, share worker logic, Bijoy converter, number-to-words, diff applier, project packer.
