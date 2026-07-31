#!/usr/bin/env node
/**
 * BlogKub - markdown twins (postbuild).
 *
 * Writes a .md copy of every indexable page next to its .html, so
 * /learn/toc  ->  /learn/toc.md. That is the convention llmstxt.org describes and
 * what AI crawlers increasingly try first: it hands an agent the article without
 * the header, nav, footer and inline scripts it would otherwise have to strip.
 *
 * This does NOT do Accept-header negotiation. That needs something running per
 * request, either Cloudflare's zone-level Markdown for Agents or a Worker in front
 * of the assets. The .md twins are useful on their own and cost nothing at runtime.
 *
 * Runs after build-hreflang so the injected <link> tags are already in place, and
 * before indexnow-plan so the planner hashes the HTML this script has finished
 * editing. Running the whole chain twice is safe: the <link rel="alternate"
 * type="text/markdown"> tag is only added when it is not already there, and the .md
 * files are rewritten with identical content.
 *
 * The converter is hand-written rather than a library because the input is not
 * arbitrary HTML. Every page comes out of two Astro layouts or one of three
 * hand-written pages, so the tag set is small and known.
 *
 * It walks the document by matching each opening tag to its own closing tag with a
 * depth counter. The obvious `<div>([\s\S]*?)</div>` does not work here: the pages
 * nest divs several deep, and a non-greedy match stops at the first </div> it sees,
 * silently truncating the element and leaving stray markup behind.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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

// dist-relative path -> canonical URL (build.format 'file')
const urlFromRel = (rel) => {
  const p = '/' + rel.replace(/\\/g, '/').replace(/\.html$/, '').replace(/\/index$/, '/');
  return SITE + (p === '/index' ? '/' : p);
};

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', middot: '·', laquo: '«', raquo: '»', times: '×', rarr: '→', larr: '←', copy: '©', deg: '°', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENTITIES ? ENTITIES[n.toLowerCase()] : m));

// The page currently being converted, so relative hrefs resolve the way a browser
// would rather than being emitted as-is into a file that may be read anywhere.
let BASE = SITE + '/';
const abs = (href) => {
  const h = decode(href).trim();
  if (/^(https?:|mailto:|tel:|data:)/i.test(h)) return h;   // a bare #fragment resolves below
  try { return new URL(h, BASE).href; } catch { return h; }
};

const collapse = (s) => s.replace(/[ \t\r\n]+/g, ' ').trim();

/**
 * Index just past the tag that closes the element opened at `from`.
 * `from` is the index of the character after the opening tag.
 */
function endOf(html, tag, from) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'gi');
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[2] === '/') continue;          // self-closing, changes nothing
    depth += m[1] ? -1 : 1;
    if (depth === 0) return { inner: html.slice(from, m.index), end: re.lastIndex };
  }
  return { inner: html.slice(from), end: html.length };
}

/**
 * Finished fragments are parked behind a placeholder instead of being written into
 * the string directly, because the last step of the inline pass deletes anything that
 * looks like a tag. The guides quote markup at readers -- `<code>&lt;div&gt;</code>` --
 * and decoding that inside a <code> element produced real angle brackets, which the
 * tag strip then swallowed. Every code sample on the site came out as an empty pair
 * of backticks. Placeholders are restored after the strip, so their contents are
 * never examined as markup.
 */
let KEEP = [];
const keep = (s) => `\u0000${KEEP.push(s) - 1}\u0000`;
const restore = (s) => {
  let out = s, guard = 0;
  while (/\u0000\d+\u0000/.test(out) && guard++ < 10) out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => KEEP[+i]);
  return out;
};

/** Inline markup -> markdown, for the contents of one block element. */
function inline(html) {
  const s = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => {
      const v = collapse(inline(t));
      return v ? `**${v}** ` : '';            // an empty <b> used as decoration emits nothing
    })
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => {
      const v = collapse(inline(t));
      return v ? `*${v}* ` : '';
    })
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => {
      const v = collapse(decode(t.replace(/<[^>]+>/g, '')));
      return v ? keep('`' + v + '`') : '';
    })
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => {
      const label = collapse(inline(t));
      return label ? keep(`[${label}](${abs(h)})`) : '';
    })
    .replace(/<img\b[^>]*>/gi, (m) => {
      const src = (m.match(/src="([^"]*)"/) || [])[1];
      const alt = (m.match(/alt="([^"]*)"/) || [])[1] || '';
      return src ? keep(`![${decode(alt)}](${abs(src)})`) : '';
    })
    .replace(/<[^>]+>/g, '');
  return decode(s);
}

const text = (html) => collapse(restore(inline(html)));

/** Split a container into its direct <li> children, nesting-aware. */
function items(html, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  let m;
  while ((m = re.exec(html))) {
    const { inner, end } = endOf(html, tag, m.index + m[0].length);
    out.push(inner);
    re.lastIndex = end;
  }
  return out;
}

function listItem(html, marker, depth) {
  const pad = '  '.repeat(depth);
  const nested = [];
  let own = html;
  for (const t of ['ul', 'ol']) {
    const re = new RegExp(`<${t}\\b[^>]*>`, 'i');
    let m;
    while ((m = re.exec(own))) {
      const { end } = endOf(own, t, m.index + m[0].length);
      nested.push(block(own.slice(m.index, end), depth + 1));
      own = own.slice(0, m.index) + own.slice(end);
    }
  }
  return [`${pad}${marker} ${text(own)}`, ...nested.filter(Boolean)].join('\n');
}

function table(html) {
  const rows = items(html, 'tr').map((r) =>
    [...r.matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((c) => text(c[2]).replace(/\|/g, '\\|'))
  ).filter((r) => r.length);
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r) => [...r, ...Array(width - r.length).fill('')];
  const head = pad(rows[0]);
  return [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.slice(1).map((r) => `| ${pad(r).join(' | ')} |`)].join('\n');
}

/**
 * A grid of card links, which is how the learn hub and the homepage list their
 * pages. Left to the inline pass these run together into one unreadable line, so a
 * container holding nothing but links becomes a list instead.
 */
function linkGrid(html) {
  const links = [];
  const re = /<a\b[^>]*href="([^"]*)"[^>]*>/gi;
  let m, stripped = html;
  while ((m = re.exec(html))) {
    const { inner } = endOf(html, 'a', m.index + m[0].length);
    links.push({ href: m[1], label: text(inner) });
  }
  if (links.length < 3) return '';
  stripped = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' ').replace(/<[^>]+>/g, ' ');
  if (collapse(decode(stripped))) return '';          // there is prose here too, leave it alone
  return links.filter((l) => l.label).map((l) => `- [${l.label}](${abs(l.href)})`).join('\n');
}

const CONTAINERS = new Set(['div', 'section', 'aside', 'blockquote', 'details', 'figure', 'ul', 'ol', 'table']);
const BLOCK_TAG = /<(h1|h2|h3|h4|h5|h6|p|ul|ol|table|figure|details|aside|blockquote|pre|div|section)\b([^>]*)>|<hr\s*\/?>/gi;

function block(html, depth = 0) {
  const out = [];
  const re = new RegExp(BLOCK_TAG.source, 'gi');
  let m;
  while ((m = re.exec(html))) {
    if (!m[1]) { out.push('---'); continue; }
    const tag = m[1].toLowerCase();
    const cls = (m[2] || '').match(/class="([^"]*)"/)?.[1] || '';
    const { inner, end } = CONTAINERS.has(tag)
      ? endOf(html, tag, m.index + m[0].length)
      : (() => {
        const close = html.toLowerCase().indexOf(`</${tag}>`, m.index);
        return close < 0
          ? { inner: html.slice(m.index + m[0].length), end: html.length }
          : { inner: html.slice(m.index + m[0].length, close), end: close + tag.length + 3 };
      })();
    re.lastIndex = end;

    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const t = text(inner);
        if (t) out.push('#'.repeat(+tag[1]) + ' ' + t);
        break;
      }
      case 'p': { const t = text(inner); if (t) out.push(cls === 'meta' ? '*' + t + '*' : t); break; }
      case 'ul': case 'ol': {
        const lines = items(inner, 'li').map((li, i) => listItem(li, tag === 'ol' ? `${i + 1}.` : '-', depth));
        if (lines.length) out.push(lines.join('\n'));
        break;
      }
      case 'table': { const t = table(inner); if (t) out.push(t); break; }
      case 'pre': out.push('```\n' + decode(inner.replace(/<[^>]+>/g, '')).replace(/^\n+|\n+$/g, '') + '\n```'); break;
      case 'figure': {
        const img = (inner.match(/<img\b[^>]*>/i) || [])[0];
        const cap = (inner.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i) || [])[1];
        if (img) out.push(text(img));
        if (cap) out.push('*' + text(cap) + '*');
        break;
      }
      case 'details': {
        const sum = (inner.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i) || [])[1];
        if (sum) out.push('**' + text(sum) + '**');
        const rest = block(inner.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/i, ''), depth);
        if (rest) out.push(rest);
        break;
      }
      case 'aside': case 'blockquote': {
        const body = block(inner, depth) || text(inner);
        if (body) out.push(body.split('\n').map((l) => '> ' + l).join('\n'));
        break;
      }
      case 'div': case 'section': {
        const grid = linkGrid(inner);
        if (grid) { out.push(grid); break; }
        const body = block(inner, depth) || text(inner);
        if (!body) break;
        // The answer-first summary is the one wrapper that means something; quoting it
        // keeps an agent from reading it as just the first paragraph.
        out.push(cls.includes('tldr') ? body.split('\n').map((l) => '> ' + l).join('\n') : body);
        break;
      }
    }
  }
  return out.filter(Boolean).join('\n\n');
}

const pages = walk(DIST);
let written = 0, tagged = 0, skipped = 0;

for (const file of pages) {
  const rel = file.slice(DIST.length + 1);
  let html = readFileSync(file, 'utf8');

  // A page kept out of the index has no business being handed to an agent either.
  if (/<meta name="robots" content="[^"]*noindex/i.test(html) || rel === '404.html') { skipped++; continue; }

  // Article pages wrap their content; the hand-written homepages and the Thai learn hub
  // are laid out in bare <section>s, so fall back to the body with the chrome removed.
  // Those are the pages an agent is most likely to ask for.
  const scope = (html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)
    || html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [])[1]
    || (html.split(/<body[^>]*>/i)[1] || '')
      .replace(/<(header|footer|nav|dialog|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  if (!scope) { skipped++; continue; }

  const url = urlFromRel(rel);
  BASE = url;
  KEEP = [];
  const body = block(scope.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' '))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  if (!body.trim()) { skipped++; continue; }

  const title = text((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || 'BlogKub');
  const md = `<!-- Markdown copy of ${url} -->\n`
    + `<!-- title: ${title} -->\n`
    + `<!-- lang: ${rel.startsWith('en/') ? 'en' : 'th'} -->\n\n${body}\n`;

  writeFileSync(file.replace(/\.html$/, '.md'), md, 'utf8');
  written++;

  const mdUrl = url.endsWith('/') ? url + 'index.md' : url + '.md';
  if (!html.includes('type="text/markdown"')) {
    writeFileSync(file, html.replace('</head>', `<link rel="alternate" type="text/markdown" href="${mdUrl}"/></head>`), 'utf8');
    tagged++;
  }
}

console.log(`markdown: ${written} .md written, ${tagged} pages tagged, ${skipped} skipped`);
