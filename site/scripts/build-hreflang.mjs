#!/usr/bin/env node
/**
 * BlogKub — hreflang injector (postbuild).
 *
 * Runs AFTER `astro build`. Walks dist/, pairs every Thai page with its
 * English counterpart at the mirrored path (`/x` <-> `/en/x`), and injects
 * reciprocal <link rel="alternate" hreflang> tags into BOTH pages' <head>:
 *   hreflang="th"        -> the Thai URL
 *   hreflang="en"        -> the English URL
 *   hreflang="x-default" -> the English URL
 *
 * Only pairs where BOTH files exist get tagged, so a Thai page with no
 * translation yet is left untouched (no dangling hreflang). Pages that
 * already declare x-default (the hand-built homepages) are skipped.
 *
 * The visible EN/TH switch is repointed here too. Article pages ship it as a
 * hardcoded link to the other language's homepage, which drops a reader who
 * was halfway through a guide back at the front door. This step already knows
 * which pairs exist, so it is the one place that can rewrite that link without
 * ever pointing at a page that was never translated.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.blogkub.com';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

// dist-relative file path -> canonical-style URL (build.format 'file')
const urlFromRel = (rel) => {
  let p = '/' + rel.replace(/\\/g, '/').replace(/\.html$/, '');
  p = p.replace(/\/index$/, '/');
  if (p === '/index') p = '/';
  return SITE + p;
};

let tagged = 0;
let switched = 0;
for (const f of walk(DIST)) {
  const rel = f.slice(DIST.length + 1).replace(/\\/g, '/');
  const isEn = rel === 'en/index.html' || rel.startsWith('en/');
  const thRel = isEn ? (rel === 'en/index.html' ? 'index.html' : rel.slice(3)) : rel;
  const enRel = isEn ? rel : 'en/' + rel;
  if (!existsSync(join(DIST, thRel)) || !existsSync(join(DIST, enRel))) continue;

  const html = readFileSync(f, 'utf8');
  if (/hreflang="x-default"/.test(html)) continue; // already declared (hand-built homepages)

  const thUrl = urlFromRel(thRel);
  const enUrl = urlFromRel(enRel);
  const block =
    `<link rel="alternate" hreflang="th" href="${thUrl}">\n` +
    `<link rel="alternate" hreflang="en" href="${enUrl}">\n` +
    `<link rel="alternate" hreflang="x-default" href="${enUrl}">\n`;

  let out = html.replace('</head>', block + '</head>');
  out = repointSwitch(out, isEn, isEn ? thUrl : enUrl);
  if (out !== html) { writeFileSync(f, out); tagged++; }
}

// Rewrite the counterpart link inside the language switch, in both the desktop
// header and the mobile drawer. Only the href of the *other* language moves; the
// current-language link still points home, which is what a reader expects from it.
function repointSwitch(html, isEn, href) {
  const target = isEn ? 'th' : 'en';
  const path = href.replace(SITE, '');
  let n = 0;
  const next = html.replace(
    new RegExp(`(<a\\s[^>]*href=")([^"]*)("[^>]*hreflang="${target}"[^>]*>)`, 'g'),
    (m, a, _old, b) => { n++; return a + path + b; }
  ).replace(
    new RegExp(`(<a\\s[^>]*hreflang="${target}"[^>]*href=")([^"]*)(")`, 'g'),
    (m, a, _old, b) => { n++; return a + path + b; }
  );
  if (n) switched += n;
  return next;
}

console.log(`hreflang: tagged ${tagged} pages (th/en/x-default pairs), repointed ${switched} language links`);
