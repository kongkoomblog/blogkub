# BlogKub

www.blogkub.com is an Astro static site that hosts a **client-side, no-code Blogger
theme builder**. A visitor assembles a theme from blocks in the browser and downloads
the Blogger XML; nothing is generated on a server and there is no backend.

The user is Thai and communicates in Thai. Reply in Thai.

## Ignore README.md

`README.md` is a leftover handoff bundle from Claude Design. It tells you to read
`chats/` and treat `project/app.html` as a prototype to reimplement. That was true
once and is now actively misleading, because the site has been built, migrated to
Astro, and deployed for a long time. This file supersedes it.

## Layout

```
project/          static assets copied verbatim into the built site
  builder.html      the builder UI shell
  assets/
    builder-app.js  ~7,000 lines. The whole product lives here.
  <key>.txt         IndexNow key file (the filename IS the key)
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

- `LIB`, `IC`, `TEMPLATES`, `SINGLETON_BLOCKS`: the block registry
- `blockDefaults(type)`: a new block's initial state
- `renderBlockInner(b)`: canvas preview markup
- `fieldsFor(b)`: the properties panel
- `renderBlockStatic(b)`: emits the Blogger XML. **This is the real output.** A change
  that only fixes the canvas preview has not fixed anything.
- `condWrap()`: wraps output in `<b:if>` for page scoping via `b.vis.scope`

## Build and deploy

```
prebuild   sync-public.mjs        copy ./project into site/public
build      astro build            build.format 'file', so /about.html serves /about
postbuild  build-en-learn-hub -> build-hreflang -> build-feeds
           -> build-sitemaps -> indexnow-plan
```

Push to `main` triggers `.github/workflows/deploy.yml`: build, deploy via
`cloudflare/wrangler-action`, then submit to IndexNow. **That workflow is the only
thing that builds and deploys this site.** Keep it that way, for the reason below.

### Why there is exactly one build path

There used to be three builds and two racing deploys per push:

1. the workflow's own build step
2. `wrangler deploy` re-running `build.command` from `wrangler.jsonc`
3. Cloudflare building the repo through its own Git integration

Builds 2 and 3 are gone. Both were removed because of one failure mode: the postbuild
chain includes the IndexNow planner, which decides what to announce by fetching the
previously deployed `indexnow-state.json` from the live site. Any planner run sitting
between the plan step and the submit step can overwrite the queue, and any deploy that
lands early can publish a state file that makes the next planner run conclude nothing
changed. Either way the submit step announces nothing and still reports success.

**Before adding anything to postbuild, ask what happens when it runs twice, the second
time against a site that has not been updated yet.**

## IndexNow

- `indexnow-plan.mjs` hashes every built page, fetches the previous hashes from
  `https://www.blogkub.com/indexnow-state.json` (published by the last deploy), and
  queues only what changed. Unreachable state means "first run", so everything is
  queued.
- `indexnow-submit.mjs` verifies the key file is live before POSTing, and aborts if
  not. 200 and 202 are both success (202 means key validation is still pending).
- A forced run (`npm run indexnow:all`) writes `.indexnow-queue-all.json` rather than
  the ordinary queue file, so nothing on the ordinary path can overwrite it. The
  submitter prefers it when present and deletes it only after every batch is accepted.
- The two sitemaps are added by hand since they never appear in `sitemap.xml`'s own
  `<loc>` list.
- Do not run a forced resubmission casually. Repeatedly announcing unchanged URLs looks
  like spam.

## Conventions

- **No personal data in generated themes.** No verification keys, IndexNow keys,
  affiliate IDs, or personally hosted image URLs may be baked into the builder's output.
- **English pages contain no em dash and no middot.** Thai pages are unrestricted.
  Keep this file pure ASCII too: it gets copied through mobile clients that mangle
  anything above U+007F.
- **The public contact address is hello@blogkub.com.** Never publish the owner's
  personal email.
- Builder help links use `DOCS_BASE = "/learn/"`. `/docs/` does not exist and never did.
- The `favicon` and `create-page` guides are still unwritten, so those two links point
  at the `/learn/` hub rather than 404.

## Testing without a browser

There is no test runner. The loop that has actually caught bugs:

1. `node --check` on anything edited
2. boot `project/builder.html` in **jsdom** with a seeded `localStorage` project
3. call `window.BXBApp.genXML()` and assert on the exported XML
4. extract the emitted CDATA scripts and drive them against a simulated Blogger DOM

Install jsdom temporarily, then uninstall it and `git checkout -- site/package-lock.json`
so only intended files show up in `git status`.

**Reproduce a reported bug on the pre-fix code with `git stash` before claiming a fix.**
Every real bug in this project has been confirmed that way, and the ones that looked
obvious were usually caused by something else.

## Gotchas that have bitten before

- **CSS specificity.** The theme's own `.site-nav ul` (0,1,1) beat `.rv-cat-list`
  (0,1,0) and rendered a dropdown horizontally. Scope new selectors with two classes.
- **A `<button>` does not inherit `a { color }`.** A category button rendered black for
  exactly this reason.
- **A bare `<span>` ignores width and height.** Story rings rendered as ellipses until
  `display:block` was added.
- **robots.txt outranks meta robots.** A blanket `Disallow: /search` silently defeated
  the label-indexing feature no matter what the meta tag said.
- **`ArticleLayout.astro` hardcodes `href="/en/"`** in both the header and the mobile
  drawer. `build-hreflang.mjs` rewrites it per page at build time, so fix
  language-switch bugs there, not in 44 separate articles.
- Panels that mirror the same setting in two places must call `renderProps()` as well as
  their own re-render, or the mirrored control lags a refresh behind.

## Git

The repo is public, so reads work unauthenticated. Pushing needs a credential with
`repo`, and editing `.github/workflows/` needs `workflow` on top of that. When a push is
rejected for missing `workflow` scope, park the file under `ops/` and ask the user to
apply it through the GitHub web editor.

Never put the model identifier in commits, PR titles or bodies, code comments, or
anything else pushed to the repo.
