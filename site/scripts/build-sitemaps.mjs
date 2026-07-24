#!/usr/bin/env node
/**
 * BlogKub — sitemap generator (postbuild).
 *
 * Scans the built dist/ for every indexable page (has a canonical, not
 * noindex) and writes:
 *   dist/sitemap.xml         urlset (sitemaps.org 0.9) + hreflang on the homepages
 *   dist/sitemap-images.xml  image sitemap (Google image extension)
 *
 * Because it reads the actual built output, the sitemap can never drift out
 * of sync with the pages again.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.blogkub.com';
const today = new Date().toISOString().slice(0, 10);

const m1 = (re, s) => { const m = s.match(re); return m ? m[1].trim() : null; };
const xesc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

function meta(url) {
  // path/priority/changefreq heuristics
  const p = url.replace(SITE, '') || '/';
  if (p === '/' || p === '/en/') return { pr: '1.0', cf: 'weekly', alt: true };
  if (p === '/learn/' || p === '/blog/') return { pr: '0.9', cf: 'weekly' };
  if (p.startsWith('/blog/')) return { pr: '0.8', cf: 'monthly' };
  if (p === '/learn/templates') return { pr: '0.8', cf: 'monthly' };
  if (p.startsWith('/learn/')) return { pr: '0.7', cf: 'monthly' };
  if (p === '/about' || p === '/contact') return { pr: '0.6', cf: 'yearly' };
  if (p === '/privacy' || p === '/terms') return { pr: '0.4', cf: 'yearly' };
  return { pr: '0.5', cf: 'monthly' };
}

const pages = [];
for (const f of walk(DIST)) {
  const h = readFileSync(f, 'utf8');
  const robots = m1(/name="robots" content="([^"]+)"/, h) || '';
  if (/noindex/.test(robots)) continue;
  const url = m1(/rel="canonical" href="([^"]+)"/, h);
  if (!url) continue;
  const lastmod = (m1(/"dateModified":\s*"([^"]+)"/, h) || m1(/"datePublished":\s*"([^"]+)"/, h) || today).slice(0, 10);
  // images: og:image + in-content images hosted on our domain
  const imgs = new Set();
  const og = m1(/property="og:image" content="([^"]+)"/, h);
  if (og && og.startsWith(SITE)) imgs.add(og);
  for (const mm of h.matchAll(/<img[^>]+src="(https:\/\/www\.blogkub\.com\/[^"]+)"/g)) imgs.add(mm[1]);
  pages.push({ url, lastmod, images: [...imgs], ...meta(url) });
}

// stable order: homepage, hubs, then alpha
pages.sort((a, b) => (b.pr.localeCompare(a.pr)) || a.url.localeCompare(b.url));

/* ---- sitemap.xml ---- */
// One combined sitemap for both languages (recommended at this scale). Each
// page that has a Thai<->English counterpart declares its language alternates
// (th / en / x-default->en) so Google serves the right language per user.
const urlSet = new Set(pages.map((p) => p.url));
const counterpart = (u) => {
  const p = u.slice(SITE.length) || '/';
  if (p === '/' || p === '/en/') return { th: `${SITE}/`, en: `${SITE}/en/` };
  if (p.startsWith('/en/')) return { th: SITE + p.slice(3), en: u }; // /en/about -> /about
  return { th: u, en: `${SITE}/en${p}` };
};
const altBlock = (u) => {
  const { th, en } = counterpart(u);
  if (!urlSet.has(th) || !urlSet.has(en)) return ''; // only when both languages exist
  return `    <xhtml:link rel="alternate" hreflang="th" href="${xesc(th)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${xesc(en)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${xesc(en)}"/>\n`;
};
const urls = pages.map((p) => `  <url>
    <loc>${xesc(p.url)}</loc>
${altBlock(p.url)}    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.cf}</changefreq>
    <priority>${p.pr}</priority>
  </url>`).join('\n');
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`);

/* ---- sitemap-images.xml ---- */
const imgUrls = pages.filter((p) => p.images.length).map((p) => `  <url>
    <loc>${xesc(p.url)}</loc>
${p.images.map((i) => `    <image:image><image:loc>${xesc(i)}</image:loc></image:image>`).join('\n')}
  </url>`).join('\n');
writeFileSync(join(DIST, 'sitemap-images.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${imgUrls}
</urlset>
`);

console.log(`sitemaps: ${pages.length} urls -> dist/sitemap.xml (+ images) `);
