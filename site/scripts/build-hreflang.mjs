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

  const out = html.replace('</head>', block + '</head>');
  if (out !== html) { writeFileSync(f, out); tagged++; }
}

console.log(`hreflang: tagged ${tagged} pages (th/en/x-default pairs)`);
