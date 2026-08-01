#!/usr/bin/env node
/**
 * BlogKub — full-content feed generator (postbuild).
 *
 * Runs AFTER `astro build`. Reads the built article pages in ./dist,
 * extracts each article's FULL content (links/images made absolute), and
 * writes:
 *   dist/rss.xml       dist/en/rss.xml     RSS 2.0, <content:encoded> = whole article
 *   dist/atom.xml      dist/en/atom.xml    Atom 1.0, same content
 *   dist/feed.json     dist/en/feed.json   JSON Feed 1.1, content_html = whole article
 *
 * One set per language, not one mixed feed. A feed channel declares a single
 * <language>, and a subscriber who asked for the English blog should not receive
 * Thai articles in the same river. The English set reads dist/en/blog and
 * dist/en/learn; the Thai set reads dist/blog and dist/learn.
 *
 * Three formats of one feed is not redundancy for its own sake. Search Console
 * accepts an RSS or Atom feed where it expects a sitemap, so these double as a
 * second, recency-ordered way to tell Google what changed. Atom is also what a
 * Blogger blog serves at /atom.xml, which is what readers arriving from that
 * world will try first.
 *
 * Wired via the "postbuild" npm script, so CI keeps the feeds in sync with
 * the deployed pages automatically.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.blogkub.com';
const NOW = new Date();

const CHANNELS = {
  th: {
    lang: 'th', dir: '', home: `${SITE}/`,
    title: 'BlogKub — คู่มือ Blogger & ตกแต่งธีมฟรี',
    desc: 'บทความและคู่มือฟีเจอร์ธีม Blogger จาก BlogKub — ทำบล็อกให้ติดหน้าแรก Google หารายได้ และแต่งธีมสวยโดยไม่ต้องเขียนโค้ด',
    author: 'ภัทร์พิศาล ดาทอง (เบน)',
    authorEmail: 'hello@blogkub.com',
    logo: `${SITE}/android-chrome-512x512.png`,
    catBlog: 'บล็อก', catLearn: 'คู่มือฟีเจอร์',
    readMore: 'อ่านบนเว็บ BlogKub →',
  },
  en: {
    lang: 'en', dir: 'en', home: `${SITE}/en/`,
    title: 'BlogKub — free Blogger theme guides',
    desc: 'Guides and feature documentation from BlogKub: build a Blogger blog that ranks on Google, earns from AdSense, and looks good without writing code.',
    author: 'Patpisan Dathong (Ben)',
    authorEmail: 'hello@blogkub.com',
    logo: `${SITE}/android-chrome-512x512.png`,
    catBlog: 'Blog', catLearn: 'Feature guide',
    readMore: 'Read it on BlogKub →',
  },
};

const m1 = (re, s) => { const m = s.match(re); return m ? m[1].trim() : null; };
const xesc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const toDate = (d) => {
  if (!d) return NOW;
  const dt = new Date(/T\d/.test(d) ? d : `${d}T09:00:00+07:00`); // accept full ISO or bare date
  return isNaN(dt) ? NOW : dt;
};
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

function collect(base, dir, kind, L) {
  const out = [];
  const full = join(DIST, base, dir);
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
      category: kind === 'blog' ? L.catBlog : L.catLearn,
    });
  }
  return out;
}

function emit(L) {
  const OUT = L.dir ? join(DIST, L.dir) : DIST;
  const BASE = L.dir ? `${SITE}/${L.dir}` : SITE;
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const items = [...collect(L.dir, 'blog', 'blog', L), ...collect(L.dir, 'learn', 'learn', L)];
  items.sort((a, b) => b.modified - a.modified);
  const lastBuild = items.length ? items[0].modified : NOW;

/* ---------- RSS 2.0 (full content) ---------- */
  const rssItems = items.map((it) => `    <item>
      <title>${xesc(it.title)}</title>
      <link>${xesc(it.url)}</link>
      <guid isPermaLink="true">${xesc(it.url)}</guid>
      <pubDate>${rfc822(it.published)}</pubDate>
      <dc:creator>${xesc(L.author)}</dc:creator>
      <category>${xesc(it.category)}</category>
      <description>${xesc(it.desc)}</description>
${it.image ? `      <enclosure url="${xesc(it.image)}" type="image/png" length="0"/>
      <media:content url="${xesc(it.image)}" medium="image" type="image/png"/>
` : ''}      <content:encoded><![CDATA[${it.image ? `<p><img src="${it.image}" alt="${it.title}" style="max-width:100%;height:auto"/></p>` : ''}${it.content}<p><a href="${it.url}">${L.readMore}</a></p>]]></content:encoded>
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${xesc(L.title)}</title>
    <link>${L.home}</link>
    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${xesc(L.desc)}</description>
    <language>${L.lang}</language>
    <copyright>© ${NOW.getFullYear()} BlogKub</copyright>
    <managingEditor>${L.authorEmail} (${xesc(L.author)})</managingEditor>
    <webMaster>${L.authorEmail} (${xesc(L.author)})</webMaster>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <generator>BlogKub feed builder</generator>
    <ttl>360</ttl>
    <image><url>${L.logo}</url><title>${xesc(L.title)}</title><link>${L.home}</link></image>
${rssItems}
  </channel>
</rss>
`;
  writeFileSync(join(OUT, 'rss.xml'), rss);

/* ---------- JSON Feed 1.1 (full content) ---------- */
  const jsonFeed = {
  version: 'https://jsonfeed.org/version/1.1',
  title: L.title,
  home_page_url: L.home,
  feed_url: `${BASE}/feed.json`,
  description: L.desc,
  language: L.lang,
  icon: L.logo,
  favicon: `${SITE}/favicon-32x32.png`,
  authors: [{ name: L.author, url: L.dir ? `${SITE}/en/about` : `${SITE}/about` }],
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
    authors: [{ name: L.author, url: L.dir ? `${SITE}/en/about` : `${SITE}/about` }],
    tags: [it.category],
  })),
};
  writeFileSync(join(OUT, 'feed.json'), JSON.stringify(jsonFeed, null, 2) + '\n');

/* ---------- Atom 1.0 (full content) ---------- */
// Atom dates are RFC 3339, which is what toISOString already produces. Every entry
// needs its own <id>; the canonical URL is stable and unique, so it serves.
  const atomEntries = items.map((it) => `  <entry>
    <title type="text">${xesc(it.title)}</title>
    <link rel="alternate" type="text/html" href="${xesc(it.url)}"/>
    <id>${xesc(it.url)}</id>
    <published>${it.published.toISOString()}</published>
    <updated>${it.modified.toISOString()}</updated>
    <author><name>${xesc(L.author)}</name><email>${L.authorEmail}</email></author>
    <category term="${xesc(it.category)}"/>
    <summary type="text">${xesc(it.desc)}</summary>
${it.image ? `    <link rel="enclosure" type="image/png" href="${xesc(it.image)}"/>\n` : ''}    <content type="html"><![CDATA[${it.image ? `<p><img src="${it.image}" alt="${it.title}" style="max-width:100%;height:auto"/></p>` : ''}${it.content}<p><a href="${it.url}">${L.readMore}</a></p>]]></content>
  </entry>`).join('\n');

  writeFileSync(join(OUT, 'atom.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${L.lang}">
  <title type="text">${xesc(L.title)}</title>
  <subtitle type="text">${xesc(L.desc)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${BASE}/atom.xml"/>
  <link rel="alternate" type="text/html" href="${L.home}"/>
  <id>${L.home}</id>
  <updated>${lastBuild.toISOString()}</updated>
  <rights>© ${NOW.getFullYear()} BlogKub</rights>
  <icon>${L.logo}</icon>
  <logo>${L.logo}</logo>
  <generator uri="${SITE}/">BlogKub feed builder</generator>
  <author><name>${xesc(L.author)}</name><email>${L.authorEmail}</email><uri>${L.dir ? `${SITE}/en/about` : `${SITE}/about`}</uri></author>
${atomEntries}
</feed>
`);

  console.log(`feeds[${L.lang}]: ${items.length} items with FULL content -> ${OUT}/rss.xml, atom.xml, feed.json`);
}

for (const L of [CHANNELS.th, CHANNELS.en]) emit(L);
