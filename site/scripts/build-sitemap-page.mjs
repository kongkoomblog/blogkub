#!/usr/bin/env node
/**
 * BlogKub - human sitemap page (postbuild, runs early).
 *
 * Writes dist/sitemap.html and dist/en/sitemap.html, served at /sitemap and
 * /en/sitemap. This is the readable counterpart to sitemap.xml: an accordion of
 * every indexable page on the site, grouped the way a reader would look for
 * them, with a filter box.
 *
 * It is generated from the built output rather than written by hand, for the
 * same reason the sitemaps are: a hand-kept list of 100+ links goes stale on the
 * first article nobody remembers to add. Anything whose path does not match a
 * known group still appears, under "More", so a new section can never fall off
 * the page silently.
 *
 * Runs BEFORE build-hreflang so the two language versions get their reciprocal
 * tags injected like every other page, and before build-sitemaps so both land in
 * sitemap.xml.
 *
 * Three things tell a crawler what this page is, and they say the same thing:
 * a CollectionPage whose mainEntity is an ItemList of every URL, SiteNavigationElement
 * microdata around the groups, and a BreadcrumbList. The bot panel at the end links
 * the machine-readable files, so a crawler that lands here can reach every feed and
 * XML sitemap in one hop.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.blogkub.com';
const m1 = (re, s) => { const m = s.match(re); return m ? m[1].trim() : null; };
const xesc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jesc = (s) => JSON.stringify(String(s == null ? '' : s));

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

/* ---------- collect every indexable page ---------- */
const pages = [];
for (const f of walk(DIST)) {
  const h = readFileSync(f, 'utf8');
  if (/noindex/.test(m1(/name="robots" content="([^"]+)"/, h) || '')) continue;
  const url = m1(/rel="canonical" href="([^"]+)"/, h);
  if (!url) continue;
  const title = (m1(/property="og:title" content="([^"]+)"/, h) || m1(/<title>([\s\S]*?)<\/title>/, h) || '')
    .replace(/\s*[|·]\s*BlogKub.*$/i, '').replace(/\s+/g, ' ').trim();
  pages.push({ url, path: url.slice(SITE.length) || '/', title });
}

/* ---------- groups, in the order they appear on the page ---------- */
// Keyed on the path with any /en prefix removed, so one table drives both languages.
const GUIDE_GROUPS = [
  ['structure', ['header', 'hero', 'footer', 'sidebar', 'postgrid', 'postlist', 'featured', 'search', 'columns', 'image', 'cta', 'about']],
  ['reading', ['toc', 'breadcrumb', 'readtime', 'progress', 'anchorlink', 'dropcap', 'lightbox', 'copycode', 'callout', 'proscons', 'slider', 'share', 'sharebar']],
  ['discovery', ['aeo', 'faq', 'related', 'morefrom', 'stories']],
  ['ui', ['dark-mode', 'themepicker', 'announce', 'cookie', 'translate', 'back-to-top', 'bookmark']],
  ['money', ['ad', 'newsletter']],
  ['setup', ['favicon', 'create-page', 'label-indexing']],
];
const guideGroupOf = (slug) => (GUIDE_GROUPS.find(([, s]) => s.includes(slug)) || [])[0];

const COPY = {
  th: {
    lang: 'th', home: '/', htext: 'หน้าแรก',
    title: 'แผนผังเว็บไซต์ BlogKub - รวมทุกหน้าและคู่มือทั้งหมด',
    h1a: 'แผนผัง', h1b: 'เว็บไซต์',
    desc: 'แผนผังเว็บไซต์ BlogKub รวมลิงก์ทุกหน้าบนเว็บไว้ที่เดียว ทั้งคู่มือฟีเจอร์ธีม Blogger ทุกบท บทความเชิงลึก และหน้าข้อมูลทั่วไป พร้อมช่องค้นหาและลิงก์ XML Sitemap สำหรับเครื่องมือค้นหา',
    lede: 'ทุกหน้าบนเว็บนี้อยู่ในหน้านี้หน้าเดียว พิมพ์ในช่องค้นหาเพื่อกรอง หรือกดหัวข้อเพื่อกางดูทั้งหมด',
    crumb: 'แผนผังเว็บไซต์',
    ph: '🔍 พิมพ์เพื่อค้นหาหน้าที่ต้องการ...',
    exp: '➕ กางทั้งหมด', col: '➖ ยุบทั้งหมด', none: 'ไม่พบหน้าที่ตรงกับคำค้นหา',
    viewall: 'ดูทั้งหมด', pages: '📄 หน้าทั่วไป',
    botsH: '🤖 สำหรับ Googlebot และเครื่องมือค้นหาอื่น',
    botsP: 'หน้านี้คือแผนผังเว็บไซต์ฉบับอ่านได้ของ blogkub.com ด้านล่างคือไฟล์ฉบับเครื่องอ่าน ทั้ง XML Sitemap และฟีดทุกรูปแบบ',
    nav: [['/', 'หน้าแรก'], ['/#templates', 'เทมเพลต'], ['/builder', 'Builder'], ['/learn/', 'เอกสาร'], ['/blog/', 'บล็อก']],
    groups: {
      tools: 'เครื่องมือ', blog: 'บทความเชิงลึก', hub: 'หน้ารวม',
      setup: 'คู่มือ: ตั้งค่าฝั่ง Blogger', structure: 'คู่มือ: โครงหน้าเว็บ',
      reading: 'คู่มือ: การอ่านในบทความ', discovery: 'คู่มือ: การค้นพบและ AI',
      ui: 'คู่มือ: อินเทอร์เฟซทั้งเว็บ', money: 'คู่มือ: หารายได้และอีเมล',
      other: 'หน้าอื่นๆ', en: 'เว็บไซต์ฉบับภาษาอังกฤษ',
    },
  },
  en: {
    lang: 'en', home: '/en/', htext: 'Home',
    title: 'Sitemap | Every page and guide on BlogKub',
    h1a: 'Site', h1b: 'map',
    desc: 'The BlogKub sitemap: every page on the site in one place, covering all the Blogger theme feature guides, the in-depth articles and the standing pages, with a filter box and direct links to the XML sitemaps and feeds.',
    lede: 'Every page on this site, on one page. Type in the box to filter, or open a section to see all of it.',
    crumb: 'Sitemap',
    ph: '🔍 Filter pages...',
    exp: '➕ Expand all', col: '➖ Collapse all', none: 'No pages match that search.',
    viewall: 'View all', pages: '📄 Pages',
    botsH: '🤖 For Googlebot and other crawlers',
    botsP: 'This page is the readable sitemap for blogkub.com. Below are the machine-readable versions: the XML sitemaps and every feed format.',
    nav: [['/en/', 'Home'], ['/en/#templates', 'Templates'], ['/builder', 'Builder'], ['/en/learn/', 'Docs'], ['/en/blog/', 'Blog']],
    groups: {
      tools: 'Tools', blog: 'In-depth articles', hub: 'Section hubs',
      setup: 'Guides: Blogger setup', structure: 'Guides: page structure',
      reading: 'Guides: reading experience', discovery: 'Guides: discovery and AI',
      ui: 'Guides: site-wide interface', money: 'Guides: monetization',
      other: 'Other pages', en: 'Thai version of the site',
    },
  },
};

// One stroked icon per group, same family as the rest of the site's UI.
const ICON = {
  tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  blog: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6M8 11h8"/>',
  hub: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  setup: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.35.4.63.73.8"/>',
  structure: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  reading: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  discovery: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  ui: '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>',
  money: '<path d="M12 2v20"/><path d="M17 6.5C17 4.6 14.8 3 12 3S7 4.6 7 6.5 9.2 10 12 10s5 1.6 5 3.5S14.8 17 12 17s-5-1.6-5-3.5"/>',
  other: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>',
  en: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/>',
};

function build(L) {
  const isEn = L.lang === 'en';
  const mine = pages.filter((p) => (p.path.startsWith('/en/') || p.path === '/en/') === isEn);
  const strip = (p) => (isEn ? p.replace(/^\/en/, '') || '/' : p);
  const used = new Set();
  const take = (fn) => {
    const got = mine.filter((p) => !used.has(p.path) && fn(strip(p.path), p));
    got.forEach((p) => used.add(p.path));
    return got;
  };

  const groups = [];
  const add = (key, items, viewAll) => { if (items.length) groups.push({ key, items, viewAll }); };

  // The builder is noindex, so the dist scan cannot find it. It is still the thing the
  // site is for, and a reader looking at a sitemap expects it first.
  groups.push({ key: 'tools', items: [
    { path: '/builder', title: isEn ? 'Visual Builder - build a Blogger theme' : 'Builder - เครื่องมือแต่งธีม Blogger' },
    ...take((s) => s === '/learn/templates'),
  ] });
  add('hub', take((s) => s === '/' || s === '/learn/' || s === '/blog/'));
  add('blog', take((s) => s.startsWith('/blog/')), isEn ? '/en/blog/' : '/blog/');
  for (const [g] of GUIDE_GROUPS) {
    add(g, take((s) => s.startsWith('/learn/') && guideGroupOf(s.slice(7)) === g), isEn ? '/en/learn/' : '/learn/');
  }
  add('other', take((s) => !['/about', '/contact', '/privacy', '/terms', '/sitemap'].includes(s)));
  take((s) => s === '/sitemap');   // drop it rather than let it list itself

  const standing = mine.filter((p) => ['/about', '/contact', '/privacy', '/terms'].includes(strip(p.path)));
  standing.forEach((p) => used.add(p.path));

  const all = [...groups.flatMap((g) => g.items), ...standing].filter((p) => p.url);
  const sections = groups.map((g, i) => `    <section class="smacc" itemscope itemtype="https://schema.org/ItemList">
      <meta itemprop="name" content="${xesc(L.groups[g.key])} - BlogKub"><meta itemprop="numberOfItems" content="${g.items.length}">
      <button type="button" class="smhead" onclick="smTog(this)" aria-expanded="false" aria-controls="smp${i}">
        <span class="smic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[g.key] || ICON.other}</svg></span>
        <span class="smt">${xesc(L.groups[g.key])}</span>
        <span class="smc">${g.items.length}</span>
        <span class="smar" aria-hidden="true">&#9662;</span>
      </button>
      <div class="smbody" id="smp${i}" role="region">
${g.viewAll ? `        <a class="small" href="${g.viewAll}">${xesc(L.viewall)} &rarr;</a>\n` : ''}        <ul class="smlist">
${g.items.map((p, j) => `          <li class="smli" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><meta itemprop="position" content="${j + 1}"><a href="${xesc(p.path)}" itemprop="url"><span itemprop="name">${xesc(p.title)}</span></a></li>`).join('\n')}
        </ul>
      </div>
    </section>`).join('\n');

  const graph = [
    `{ "@type": "Organization", "@id": "${SITE}/#org", "name": "BlogKub", "url": "${SITE}/", "logo": { "@type": "ImageObject", "url": "${SITE}/android-chrome-512x512.png", "width": 512, "height": 512 } }`,
    `{ "@type": "WebSite", "@id": "${SITE}/#website", "url": "${SITE}/", "name": "BlogKub", "publisher": { "@id": "${SITE}/#org" } }`,
    `{ "@type": "CollectionPage", "@id": "${SITE}${isEn ? '/en/sitemap' : '/sitemap'}#page", "url": "${SITE}${isEn ? '/en/sitemap' : '/sitemap'}", "name": ${jesc(L.title)}, "description": ${jesc(L.desc)}, "inLanguage": "${L.lang}", "isPartOf": { "@id": "${SITE}/#website" }, "mainEntity": { "@type": "ItemList", "name": ${jesc(L.title)}, "numberOfItems": ${all.length}, "itemListElement": [\n${all.map((p, i) => `      {"@type":"ListItem","position":${i + 1},"url":${jesc(p.url)},"name":${jesc(p.title)}}`).join(',\n')}\n    ] } }`,
    `{ "@type": "BreadcrumbList", "itemListElement": [ { "@type": "ListItem", "position": 1, "name": ${jesc(L.htext)}, "item": "${SITE}${L.home}" }, { "@type": "ListItem", "position": 2, "name": ${jesc(L.crumb)} } ] }`,
  ];

  const path = isEn ? '/en/sitemap' : '/sitemap';
  return `<!doctype html>
<html lang="${L.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xesc(L.title)}</title>
<link rel="canonical" href="${SITE}${path}">
<meta name="description" content="${xesc(L.desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BlogKub">
<meta property="og:title" content="${xesc(L.title)}">
<meta property="og:description" content="${xesc(L.desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:locale" content="${isEn ? 'en_US' : 'th_TH'}">
<meta property="og:image" content="${SITE}/android-chrome-512x512.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{ "@context": "https://schema.org", "@graph": [
  ${graph.join(',\n  ')}
]}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{--maxw:1000px;--fg:#1e2333;--fg-soft:#4a5063;--muted:#828aa0;--bg:#fff;--surface:#f7f8fc;--border:#e8eaf2;--primary:#6366f1;--accent:#8b5cf6;--grad:linear-gradient(120deg,#6366f1,#8b5cf6 50%,#ec4899);--font-d:'Space Grotesk','IBM Plex Sans Thai',sans-serif}
  @media(prefers-color-scheme:dark){:root{--fg:#e2e8f0;--fg-soft:#b6c0d4;--muted:#8593ab;--bg:#0b0d14;--surface:#12141f;--border:rgba(255,255,255,.09)}}
  :root[data-theme="dark"]{--fg:#e2e8f0;--fg-soft:#b6c0d4;--muted:#8593ab;--bg:#0b0d14;--surface:#12141f;--border:rgba(255,255,255,.09)}
  :root[data-theme="light"]{--fg:#1e2333;--fg-soft:#4a5063;--muted:#828aa0;--bg:#fff;--surface:#f7f8fc;--border:#e8eaf2}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--fg);line-height:1.7;font-family:'IBM Plex Sans Thai',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  a{color:inherit;text-decoration:none}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 20px}
  header.top{border-bottom:1px solid var(--border);position:sticky;top:0;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(12px);z-index:10}
  .bar{display:flex;align-items:center;gap:22px;height:62px}
  .brand{display:flex;align-items:center;gap:10px;font-family:var(--font-d);font-weight:700;font-size:17px}
  .brand .lg{width:30px;height:30px;border-radius:8px;background:var(--grad);display:grid;place-items:center;overflow:hidden}
  .brand .lg img{width:100%;height:100%;object-fit:cover}
  .bar nav{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap}
  .bar nav a{padding:7px 12px;border-radius:8px;font-size:14.5px;color:var(--fg-soft);font-weight:500}
  .bar nav a:hover,.bar nav a.on{color:var(--fg);background:var(--surface)}
  .hero{padding:52px 0 26px;text-align:center}
  .crumb{font-size:13px;color:var(--muted);margin-bottom:14px}
  .hero h1{font-family:var(--font-d);font-size:clamp(28px,5vw,44px);font-weight:700;letter-spacing:-.02em;line-height:1.15}
  .hero h1 .g{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .hero p{color:var(--fg-soft);font-size:17px;max-width:640px;margin:16px auto 0}
  .smsearch{margin:6px 0 12px}
  .smsearch input{width:100%;font-family:inherit;font-size:15px;padding:13px 18px;border:2px solid var(--border);border-radius:14px;background:var(--surface);color:var(--fg)}
  .smsearch input:focus{outline:none;border-color:var(--primary)}
  .smnores{display:none;font-size:13.5px;color:var(--muted);padding:10px 4px;font-style:italic}
  .smnores.show{display:block}
  .smtools{display:flex;gap:10px;margin:0 0 16px;flex-wrap:wrap}
  .smexp{font-family:inherit;font-size:12.5px;font-weight:600;color:var(--primary);background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:8px 16px;cursor:pointer}
  .smexp:hover{border-color:var(--primary)}
  .smacc{background:var(--surface);border:1px solid var(--border);border-radius:16px;margin:0 0 12px;overflow:hidden}
  .smacc.open{border-color:var(--primary)}
  .smhead{width:100%;background:none;border:0;cursor:pointer;display:flex;align-items:center;gap:13px;padding:16px 20px;font-family:var(--font-d);text-align:left;color:inherit}
  .smhead:hover{background:color-mix(in srgb,var(--primary) 6%,transparent)}
  .smic{flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;color:var(--primary)}
  .smic svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .smt{font-size:17px;font-weight:700;letter-spacing:-.01em}
  .smc{font-size:12px;font-weight:700;color:var(--primary);background:var(--bg);border:1px solid var(--border);border-radius:999px;padding:2px 11px}
  .smacc.open .smc{background:var(--primary);color:#fff;border-color:var(--primary)}
  .smar{margin-left:auto;color:var(--muted);font-size:15px;transition:transform .3s}
  .smacc.open .smar{transform:rotate(180deg)}
  .smbody{max-height:0;overflow:hidden;transition:max-height .4s ease}
  .smacc.open .smbody{max-height:4000px}
  .small{display:inline-block;font-size:12.5px;color:var(--muted);font-weight:600;margin:14px 20px 2px}
  .small:hover{color:var(--primary)}
  .smlist{margin:0;padding:0 20px 16px;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:0 20px}
  @media(max-width:640px){.smlist{grid-template-columns:1fr}}
  .smli{border-top:1px solid var(--border)}
  .smli a{color:var(--fg-soft);font-size:14.5px;display:block;padding:9px 0 9px 16px;position:relative;transition:color .2s,padding-left .2s}
  .smli a::before{content:"\\25B8";position:absolute;left:0;top:9px;color:var(--accent);font-size:11px}
  .smli a:hover{color:var(--primary);padding-left:21px}
  .smpanel{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px 22px;margin:16px 0 0}
  .smpanel h2{font-family:var(--font-d);font-size:16px;font-weight:700;margin:0 0 8px}
  .smpanel p{font-size:13px;color:var(--muted);margin:0 0 12px}
  .smpanel ul{margin:0;padding:0;list-style:none}
  .smpanel li{border-top:1px solid var(--border)}
  .smpanel li:first-child{border-top:0}
  .smpanel li a{display:block;padding:10px 0 10px 16px;color:var(--fg-soft);font-size:14.5px;position:relative}
  .smpanel li a::before{content:"\\25B8";position:absolute;left:0;top:10px;color:var(--accent);font-size:11px}
  .smpanel li a:hover{color:var(--primary)}
  .smchips{display:flex;flex-wrap:wrap;gap:8px}
  .smchip{display:inline-flex;align-items:center;padding:8px 15px;border-radius:999px;background:var(--bg);border:1px solid var(--border);color:var(--fg-soft);font-weight:600;font-size:12.5px;transition:.2s}
  .smchip:hover{border-color:var(--primary);color:var(--primary);transform:translateY(-2px)}
  .smhide{display:none}
  footer{border-top:1px solid var(--border);margin-top:56px;padding:30px 0;color:var(--muted);font-size:13.5px;text-align:center}
  footer a{color:var(--fg-soft)}
</style>
<link rel="alternate" type="application/rss+xml" title="BlogKub RSS" href="${SITE}/rss.xml">
<link rel="alternate" type="application/atom+xml" title="BlogKub Atom" href="${SITE}/atom.xml">
<link rel="alternate" type="application/feed+json" title="BlogKub JSON Feed" href="${SITE}/feed.json">
</head>
<body>
<header class="top">
  <div class="wrap bar">
    <a class="brand" href="${L.home}"><span class="lg"><img src="/android-chrome-192x192.png" alt="BlogKub"></span>BlogKub</a>
    <nav>
${L.nav.map(([h, t]) => `      <a href="${h}">${xesc(t)}</a>`).join('\n')}
      <a href="${path}" class="on">${xesc(L.crumb)}</a>
    </nav>
  </div>
</header>

<main>
<section class="hero"><div class="wrap">
  <nav class="crumb"><a href="${L.home}">${xesc(L.htext)}</a> &rsaquo; <span>${xesc(L.crumb)}</span></nav>
  <h1><span class="g">${xesc(L.h1a)}</span>${xesc(L.h1b)}</h1>
  <p>${xesc(L.lede)}</p>
</div></section>

<div class="wrap">
  <div class="smsearch">
    <input type="search" id="smq" oninput="smFilter(this.value)" placeholder="${xesc(L.ph)}" aria-label="${xesc(L.ph)}">
    <div class="smnores" id="smnores">${xesc(L.none)}</div>
  </div>
  <div class="smtools">
    <button type="button" class="smexp" onclick="smAll(1)">${xesc(L.exp)}</button>
    <button type="button" class="smexp" onclick="smAll(0)">${xesc(L.col)}</button>
  </div>

  <div itemscope itemtype="https://schema.org/SiteNavigationElement">
${sections}
  </div>

  <section class="smpanel">
    <h2>${xesc(L.pages)}</h2>
    <ul>
${standing.map((p) => `      <li><a href="${xesc(p.path)}">${xesc(p.title)}</a></li>`).join('\n')}
      <li><a href="${isEn ? '/sitemap' : '/en/sitemap'}">${xesc(L.groups.en)}</a></li>
    </ul>
  </section>

  <section class="smpanel">
    <h2>${xesc(L.botsH)}</h2>
    <p>${xesc(L.botsP)}</p>
    <div class="smchips">
      <a class="smchip" href="/sitemap.xml">sitemap.xml</a>
      <a class="smchip" href="/sitemap-pages.xml">sitemap-pages.xml</a>
      <a class="smchip" href="/sitemap-images.xml">sitemap-images.xml</a>
      <a class="smchip" href="/rss.xml">RSS</a>
      <a class="smchip" href="/atom.xml">Atom</a>
      <a class="smchip" href="/feed.json">JSON Feed</a>
      <a class="smchip" href="/llms.txt">llms.txt</a>
      <a class="smchip" href="/robots.txt">robots.txt</a>
    </div>
  </section>
</div>
</main>

<footer><div class="wrap">
  &copy; 2026 BlogKub &nbsp; <a href="${L.home}">${xesc(L.htext)}</a> &nbsp; <a href="${isEn ? '/en/blog/' : '/blog/'}">${isEn ? 'Blog' : 'บล็อก'}</a> &nbsp; <a href="/builder">Builder</a> &nbsp; <a href="${isEn ? '/en/about' : '/about'}">${isEn ? 'About' : 'เกี่ยวกับ'}</a> &nbsp; <a href="${path}">${xesc(L.crumb)}</a> &nbsp; <a href="/rss.xml">RSS</a>
</div></footer>

<script>
(function(){try{var t=localStorage.getItem('bxb_theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}}());
function smTog(b){var a=b.parentNode,o=a.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');}
function smAll(open){var a=document.querySelectorAll('.smacc');for(var i=0;i<a.length;i++){a[i].classList.toggle('open',!!open);var b=a[i].querySelector('.smhead');if(b)b.setAttribute('aria-expanded',open?'true':'false');}}
function smFilter(q){
  q=(q||'').toLowerCase().trim();
  var accs=document.querySelectorAll('.smacc'),any=false;
  for(var i=0;i<accs.length;i++){
    var lis=accs[i].querySelectorAll('.smli'),hitAny=false;
    for(var j=0;j<lis.length;j++){
      var hit=!q||lis[j].textContent.toLowerCase().indexOf(q)>=0;
      lis[j].classList.toggle('smhide',!hit); if(hit)hitAny=true;
    }
    accs[i].classList.toggle('smhide',!hitAny);
    if(hitAny){any=true;if(q)accs[i].classList.add('open');}
  }
  document.getElementById('smnores').classList.toggle('show',!any);
  if(!q)smAll(0);
}
smAll(1);
</script>
</body>
</html>
`;
}

writeFileSync(join(DIST, 'sitemap.html'), build(COPY.th));
if (!existsSync(join(DIST, 'en'))) mkdirSync(join(DIST, 'en'), { recursive: true });
writeFileSync(join(DIST, 'en', 'sitemap.html'), build(COPY.en));

const th = pages.filter((p) => !p.path.startsWith('/en/')).length;
console.log(`sitemap page: ${th} th + ${pages.length - th} en links -> dist/sitemap.html, dist/en/sitemap.html`);
