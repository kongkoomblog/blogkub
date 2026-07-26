#!/usr/bin/env node
/**
 * BlogKub — IndexNow submitter (runs after the deploy).
 *
 * Deliberately separate from the planner and deliberately after the deploy:
 * IndexNow tells a search engine "come and fetch this now", so the page has
 * to already be live or the crawler arrives at the old version, or a 404.
 *
 * Ownership is proved with the key file at the site root (protocol Option 1).
 * That file is checked before anything is submitted, because a stale or
 * missing key means every submission comes back 403 and the run would
 * otherwise look like it worked.
 *
 * Flags:
 *   --dry-run   do everything except the final POST
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const SITE = 'https://www.blogkub.com';
const QUEUE_FILE = '.indexnow-queue.json';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH = 10000;              // protocol maximum per POST
const DRY = process.argv.includes('--dry-run');

// The key is whatever <key>.txt sits at the site root, so rotating it is a
// matter of replacing that one file. Nothing here hardcodes the value.
function keyFromRepo() {
  const dirs = ['dist', '../project'];
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      const m = f.match(/^([0-9a-fA-F-]{8,128})\.txt$/);
      if (!m) continue;
      const body = readFileSync(`${d}/${f}`, 'utf8').trim();
      if (body === m[1]) return m[1];
    }
  }
  return null;
}

async function keyIsLive(key) {
  try {
    const res = await fetch(`${SITE}/${key}.txt`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return `HTTP ${res.status}`;
    const body = (await res.text()).trim();
    return body === key ? true : `file served but contains "${body.slice(0, 40)}"`;
  } catch (err) {
    return err.message;
  }
}

if (!existsSync(QUEUE_FILE)) {
  console.log('indexnow: no queue file, nothing to submit');
  process.exit(0);
}
const { urls } = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
if (!urls.length) {
  console.log('indexnow: nothing changed, no submission needed');
  process.exit(0);
}

const key = keyFromRepo();
if (!key) {
  console.error('indexnow: no key file found. Expected <key>.txt at the site root containing exactly that key.');
  process.exit(1);
}

const live = await keyIsLive(key);
if (live !== true) {
  console.error(`indexnow: key file is not reachable at ${SITE}/${key}.txt (${live}). Submissions would be rejected, aborting.`);
  process.exit(1);
}
console.log(`indexnow: key verified at ${SITE}/${key}.txt`);

let sent = 0;
for (let i = 0; i < urls.length; i += BATCH) {
  const batch = urls.slice(i, i + BATCH);
  const payload = {
    host: new URL(SITE).host,
    key,
    keyLocation: `${SITE}/${key}.txt`,
    urlList: batch,
  };
  if (DRY) {
    console.log(`indexnow: [dry run] would POST ${batch.length} URL(s)`);
    batch.slice(0, 5).forEach((u) => console.log(`  ${u}`));
    if (batch.length > 5) console.log(`  ... and ${batch.length - 5} more`);
    sent += batch.length;
    continue;
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  // 200 accepted, 202 accepted with key validation still pending. Anything
  // else is a real failure and should fail the job rather than pass quietly.
  if (res.status !== 200 && res.status !== 202) {
    console.error(`indexnow: submission failed with HTTP ${res.status} ${res.statusText}`);
    console.error(await res.text().catch(() => ''));
    process.exit(1);
  }
  console.log(`indexnow: submitted ${batch.length} URL(s), HTTP ${res.status}`);
  sent += batch.length;
}
console.log(`indexnow: done, ${sent} URL(s) announced`);
