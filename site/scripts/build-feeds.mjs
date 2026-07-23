#!/usr/bin/env node
/**
 * BlogKub — full-content feed generator (postbuild).
 *
 * Runs AFTER `astro build`. Reads the built article pages in ./dist,
 * extracts each article's FULL content (links/images made absolute), and
 * writes:
 *   dist/rss.xml   RSS 2.0 with <content:encoded> = the whole article
 *   dist/feed.json JSON Feed 1.1 with content_html = the whole article
 *
 * Wired via the "postbuild" npm script, so CI keeps the feeds in sync with
 * the deployed pages automatically.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.blogkub.com';
const NOW = new Date();

const CHANNEL = {
  title: 'BlogKub — คู่มือ Blogger & ตกแต่งธีมฟรี',
  desc: 'บทความและคู่มือฟีเจอร์ธีม Blogger จาก BlogKub — ทำบล็อกให้ติดหน้าแรก Google หารายได้ และแต่งธีมสวยโดยไม่ต้องเขียนโค้ด',
  lang: 'th',
  author: 'ภัทร์พิศาล ดาทอง (เบน)',
  authorEmail: 'hello@blogkub.com',
  logo: `${SITE}/android-chrome-512x512.png`,
};

const m1 = (re, s) => { const m = s.match(re); return m ? m[1].trim() : null; };
const xesc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const toDate = (d) => new Date(`${d}T09:00:00+07:00`);
const rfc822 = (dt) => dt.toUTCString().replace('GMT', '+0000');

// root-relative href="/x" / src="/x" -> absolute; leave //, http(s):, #, mailto: alone
const absolutize = (html) => html.replace(/(href|src)="(\/[^/][^"]*)"/g, (_, a, p) => `${a}="${SITE}${p}"`);

function articleContent(html) {
  let m = html.match(/<article>([\s\S]*?)<\/article>/);
  if (!m) return '';
  let c = m[1];
  c = c.replace(/<aside class="author-box"[\s\S]*?<\/aside>/g, ''); // drop redundant author box
  c = c.replace(/<nav class="crumb"[\s\S]*?<\/nav>/g, '');           // drop breadcrumb if inside
  return absolutize(c).trim();
}

function collect(dir, kind) {
  const out = [];
  const full = join(DIST, dir);
  let files;
  try { files = readdirSync(full); } catch { return out; }
  for (const name of files) {
    if (!name.endsWith('.html') || name === 'index.html') continue;
    const h = readFileSync(join(full, name), 'utf8');
    const robots = m1(/name="robots" content="([^"]+)"/, h) || '';
    if (/noindex/.test(robots)) continue;
    const url = m1(/rel="canonical" href="([^"]+)"/, h);
    if (!url) continue;
    const pub = m1(/"datePublished":\s*"([^"]+)"/, h);
    const mod = m1(/"dateModified":\s*"([^"]+)"/, h) || pub;
    out.push({
      url, kind,
      title: m1(/property="og:title" content="([^"]+)"/, h) || m1(/<title>([\s\S]*?)<\/title>/, h),
      desc: m1(/name="description" content="([^"]+)"/, h) || '',
      image: m1(/property="og:image" content="([^"]+)"/, h),
      content: articleContent(h),
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

/* ---------- RSS 2.0 (full content) ---------- */
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
` : ''}      <content:encoded><![CDATA[${it.image ? `<p><img src="${it.image}" alt="${it.title}" style="max-width:100%;height:auto"/></p>` : ''}${it.content}<p><a href="${it.url}">อ่านบนเว็บ BlogKub →</a></p>]]></content:encoded>
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
    <generator>BlogKub feed builder</generator>
    <ttl>360</ttl>
    <image><url>${CHANNEL.logo}</url><title>${xesc(CHANNEL.title)}</title><link>${SITE}/</link></image>
${rssItems}
  </channel>
</rss>
`;
writeFileSync(join(DIST, 'rss.xml'), rss);

/* ---------- JSON Feed 1.1 (full content) ---------- */
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
    content_html: (it.image ? `<p><img src="${it.image}" alt="${it.title}"/></p>` : '') + it.content,
    image: it.image || undefined,
    banner_image: it.image || undefined,
    date_published: it.published.toISOString(),
    date_modified: it.modified.toISOString(),
    authors: [{ name: CHANNEL.author, url: `${SITE}/about` }],
    tags: [it.category],
  })),
};
writeFileSync(join(DIST, 'feed.json'), JSON.stringify(jsonFeed, null, 2) + '\n');

console.log(`feeds: ${items.length} items with FULL content -> dist/rss.xml, dist/feed.json`);
