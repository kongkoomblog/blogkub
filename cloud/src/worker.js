/* =============================================================
   BlogKub Cloud — Worker API (PROTOTYPE)
   Serverless backend: D1 (ทะเบียน) + R2 (ไฟล์ JSON) + KV (session)

   Auth      POST /api/auth/request-link {email}
             GET  /api/auth/verify?token=...
             GET  /api/me            POST /api/logout
   Projects  GET  /api/projects
             GET  /api/projects/:id          (เจ้าของ หรือ public)
             PUT  /api/projects/:id {name, templateId, state}
             DELETE /api/projects/:id
   History   GET  /api/projects/:id/snapshots
             POST /api/projects/:id/snapshots {reason}
             POST /api/projects/:id/restore {key}
   Community POST /api/projects/:id/publish {public}
             GET  /api/community
             POST /api/community/:id/clone
             POST /api/community/:id/like
   ============================================================= */

const SESSION_TTL = 60 * 60 * 24 * 30;   // 30 วัน
const MAGIC_TTL = 60 * 15;               // ลิงก์อีเมลอายุ 15 นาที
const MAX_SNAPSHOTS = 20;                // เก็บย้อนหลังต่อโปรเจกต์
const MAX_STATE_BYTES = 1_500_000;       // เพดานขนาดไฟล์ JSON (~1.5MB)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    const method = request.method;

    if (method === "OPTIONS") return respond(env, null, 204);

    try {
      // ---------- AUTH ----------
      if (path === "/api/auth/request-link" && method === "POST") return authRequestLink(request, env);
      if (path === "/api/auth/verify" && method === "GET") return authVerify(request, env, url);
      if (path === "/api/me" && method === "GET") {
        const user = await requireUser(request, env);
        return respond(env, { id: user.id, email: user.email, displayName: user.display_name });
      }
      if (path === "/api/logout" && method === "POST") {
        const token = cookieToken(request);
        if (token) await env.KV.delete("sess:" + token);
        return respond(env, { ok: true }, 200, clearCookie());
      }

      // ---------- PROJECTS ----------
      if (path === "/api/projects" && method === "GET") {
        const user = await requireUser(request, env);
        const rows = await env.DB.prepare(
          "SELECT id,name,template_id,is_public,likes,downloads,clones,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC"
        ).bind(user.id).all();
        return respond(env, { projects: rows.results });
      }

      let m;
      if ((m = path.match(/^\/api\/projects\/([\w-]+)$/))) {
        if (method === "GET") return projectGet(request, env, m[1]);
        if (method === "PUT") return projectPut(request, env, m[1]);
        if (method === "DELETE") return projectDelete(request, env, m[1]);
      }
      if ((m = path.match(/^\/api\/projects\/([\w-]+)\/snapshots$/))) {
        if (method === "GET") return snapshotList(request, env, m[1]);
        if (method === "POST") return snapshotCreate(request, env, m[1]);
      }
      if ((m = path.match(/^\/api\/projects\/([\w-]+)\/restore$/)) && method === "POST")
        return snapshotRestore(request, env, m[1]);
      if ((m = path.match(/^\/api\/projects\/([\w-]+)\/publish$/)) && method === "POST")
        return projectPublish(request, env, m[1]);

      // ---------- COMMUNITY (Marketplace & Showcase) ----------
      if (path === "/api/community" && method === "GET") return communityList(env, url);
      if ((m = path.match(/^\/api\/community\/([\w-]+)\/clone$/)) && method === "POST")
        return communityClone(request, env, m[1]);
      if ((m = path.match(/^\/api\/community\/([\w-]+)\/like$/)) && method === "POST")
        return communityLike(request, env, m[1]);
      if ((m = path.match(/^\/api\/community\/([\w-]+)\/comments$/))) {
        if (method === "GET") return commentList(env, m[1]);
        if (method === "POST") return commentCreate(request, env, m[1]);
      }
      if ((m = path.match(/^\/api\/creators\/([\w-]+)$/)) && method === "GET")
        return creatorProfile(env, m[1]);

      return respond(env, { error: "not_found" }, 404);
    } catch (e) {
      if (e instanceof ApiError) return respond(env, { error: e.code }, e.status);
      console.error(e);
      return respond(env, { error: "internal" }, 500);
    }
  },
};

/* ---------------- helpers ---------------- */

class ApiError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }

function respond(env, body, status = 200, extraHeaders = {}) {
  const h = {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "no-store",
    ...extraHeaders,
  };
  if (body === null) return new Response(null, { status, headers: h });
  h["Content-Type"] = "application/json; charset=utf-8";
  return new Response(JSON.stringify(body), { status, headers: h });
}

function cookieToken(request) {
  const c = request.headers.get("Cookie") || "";
  const m = c.match(/(?:^|;\s*)bk_sess=([\w-]+)/);
  return m ? m[1] : null;
}
function sessionCookie(token) {
  return { "Set-Cookie": `bk_sess=${token}; Max-Age=${SESSION_TTL}; Path=/; HttpOnly; Secure; SameSite=None` };
}
function clearCookie() {
  return { "Set-Cookie": "bk_sess=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None" };
}

async function requireUser(request, env) {
  const token = cookieToken(request);
  if (!token) throw new ApiError(401, "unauthorized");
  const userId = await env.KV.get("sess:" + token);
  if (!userId) throw new ApiError(401, "unauthorized");
  const user = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(userId).first();
  if (!user) throw new ApiError(401, "unauthorized");
  return user;
}

async function readJson(request) {
  try { return await request.json(); } catch { throw new ApiError(400, "bad_json"); }
}

const projKey = (userId, id) => `projects/${userId}/${id}.json`;
const snapPrefix = (userId, id) => `snapshots/${userId}/${id}/`;

/* ---------------- auth: magic link ---------------- */

async function authRequestLink(request, env) {
  const { email } = await readJson(request);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ApiError(400, "bad_email");
  const token = crypto.randomUUID();
  await env.KV.put("magic:" + token, email.toLowerCase(), { expirationTtl: MAGIC_TTL });
  const link = new URL(request.url).origin + "/api/auth/verify?token=" + token;

  if (env.DEV_MODE === "1") return respond(env, { ok: true, devLink: link }); // โหมดพัฒนา: คืนลิงก์ตรงๆ

  // production: ส่งอีเมลผ่าน MailChannels (ฟรีสำหรับ Workers — ต้องตั้ง SPF/DKIM ของโดเมนก่อน)
  const mail = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: env.MAIL_FROM, name: "BlogKub" },
      subject: "ลิงก์เข้าสู่ระบบ BlogKub ของคุณ",
      content: [{ type: "text/plain", value: "คลิกเพื่อเข้าสู่ระบบ (หมดอายุใน 15 นาที):\n" + link }],
    }),
  });
  if (!mail.ok) throw new ApiError(502, "mail_failed");
  return respond(env, { ok: true });
}

async function authVerify(request, env, url) {
  const token = url.searchParams.get("token") || "";
  const email = await env.KV.get("magic:" + token);
  if (!email) throw new ApiError(400, "link_expired");
  await env.KV.delete("magic:" + token);

  const now = Date.now();
  let user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
  if (!user) {
    user = { id: crypto.randomUUID(), email };
    await env.DB.prepare("INSERT INTO users (id,email,display_name,created_at,last_login) VALUES (?,?,?,?,?)")
      .bind(user.id, email, email.split("@")[0], now, now).run();
  } else {
    await env.DB.prepare("UPDATE users SET last_login=? WHERE id=?").bind(now, user.id).run();
  }

  const sess = crypto.randomUUID();
  await env.KV.put("sess:" + sess, user.id, { expirationTtl: SESSION_TTL });
  return new Response(null, {
    status: 302,
    headers: { Location: env.APP_URL || "/", ...sessionCookie(sess) },
  });
}

/* ---------------- projects (R2 + D1) ---------------- */

async function projectPut(request, env, id) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  const state = JSON.stringify(body.state ?? {});
  if (state.length > MAX_STATE_BYTES) throw new ApiError(413, "too_large");

  await env.STORE.put(projKey(user.id, id), state, { httpMetadata: { contentType: "application/json" } });
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO projects (id,user_id,name,template_id,created_at,updated_at) VALUES (?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, template_id=excluded.template_id, updated_at=excluded.updated_at
     WHERE projects.user_id=excluded.user_id`
  ).bind(id, user.id, String(body.name || "เว็บไซต์ของฉัน").slice(0, 120), body.templateId || null, now, now).run();
  return respond(env, { ok: true, savedAt: now });
}

async function ownedProject(env, user, id) {
  const row = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(id).first();
  if (!row) throw new ApiError(404, "not_found");
  if (row.user_id !== user.id) throw new ApiError(403, "forbidden");
  return row;
}

async function projectGet(request, env, id) {
  const row = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(id).first();
  if (!row) throw new ApiError(404, "not_found");
  if (!row.is_public) {
    const user = await requireUser(request, env);
    if (row.user_id !== user.id) throw new ApiError(403, "forbidden");
  }
  const obj = await env.STORE.get(projKey(row.user_id, id));
  if (!obj) throw new ApiError(404, "no_state");
  return respond(env, { id, name: row.name, templateId: row.template_id, isPublic: !!row.is_public, state: await obj.json() });
}

async function projectDelete(request, env, id) {
  const user = await requireUser(request, env);
  await ownedProject(env, user, id);
  await env.STORE.delete(projKey(user.id, id));
  const snaps = await env.STORE.list({ prefix: snapPrefix(user.id, id) });
  await Promise.all(snaps.objects.map((o) => env.STORE.delete(o.key)));
  await env.DB.prepare("DELETE FROM projects WHERE id=?").bind(id).run();
  return respond(env, { ok: true });
}

/* ---------------- time machine (snapshots) ---------------- */

async function snapshotCreate(request, env, id) {
  const user = await requireUser(request, env);
  await ownedProject(env, user, id);
  const body = await readJson(request).catch(() => ({}));
  const cur = await env.STORE.get(projKey(user.id, id));
  if (!cur) throw new ApiError(404, "no_state");
  const key = snapPrefix(user.id, id) + Date.now() + ".json";
  await env.STORE.put(key, await cur.arrayBuffer(), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { reason: String(body.reason || "manual").slice(0, 60) },
  });
  // ตัดของเก่าเกินโควตา
  const list = await env.STORE.list({ prefix: snapPrefix(user.id, id) });
  const sorted = list.objects.sort((a, b) => (a.key < b.key ? 1 : -1));
  await Promise.all(sorted.slice(MAX_SNAPSHOTS).map((o) => env.STORE.delete(o.key)));
  return respond(env, { ok: true, key });
}

async function snapshotList(request, env, id) {
  const user = await requireUser(request, env);
  await ownedProject(env, user, id);
  const list = await env.STORE.list({ prefix: snapPrefix(user.id, id), include: ["customMetadata"] });
  const snaps = list.objects
    .map((o) => ({ key: o.key, at: Number(o.key.split("/").pop().replace(".json", "")), reason: (o.customMetadata || {}).reason || "" }))
    .sort((a, b) => b.at - a.at);
  return respond(env, { snapshots: snaps });
}

async function snapshotRestore(request, env, id) {
  const user = await requireUser(request, env);
  await ownedProject(env, user, id);
  const { key } = await readJson(request);
  if (!key || !key.startsWith(snapPrefix(user.id, id))) throw new ApiError(400, "bad_key");
  const snap = await env.STORE.get(key);
  if (!snap) throw new ApiError(404, "not_found");
  // กันพลาด: เก็บสภาพปัจจุบันเป็น snapshot ก่อนเขียนทับ
  const cur = await env.STORE.get(projKey(user.id, id));
  if (cur) await env.STORE.put(snapPrefix(user.id, id) + Date.now() + ".json", await cur.arrayBuffer(), {
    httpMetadata: { contentType: "application/json" }, customMetadata: { reason: "before-restore" },
  });
  const data = await snap.arrayBuffer();
  await env.STORE.put(projKey(user.id, id), data, { httpMetadata: { contentType: "application/json" } });
  await env.DB.prepare("UPDATE projects SET updated_at=? WHERE id=?").bind(Date.now(), id).run();
  return respond(env, { ok: true, state: JSON.parse(new TextDecoder().decode(data)) });
}

/* ---------------- community showcase (Module 5) ---------------- */

const CATEGORIES = ["personal", "news", "corporate", "education", "affiliate"];

// 🛡️ Quality Gatekeeper — ตรวจโครงสร้าง state ก่อนอนุญาตให้เผยแพร่
// คืน [] = ผ่าน, ไม่ผ่านคืนรายการปัญหาพร้อมคำแนะนำ (ให้ UI แสดง)
function validateForPublish(state) {
  const issues = [];
  const blocks = state && Array.isArray(state.blocks) ? state.blocks : null;
  if (!blocks || !blocks.length) return ["โครงสร้างไม่ถูกต้อง: ไม่พบรายการบล็อก (blocks)"];
  const types = blocks.map((b) => b && b.type);
  if (!types.includes("header")) issues.push("ต้องมีบล็อก Header — เพิ่มส่วนหัวก่อนเผยแพร่");
  if (!types.includes("footer")) issues.push("ต้องมีบล็อก Footer — เพิ่มส่วนท้ายก่อนเผยแพร่");
  if (!types.some((t) => ["postgrid", "postlist", "featured"].includes(t)))
    issues.push("ต้องมีบล็อกแสดงบทความอย่างน้อย 1 อัน (Post Grid / Post List / Featured)");
  for (const b of blocks) {
    if (!b || typeof b.type !== "string" || typeof b.props !== "object")
      { issues.push("พบบล็อกที่โครงสร้างเสียหาย"); break; }
  }
  // Performance baseline: กัน CLS/LCP เบื้องต้น
  for (const b of blocks) {
    const p = b.props || {};
    for (const k of Object.keys(p)) {
      if (/url$/i.test(k) && typeof p[k] === "string" && /^http:\/\//.test(p[k]))
        { issues.push("พบรูป/ลิงก์แบบ http:// (ไม่ปลอดภัยและกระทบ Web Vitals) — เปลี่ยนเป็น https://"); break; }
    }
  }
  if (JSON.stringify(state).length > MAX_STATE_BYTES) issues.push("ขนาดโปรเจกต์ใหญ่เกินไป");
  return issues;
}

// 🪄 โคลนโครงสร้าง ไม่โคลนข้อมูลส่วนตัว — ล้างคีย์อ่อนไหวออกจาก state
const SENSITIVE_KEY = /adcode|adsense|adclient|adslot|analytics|gtag|gtm|pixel|trackingid/i;
function sanitizeState(state) {
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== "object") return;
    for (const k of Object.keys(node)) {
      if (SENSITIVE_KEY.test(k)) node[k] = typeof node[k] === "string" ? "" : Array.isArray(node[k]) ? [] : node[k];
      else if (/^sociallinks$/i.test(k) && Array.isArray(node[k])) node[k] = []; // ลิงก์โซเชียลส่วนตัวของผู้สร้าง
      else walk(node[k]);
    }
  };
  walk(state);
  if (state && state.seo) { state.seo.analyticsId = ""; state.seo.adsenseId = ""; }
  return state;
}

async function projectPublish(request, env, id) {
  const user = await requireUser(request, env);
  await ownedProject(env, user, id);
  const body = await readJson(request);
  const pub = !!body.public;
  const category = CATEGORIES.includes(body.category) ? body.category : null;

  if (pub) { // Quality gate เฉพาะตอนจะเผยแพร่
    const obj = await env.STORE.get(projKey(user.id, id));
    if (!obj) throw new ApiError(404, "no_state");
    const issues = validateForPublish(await obj.json());
    if (issues.length) return respond(env, { error: "quality_gate", issues }, 422);
  }
  await env.DB.prepare("UPDATE projects SET is_public=?, category=COALESCE(?,category), updated_at=? WHERE id=?")
    .bind(pub ? 1 : 0, category, Date.now(), id).run();
  return respond(env, { ok: true, isPublic: pub, category });
}

// รายการตลาด: sort=trending (โคลน 7 วันล่าสุด) | new | top, กรอง category ได้
async function communityList(env, url) {
  const sort = url.searchParams.get("sort") || "trending";
  const cat = url.searchParams.get("category");
  const catSql = CATEGORIES.includes(cat) ? "AND p.category=?" : "";
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let sql, binds = [];
  if (sort === "new") {
    sql = `SELECT p.id,p.name,p.template_id,p.category,p.is_official,p.likes,p.clones,p.updated_at,u.display_name AS author,u.id AS author_id,0 AS clones7
           FROM projects p JOIN users u ON u.id=p.user_id WHERE p.is_public=1 ${catSql} ORDER BY p.updated_at DESC LIMIT 60`;
    if (catSql) binds.push(cat);
  } else if (sort === "top") {
    sql = `SELECT p.id,p.name,p.template_id,p.category,p.is_official,p.likes,p.clones,p.updated_at,u.display_name AS author,u.id AS author_id,0 AS clones7
           FROM projects p JOIN users u ON u.id=p.user_id WHERE p.is_public=1 ${catSql} ORDER BY p.likes DESC, p.clones DESC LIMIT 60`;
    if (catSql) binds.push(cat);
  } else { // trending: จัดอันดับด้วยยอดโคลนสัปดาห์นี้
    sql = `SELECT p.id,p.name,p.template_id,p.category,p.is_official,p.likes,p.clones,p.updated_at,u.display_name AS author,u.id AS author_id,
                  COUNT(e.id) AS clones7
           FROM projects p JOIN users u ON u.id=p.user_id
           LEFT JOIN clone_events e ON e.project_id=p.id AND e.created_at>?
           WHERE p.is_public=1 ${catSql}
           GROUP BY p.id ORDER BY clones7 DESC, p.likes DESC, p.updated_at DESC LIMIT 60`;
    binds.push(weekAgo); if (catSql) binds.push(cat);
  }
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return respond(env, { sort, category: cat || null, projects: rows.results });
}

async function communityClone(request, env, id) {
  const user = await requireUser(request, env);
  const src = await env.DB.prepare("SELECT * FROM projects WHERE id=? AND is_public=1").bind(id).first();
  if (!src) throw new ApiError(404, "not_found");
  const obj = await env.STORE.get(projKey(src.user_id, id));
  if (!obj) throw new ApiError(404, "no_state");
  const clean = sanitizeState(await obj.json()); // ล้าง AdSense/Analytics/โซเชียลของผู้สร้างเดิม
  const newId = crypto.randomUUID();
  const now = Date.now();
  await env.STORE.put(projKey(user.id, newId), JSON.stringify(clean), { httpMetadata: { contentType: "application/json" } });
  await env.DB.prepare("INSERT INTO projects (id,user_id,name,template_id,category,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
    .bind(newId, user.id, src.name + " (Clone)", src.template_id, src.category, now, now).run();
  await env.DB.prepare("UPDATE projects SET clones=clones+1 WHERE id=?").bind(id).run();
  await env.DB.prepare("INSERT INTO clone_events (project_id,user_id,created_at) VALUES (?,?,?)").bind(id, user.id, now).run();
  return respond(env, { ok: true, id: newId }); // client พาเข้า builder ต่อทันที
}

/* --- comments / reviews --- */

async function commentList(env, id) {
  const rows = await env.DB.prepare(
    "SELECT c.id,c.body,c.created_at,u.display_name AS author FROM comments c JOIN users u ON u.id=c.user_id WHERE c.project_id=? ORDER BY c.created_at DESC LIMIT 50"
  ).bind(id).all();
  return respond(env, { comments: rows.results });
}

async function commentCreate(request, env, id) {
  const user = await requireUser(request, env);
  const proj = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND is_public=1").bind(id).first();
  if (!proj) throw new ApiError(404, "not_found");
  const { body } = await readJson(request);
  const text = String(body || "").trim();
  if (!text || text.length > 500) throw new ApiError(400, "bad_comment");
  const cid = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO comments (id,project_id,user_id,body,created_at) VALUES (?,?,?,?,?)")
    .bind(cid, id, user.id, text, Date.now()).run();
  return respond(env, { ok: true, id: cid });
}

/* --- creator profile --- */

async function creatorProfile(env, userId) {
  const u = await env.DB.prepare("SELECT id,display_name,created_at FROM users WHERE id=?").bind(userId).first();
  if (!u) throw new ApiError(404, "not_found");
  const rows = await env.DB.prepare(
    "SELECT id,name,template_id,category,is_official,likes,clones,updated_at FROM projects WHERE user_id=? AND is_public=1 ORDER BY updated_at DESC LIMIT 60"
  ).bind(userId).all();
  const totals = rows.results.reduce((a, p) => ({ likes: a.likes + p.likes, clones: a.clones + p.clones }), { likes: 0, clones: 0 });
  return respond(env, { creator: { id: u.id, displayName: u.display_name, memberSince: u.created_at }, totals, projects: rows.results });
}

async function communityLike(request, env, id) {
  const user = await requireUser(request, env);
  const src = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND is_public=1").bind(id).first();
  if (!src) throw new ApiError(404, "not_found");
  const ins = await env.DB.prepare("INSERT OR IGNORE INTO likes (user_id,project_id,created_at) VALUES (?,?,?)")
    .bind(user.id, id, Date.now()).run();
  if (ins.meta.changes > 0) await env.DB.prepare("UPDATE projects SET likes=likes+1 WHERE id=?").bind(id).run();
  const row = await env.DB.prepare("SELECT likes FROM projects WHERE id=?").bind(id).first();
  return respond(env, { ok: true, likes: row.likes });
}
