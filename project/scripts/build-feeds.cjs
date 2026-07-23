#!/usr/bin/env node
/**
 * BlogKub — intelligent feed generator.
 *
 * Single source of truth = the published HTML pages. This script scans every
 * blog + learn article, reads their canonical URL, title, description, image,
 * author and dates straight from the markup/JSON-LD, then regenerates:
 *   - /rss.xml      RSS 2.0 (with media + Atom self link)   — the primary feed
 *   - /feed.json    JSON Feed 1.1 (modern readers / apps / AI)
 *
 * Re-run any time content changes:  node scripts/build-feeds.cjs
 * No manual feed editing — new articles appear automatically, newest first.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.blogkub.com';
const NOW = new Date();

const CHANNEL = {
  title: 'BlogKub — คู่มือ Blogger & ตกแต่งธีมฟรี',
  desc: 'บทความและคู่มือฟีเจอร์ธีม Blogger จาก BlogKub — ทำบล็อกให้ติดหน้าแรก Google หารายได้ และแต่งธีมสวยโดยไม่ต้องเขียนโค้ด',
  lang: 'th',
  author: 'ภัทร์พิศาล ดาทอง (เบน)',
  authorEmail: 'hello@blogkub.com',
  image: `${SITE}/og-home.png`,
  logo: `${SITE}/android-chrome-512x512.png`,
};

function read(f) { return fs.readFileSync(f, 'utf8'); }
function m1(re, s) { const m = s.match(re); return m ? m[1].trim() : null; }
function xesc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Fixed publish time-of-day (Asia/Bangkok, +07:00) since pages carry a date only.
function toDate(d) { return new Date(`${d}T09:00:00+07:00`); }
function rfc822(dt) { return dt.toUTCString().replace('GMT', '+0000'); }

function collect(dir, kind) {
  const out = [];
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    if (!name.endsWith('.html') || name === 'index.html') continue;
    const h = read(path.join(ROOT, dir, name));
    const robots = m1(/name="robots" content="([^"]+)"/, h) || '';
    if (/noindex/.test(robots)) continue; // never feed pages we tell Google to skip
    const url = m1(/rel="canonical" href="([^"]+)"/, h);
    if (!url) continue;
    const title = m1(/property="og:title" content="([^"]+)"/, h) || m1(/<title>(.*?)<\/title>/s, h);
    const desc = m1(/name="description" content="([^"]+)"/, h) || '';
    const image = m1(/property="og:image" content="([^"]+)"/, h);
    const pub = m1(/"datePublished":\s*"([^"]+)"/, h);
    const mod = m1(/"dateModified":\s*"([^"]+)"/, h) || pub;
    out.push({
      url, title, desc, image, kind,
      published: pub ? toDate(pub) : NOW,
      modified: mod ? toDate(mod) : NOW,
      category: kind === 'blog' ? 'บล็อก' : 'คู่มือฟีเจอร์',
    });
  }
  return out;
}

let items = [...collect('blog', 'blog'), ...collect('learn', 'learn')];
items.sort((a, b) => b.modified - a.modified);

const lastBuild = items.length ? items[0].modified : NOW;

/* ---------- RSS 2.0 ---------- */
const rssItems = items.map((it) => `    <item>
      <title>${xesc(it.title)}</title>
      <link>${xesc(it.url)}</link>
      <guid isPermaLink="true">${xesc(it.url)}</guid>
      <pubDate>${rfc822(it.published)}</pubDate>
      <dc:creator>${xesc(CHANNEL.author)}</dc:creator>
      <category>${xesc(it.category)}</category>
      <description>${xesc(it.desc)}</description>
${it.image ? `      <enclosure url="${xesc(it.image)}" type="image/png" length="0"/>
      <media:content url="${xesc(it.image)}" medium="image" type="image/png"/>
      <media:thumbnail url="${xesc(it.image)}"/>
      <content:encoded><![CDATA[<p><img src="${it.image}" alt="${it.title}" style="max-width:100%;height:auto"/></p><p>${it.desc}</p><p><a href="${it.url}">อ่านบทความเต็มบน BlogKub →</a></p>]]></content:encoded>` : `      <content:encoded><![CDATA[<p>${it.desc}</p><p><a href="${it.url}">อ่านบทความเต็มบน BlogKub →</a></p>]]></content:encoded>`}
    </item>`).join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${xesc(CHANNEL.title)}</title>
    <link>${SITE}/</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${xesc(CHANNEL.desc)}</description>
    <language>${CHANNEL.lang}</language>
    <copyright>© ${NOW.getFullYear()} BlogKub</copyright>
    <managingEditor>${CHANNEL.authorEmail} (${xesc(CHANNEL.author)})</managingEditor>
    <webMaster>${CHANNEL.authorEmail} (${xesc(CHANNEL.author)})</webMaster>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <generator>BlogKub feed builder (scripts/build-feeds.cjs)</generator>
    <ttl>360</ttl>
    <image>
      <url>${CHANNEL.logo}</url>
      <title>${xesc(CHANNEL.title)}</title>
      <link>${SITE}/</link>
    </image>
${rssItems}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(ROOT, 'rss.xml'), rss);

/* ---------- JSON Feed 1.1 ---------- */
const jsonFeed = {
  version: 'https://jsonfeed.org/version/1.1',
  title: CHANNEL.title,
  home_page_url: `${SITE}/`,
  feed_url: `${SITE}/feed.json`,
  description: CHANNEL.desc,
  language: CHANNEL.lang,
  icon: CHANNEL.logo,
  favicon: `${SITE}/favicon-32x32.png`,
  authors: [{ name: CHANNEL.author, url: `${SITE}/about` }],
  items: items.map((it) => ({
    id: it.url,
    url: it.url,
    title: it.title,
    summary: it.desc,
    content_html: `<p>${it.desc}</p><p><a href="${it.url}">อ่านบทความเต็มบน BlogKub →</a></p>`,
    image: it.image || undefined,
    banner_image: it.image || undefined,
    date_published: it.published.toISOString(),
    date_modified: it.modified.toISOString(),
    authors: [{ name: CHANNEL.author, url: `${SITE}/about` }],
    tags: [it.category],
  })),
};
fs.writeFileSync(path.join(ROOT, 'feed.json'), JSON.stringify(jsonFeed, null, 2) + '\n');

console.log(`Feeds rebuilt: ${items.length} items (blog + learn), newest = ${items[0].title}`);
console.log('  -> rss.xml, feed.json');
