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

## Status
- [ ] Receive reference examples from user
- [ ] Finalize the 8–10 template shortlist (which to keep/merge/cut)
- [ ] Spec each template's tokens + signature layout
- [ ] Build + test one at a time
