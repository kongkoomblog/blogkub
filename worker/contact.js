/**
 * BlogKub - contact form endpoint (POST /api/contact).
 *
 * Cloudflare Email Routing, which this domain now runs, only RECEIVES: it forwards
 * anything sent to hello@blogkub.com on to a verified destination address. It cannot
 * send, so a contact form needs a sending path of its own. That is the `send_email`
 * binding, which is part of Email Workers, costs nothing, and can only deliver to an
 * address already verified on the account. There is no third party in the path and
 * nothing to leak: a stolen key would be useless because the only possible recipient
 * is the owner's own inbox.
 *
 * The recipient is read from env.CONTACT_TO rather than pinned in wrangler.jsonc,
 * because this repository is public and the destination is a real mailbox. Set it with
 * `wrangler secret put CONTACT_TO`, or as a Worker variable in the dashboard.
 *
 * This must never be able to take the site down. index.js calls it only for this exact
 * path and method, it catches everything, and it always answers with JSON.
 */

const MAX = { name: 80, email: 160, message: 4000 };
const MIN = { name: 1, message: 10 };
const TOPICS = new Set(['question', 'bug', 'feature', 'other']);

// Deliberately loose. The address only has to be plausible enough to reply to, and a
// strict regex rejects real addresses far more often than it catches a fake one.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      // The form is same-origin, so no CORS headers on purpose: a browser on another
      // site cannot read the reply, which removes one way to probe this endpoint.
    },
  });

/** base64 of a UTF-8 string, wrapped, for MIME bodies and RFC 2047 subjects. */
function b64(str, wrap) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  const out = btoa(bin);
  return wrap ? (out.match(/.{1,76}/g) || []).join('\r\n') : out;
}

/**
 * RFC 2047 subject. An encoded word may not exceed 75 characters, and a header line
 * may not exceed 76, so a long subject has to be split into several encoded words and
 * folded onto continuation lines. Splitting is by CHARACTER, not by byte: each encoded
 * word must decode on its own, and a Thai character cut across two of them decodes to
 * nothing on either side. Thai is 3 bytes per character, so the byte budget is what
 * binds, not the character count.
 */
function encodeSubject(s) {
  const enc = new TextEncoder();
  const words = [];
  let chunk = '';
  // 39 bytes -> 52 base64 chars -> a 64-char encoded word. With the 9-char
  // "Subject: " prefix that is a 73-char first line, inside the 76 limit. A 42-byte
  // budget looked right and produced a 77-char first line.
  for (const ch of String(s)) {
    if (enc.encode(chunk + ch).length > 39) { words.push(chunk); chunk = ch; }
    else chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => '=?utf-8?B?' + b64(w, false) + '?=').join('\r\n ');
}

/**
 * RFC 5322 message. CRLF throughout, base64 body, and an RFC 2047 encoded subject,
 * because both the subject and the body are routinely Thai and a raw 8-bit header is
 * not valid. Reply-To carries the sender so a reply goes to them; From stays on the
 * site's own domain, which is what Email Routing is configured to allow.
 */
function buildMime({ from, to, replyTo, subject, text }) {
  const id = crypto.randomUUID();
  return [
    'From: BlogKub Contact <' + from + '>',
    'To: <' + to + '>',
    'Reply-To: ' + replyTo,
    'Subject: ' + encodeSubject(subject),
    'Message-ID: <' + id + '@blogkub.com>',
    'Date: ' + new Date().toUTCString(),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(text, true),
    '',
  ].join('\r\n');
}

/** A header value must not carry a newline, or a sender can inject their own headers. */
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();

export async function handleContact(request, env) {
  try {
    // Same-origin only. Not a security boundary on its own, but it costs nothing and
    // stops the simplest drive-by posting.
    const origin = request.headers.get('Origin');
    const site = new URL(request.url).origin;
    if (origin && origin !== site) return json({ ok: false, error: 'origin' }, 403);

    if (!/^application\/json\b/.test(request.headers.get('Content-Type') || '')) {
      return json({ ok: false, error: 'content_type' }, 415);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'bad_json' }, 400);
    }

    // Honeypot: a real browser never fills a field it cannot see. A trip returns
    // ok:true, so the sender is shown success while nothing is sent, which is what
    // makes a FALSE positive the worst outcome here: a real message would vanish and
    // the person would believe it arrived. That is why the field is not called
    // "website" or anything else browser autofill recognises.
    if (body.hp) return json({ ok: true, spam: true });

    // A human needs longer than this to read the form and type a message. Bots post
    // the instant the page parses.
    //
    // `t` is required, and the first version of this defaulted it to 0 with
    // `Number(body.t || 0)`. That made a missing timestamp look like the epoch, so it
    // read as infinitely old and sailed through: omitting the field entirely was
    // enough to skip the check. Absent is now as suspicious as too fast. The upper
    // bound catches a payload captured once and replayed later.
    const t = Number(body.t);
    const elapsed = Date.now() - t;
    if (!Number.isFinite(t) || t <= 0 || elapsed < 3000 || elapsed > 86400000) {
      return json({ ok: true, spam: true });
    }

    const name = oneLine(body.name || '');
    const email = oneLine(body.email || '');
    const topic = String(body.topic || 'other');
    const message = String(body.message || '').trim();

    const bad = [];
    if (name.length < MIN.name || name.length > MAX.name) bad.push('name');
    if (!EMAIL_RE.test(email) || email.length > MAX.email) bad.push('email');
    if (message.length < MIN.message || message.length > MAX.message) bad.push('message');
    if (!TOPICS.has(topic)) bad.push('topic');
    if (bad.length) return json({ ok: false, error: 'invalid', fields: bad }, 422);

    // Configuration, not the sender's fault. Say so plainly rather than pretending the
    // message went somewhere. The two causes are reported separately: they look
    // identical to the visitor but need completely different fixes, and telling them
    // apart from the outside otherwise means guessing.
    //   no_recipient -> `wrangler secret put CONTACT_TO` was never run
    //   no_binding   -> the send_email binding did not deploy
    if (!env.CONTACT_EMAIL) {
      console.log('contact: send_email binding CONTACT_EMAIL is missing');
      return json({ ok: false, error: 'unconfigured', why: 'no_binding' }, 503);
    }
    const to = env.CONTACT_TO;
    if (!to) {
      console.log('contact: CONTACT_TO is not set');
      return json({ ok: false, error: 'unconfigured', why: 'no_recipient' }, 503);
    }

    const from = 'hello@blogkub.com';
    const label = { question: 'Question', bug: 'Bug report', feature: 'Feature request', other: 'Other' }[topic];

    const text = [
      'Topic:   ' + label,
      'Name:    ' + name,
      'Email:   ' + email,
      'Sent:    ' + new Date().toISOString(),
      'Country: ' + (request.headers.get('CF-IPCountry') || '-'),
      'Page:    ' + oneLine(body.page || '-'),
      '',
      '---',
      '',
      message,
      '',
    ].join('\n');

    // Imported here rather than at the top of the module: if Email Workers were ever
    // unavailable, a module-level import would fail the whole Worker, and the Worker
    // is what serves the site.
    const { EmailMessage } = await import('cloudflare:email');
    await env.CONTACT_EMAIL.send(
      new EmailMessage(from, to, buildMime({
        from,
        to,
        replyTo: '"' + name.replace(/"/g, "'") + '" <' + email + '>',
        subject: '[BlogKub] ' + label + ' - ' + name,
        text,
      }))
    );

    return json({ ok: true });
  } catch (err) {
    console.log('contact: send failed', err && err.message);
    return json({ ok: false, error: 'send_failed' }, 502);
  }
}
