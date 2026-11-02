# DECISIONS

Add one entry per decision. Never delete entries. Format: date, part, decision, reason. Flag `NEEDS OWNER APPROVAL` when a spec item is cut or reduced.

## D-001 (planning)
Handoff format: one master zip per session with handoff/ folder (SPEC_ORIGINAL, SPEC_ADDENDUM, PLAN, STATUS, DECISIONS, SESSION_LOG). Reason: avoids two zips getting out of sync.

## D-002 (planning)
Voice is English only, short fixed phrases, via browser SpeechSynthesis, muted-able. Reason: Bengali voices are inconsistent across devices (owner request).

## D-003 (planning)
Characters are original artwork only. Reason: copyright and platform-ban risk.

## D-004 (planning)
Spec review risks to handle (see reference/spec-review-and-risks.md): shared free AI allowance is small so rule-based GRID is primary; IndexedDB is the default store with OPFS as optimization; Pyodide download needs a size warning; shell JS budget is tight so prefer CSS transitions and lazy-load Motion; isomorphic-git needs a CORS proxy for remotes, so state limits honestly.

## D-005 (Part 1)
wrangler.jsonc written from memory (assets.directory, binding, not_found_handling, run_worker_first as an array of routes, kv_namespaces, ai). Reason: no network in session 1. The next agent with network must verify every field against current Cloudflare docs before the first deploy. Also no package-lock.json exists yet, so `npm ci` will fail until `npm install` has been run once.

## D-006 (Part 1)
VFS uses a StorageAdapter interface; IndexedDB (idb) is the default store and MemoryAdapter is used for tests. OPFS is deferred as an optimization (matches D-004). Versions are kept inside each file record (max 20, only stored when content changes).

## D-007 (Part 1)
Settings live in localStorage under `sg.settings` with a `version` field and `migrateSettings()`; unknown or corrupt data falls back to defaults. Device id lives in `sg.deviceId`. Reason: both are tiny and needed synchronously at boot, before the VFS opens.

## D-008 (Part 1)
Window position uses translate3d on an outer element while Motion animates scale/opacity/y on an inner element. Reason: keeps dragging on transform only (spec: animate only transform and opacity). On phones only the focused window is visible and the others stay mounted (display:none) so app state survives switching. Single-instance rule: opening an app with no file re-focuses its existing window.

## D-009 (Part 1)
This session shipped NO package-lock, NO built output and NO browser check. Statuses were set to PARTIAL instead of DONE on purpose (see START_HERE rule on DONE).

## D-010 (Part 1, session 2)
Palette (F-09) and Search (F-11) share one overlay component and one ranking function (core/search.ts). Palette mode lists commands + apps; Search mode adds VFS files. Shortcuts: Ctrl/Cmd+K palette, Ctrl/Cmd+Shift+K search. Reason: one place to maintain, same keyboard behaviour, small shell bundle. Ctrl+K can clash with the browser address-bar shortcut in some browsers; we call preventDefault. If that proves annoying on a real browser, move the shortcut and record it here.

## D-011 (Part 1, session 2)
Notification history is kept in memory only (not saved to localStorage or the VFS). Reason: notices can contain file names, and nothing needs them after a reload. Cap 50, identical notice within 3 s ignored, max 3 toasts at once.

## D-012 (Part 1, session 2)
Pure logic is split from Zustand/React wrappers (core/notificationLogic.ts vs core/notifications.ts; core/commands.ts has no React). Reason: the logic can be tested in plain Node even when dependencies cannot be installed. Keep doing this for new modules.

## D-013 (Part 1, session 3)
The UI sounds toggle is NOT shown in Settings yet. Reason: there is no sound system, and a switch that does nothing would be a fake capability (START_HERE rule). The `uiSounds` field stays in the settings schema (default false). Add the toggle when sounds exist.

## D-014 (Part 1, session 3)
Boot lines are gated by real work: the 'Mounting virtual file system' line waits until `getVfs().stat('/')` finished, and 'Loading modules' waits until the app list and the first app chunk loaded. A failing step still completes (a warning notice is shown) so a broken storage never blocks the desktop. Boot length: 2 s first visit, 0.6 s repeat, 0 with reduced motion. Skip always works.

## D-015 (Part 1, session 3)
Particle wallpaper uses one canvas (not DOM nodes), seeded random for repeatable tests, device pixel ratio capped at 1.5, at most 90 particles, loop stops when the tab is hidden, and it is not mounted in Low-power mode. Reason: keep phones smooth. Canvas drawing is the only animation here that is not transform/opacity; accepted because it is one layer and stops under reduced motion.

## D-016 (Part 1, session 4)
Task manager shows only measured values. FPS comes from one requestAnimationFrame loop that stops when the window is minimized, hidden behind another card on phones, or the tab is hidden. JS memory shows only when `performance.memory` exists (Chromium); other browsers see a plain 'not available' line. Reason: START_HERE forbids fake metrics; the loop must not drain batteries.

## D-017 (Part 1, session 4)
Legal text is data (content/legal.ts), English and Bengali side by side, with tests for parity. It describes only the current build (no uploads, no AI, no cookies, Cloudflare hosting). Later parts that add uploads or AI MUST update PRIVACY in the same session and bump LEGAL_UPDATED. NEEDS OWNER APPROVAL: the wording is a plain-language starting point, not legal advice; the owner should have it reviewed before public launch.

## D-018 (Part 1, session 4)
Owner contact links are built only from real values (core/contact.ts): https links and a syntactically valid email; placeholders and empty values never become buttons. Feedback prefers `<REPO_URL>/issues/new`, else mailto. Reason: no dead or fake buttons.

## D-019 (Part 1, session 4)
The session's network policy blocked the npm registry (403 on CONNECT). The block was reported, not bypassed. Offline verification used: TypeScript syntax check of every file, a stub-module strict type check, the node:test vitest shim, and the i18n script. These do NOT replace npm install, real typecheck, lint and build, which stay the first job of the next agent that has network.

## D-020 (Part 1, session 5)
The .sgrid backup is a plain ZIP (manifest.json + files/<path>) written by our own dependency-free zip code (core/zip.ts, stored entries, no compression). Reason: spec says 'zip of VFS plus settings plus manifest version'; no zip library could be installed (network blocked) and a stored zip needs about 60 lines. Per-file version history is NOT included, only current content (keeps backups small; restoring keeps the replaced content in the file's own history). Restored files get the restore time as mtime. If compression is wanted later, swap the writer for CompressionStream('deflate-raw'); the reader already handles deflate. Reader refuses archives declaring more than 500 MB, but the check uses declared sizes only.

## D-021 (Part 1, session 5)
Backup reminder logic avoids a new settings field: it shows only when there is something to lose (files exist and: never backed up and oldest file is 7+ days old, or last backup is 7+ days old and a file changed after it). Reason: a brand-new user must not get a banner on day one, and an unchanged workspace needs no reminder. 'Later' hides the banner until the next page load. Backup paths are validated (absolute, already normalized, no '..') before anything is written.

## D-022 (Part 1, session 6)
The service worker is a hand-written public/sw.js (no Workbox, no vite-plugin-pwa): no library could be installed (network blocked) and the rules are short. Page loads are network-first (fresh deploys show at once), hashed /assets/ files are cache-first in a cache that is never deleted (so an open old tab can still load lazy chunks after an update), /api/ and /s/ are never cached. It registers only in production builds. Owner decision (session 6): the owner will build, install and test everything himself after the project is written, so agents without network should keep writing items and not stop to ask. Update SHELL_VERSION in sw.js when its behaviour changes.

## D-023 (Part 1, session 7)
The tour-seen flag lives in its own localStorage key `sg.tourSeen` (like `sg.bootSeen`), not in the Settings schema, so no settings migration is needed. If storage is blocked the tour does NOT auto-start (better than nagging on every reload); it can still be started from Help or the palette. The tour only points at the 5 Taskbar controls that exist today; add a step in design/tourLogic.ts (TOUR_STEPS) plus a `data-tour` attribute and en/bn strings when a new main control appears (Files app, GRID assistant).

## D-024 (Part 1, session 8)
Start menu layout: the app list and Recent files scroll; the About/Hire card plus the Help and Privacy and Terms buttons are pinned at the bottom. Reason: the spec wants the About card and contact buttons visible, and Parts 3 to 6 will add dozens of apps, which would push a card at the end of the list out of sight. The card never shows hire text, owner name or tagline while PROFILE values are placeholders (D-018); GitHub alone does not trigger the 'Need a tool or app built?' line. The menu is now role=dialog (not role=menu) because it holds links and sections, not only menu items. Recent files reuse Vfs.allFiles() like global search (reads every file record once per open; fine for now, add a light 'list stats only' method to the Vfs if the Files app makes workspaces big). The What's new log was NOT changed: nothing here has run in a browser yet and the log lists only things that really work.

## D-025 (Part 1, session 9)
Window keyboard controls: the desktop title bar is focusable; with the bar itself focused, plain arrows move the window by 16 px and Shift+arrows resize it from the bottom-right corner (shell/windowLogic.ts keyboardRect). Not implemented on purpose: Ctrl+arrow keyboard snap (Ctrl+Left/Right switches Spaces on macOS, Alt+Left is Back in browsers); keyboard users snap with the two title-bar buttons instead. Snap buttons are hidden when the window is narrower than 360 px so the title stays readable; maximize/restore is always there. Desktop title-bar buttons are 36 px wide (WCAG 2.5.8 asks for 24 px) instead of 44 px so five fit at the 280 px minimum window width; phones keep 44 px targets.

## D-026 (Part 1, session 9)
Shortcuts overlay: '?' toggles it (Desktop.tsx), but never while typing (inputs, textarea, select, contenteditable such as the code editor, the terminal's textarea) and never with Ctrl/Cmd/Alt, and not during the guided tour. The overlay and the Help tab read the same list (content/shortcuts.ts). Tab trapping is one helper (shell/focusTrap.ts); use it for every future dialog. Reason: one list and one trap means no drift between the screens.

## D-027 (Part 1, session 9)
Install button (F-25): the app keeps the browser's `beforeinstallprompt` event and shows its own button only when the browser really offers it. iOS has no such event, so it shows the manual 'Share > Add to Home Screen' steps; browsers with no install support get an honest 'look in the browser menu' note. No fake install button, no nagging banner. The listener is registered in main.tsx before React renders because the event can fire very early.

## D-028 (Part 1, session 10)
Workspace restore (F-17): the open windows are saved in their own localStorage key `sg.workspace` (JSON, version 1), not inside the Settings schema and not inside the .sgrid backup. Reason: it changes on every drag and is only useful on this device and screen; settings and backups should not churn or carry screen-size-specific data. Rules: back-to-front order replaces ids and z values; maximized and snapped windows are re-fitted to the current screen on restore (the saved normal size is kept so 'restore' still works); positions are clamped into the current screen; unknown or disabled apps and malformed entries are skipped one by one; at most 12 windows come back; a saved file path must be absolute with no '..' and must still exist in the VFS, otherwise the window opens without a file. No saved value = first visit = Welcome opens; a saved empty desktop stays empty. Saves wait 400 ms after the last change and also run when the tab is hidden or the page closes. Autosave starts only after restore finished so the empty startup state cannot overwrite the saved one. Not done on purpose: any in-window app state (editor cursor, terminal history) - each app will restore its own state from the VFS when it exists (Part 3).

## D-029 (Part 1, session 11)
Low-power auto-suggestion (F-04): shown as ONE info notice per device, 4 s after the boot screen, only when real signals say the device is slow (deviceMemory <= 2 or hardwareConcurrency <= 2; missing values never count) and Low-power is still off. The 'already suggested' flag lives in localStorage key `sg.lowPowerSuggested` (not in Settings, not in the backup). Blocked storage means no notice, so it can never nag on every load. The notice is plain text pointing to Settings (the notification system has no action buttons yet); the Settings and Welcome switches and the Task Manager low-FPS hint stay as they were. `shouldSuggestLowPower()` in motion.ts now delegates to `isSlowDevice()` in design/lowPowerLogic.ts, same behavior.

## D-030 (owner approval, session 11)
OWNER APPROVED (said in chat): do NOT wait for the first real build. If the network stays blocked, keep writing code for the next parts (Part 2, then 3 and on, in order) and run the build once at the end. This lifts the 'Part N+1 only after Part N is DONE' rule for as long as no network exists. Rules that stay: finish one item completely before the next, tests for all pure logic, both languages, no fake data, update STATUS.md after every item. Extra duty because of this: keep every new file small and simple, avoid new dependencies that are not already in package.json unless the part needs them (note each one in DECISIONS.md), and write down every untested UI file in the session log so the first build can fix them in one go. The moment a network exists, the FIRST job is still npm install, typecheck, lint, test, build, and fixing errors before any new feature.

## D-031 (Part 2, session 12): character picker (C-01)
Where things live: `core/characterChoice.ts` is tiny and stays in the shell bundle (ids, saved choice, first-visit rule, zustand store). Everything heavy is in the NEW folder `src/character/` (catalogue, SVG art, portrait, picker dialog) and is loaded as a lazy chunk only when the picker opens or Settings shows a portrait (addendum B.8). `src/character/` is not in the spec's folder list; it was added so the lazy chunk has one clear home (C-02 to C-05 will grow it).
Saved value: own localStorage key `sg.character` = `{"v":1,"id":"robot-b"}` or `{"v":1,"id":"none"}`; not in the Settings schema and not in the .sgrid backup (same reasoning as D-028/D-029: tiny, device-local). Consequence: restoring a backup on a new device asks for a character again.
Rules: the picker opens by itself only on a first visit AND only when the browser can really remember the choice (probe write); with blocked storage it would return on every load, so it stays closed and Settings still works for the visit. On a first visit the dialog cannot be dismissed with Esc or a backdrop click: the visitor picks a character or taps 'Continue without a character' (saved as 'none', no character shown, changeable later). When opened from Settings or the palette, Esc and Cancel close it without changes. The guided tour waits until the picker is closed (boot -> choose character -> tour, addendum C). Visitors who used an earlier build will see the picker once, because they have no saved choice.
Art: 4 styles (anime-inspired, robot, cartoon, friendly human) x 3 looks (a = masculine-looking, b = feminine-looking, c = neutral), so nobody is assumed to be a gender; the UI never labels looks by gender. Names are invented labels (Daichi, Mika, Tomo, Volt, Nova, Pixel, Bobo, Pip, Zuzu, Arif, Nila, Sam) with Bengali spellings; NEEDS OWNER APPROVAL only if the owner wants other names (edit src/character/characters.ts). All drawings are original shapes, no existing character or real person. The art is built as SVG strings from our own constants and injected with dangerouslySetInnerHTML in CharacterPortrait.tsx; this is safe because no user text ever enters the string, and a test allows only drawing elements (no script, image, use, links, event attributes). Each part (back hair, body, neck, head, eyes, brows, nose, mouth, front hair) is its own `<g data-layer>` so C-02 can swap parts; eyes already support 'open' and 'blink'.

## D-032 (Part 2, session 13): character renderer (C-02)
One `Face` = four independent options, each with a fixed list exported from characterArt.ts: eyes (open, blink, happy, wide, up), mouth (smile, grin, open, flat, frown), brows (neutral, raised, worried), hands (down, wave, point, chin, cheer). C-03 will map real events to a Face (for example surprised = wide + open + raised + cheer, worried = wide + frown + worried, thinking = up + flat + raised + chin, pointing = point, proud = happy + smile + raised + cheer). `completeFace()` fills missing or unknown values with the defaults, so callers (and a future saved-state reader) can never crash the renderer. The default face must keep looking exactly like the C-01 gallery picture; a test and a Chromium pixel comparison guard that. Layers: `arms` is drawn behind the body and `hands` on top of everything, so a raised hand can cover the face (chin) or the hair. Hands are built only from thick round-capped lines (a zero-length line is a dot), so they stay inside the allowed element list (path only) and cartoon outlines are just a wider dark line drawn first. Robots have no eyebrows: 'neutral' draws none, the other two moods light two LED bars on the screen (design choice, a robot with real eyebrows would look off-style). The pointing hand always points straight up with the viewer's right hand; the corner placement in C-05 may mirror the whole portrait with CSS when the character sits at the left. No new dependencies, no new strings.


## D-033 (Part 2, session 14): expression and gesture controller (C-03)

The character's semantic moods are `idle`, `happy`, `thinking`, `surprised`, `worried`, `proud`, and `pointing`. Real cues are `app-opened` -> pointing (1.4 s), successful task -> proud (2.1 s), warning -> surprised (1.5 s), error -> worried (2.6 s), GRID thinking -> thinking until a later response/error, and GRID answered -> happy (1.8 s). Every mood has a fixed Face using the C-02 renderer's supported options. Newer cues replace older cues; cleared timers cannot cancel a newer reaction.

Idle blinking begins only while the visible companion is mounted: a randomized 4.2–6.8 s interval, a 140 ms blink, then another interval. It pauses during reactions and is disabled under OS reduced-motion or in-app Low-power mode; turning reduced motion off resumes it. `CharacterPortrait` cross-fades face changes and uses small transform-only body motion; reduced motion disables both. No new dependency or translation key was added.

The controller and event bus stay in the small core bundle and use a shared `CharacterFace` type; SVG art remains in the lazy-loaded character chunk. Current real sources are app opens and success/warning/error notifications. GRID thinking/answer cues are exposed for C-06+ but cannot be emitted by GRID until that work exists. The character itself is still not on the desktop; C-05 will mount the controller and start idle blinking. UI animation has not been tested in the React app because npm registry DNS is unavailable; keep C-03 PARTIAL until a real build/browser check succeeds.

## D-034 (Part 2, session 15): character voice safety and first-tap policy
- C-04 uses browser `SpeechSynthesis` only; no audio files, remote TTS, paid API, or arbitrary user text are spoken.
- Voice is OFF by default (`voiceEnabled: false`) and can be enabled in Settings. This is an additive v1 settings field; old settings migrate to the safe default without changing the schema version.
- Only a fixed allowlist of short English phrases may be spoken. The voice controller refuses speech until explicitly unlocked from a real user gesture, cancels previous speech before a new phrase, and greets at most once (a muted/unsupported first attempt does not consume the greeting).
- The actual character tap-to-greet hookup belongs in C-05 when the desktop companion becomes interactive; C-04 remains PARTIAL until that wiring and browser checks are complete.
