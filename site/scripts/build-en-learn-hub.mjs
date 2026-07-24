#!/usr/bin/env node
/**
 * BlogKub — English Learning Center hub generator (postbuild, runs first).
 *
 * The English learn hub at /en/learn/ is generated from whatever English
 * learn articles actually exist in dist/en/learn/. That means the hub never
 * links to a page that has not been translated yet: as each /en/learn/<slug>
 * article is added, it appears here automatically on the next build, and the
 * hub stays coherent no matter how far the translation effort has progressed.
 *
 * Writes dist/en/learn/index.html using the same lightweight chrome as the
 * Thai learn/blog hubs (self-contained, its own inline styles).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const DIR = join(DIST, 'en', 'learn');
const SITE = 'https://www.blogkub.com';
const m1 = (re, s) => { const m = s.match(re); return m ? m[1].trim() : null; };
const xesc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let files = [];
try { files = readdirSync(DIR); } catch { /* no en/learn yet */ }

const items = [];
for (const name of files) {
  if (!name.endsWith('.html') || name === 'index.html') continue;
  const h = readFileSync(join(DIR, name), 'utf8');
  const slug = name.replace(/\.html$/, '');
  const title = m1(/property="og:title" content="([^"]+)"/, h) || m1(/<title>([\s\S]*?)<\/title>/, h) || slug;
  const desc = m1(/name="description" content="([^"]+)"/, h) || '';
  items.push({ slug, title: title.replace(/\s*\|\s*BlogKub.*$/i, '').trim(), desc });
}
items.sort((a, b) => a.title.localeCompare(b.title));

const cards = items.map((it) => `    <a href="/en/learn/${it.slug}">
      <div class="th"></div>
      <div class="in"><div class="tag">Guide</div><h3>${xesc(it.title)}</h3><p>${xesc(it.desc)}</p></div>
    </a>`).join('\n');

const gridSection = items.length
  ? `  <h2 class="sec">All feature guides</h2>
  <p class="lead">Step-by-step guides for every BlogKub feature, ${items.length} and growing.</p>
  <div class="grid">
${cards}
  </div>`
  : `  <h2 class="sec">Guides are on the way</h2>
  <p class="lead">The English feature guides are being published. In the meantime, explore the blog and the builder below.</p>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Learning Center | BlogKub feature guides for Blogger</title>
<link rel="canonical" href="${SITE}/en/learn/">
<meta name="description" content="The BlogKub Learning Center: step-by-step guides for every feature of the Blogger theme builder, from a table of contents and dark mode to the AEO summary box and choosing a template.">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BlogKub">
<meta property="og:title" content="Learning Center | BlogKub feature guides">
<meta property="og:description" content="Step-by-step guides for every feature of the BlogKub Blogger theme builder.">
<meta property="og:url" content="${SITE}/en/learn/">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:image" content="${SITE}/android-chrome-512x512.png">
<script type="application/ld+json">
{ "@context": "https://schema.org", "@graph": [
  { "@type": "Organization", "@id": "${SITE}/#org", "name": "BlogKub", "url": "${SITE}/" },
  { "@type": "WebSite", "@id": "${SITE}/#website", "url": "${SITE}/", "name": "BlogKub", "publisher": { "@id": "${SITE}/#org" } },
  { "@type": "CollectionPage", "@id": "${SITE}/en/learn/#page", "url": "${SITE}/en/learn/", "name": "Learning Center", "inLanguage": "en", "isPartOf": { "@id": "${SITE}/#website" } },
  { "@type": "BreadcrumbList", "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE}/en/" },
    { "@type": "ListItem", "position": 2, "name": "Learning Center" }
  ]}
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
  .hero p{color:var(--fg-soft);font-size:18px;max-width:640px;margin:16px auto 0}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;margin:18px 0 10px}
  .grid a{display:block;border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--surface);transition:transform .18s,border-color .18s}
  .grid a:hover{transform:translateY(-4px);border-color:var(--primary)}
  .grid .th{height:8px;background:var(--grad)}
  .grid .in{padding:18px 20px}
  .grid .tag{font-size:11.5px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.05em}
  .grid h3{font-family:var(--font-d);font-size:18px;line-height:1.35;margin:8px 0 6px}
  .grid p{color:var(--muted);font-size:13.5px}
  h2.sec{font-family:var(--font-d);font-size:24px;font-weight:700;margin:44px 0 6px}
  .lead{color:var(--fg-soft);margin-bottom:6px}
  .hubs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:22px 0}
  .hubs a{border:1px solid var(--border);border-radius:14px;padding:20px 22px;background:var(--surface);transition:.18s}
  .hubs a:hover{border-color:var(--primary);transform:translateY(-3px)}
  .hubs .ic{font-size:26px}
  .hubs b{display:block;font-family:var(--font-d);font-size:17px;margin:10px 0 4px}
  .hubs span{color:var(--muted);font-size:13.5px}
  footer{border-top:1px solid var(--border);margin-top:56px;padding:30px 0;color:var(--muted);font-size:13.5px;text-align:center}
  footer a{color:var(--fg-soft)}
</style>
<link rel="alternate" type="application/rss+xml" title="BlogKub RSS" href="${SITE}/rss.xml">
<link rel="alternate" type="application/feed+json" title="BlogKub JSON Feed" href="${SITE}/feed.json">
</head>
<body>
<header class="top">
  <div class="wrap bar">
    <a class="brand" href="/en/"><span class="lg"><img src="/android-chrome-192x192.png" alt="BlogKub"></span>BlogKub</a>
    <nav>
      <a href="/en/">Home</a>
      <a href="/en/#templates">Templates</a>
      <a href="/builder.html">Builder</a>
      <a href="/en/learn/" class="on">Docs</a>
      <a href="/en/blog/">Blog</a>
    </nav>
  </div>
</header>

<main>
<section class="hero"><div class="wrap">
  <nav class="crumb"><a href="/en/">Home</a> › <span>Learning Center</span></nav>
  <h1>BlogKub <span class="g">Learning Center</span></h1>
  <p>Step-by-step guides for every feature of the Blogger theme builder. Learn how each block works and how to use it to build a blog that looks good and does real SEO.</p>
</div></section>

<div class="wrap">

${gridSection}

  <h2 class="sec">Explore more of BlogKub</h2>
  <p class="lead">However you arrived, there is always a next step.</p>
  <div class="hubs">
    <a href="/builder.html"><div class="ic">🛠️</div><b>Open the Builder</b><span>Build and customize your Blogger theme for free, no coding needed.</span></a>
    <a href="/en/blog/"><div class="ic">📝</div><b>The Blog</b><span>In-depth guides on SEO, AdSense, and getting started.</span></a>
    <a href="/en/#templates"><div class="ic">🎨</div><b>All 8 templates</b><span>Pick the template that fits your kind of site as a starting point.</span></a>
    <a href="/en/about"><div class="ic">💡</div><b>About BlogKub</b><span>Where it came from, what we believe, and what we set out to build.</span></a>
  </div>

</div>
</main>

<footer><div class="wrap">
  © 2026 BlogKub &nbsp; <a href="/en/">Home</a> &nbsp; <a href="/en/blog/">Blog</a> &nbsp; <a href="/builder.html">Builder</a> &nbsp; <a href="/en/about">About</a> &nbsp; <a href="/en/privacy">Privacy</a> &nbsp; <a href="/en/contact">Contact</a> &nbsp; <a href="/rss.xml">RSS</a>
</div></footer>

<script>
(function(){try{var t=localStorage.getItem('bxb_theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}}());
</script>
</body>
</html>
`;

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
writeFileSync(join(DIR, 'index.html'), html);
console.log(`en learn hub: ${items.length} guide(s) -> dist/en/learn/index.html`);
