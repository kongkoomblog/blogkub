/**
 * BlogKub - markdown content negotiation.
 *
 * Cloudflare's own Markdown for Agents does this at the zone level, but it is a Pro
 * plan feature and this zone is on Free. The site is otherwise pure static assets with
 * no Worker at all, so this script exists only to answer `Accept: text/markdown` from
 * the .md twins that build-markdown.mjs already writes next to every page.
 *
 * It must not be able to take the site down. Every path ends at env.ASSETS.fetch, and
 * anything unexpected is caught and falls through to exactly the response the site
 * would have served without this Worker in front of it.
 */

/** Quality value the Accept header gives a media type, 0 if it is not acceptable. */
function quality(accept, type) {
  let best = 0;
  for (const part of accept.split(',')) {
    const [name, ...params] = part.trim().split(';');
    if (name.trim().toLowerCase() !== type) continue;
    const q = params.map((p) => p.trim().match(/^q=([0-9.]+)$/i)).find(Boolean);
    best = Math.max(best, q ? parseFloat(q[1]) : 1);
  }
  return best;
}

// Markdown only when it is acceptable AND at least as wanted as HTML. An Accept of
// "text/html, text/markdown;q=0.9" is a client that would rather have the page, and
// answering it with markdown because markdown was mentioned at all ignores what it
// actually said. "text/markdown" alone, which is what agents send, gives 1 against 0.
const WANTS_MD = (accept) => {
  const md = quality(accept, 'text/markdown');
  return md > 0 && md >= quality(accept, 'text/html');
};

// A page URL -> its markdown twin. Anything that already names a file is left alone.
const twinOf = (pathname) => {
  if (pathname.endsWith('/')) return pathname + 'index.md';
  if (/\.[a-z0-9]+$/i.test(pathname)) return null;
  return pathname + '.md';
};

// Tell caches that the same URL has two representations, or one of them gets pinned.
const withVary = (res) => {
  const headers = new Headers(res.headers);
  const vary = headers.get('Vary');
  if (!/\bAccept\b/i.test(vary || '')) headers.set('Vary', vary ? vary + ', Accept' : 'Accept');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};

export default {
  async fetch(request, env) {
    try {
      const accept = request.headers.get('Accept') || '';
      if ((request.method === 'GET' || request.method === 'HEAD') && WANTS_MD(accept)) {
        const url = new URL(request.url);
        const twin = twinOf(url.pathname);
        if (twin) {
          const res = await env.ASSETS.fetch(new URL(twin, url));
          if (res.ok) {
            const headers = new Headers(res.headers);
            // Set rather than trust: Workers Static Assets drops the charset parameter
            // on deploy, and a .md file declares its encoding nowhere in-band.
            headers.set('Content-Type', 'text/markdown; charset=utf-8');
            headers.set('Vary', 'Accept');
            headers.set('Content-Location', twin);
            // No x-markdown-tokens. The header is optional and a token count is
            // model-specific; the usual bytes/4 rule is far out for Thai, and a
            // confidently wrong number is worse than none.
            return new Response(request.method === 'HEAD' ? null : res.body, { status: 200, headers });
          }
        }
      }
      // A .md fetched by its own URL. This used to be a `/*.md` rule in _headers, which
      // is the one Cloudflare-parsed thing the first failing deploy changed, so it was
      // removed and the job moved here. The charset has to be stated either way: Workers
      // Static Assets drops it on deploy and a .md file declares nothing in-band, which
      // is what turned llms.txt into mojibake once already.
      if (new URL(request.url).pathname.endsWith('.md')) {
        const res = await env.ASSETS.fetch(request);
        if (res.ok) {
          const headers = new Headers(res.headers);
          headers.set('Content-Type', 'text/markdown; charset=utf-8');
          return new Response(res.body, { status: res.status, headers });
        }
        return res;
      }
    } catch {
      // fall through
    }
    return withVary(await env.ASSETS.fetch(request));
  },
};
