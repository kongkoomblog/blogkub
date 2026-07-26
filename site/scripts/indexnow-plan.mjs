#!/usr/bin/env node
/**
 * BlogKub — IndexNow planner (runs after the build, before the deploy).
 *
 * Works out which pages actually changed since the last deploy, so we only
 * ping search engines about those. The sitemap cannot answer that question:
 * its <lastmod> is the build date, so every page looks new on every build.
 * Instead we hash the built HTML of each indexable page and compare against
 * the hashes recorded on the last run.
 *
 * That record lives at /indexnow-state.json on the live site, which makes the
 * previously deployed build its own source of truth. No cache to expire, no
 * state file to commit, and nothing to go stale if a deploy is rolled back.
 * If the file cannot be fetched (first ever run, or the site is not up yet)
 * every URL is treated as new, which is exactly the behaviour wanted the
 * first time round.
 *
 * The two sitemaps are announced alongside the pages. They are not listed in
 * sitemap.xml themselves, so they get added by hand, and they go through the
 * same hash comparison as everything else. Their <lastmod> is a date, so they
 * only change on a day the site is actually rebuilt, which keeps them to at
 * most one submission per day rather than one per deploy.
 *
 * Writes two files:
 *   dist/indexnow-state.json   ships with the site, read by the next run
 *   .indexnow-queue.json       the URLs to submit, read by indexnow-submit
 *
 * Flags:
 *   --all   submit every URL regardless of what changed
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.blogkub.com';
const STATE_PATH = 'indexnow-state.json';
const QUEUE_FILE = '.indexnow-queue.json';
const FORCE_ALL = process.argv.includes('--all');

// Not pages, so they never appear in sitemap.xml's own <loc> list.
const EXTRA_URLS = [`${SITE}/sitemap.xml`, `${SITE}/sitemap-images.xml`];

// canonical URL -> the file that serves it (astro build.format 'file')
function fileFor(url) {
  let p = url.replace(SITE, '') || '/';
  p = p.replace(/[?#].*$/, '');
  // already a real filename (the sitemaps); everything else is an extensionless page
  if (/\.[a-z0-9]+$/i.test(p)) return join(DIST, p.replace(/^\//, ''));
  if (p.endsWith('/')) p += 'index';
  return join(DIST, p.replace(/^\//, '') + '.html');
}

function urlsFromSitemap() {
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function hashOf(file) {
  // The whole document is hashed on purpose. A layout or nav change is a real
  // change to the page a crawler would fetch, so it should be re-announced.
  return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16);
}

async function previousState() {
  if (FORCE_ALL) return {};
  try {
    const res = await fetch(`${SITE}/${STATE_PATH}`, {
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.log(`indexnow: no previous state (HTTP ${res.status}) -> treating every URL as new`);
      return {};
    }
    const json = await res.json();
    return json && typeof json.pages === 'object' ? json.pages : {};
  } catch (err) {
    console.log(`indexnow: could not read previous state (${err.message}) -> treating every URL as new`);
    return {};
  }
}

const urls = [...urlsFromSitemap(), ...EXTRA_URLS];
const pages = {};
const missing = [];
for (const url of urls) {
  const f = fileFor(url);
  if (!existsSync(f)) { missing.push(url); continue; }
  pages[url] = hashOf(f);
}

const prev = await previousState();
const queue = Object.keys(pages).filter((u) => FORCE_ALL || prev[u] !== pages[u]);
const removed = Object.keys(prev).filter((u) => !(u in pages));

writeFileSync(join(DIST, STATE_PATH), JSON.stringify({
  generated: new Date().toISOString(),
  count: Object.keys(pages).length,
  pages,
}, null, 0) + '\n');

writeFileSync(QUEUE_FILE, JSON.stringify({ host: new URL(SITE).host, urls: queue }, null, 0) + '\n');

if (missing.length) console.log(`indexnow: ${missing.length} sitemap URL(s) had no built file, skipped`);
if (removed.length) console.log(`indexnow: ${removed.length} URL(s) disappeared since last deploy (not submitted, IndexNow is for live URLs)`);
console.log(
  FORCE_ALL
    ? `indexnow: full submission requested -> ${queue.length} of ${urls.length} URLs queued`
    : `indexnow: ${queue.length} changed of ${Object.keys(pages).length} pages queued`
);
