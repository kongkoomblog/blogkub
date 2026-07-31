// Build-time: populate ./public from ../project (the source of assets + unmigrated
// pages), then remove any page we have an Astro route for (so no collision).
// public/ is gitignored — generated fresh each build, so images aren't duplicated in git.
import { cpSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

rmSync('public', { recursive: true, force: true });
cpSync('../project', 'public', { recursive: true });

const PAGES = 'src/pages';
let removed = 0;
function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!e.endsWith('.astro')) continue;
    const rel = relative(PAGES, p).replace(/\.astro$/, '.html');
    const pub = join('public', rel);
    if (existsSync(pub)) { rmSync(pub); removed++; }
  }
}
walk(PAGES);

// Internal notes live alongside the assets in ../project, so the copy above was putting
// them on the public site: PROJECT-HANDOFF.md, DEPLOY-README.md and the rest were all
// readable at their own URLs. None contains a credential, but DEPLOY-README walks
// through creating a Cloudflare API token, and several describe an architecture the
// site moved off long ago, which is worth neither publishing nor letting a crawler read.
// They stay in git where they are; they just stop being deployed.
let internal = 0;
for (const e of readdirSync('public')) {
  if (e.endsWith('.md') && e !== 'llms.md') { rmSync(join('public', e)); internal++; }
}
console.log(`sync-public: copied ../project -> public, removed ${removed} migrated page(s), ${internal} internal doc(s)`);
