#!/usr/bin/env node
/**
 * BlogKub - WebSub publish notification.
 *
 * Runs AFTER the deploy, from the workflow. Tells the hub that the feeds changed
 * so it can push to everyone subscribed through it, instead of them polling.
 *
 *   POST https://pubsubhubbub.appspot.com/
 *   hub.mode=publish&hub.url=<feed url>
 *
 * Only the four XML feeds are published. The hub fetches whatever URL it is given
 * and distributes it to subscribers of that topic, and WebSub subscribers speak
 * RSS and Atom; JSON Feed carries its own `hubs` array for the readers that
 * support it, but the hub is not going to serve JSON to an Atom subscriber.
 *
 * Ordering, and why this is last:
 *
 *   The hub FETCHES the feed as soon as it is told to. Publishing before the
 *   deploy lands means it fetches the previous build and pushes stale content as
 *   if it were new, and there is no retraction. So this must run after wrangler,
 *   for the same reason IndexNow does.
 *
 * When it runs:
 *
 *   Only when this deploy actually changed something. It reads the queue that
 *   indexnow-plan.mjs wrote; an empty or missing queue means the build produced
 *   the same bytes as the last one, and announcing that is noise. A hub that is
 *   pinged on every no-op push learns to distrust the publisher.
 *
 * Failure is not fatal. A hub being down does not undo a good deploy, and the
 * feeds are still correct and still polled by anyone not using WebSub. The
 * workflow step carries continue-on-error for the same reason.
 */
import { readFileSync, existsSync } from 'node:fs';

const HUB = 'https://pubsubhubbub.appspot.com/';
const SITE = 'https://www.blogkub.com';

const FEEDS = [
  `${SITE}/rss.xml`,
  `${SITE}/atom.xml`,
  `${SITE}/en/rss.xml`,
  `${SITE}/en/atom.xml`,
];

const QUEUE_ALL = '.indexnow-queue-all.json';
const QUEUE = existsSync(QUEUE_ALL) ? QUEUE_ALL : '.indexnow-queue.json';

let changed = [];
if (existsSync(QUEUE)) {
  try {
    const q = JSON.parse(readFileSync(QUEUE, 'utf8'));
    changed = Array.isArray(q) ? q : (q.urls || []);
  } catch { changed = []; }
}

if (!changed.length) {
  console.log('websub: nothing changed in this deploy, not publishing');
  process.exit(0);
}

console.log(`websub: ${changed.length} page(s) changed, publishing ${FEEDS.length} feed(s) to the hub`);

let ok = 0, failed = 0;
for (const url of FEEDS) {
  const body = new URLSearchParams({ 'hub.mode': 'publish', 'hub.url': url });
  try {
    const res = await fetch(HUB, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    // The spec says 204 on success. Hubs in the wild also answer 200 or 202.
    if (res.status === 204 || res.status === 200 || res.status === 202) {
      console.log(`   ok    ${res.status}  ${url}`);
      ok++;
    } else {
      const text = (await res.text().catch(() => '')).slice(0, 200);
      console.log(`   fail  ${res.status}  ${url}  ${text}`);
      failed++;
    }
  } catch (e) {
    console.log(`   fail  ---  ${url}  ${e.message}`);
    failed++;
  }
}

console.log(`websub: ${ok} published, ${failed} failed`);
// Never fail the job: the deploy is already live and correct without the hub.
process.exit(0);
