# Spec Addendum: owner's extra vision

Authority: this addendum extends `SPEC_ORIGINAL.md` and wins where they conflict. Nothing here removes anything from the original.

## A. The owner's goal
This is not a business product. The owner wants to catch people's attention and make visitors think "wow, what is this?". Emotion, character and polish matter as much as features. Still obey the honesty rules: no fake numbers, no fake capabilities.

## B. Character assistant (new core feature, part of GRID)
1. **First visit:** after boot, the visitor chooses a character to work with. Show a gallery with styles: cute anime-style, futuristic robot, cartoon, and a friendly "normal" human style. Do not assume the visitor's gender; let them pick freely (offer a few male-looking, female-looking and neutral options in each style). The choice is saved locally and can be changed in Settings.
2. **Originals only.** Characters are designed by us (layered SVG or CSS art with swappable eyes, mouth, brows, hands). No copyrighted characters, no existing anime or game IP, no photos of real people.
3. **Placement:** a small character sits at a corner of the screen (movable, can be minimized to an icon). It must never block windows or typing on a phone.
4. **Role:** helper, not a chat toy. It appears to guide: greets, points at the right tool, explains errors, offers tips, celebrates a finished task. Detailed answers use the GRID panel. The character's hint bubbles are rate-limited and dismissible.
5. **Expressions and gestures** (tied to real events): idle with blinking, happy, thinking (while GRID answers), surprised, worried (errors), proud (success), pointing (to a button or app). Smooth transitions; static pose under reduced motion.
6. **Voice:** English only. Use the browser SpeechSynthesis API with short fixed phrases (for example "Hi, I'm your assistant. Tap me if you need help."). Browsers block audio until the visitor taps once, so the first greeting plays after the first tap. Voice is optional, with a mute toggle in Settings and on the character. No Bengali voice, and Bengali bubble text is not spoken.
7. **Brain:** the same GRID assistant described in original spec section 11 (rule-based first, Workers AI second, daily limits, fallback). The character is the face and body of GRID.
8. **Performance:** character art is lazy-loaded after the desktop is interactive; it must not hurt the shell's JavaScript budget.
9. **Future (disabled flags only):** 3D or Live2D animation, more voices, character shop.

## C. Presentation and design ambition
- Everything should feel premium and cinematic: smooth window motion, glowing accents used with restraint, a memorable boot, a polished first minute (boot, choose character, short tour).
- Design must be distinctive, not a template. Prefer one bold signature element (the character plus the glowing grid) and quiet discipline elsewhere.
- Where useful, the agent may search the web for UI references and adopt the best ideas, recording sources and choices in DECISIONS.md.

## D. Process rules from the owner
- Work in 7 parts (see PLAN.md). Deliver a master zip after each session so the next agent can continue.
- The owner often has limited usage; stop early and hand off cleanly rather than leaving half-finished work unrecorded.
- Nothing from this document or the original spec may be silently dropped.
