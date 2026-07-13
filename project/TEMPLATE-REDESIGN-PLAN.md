# Template Redesign Plan — BlogKub

> Agreed 2026-06-29. Goal: make each template visually distinct & unique (not just color swaps).

## Decisions
1. **Depth = Level 1 + Level 3 mixed**
   - Level 1: each template gets a full design-token personality (heading/body font pair, button shape, shadow, border, spacing rhythm, card style).
   - Level 3: each template gets a *signature layout* (distinct structure, not just block reordering).
2. **Count: reduce 14 → 8–10** strong, clearly-different templates (kill near-duplicates).
3. **Blogger XML must validate & upload 100%.** Build + test each template ONE AT A TIME. Complex layouts (sidebar, masonry) get individual export testing before moving on.
4. **References:** user will provide example themes/screenshots to capture identity from. WAIT for these before finalizing each template's look.

## How to differentiate (toolbox)
- **Theme tokens (Level 1):** font pair, type scale, weight, button radius/shape (square/rounded/pill), shadow depth, border style, spacing density, card treatment.
- **Layout variants (Level 2, supporting):** header (logo-left+menu-right / centered / topbar), hero (centered / split / full-bleed image), post display (grid / list / masonry / horizontal cards), sidebar on/off.
- **Signature layout (Level 3):** per-template hallmark, e.g. Magazine = big featured + 3-col grid + sidebar; News = dense multi-section list.

## Workflow (avoid GitHub conflicts with Claude Code)
- Do the work HERE in this project, one template at a time.
- After each template: verify export is valid Blogger XML (test edge cases + ideally a real Blogger upload).
- When a batch is done, package for the user to push to GitHub. Don't edit in two places simultaneously.

## Shortlist (finalized 2026-07-05 — 8 templates)
The earlier cut already reduced the lineup to 8 distinct templates in code
(`TEMPLATES` array). All 8 stay; none are near-duplicates once signatures land.

| # | id | Personality (Level 1 tokens) | Signature layout (Level 3) | Status |
|---|---|---|---|---|
| 1 | personal | Serif headings, warm cream tints, soft shadows | Avatar-ring hero + author band + card grid | ✅ live & upload-tested |
| 2 | magazine | Serif display, red kickers, uppercase + border-left headings, dense | Featured lead + 2 stacked side stories + 3-col grid + dense news rows | ✅ upload-tested 2026-07-05 (blogkub-magazine.blogspot.com) — `b:loop index=` confirmed WORKING on Blogger |
| 3 | travel | Airy sans, sky tints, photo-first | Full-bleed cinematic hero + 4:3 photo cards with location pills | ✅ live 2026-07-13 · signature graphics: hero dot-grid map texture + light glow, wavy horizon divider, gradient heading underline, ringed 📍 location pills |
| 4 | tech | System sans + mono eyebrows, slate tints | Dark hero + numbered list rows + bordered hover cards | built, hidden |
| 5 | review | Sans, amber tints, score-forward | Score-badge cards + BEST-PICK ribbons + trust/about band | built, hidden |
| 6 | course | Trebuchet, purple tints | Chip hero + pricing/enroll cards + trust stats CTA | built, hidden |
| 7 | company | Corporate sans, blue tints | Gradient hero + stats row + visual grid + big CTA | built, hidden |
| 8 | sidebar-blog | Serif, parchment tints | Classic 2-col: content + real Blogger sidebar widgets | sidebar section already upload-tested via Personal |

## Build & test order (one at a time, real Blogger upload each)
1. ~~personal~~ ✅ → 2. **magazine** (now) → 3. travel → 4. tech → 5. review → 6. course → 7. company → 8. sidebar-blog

⚠️ Test note: magazine's featured block uses `b:loop index=` — the same
construct suspected in the earlier blank-grid regression. Its upload test
doubles as the verdict on that construct. Test on a THROWAWAY blog first.

## Status
- [ ] Receive reference examples from user (needed to finalize looks of #3–#8)
- [x] Finalize the 8–10 template shortlist (keep all 8 current)
- [x] Spec each template's tokens + signature layout (table above)
- [ ] Build + test one at a time — in progress: magazine unhidden for upload testing
