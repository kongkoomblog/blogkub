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
 * Thai articles in the same river. The English set reads dist/en/**; the Thai set
 * reads dist/**, minus the language directories.
 *
 * Three formats of one feed is not redundancy for its own sake. Search Console
 * accepts an RSS or Atom feed where it expects a sitemap, so these double as a
 * second, recency-ordered way to tell Google what changed. Atom is also what a
 * Blogger blog serves at /atom.xml, which is what readers arriving from that
 * world will try first. JSON Feed is for readers and agents; Search Console does
 * NOT accept it and rejects it as an unsupported format, which is expected and
 * correct. Do not submit feed.json there.
 *
 * Wired via the "postbuild" npm script, so CI keeps the feeds in sync with
 * the deployed pages automatically.
 *
 * ------------------------------------------------------------------
 * Everything below the CHANNELS table is about not breaking silently.
 * A feed is the one output nobody looks at: it is read by machines, it is
 * cached for an hour, and a malformed one fails in a subscriber's reader where
 * we never see it. So this script would rather fail the build than deploy a
 * broken feed. See `assertSane`, `xesc`, `cdata` and `verifyXml`.
 * ------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.blogkub.com';
const NOW = new Date();

/**
 * WebSub hub. A feed declares rel="hub" next to rel="self"; a subscriber that
 * understands WebSub then registers with the hub instead of polling, and the hub
 * pushes to it the moment `websub-ping.mjs` publishes after a deploy.
 *
 * This is Google's public reference hub. It does NOT make Googlebot index faster:
 * Google Search dropped WebSub as an indexing signal, and its documented channels
 * are the sitemap and, for two narrow content types, the Indexing API. The
 * search-engine equivalent that does work is IndexNow, which this site already
 * runs, and which Google does not support. What WebSub buys is feed readers and
 * aggregators getting pushed updates, and not polling six feeds on a timer.
 */
const HUB = 'https://pubsubhubbub.appspot.com/';

/**
 * Newest N articles per feed. The feeds carry FULL article content, so they grow
 * without bound as articles are added: at 46 Thai articles the file is already
 * 1.25 MB, and every subscriber and every crawler downloads all of it every time.
 * Truncating loses nothing, because sitemap.xml is the complete URL list and is
 * what Google actually crawls for coverage. A feed is a recency river, not an
 * archive. Raise this only with the file size in mind.
 */
const MAX_ITEMS = 50;

/**
 * Directories under a language root that are not article sections. Everything
 * else is discovered (see `discoverSections`), so a brand new section starts
 * appearing in the feeds on its own instead of being silently absent. `en` and
 * `th` are here so the Thai channel never swallows the English tree.
 */
const NOT_SECTIONS = new Set(['assets', 'en', 'th', 'uploads', 'scraps', 'images', 'og', '_astro']);

/** Section label per language. An undiscovered section falls back to its own name. */
const SECTION_LABELS = {
  blog: { th: 'บล็อก', en: 'Blog' },
  learn: { th: 'คู่มือฟีเจอร์', en: 'Feature guide' },
};

const CHANNELS = {
  th: {
    lang: 'th', dir: '', home: `${SITE}/`,
    title: 'BlogKub — คู่มือ Blogger & ตกแต่งธีมฟรี',
    desc: 'บทความและคู่มือฟีเจอร์ธีม Blogger จาก BlogKub — ทำบล็อกให้ติดหน้าแรก Google หารายได้ และแต่งธีมสวยโดยไม่ต้องเขียนโค้ด',
    author: 'ภัทร์พิศาล ดาทอง (เบน)',
    authorEmail: 'hello@blogkub.com',
    logo: `${SITE}/android-chrome-512x512.png`,
    readMore: 'อ่านบนเว็บ BlogKub →',
  },
  en: {
    lang: 'en', dir: 'en', home: `${SITE}/en/`,
    title: 'BlogKub — free Blogger theme guides',
    desc: 'Guides and feature documentation from BlogKub: build a Blogger blog that ranks on Google, earns from AdSense, and looks good without writing code.',
    author: 'Patpisan Dathong (Ben)',
    authorEmail: 'hello@blogkub.com',
    logo: `${SITE}/android-chrome-512x512.png`,
    readMore: 'Read it on BlogKub →',
  },
};

/* ------------------------------------------------------------------ *
 * XML safety
 * ------------------------------------------------------------------ */

/**
 * XML 1.0 forbids most C0 control characters outright: there is no escape for
 * them, so a single stray 0x0B in an article kills the whole document for every
 * strict parser, which is every feed reader. Strip them before anything else.
 */
const stripCtl = (s) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** Escape for element text and attribute values. */
const xesc = (s) => stripCtl(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * Wrap HTML in CDATA. `]]>` inside the payload would end the section early and
 * leave raw markup in the document, so it is split across two sections, which is
 * the standard trick and is invisible to the consumer. This site publishes code
 * samples, and `<![CDATA[ ... ]]>` is itself one of the things a Blogger article
 * teaches, so the sequence WILL appear in an article eventually. It has already
 * broken the theme builder once for the same reason (see CLAUDE.md, themeCSS).
 */
const cdata = (s) => `<![CDATA[${stripCtl(s).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

/* ------------------------------------------------------------------ *
 * Parsing the built pages
 * ------------------------------------------------------------------ */

const m1 = (re, s) => { const m = s.match(re); return m ? m[1].trim() : null; };

const toDate = (d) => {
  if (!d) return null;
  const dt = new Date(/T\d/.test(d) ? d : `${d}T09:00:00+07:00`); // accept full ISO or bare date
  return isNaN(dt) ? null : dt;
};
const rfc822 = (dt) => dt.toUTCString().replace('GMT', '+0000');

// root-relative href="/x" / src="/x" -> absolute; leave //, http(s):, #, mailto: alone
const absolutize = (html) => html.replace(/(href|src)="(\/[^/][^"]*)"/g, (_, a, p) => `${a}="${SITE}${p}"`);

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };

/**
 * RSS <enclosure> requires type and length, and length must be the real byte
 * count. It used to be hardcoded to 0 with type image/png, which validators flag
 * and some readers use to decide whether to prefetch. The image is a local file
 * in dist, so the real numbers are free to obtain.
 */
function enclosureOf(url) {
  if (!url || !url.startsWith(`${SITE}/`)) return null;
  const rel = url.slice(SITE.length + 1).split('?')[0];
  const ext = (rel.split('.').pop() || '').toLowerCase();
  const type = MIME[ext];
  if (!type) return null;
  let length = 0;
  try { length = statSync(join(DIST, rel)).size; } catch { return null; } // missing file: no enclosure
  return { url, type, length };
}

function articleContent(html) {
  const m = html.match(/<article>([\s\S]*?)<\/article>/);
  if (!m) return '';
  let c = m[1];
  c = c.replace(/<aside class="author-box"[\s\S]*?<\/aside>/g, ''); // drop redundant author box
  c = c.replace(/<nav class="crumb"[\s\S]*?<\/nav>/g, '');           // drop breadcrumb if inside
  return absolutize(c).trim();
}

/**
 * Every immediate subdirectory of a language root that holds at least one
 * article page. Hardcoding ['blog','learn'] meant a new section would publish,
 * appear in the sitemap, and quietly never reach a single subscriber. Discovery
 * has no such failure mode, and the labels below only affect the <category>.
 */
function discoverSections(base) {
  const root = base ? join(DIST, base) : DIST;
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter((e) => e.isDirectory() && !NOT_SECTIONS.has(e.name))
    .map((e) => e.name)
    .filter((name) => {
      try {
        return readdirSync(join(root, name)).some((f) => {
          if (!f.endsWith('.html') || f === 'index.html') return false;
          return /rel="canonical"/.test(readFileSync(join(root, name, f), 'utf8'));
        });
      } catch { return false; }
    })
    .sort();
}

function collect(base, section, L, warn) {
  const out = [];
  const full = join(DIST, base, section);
  let files;
  try { files = readdirSync(full).sort(); } catch { return out; }

  const label = (SECTION_LABELS[section] && SECTION_LABELS[section][L.lang]) || section;

  for (const name of files) {
    if (!name.endsWith('.html') || name === 'index.html') continue;
    const h = readFileSync(join(full, name), 'utf8');

    const robots = m1(/name="robots" content="([^"]+)"/, h) || '';
    if (/noindex/.test(robots)) continue;

    const url = m1(/rel="canonical" href="([^"]+)"/, h);
    if (!url) { warn(`${base}/${section}/${name}: no canonical, skipped`); continue; }

    const title = m1(/property="og:title" content="([^"]+)"/, h) || m1(/<title>([\s\S]*?)<\/title>/, h);
    const content = articleContent(h);
    if (!title) { warn(`${url}: no title, skipped`); continue; }
    if (!content) { warn(`${url}: no <article> content, skipped`); continue; }

    const pub = toDate(m1(/"datePublished":\s*"([^"]+)"/, h));
    const mod = toDate(m1(/"dateModified":\s*"([^"]+)"/, h)) || pub;
    if (!pub) warn(`${url}: no datePublished, using build time (feed will differ every build)`);

    const image = m1(/property="og:image" content="([^"]+)"/, h);

    out.push({
      url, section, title,
      desc: m1(/name="description" content="([^"]+)"/, h) || '',
      image,
      enclosure: enclosureOf(image),
      content,
      published: pub || NOW,
      modified: mod || pub || NOW,
      category: label,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Guards
 * ------------------------------------------------------------------ */

/**
 * Fail the build rather than publish a feed that is empty or duplicated. An
 * empty feed is indistinguishable from "the site has no articles" to a reader,
 * and it would overwrite a good one that is already live.
 */
function assertSane(L, items) {
  if (!items.length) throw new Error(`feeds[${L.lang}]: 0 items. Refusing to publish an empty feed.`);
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.url)) throw new Error(`feeds[${L.lang}]: duplicate canonical ${it.url}`);
    seen.add(it.url);
  }
  const wrongLang = items.filter((it) => (L.dir ? !it.url.startsWith(`${SITE}/en/`) : it.url.startsWith(`${SITE}/en/`)));
  if (wrongLang.length) throw new Error(`feeds[${L.lang}]: ${wrongLang.length} item(s) from the other language, first: ${wrongLang[0].url}`);
}

/**
 * Walk the document the way a parser does: outside a CDATA section look for the
 * next `<![CDATA[`, inside one look for the next `]]>`. Every section must be
 * closed by the end.
 *
 * Counting `<![CDATA[` against `]]>` instead looks equivalent and is not. An
 * article that *shows* a CDATA example, which this site does because Blogger
 * themes are full of them, puts a literal `<![CDATA[` inside the payload where
 * it is ordinary text and opens nothing. The counts then disagree on a document
 * that is perfectly well formed. That naive version produced a false failure the
 * first time it was tested, which is the same trap as counting `<b:...>` tags.
 */
function cdataClosed(s) {
  let i = 0, inside = false;
  for (;;) {
    if (!inside) {
      const n = s.indexOf('<![CDATA[', i);
      if (n < 0) return true;
      inside = true; i = n + 9;
    } else {
      const n = s.indexOf(']]>', i);
      if (n < 0) return false;
      inside = false; i = n + 3;
    }
  }
}

/**
 * A structural smoke test on what was just written. Not a full parser, but it
 * catches the failure modes this generator can actually produce: an unbalanced
 * or prematurely closed CDATA section, and a bare `&` or `<` in the markup
 * outside one. Both make the document unparseable for every reader, and both
 * come from article content rather than from this file, so they cannot be ruled
 * out by reading the code.
 */
function verifyXml(path, expectedItems, itemTag) {
  const s = readFileSync(path, 'utf8');

  if (!cdataClosed(s)) throw new Error(`${path}: unterminated CDATA section`);

  const count = (s.match(new RegExp(`<${itemTag}>`, 'g')) || []).length;
  if (count !== expectedItems) throw new Error(`${path}: wrote ${count} <${itemTag}>, expected ${expectedItems}`);

  // Blank out every CDATA payload, then the remaining markup must be clean.
  const skeleton = s.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  if (skeleton.includes(']]>')) throw new Error(`${path}: stray ]]> outside a CDATA section`);
  const badAmp = skeleton.match(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
  if (badAmp) throw new Error(`${path}: unescaped & near "${skeleton.slice(Math.max(0, badAmp.index - 60), badAmp.index + 60)}"`);
  if (!s.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) throw new Error(`${path}: missing XML declaration`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) throw new Error(`${path}: control character in output`);
}

function verifyJson(path, expectedItems) {
  const j = JSON.parse(readFileSync(path, 'utf8')); // throws on malformed
  if (j.items.length !== expectedItems) throw new Error(`${path}: wrote ${j.items.length} items, expected ${expectedItems}`);
  if (j.version !== 'https://jsonfeed.org/version/1.1') throw new Error(`${path}: wrong JSON Feed version`);
}

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

function emit(L) {
  const OUT = L.dir ? join(DIST, L.dir) : DIST;
  const BASE = L.dir ? `${SITE}/${L.dir}` : SITE;
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const warnings = [];
  const warn = (m) => warnings.push(m);

  const sections = discoverSections(L.dir);
  const unlabelled = sections.filter((s) => !SECTION_LABELS[s]);

  let items = sections.flatMap((s) => collect(L.dir, s, L, warn));

  // Newest first. The URL tiebreaker keeps the output byte-identical between two
  // builds of the same content, which is what IndexNow's change detection and
  // the hourly cache both depend on.
  items.sort((a, b) => (b.modified - a.modified) || (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));

  assertSane(L, items);

  const total = items.length;
  items = items.slice(0, MAX_ITEMS);
  const lastBuild = items[0].modified;

/* ---------- RSS 2.0 (full content) ---------- */
  const rssItems = items.map((it) => `    <item>
      <title>${xesc(it.title)}</title>
      <link>${xesc(it.url)}</link>
      <guid isPermaLink="true">${xesc(it.url)}</guid>
      <pubDate>${rfc822(it.published)}</pubDate>
      <dc:creator>${xesc(L.author)}</dc:creator>
      <category>${xesc(it.category)}</category>
      <description>${xesc(it.desc)}</description>
${it.enclosure ? `      <enclosure url="${xesc(it.enclosure.url)}" type="${it.enclosure.type}" length="${it.enclosure.length}"/>
      <media:content url="${xesc(it.enclosure.url)}" medium="image" type="${it.enclosure.type}"/>
` : ''}      <content:encoded>${cdata(`${it.image ? `<p><img src="${it.image}" alt="${it.title}" style="max-width:100%;height:auto"/></p>` : ''}${it.content}<p><a href="${it.url}">${L.readMore}</a></p>`)}</content:encoded>
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
    <atom:link href="${HUB}" rel="hub"/>
    <description>${xesc(L.desc)}</description>
    <language>${L.lang}</language>
    <copyright>© ${NOW.getFullYear()} BlogKub</copyright>
    <managingEditor>${L.authorEmail} (${xesc(L.author)})</managingEditor>
    <webMaster>${L.authorEmail} (${xesc(L.author)})</webMaster>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <generator>BlogKub feed builder</generator>
    <ttl>60</ttl>
    <image><url>${L.logo}</url><title>${xesc(L.title)}</title><link>${L.home}</link></image>
${rssItems}
  </channel>
</rss>
`;
  writeFileSync(join(OUT, 'rss.xml'), rss);

/* ---------- JSON Feed 1.1 (full content) ---------- */
  const authors = [{ name: L.author, url: L.dir ? `${SITE}/en/about` : `${SITE}/about` }];
  const jsonFeed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: L.title,
    home_page_url: L.home,
    feed_url: `${BASE}/feed.json`,
    hubs: [{ type: 'WebSub', url: HUB }],
    description: L.desc,
    language: L.lang,
    icon: L.logo,
    favicon: `${SITE}/favicon-32x32.png`,
    authors,
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
      authors,
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
${it.enclosure ? `    <link rel="enclosure" type="${it.enclosure.type}" length="${it.enclosure.length}" href="${xesc(it.enclosure.url)}"/>\n` : ''}    <content type="html">${cdata(`${it.image ? `<p><img src="${it.image}" alt="${it.title}" style="max-width:100%;height:auto"/></p>` : ''}${it.content}<p><a href="${it.url}">${L.readMore}</a></p>`)}</content>
  </entry>`).join('\n');

  writeFileSync(join(OUT, 'atom.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${L.lang}">
  <title type="text">${xesc(L.title)}</title>
  <subtitle type="text">${xesc(L.desc)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${BASE}/atom.xml"/>
  <link rel="hub" href="${HUB}"/>
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

/* ---------- verify what was written, before anything ships ---------- */
  verifyXml(join(OUT, 'rss.xml'), items.length, 'item');
  verifyXml(join(OUT, 'atom.xml'), items.length, 'entry');
  verifyJson(join(OUT, 'feed.json'), items.length);

  const capped = total > items.length ? ` (capped from ${total})` : '';
  console.log(`feeds[${L.lang}]: ${items.length} items${capped} from [${sections.join(', ')}] -> ${OUT}/rss.xml, atom.xml, feed.json`);
  for (const s of unlabelled) console.log(`feeds[${L.lang}]: NOTE new section "${s}" included; add it to SECTION_LABELS for a proper <category>`);
  for (const w of warnings) console.log(`feeds[${L.lang}]: WARN ${w}`);
}

for (const L of [CHANNELS.th, CHANNELS.en]) emit(L);
