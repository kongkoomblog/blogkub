# BloggerXMLBuilder — Project Handoff (for Claude Code)

> Generated 2026-06-26. This document is a complete map of the project so a developer (or Claude Code) can continue without re-reading every file. Read this top to bottom first.

---

## 1. What this project is

**BloggerXMLBuilder** — a free, 100% client-side **visual builder that generates valid Blogger XML themes**. No backend, no database, no login required (login is an *optional future* idea only, for saving work). Built with **vanilla HTML/CSS/JS** (no React/Vue/build step). Designed to be hosted as static files (Cloudflare Pages / Netlify) on the domain `bloggerxmlbuilder.com`.

Core promise: user designs a site by tap/drag → live preview → **exports a `.xml` file that uploads cleanly into Blogger** (การออกแบบ > แก้ไข HTML > สำรองข้อมูล/กู้คืน > อัปโหลด).

The product is **bilingual (TH default / EN)** following Google's URL-segment i18n (`/th/`, `/en/`).

---

## 2. File map

```
index.html                  Root = language picker (TH/EN), no auto-redirect. hreflang + noindex (pre-launch).
th/index.html               Thai marketing homepage (hero, features, workflow, SEO, templates, CTA, footer). CTAs → ../app.html
en/index.html               English homepage (same structure, lang=en, EN copy).
app.html                    THE BUILDER APP shell (3-panel workspace, start/onboarding screen, export modal). ~458 lines.
assets/builder-app.js       THE BUILDER ENGINE — all logic. ~1047 lines. THE most important file.
sitemap.xml                 2-language sitemap w/ hreflang annotations.
robots.txt                  PRE-LAUNCH: blocks all crawlers. robots.launch.txt = the real one for go-live.
robots.launch.txt           Production robots (allows Google + AI bots, points to sitemap).
DEPLOY-README.md            How to deploy privately on Cloudflare Pages + Access, then go public.
REFERENCE-blogger-theme-engineering.md   Distilled rules from the 3 research PDFs. READ THIS — it's the spec.
uploads/                    Source research PDFs (doc1/2/3 = the 3 spec docs) + user screenshots.
```

**Pre-launch flags currently ON** (remove at go-live): `<meta name="robots" content="noindex,nofollow">` in index/th/en/app, and `robots.txt` = block-all.

---

## 3. The builder engine (`assets/builder-app.js`) — architecture

Single IIFE, vanilla JS. State lives in one object `S`, persisted to `localStorage` key `bxb_project_v1`. Exposes `window.BXBApp = { genXML(), state() }` for debugging.

### State shape (`S`)
```js
{
  name, lang:'th',
  design: { primary, accent, font:'sans|serif|mono', radius:Number },
  seo: { blogTitle, title, desc, labelIndex:Bool, schema:Bool, og:Bool,
         orgType:'Organization|Person|LocalBusiness', sameAs, siteUrl, logoUrl },
  blocks: [ { id, type, props:{...}, vis:{ scope:'home|item|page|label', hideMobile:Bool } } ]
}
```

### Block types
`header, hero, postgrid, postlist, featured, about, text, columns, cta, image, ad, footer`
- **POST-DRIVEN blocks** = `postgrid, postlist, featured` (use `data:posts`). Constant `POST_BLOCKS`.
- All others = **static** (rendered as plain HTML in `<body>`).

### Key function pairs (canvas vs export)
- `renderBlockInner(b)` → preview markup for the **editor canvas** (inline styles, dummy content).
- `renderBlockStatic(b)` → **Blogger XML** markup (uses `data:` tags, `<b:loop>`, CSS vars).
- `fieldsFor(b)` / `bindFields` → the right-panel **Properties** editor per block.
- `genXML()` → assembles the final `.xml`. `themeCSS()` + `skinVariables()` → `<b:skin>`. `schemaGraph()` + `ogTags()` → head SEO.

### Critical Blogger architecture rule (recently fixed — DO NOT REGRESS)
`data:posts` is **only in scope inside the single Blog widget's `<b:includable id='main'>`**. So `genXML()`:
1. Filters post-driven blocks out of the normal flow.
2. Emits exactly **ONE** `<b:section id='main'><b:widget type='Blog' id='Blog1' version='2'><b:includable id='main'>…</b:includable>` containing all post blocks, placed at the position of the first post block.
3. Static blocks render directly in `<body>` in document order.
4. If no post block exists, a hidden fallback Blog widget is still emitted (Blogger requires exactly one Blog widget).
Never go back to raw `<b:loop values='data:posts'>` in the body, and never emit an empty self-closed `<b:includable id='main'/>` — both cause Blogger upload errors.

---

## 4. Bugs fixed so far (history — don't reintroduce)
1. **"Content is not allowed in trailing section" (SAX, line 82)** → caused by empty self-closed Blog widget + `data:posts` loops leaking outside the widget. Fixed by the single-Blog-widget architecture above.
2. **`InvalidVariableException: Length is invalid. Input: 32`** → the `radius` skin `<Variable type="length">` had `min="0" max="32"`. Blogger length variables reject min/max. Removed them; values keep `px` units.
3. Unescaped `&`, `"`, `'` in titles broke XML → `esc()` now escapes `& < > " '` (`'`→`&#39;`). All user fields route through `esc()`.

**Browser `DOMParser` is NOT a sufficient validator** — it accepts XML that Blogger's stricter Java parser rejects. Validate against Blogger's actual rules (see REFERENCE doc), not just `parseOK`.

---

## 5. Features implemented (per the 3 research docs)

**Doc 1 — UX/UI & Visual Builder** ✅
3-panel workspace; responsive preview switcher (desktop/tablet/mobile) as a floating pill on mobile; "pop-out preview" in a new window; tap-to-add (mobile) + drag-drop (desktop); bottom-sheet panels on mobile; Navigation Drawer with left/right side choice; onboarding gate ("registered with Blogger yet?" → template picker OR step-by-step signup guide w/ SEO tips); free-form menu links (root-relative URLs like `/p/about.html`); per-block **Conditional Display** (`<b:if>` by page type); **Layers** tree view (reorder); contrast/WCAG warnings; columns block; TH/EN i18n; autosave; undo.

**Doc 2 — XML Compilation Engine** ✅
`b:version='2'` + `b:layoutsVersion='3'`; full namespaces; `<b:skin>` with editable `<Variable>` (color/font/length) → backend Theme Designer; `$(keycolor)` substitution; semantic HTML5 + skip link + landmarks; robots per page type; label-index toggle (warns "1 article = 1 label" rule); single Blog widget; XML validator + safe escaping.

**Doc 3 — Technical SEO & Schema** ✅
`@graph` (Organization/Person/LocalBusiness + WebSite linked by `@id`); BlogPosting (author, publisher, dateModified, mainEntityOfPage); Speakable; BreadcrumbList (home > label > post); OG + Twitter Card; canonical; meta description.

---

## 6. Known gaps / next work (suggested for Claude Code)
- **Validate exports against a real Blogger test blog** for every template + block combination (the in-app validator only checks XML well-formedness, not Blogger's skin/widget rules).
- Audit every `<Variable>` for Blogger validity (color/font/length syntax); consider dropping `type="font"` complex values if they error.
- `?m=1` mobile canonical handling (doc mentions, not yet implemented in export).
- WebSub hub link, IndexNow, Apps Script automation pages (were in earlier docs scope; marketing pages reference them — confirm or descope).
- i18n coverage audit on the builder UI (some strings may still be Thai-only).
- Consider unit tests for `genXML()` across all block types.

---

## 7. How to run / verify
Static files — open `app.html` directly (no server needed). The builder auto-resumes the last project from `localStorage` (`bxb_project_v1`).
Debug the export from the console:
```js
BXBApp.state()      // current project state
BXBApp.genXML()     // the exact .xml string the Export button produces
```
To reproduce a Blogger upload: copy `genXML()` output → Blogger → Theme → Edit HTML, or download via the Export modal and use Backup/Restore → Upload.

---

## 8. Constraints (hard rules — keep)
- No backend, no DB, no login/subscription/SaaS. 100% client-side vanilla JS.
- No React/Vue/Angular/Node/Firebase. No build step.
- Output must be **valid, uploadable Blogger XML** — this is the whole point.
- Bilingual TH/EN. AdSense-friendly, SEO/AEO/GEO oriented.
- See `REFERENCE-blogger-theme-engineering.md` for the engineering rules; the 3 PDFs in `uploads/` (doc1/2/3) are the full specs.
