# START HERE: instructions for every AI agent working on Shadow-Grid

You are one agent in a relay. Other agents worked before you; others will work after you. The owner is a "vibe coder" (not a programmer) with limited usage limits, so the relay only works if you follow this file exactly. Speak to the owner in simple Bengali (Bangla), short and clear. Code, comments and docs stay in English.

## 1. Reading order (do this before writing any code)
1. `handoff/STATUS.md`: what is done, partial, not started. This is the truth.
2. `handoff/PLAN.md`: the 7 parts and what each contains.
3. `handoff/SPEC_ADDENDUM.md`: the owner's extra vision (character assistant, voice, feelings). It overrides the original spec where they conflict.
4. `handoff/SPEC_ORIGINAL.md`: the full original specification. Never edit it.
5. `handoff/DECISIONS.md` and `handoff/SESSION_LOG.md`: past choices and sessions.
6. `reference/`: an early prototype and a risk review. Reference only; rebuild properly in React + Vite + TypeScript as the spec says.

Then tell the owner in 3 to 5 Bengali lines: which part you are on, which items you will do now.

## 2. Rules that prevent things from being dropped
- Every feature has an ID in `STATUS.md` (for example F-05, W-03). **Never delete or rename an ID.** Only change its status: `NOT_STARTED`, `IN_PROGRESS`, `PARTIAL`, `DONE`, `DISABLED` (built but hidden with enabled:false).
- `DONE` means: works, tested in the browser or by tests, has loading/empty/error/success states, both languages, and passes the spec's definition of done for that item. Anything less is `PARTIAL` with a one-line note on what is missing.
- You may not cut, merge or simplify a feature on your own. If something truly cannot be done (platform limit, cost, safety), mark it `PARTIAL`, write the reason in `DECISIONS.md`, and add `NEEDS OWNER APPROVAL` so the next session asks the owner.
- Do not start Part N+1 items until Part N is `DONE`, unless the owner says so. Within a part, finish one item completely before the next.
- Do not rewrite or "clean up" finished work from earlier agents unless a bug requires it. Record bug fixes in the session log.
- Never fake data, metrics or capabilities. Never add out-of-scope features (original spec section 3). No secrets in the repository.
- Original characters only. Never use copyrighted anime, game or cartoon characters.

## 3. How to work and when to stop
- Work in small steps. After each finished item: run typecheck, lint, tests and build (if your tools allow), fix failures, then update `STATUS.md` immediately.
- Your usage limit can end at any time. So keep `STATUS.md` current after every item, not only at the end.
- When you notice you are running low (long session, limit warnings, slow responses): **stop starting new items**. Finish or safely park the current one (mark it `PARTIAL` with exact notes: file names, what works, what is next).
- If you cannot run commands or create files, say so plainly and output the changed files in full, plus the updated handoff files.

## 4. Delivery at the end of every session (mandatory)
1. Update `handoff/STATUS.md` (every item's status and notes) and add a block at the top of `handoff/SESSION_LOG.md` using the template there.
2. Add any new choices to `handoff/DECISIONS.md`.
3. Create ONE zip named `shadow-grid-master-vN.zip` (N = previous N + 1) containing the whole project: source, `handoff/`, `reference/`, `START_HERE.md`. Exclude node_modules, dist, .wrangler, .env.
4. Present the zip to the owner. Then reply in Bengali with: what you finished (item IDs), what is partial, what the next agent will do, and exactly how to continue: "Upload this zip to a new session and paste the text from NEXT_AGENT_PROMPT.md".
5. When Part 7 is fully DONE, also produce `shadow-grid-v1.zip` as described in original spec section 18.

## 5. Tools and environment notes
- Prefer an agent environment with a terminal and network (for npm install, tests, build). If you have no network, write code carefully, say that you could not run the build, and list what the owner should test.
- Deployment target: GitHub repo connected to one Cloudflare Worker with static assets; free plan only. Verify wrangler syntax against current Cloudflare docs when you can.

## 6. Quality bar
The owner wants visitors to feel this is built by a funded team: consistent design, smooth motion, clear guidance, honest limits. Follow the design tokens and motion rules in the original spec section 7 and the character vision in the addendum. Finish fewer things completely rather than many things halfway.
