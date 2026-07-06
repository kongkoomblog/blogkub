/* =============================================================
   BlogKub CloudSync — browser client (PROTOTYPE)
   Hybrid Auto-Save: IndexedDB (offline-first) + Cloud sync (R2)

   การใช้งาน (framework-agnostic — เสียบเข้า builder ปัจจุบันได้):

     BKCloud.init({
       apiBase:  "https://blogkub-cloud.<account>.workers.dev",
       getState: () => S,                       // สถานะโปรเจกต์ปัจจุบัน (JSON-able)
       applyState: (state) => { ...โหลดเข้าแอป... },
       getMeta:  () => ({ id: S.projectId, name: S.name, templateId: S.templateId }),
       onStatus: (s) => {}                      // "local-saved" | "syncing" | "cloud-saved" | "offline" | "error"
     });
     BKCloud.markDirty();      // เรียกทุกครั้งที่ผู้ใช้แก้อะไรก็ตาม (ต่อจาก save() เดิม)
     BKCloud.requestLink(email) / BKCloud.me() / BKCloud.logout()
     BKCloud.listSnapshots() / BKCloud.snapshot(reason) / BKCloud.restore(key)
   ============================================================= */
(function (global) {
  "use strict";

  var SYNC_INTERVAL = 3 * 60 * 1000;  // ซิงก์ทุก 3 นาที
  var IDLE_SYNC = 10 * 1000;          // หรือเมื่อไม่ขยับ 10 วิ
  var DB_NAME = "bk-cloud", STORE = "projects";

  var cfg = null, dirty = false, syncing = false, user = null;
  var idleTimer = null, loopTimer = null;

  /* ---------- IndexedDB (offline-first) ---------- */
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function localPut(id, value) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, id);
        tx.oncomplete = res; tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function localGet(id) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var q = db.transaction(STORE).objectStore(STORE).get(id);
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    });
  }

  /* ---------- API ---------- */
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = "include"; // session cookie
    if (opts.body && typeof opts.body !== "string") {
      opts.body = JSON.stringify(opts.body);
      opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers);
    }
    return fetch(cfg.apiBase + path, opts).then(function (r) {
      if (r.status === 401) { user = null; throw { code: "unauthorized" }; }
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw j.error ? { code: j.error } : { code: "http_" + r.status };
        return j;
      });
    });
  }

  function status(s) { if (cfg && cfg.onStatus) try { cfg.onStatus(s); } catch (e) {} }

  /* ---------- hybrid save/sync ---------- */
  function saveLocalNow() {
    if (!cfg) return Promise.resolve();
    var meta = cfg.getMeta();
    return localPut(meta.id, { meta: meta, state: cfg.getState(), at: Date.now() })
      .then(function () { status("local-saved"); });
  }

  function syncNow() {
    if (!cfg || !dirty || syncing) return Promise.resolve();
    if (!user) return Promise.resolve();                 // guest mode: local เท่านั้น
    if (!navigator.onLine) { status("offline"); return Promise.resolve(); }
    syncing = true; status("syncing");
    var meta = cfg.getMeta();
    return api("/api/projects/" + encodeURIComponent(meta.id), {
      method: "PUT",
      body: { name: meta.name, templateId: meta.templateId, state: cfg.getState() },
    }).then(function () {
      dirty = false; status("cloud-saved");              // "✅ บันทึกขึ้นคลาวด์แล้ว"
    }).catch(function (e) {
      status(e.code === "unauthorized" ? "offline" : "error");
    }).finally(function () { syncing = false; });
  }

  /* ---------- public API ---------- */
  var BKCloud = {
    init: function (options) {
      cfg = options;
      loopTimer = setInterval(syncNow, SYNC_INTERVAL);
      window.addEventListener("online", syncNow);
      // ลอง restore session เดิม
      return BKCloud.me().catch(function () { return null; });
    },

    // เรียกทุกครั้งที่มีการแก้ไข — เซฟลงเครื่องทันที + นัดซิงก์ตอน idle
    markDirty: function () {
      dirty = true;
      saveLocalNow();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(syncNow, IDLE_SYNC);
    },

    /* --- auth --- */
    requestLink: function (email) { return api("/api/auth/request-link", { method: "POST", body: { email: email } }); },
    me: function () { return api("/api/me").then(function (u) { user = u; return u; }); },
    logout: function () { return api("/api/logout", { method: "POST" }).then(function () { user = null; }); },
    isLoggedIn: function () { return !!user; },

    /* --- cross-device: โหลดโปรเจกต์ (cloud ก่อน, fallback local) --- */
    loadProject: function (id) {
      var cloud = user
        ? api("/api/projects/" + encodeURIComponent(id)).catch(function () { return null; })
        : Promise.resolve(null);
      return cloud.then(function (c) {
        if (c && c.state) { cfg.applyState(c.state); return { source: "cloud", meta: c }; }
        return localGet(id).then(function (l) {
          if (l && l.state) { cfg.applyState(l.state); return { source: "local", meta: l.meta }; }
          return null;
        });
      });
    },
    listCloudProjects: function () { return api("/api/projects"); },

    /* --- time machine --- */
    snapshot: function (reason) {
      var id = cfg.getMeta().id;
      return syncNow().then(function () {
        return api("/api/projects/" + encodeURIComponent(id) + "/snapshots", { method: "POST", body: { reason: reason || "manual" } });
      });
    },
    listSnapshots: function () {
      return api("/api/projects/" + encodeURIComponent(cfg.getMeta().id) + "/snapshots");
    },
    restore: function (key) {
      return api("/api/projects/" + encodeURIComponent(cfg.getMeta().id) + "/restore", { method: "POST", body: { key: key } })
        .then(function (r) { cfg.applyState(r.state); dirty = false; saveLocalNow(); return r; });
    },

    /* --- community --- */
    publish: function (pub) {
      return api("/api/projects/" + encodeURIComponent(cfg.getMeta().id) + "/publish", { method: "POST", body: { public: !!pub } });
    },
    community: function () { return api("/api/community"); },
    clone: function (id) { return api("/api/community/" + encodeURIComponent(id) + "/clone", { method: "POST", body: {} }); },
    like: function (id) { return api("/api/community/" + encodeURIComponent(id) + "/like", { method: "POST", body: {} }); },
  };

  global.BKCloud = BKCloud;
})(window);
