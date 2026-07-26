# BlogKub

www.blogkub.com โ€” an Astro static site that hosts a **client-side, no-code Blogger theme
builder**. A visitor assembles a theme from blocks in the browser and downloads the
Blogger XML; nothing is generated on a server and there is no backend.

The user is Thai and communicates in Thai. Reply in Thai.

## Ignore README.md

`README.md` is a leftover handoff bundle from Claude Design. It tells you to read
`chats/` and treat `project/app.html` as a prototype to reimplement. That was true
once and is now actively misleading โ€” the site has been built, migrated to Astro, and
deployed for a long time. This file supersedes it.

## Layout

```
project/          static assets copied verbatim into the built site
  builder.html      the builder UI shell
  assets/
    builder-app.js  ~7,000 lines. The whole product lives here.
  afc81411โ€ฆ.txt     IndexNow key file (the name IS the key)
site/             the Astro site
  src/pages/        th pages; src/pages/en/ mirrors them in English
  src/layouts/      ArticleLayout.astro and friends
  scripts/          the postbuild chain (see below)
wrangler.jsonc    Cloudflare Workers Static Assets config
ops/              workflow files parked here when they cannot be pushed directly
DESIGN.md         the design system (Google Labs design.md v0.3.0 format)
```

### builder-app.js

One file, no build step, no modules. Know these pieces before editing:

- `LIB`, `IC`, `TEMPLATES`, `SINGLETON_BLOCKS` โ€” the block registry
- `blockDefaults(type)` โ€” a new block's initial state
- `renderBlockInner(b)` โ€” canvas preview markup
- `fieldsFor(b)` โ€” the properties panel
- `renderBlockStatic(b)` โ€” emits the Blogger XML. **This is the real output.** A change
  that only fixes the canvas preview has not fixed anything.
- `condWrap()` โ€” wraps output in `<b:if>` for page scoping via `b.vis.scope`

## Build and deploy

```
prebuild   sync-public.mjs        copy ./project into site/public
build      astro build            build.format 'file' -> /about.html serves /about
postbuild  build-en-learn-hub -> build-hreflang -> build-feeds
           -> build-sitemaps -> indexnow-plan
```

Push to `main` triggers `.github/workflows/deploy.yml`: build, deploy via
`cloudflare/wrangler-action`, then submit to IndexNow.

### The double build, and the trap inside it

`wrangler.jsonc` sets `build.command = "npm ci && npm run build"`, so **`wrangler deploy`
builds the site a second time**, after the workflow's own build step and before the
upload. Every postbuild script therefore runs twice per deploy.

That is wasteful but harmless for anything idempotent. It was not harmless for IndexNow:
a forced full resubmission wrote its queue, then wrangler's rebuild ran the planner again
without `--all` and overwrote the queue with an empty one, so the submit step reported
success having sent nothing. Fixed by giving the forced queue its own filename
(`.indexnow-queue-all.json`) that the ordinary path never writes.

**Before adding anything to postbuild, ask what happens when it runs twice, the second
time against a site that has not been updated yet.**

Removing the duplicate build is still open. It is blocked on confirming whether
Cloudflare also builds this repo through its own Git integration โ€” if it does, deleting
`build` from `wrangler.jsonc` breaks that path.

## IndexNow

- `indexnow-plan.mjs` hashes every built page, fetches the previous hashes from
  `https://www.blogkub.com/indexnow-state.json` (published by the last deploy), and
  queues only what changed. Unreachable state means "first run", so everything is queued.
- `indexnow-submit.mjs` verifies the key file is live before POSTing, and aborts if not.
  200 and 202 are both success (202 means key validation is still pending).
- The two sitemaps are added by hand since they never appear in `sitemap.xml`'s own
  `<loc>` list.
- `npm run indexnow:all` forces a full resubmission. Do not run it casually โ€” repeatedly
  announcing unchanged URLs looks like spam.

## Conventions

- **No personal data in generated themes.** No verification keys, IndexNow keys,
  affiliate IDs, or personally hosted image URLs may be baked into the builder's output.
- **English pages contain no em dash and no middot.** Thai pages are unrestricted.
- **Public contact address is hello@blogkub.com.** Never publish the owner's personal
  email.
- Builder help links use `DOCS_BASE = "/learn/"`. `/docs/` does not exist and never did.
- `favicon` and `create-page` guides are still unwritten, so those two links point at the
  `/learn/` hub rather than 404.

## Testing without a browser

There is no test runner. The loop that has actually caught bugs:

1. `node --check` on anything edited
2. boot `project/builder.html` in **jsdom** with a seeded `localStorage` project
3. call `window.BXBApp.genXML()` and assert on the exported XML
4. extract the emitted CDATA scripts and drive them against a simulated Blogger DOM

Install jsdom temporarily, then uninstall it and `git checkout -- site/package-lock.json`
so only intended files show up in `git status`.

**Reproduce a reported bug on the pre-fix code with `git stash` before claiming a fix.**
Every real bug in this project has been confirmed this way, and the ones that looked
obvious were usually caused by something else.

## Gotchas that have bitten before

- **CSS specificity.** The theme's own `.site-nav ul` (0,1,1) beat `.rv-cat-list` (0,1,0)
  and rendered a dropdown horizontally. Scope new selectors with two classes.
- **`<button>` does not inherit `a { color }`.** A category button rendered black for
  exactly this reason.
- **A bare `<span>` ignores width and height.** Story rings rendered as ellipses until
  `display:block` was added.
- **robots.txt outranks meta robots.** A blanket `Disallow: /search` silently defeated
  the label-indexing feature no matter what the meta tag said.
- **`ArticleLayout.astro` hardcodes `href="/en/"`** in both the header and the mobile
  drawer. `build-hreflang.mjs` rewrites it per page at build time; fix language-switch
  bugs there, not in 44 separate articles.
- Panels that mirror the same setting in two places must call `renderProps()` as well as
  their own re-render, or the mirrored control lags a refresh behind.

## Git

The repo is public, so reads work unauthenticated. Pushing needs a credential with
`repo`, and editing `.github/workflows/` needs `workflow` on top of that. When a push is
rejected for missing `workflow` scope, park the file under `ops/` and ask the user to
apply it through the GitHub web editor.

Never put the model identifier in commits, PR titles or bodies, code comments, or
anything else pushed to the repo.
