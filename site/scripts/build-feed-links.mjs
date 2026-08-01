#!/usr/bin/env node
/**
 * BlogKub - feed discovery + WebSub links in every page head (postbuild).
 *
 * Adds, to every indexable HTML page, in its own language:
 *
 *   <link rel="alternate" type="application/rss+xml"   href=".../rss.xml">
 *   <link rel="alternate" type="application/atom+xml"  href=".../atom.xml">
 *   <link rel="alternate" type="application/feed+json" href=".../feed.json">
 *   <link rel="hub"  href="https://pubsubhubbub.appspot.com/">
 *   <link rel="self" href="<this page's canonical>">
 *
 * Why a postbuild pass and not the layouts: the site is built from three Astro
 * layouts AND several hand-written files copied verbatim from ./project. Editing
 * only the layouts would have missed the two homepages, the Thai learn hub and
 * the generated sitemap pages, which is exactly how the Atom link came to be
 * present on 105 pages and absent on 7.
 *
 * On rel="hub" and rel="self": both are in the IANA link relation registry, and
 * WebSub says a publisher advertises them on the resource itself as well as in
 * the feed. Note what this does and does not buy. It does not make Googlebot
 * index faster - Google Search dropped WebSub as an indexing signal, and its
 * documented channels are the sitemap and, for two narrow content types, the
 * Indexing API. It lets a feed reader or aggregator subscribe through the hub
 * and be pushed updates instead of polling. The real-time search-engine channel
 * is IndexNow, which this site already runs and Google does not support.
 *
 * Idempotent: a page that already carries a link is left alone, so running this
 * twice over the same dist changes nothing.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.blogkub.com';
const HUB = 'https://pubsubhubbub.appspot.com/';

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
};

const files = walk(DIST);
let touched = 0, skipped = 0, added = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');

  // A page that asks not to be indexed has nothing to advertise, and the two
  // redirect stubs and the builder are exactly that.
  if (/name="robots"[^>]*content="[^"]*noindex/i.test(html)) { skipped++; continue; }

  const head = html.indexOf('</head>');
  if (head < 0) { skipped++; continue; }

  // English pages point at the English feeds. Read it off the page rather than
  // the path, so a page that moves keeps pointing at the right channel.
  const isEn = /<html[^>]*\blang="en"/i.test(html);
  const base = isEn ? `${SITE}/en` : SITE;
  const canonical = (html.match(/rel="canonical" href="([^"]+)"/) || [])[1];

  const wanted = [
    ['alternate', `${base}/rss.xml`, 'application/rss+xml', `BlogKub RSS`],
    ['alternate', `${base}/atom.xml`, 'application/atom+xml', `BlogKub Atom`],
    ['alternate', `${base}/feed.json`, 'application/feed+json', `BlogKub JSON Feed`],
  ];

  const lines = [];
  for (const [rel, href, type, title] of wanted) {
    if (html.includes(`href="${href}"`)) continue; // already there
    lines.push(`<link rel="${rel}" type="${type}" href="${href}" title="${title}">`);
  }
  if (!/rel="hub"/i.test(html)) lines.push(`<link rel="hub" href="${HUB}">`);
  if (canonical && !/rel="self"/i.test(html)) lines.push(`<link rel="self" href="${canonical}">`);

  if (!lines.length) { skipped++; continue; }

  writeFileSync(file, html.slice(0, head) + lines.join('\n') + '\n' + html.slice(head));
  touched++;
  added += lines.length;
}

console.log(`feed links: ${touched} page(s) updated, ${added} link(s) added, ${skipped} skipped (noindex or already complete)`);
