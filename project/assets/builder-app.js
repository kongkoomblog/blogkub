/* ==========================================================================
   BloggerXMLBuilder — Visual Builder App (Vanilla JS, client-side)
   Block model -> live canvas render -> valid Blogger XML export.
   No backend. Autosave to localStorage. Projects export/import as JSON.
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function el(tag, attrs, html) { var e = document.createElement(tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function uid() { return "b" + Math.random().toString(36).slice(2, 8); }

  /* ---------- icons ---------- */
  var IC = {
    header: '<path d="M3 5h18M3 5v14M21 5v14M3 19h18"/><rect x="3" y="5" width="18" height="5" fill="currentColor" opacity=".3"/>',
    hero: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14l4-4 4 4 6-6 4 4"/>',
    nav: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    featured: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
    text: '<path d="M4 7V5h16v2M9 5v14M9 19h6"/>',
    cta: '<rect x="3" y="8" width="18" height="8" rx="4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
    footer: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16h18"/><rect x="3" y="16" width="18" height="5" fill="currentColor" opacity=".3"/>',
    ad: '<rect x="3" y="5" width="18" height="14" rx="2" stroke-dasharray="3 3"/><path d="M8 12h8"/>',
    columns: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/>',
    about: '<circle cx="12" cy="8" r="3"/><path d="M5 21v-1a7 7 0 0114 0v1"/>',
    cursor: '<path d="M3 3l7 18 2.5-7.5L20 11z"/>'
  };
  function svg(p, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }

  /* ---------- element library ---------- */
  var LIB = [
    ["โครงสร้างหลัก", [
      ["header", "ส่วนหัว (Header)", "โลโก้ + เมนู"],
      ["hero", "Hero", "แบนเนอร์หลัก + ปุ่ม"],
      ["footer", "ส่วนท้าย (Footer)", "ลิงก์ + ลิขสิทธิ์"]
    ]],
    ["เนื้อหา", [
      ["postgrid", "ตารางบทความ", "Post Grid"],
      ["postlist", "รายการบทความ", "Post List"],
      ["featured", "บทความเด่น", "Featured"],
      ["about", "เกี่ยวกับ / ผู้เขียน", "About + E-E-A-T"],
      ["text", "ข้อความ", "หัวข้อ + ย่อหน้า"],
      ["columns", "คอลัมน์ (Features)", "2–3 คอลัมน์"],
      ["cta", "Call To Action", "กล่องชวนคลิก"],
      ["image", "รูปภาพ", "Image"]
    ]],
    ["ส่วนเสริม", [
      ["ad", "ช่องโฆษณา", "AdSense Safe"]
    ]]
  ];

  /* defaults per block type */
  function blockDefaults(type) {
    var d = {
      header: { logoText: "MyBlog", menuItems: [
        { label: "หน้าแรก", url: "/" },
        { label: "บทความ", url: "/search" },
        { label: "เกี่ยวกับ", url: "/p/about.html" },
        { label: "ติดต่อ", url: "/p/contact.html" }
      ], sticky: true, showSearch: true, mobileSide: "right" },
      hero: { title: "ยินดีต้อนรับสู่บล็อกของเรา", subtitle: "แบ่งปันความรู้ บทความคุณภาพ อัปเดตใหม่ทุกสัปดาห์", btnText: "อ่านบทความล่าสุด", align: "center", bg: "gradient" },
      footer: { about: "บล็อกแบ่งปันความรู้และบทความคุณภาพ", columns: 4, copyright: "© 2026 MyBlog. สงวนลิขสิทธิ์", social: true },
      postgrid: { heading: "บทความล่าสุด", columns: 3, count: 6, showImage: true, showExcerpt: true },
      postlist: { heading: "อ่านต่อ", count: 5, showImage: true },
      featured: { heading: "บทความแนะนำ", count: 1 },
      about: { name: "ทีมงาน MyBlog", bio: "เราคือทีมผู้เชี่ยวชาญที่แบ่งปันความรู้ผ่านบทความคุณภาพมากว่า 5 ปี", showAvatar: true },
      text: { heading: "หัวข้อของคุณ", body: "เขียนเนื้อหาตรงนี้ ใส่ข้อความที่ต้องการให้ผู้อ่านเห็น", align: "left" },
      cta: { title: "พร้อมเริ่มต้นแล้วหรือยัง?", btnText: "เริ่มเลย", bg: "soft" },
      image: { alt: "คำอธิบายรูปภาพ", caption: "", ratio: "16/9" },
      ad: { slot: "ใต้ส่วนหัว", label: true },
      columns: { heading: "บริการของเรา", cols: 3, items: [
        { icon: "★", title: "คุณภาพสูง", text: "เนื้อหาคัดสรรอย่างพิถีพิถัน เชื่อถือได้" },
        { icon: "⚡", title: "รวดเร็ว", text: "โหลดไว ใช้งานลื่นทุกอุปกรณ์" },
        { icon: "♥", title: "ใส่ใจ", text: "ดูแลผู้อ่านทุกคนด้วยหัวใจ" }
      ] }
    };
    return JSON.parse(JSON.stringify(d[type] || {}));
  }

  /* ---------- template presets ---------- */
  var CATS = ["ทั้งหมด", "บล็อก", "ธุรกิจ", "ข่าว/นิตยสาร", "การศึกษา", "Affiliate"];
  var TEMPLATES = [
    { id: "personal", cat: "บล็อก", name: "Personal Blog", desc: "บล็อกส่วนตัว อ่านง่าย", c: ["#6366f1", "#8b5cf6"], blocks: ["header", "hero", "postgrid", "about", "footer"], design: { primary: "#6366f1", accent: "#8b5cf6", font: "sans", radius: 12 } },
    { id: "travel", cat: "บล็อก", name: "Travel Blog", desc: "บล็อกท่องเที่ยว ภาพใหญ่", c: ["#0ea5e9", "#22d3ee"], blocks: ["header", "hero", "featured", "postgrid", "footer"], design: { primary: "#0ea5e9", accent: "#22d3ee", font: "sans", radius: 16 } },
    { id: "food", cat: "บล็อก", name: "Food Blog", desc: "บล็อกอาหาร อบอุ่น", c: ["#f59e0b", "#f97316"], blocks: ["header", "hero", "postgrid", "about", "footer"], design: { primary: "#f97316", accent: "#f59e0b", font: "serif", radius: 14 } },
    { id: "tech", cat: "บล็อก", name: "Tech Blog", desc: "บล็อกเทคโนโลยี เฉียบ", c: ["#10b981", "#06b6d4"], blocks: ["header", "hero", "postlist", "postgrid", "footer"], design: { primary: "#10b981", accent: "#06b6d4", font: "sans", radius: 10 } },
    { id: "company", cat: "ธุรกิจ", name: "Company", desc: "เว็บบริษัทมืออาชีพ", c: ["#1e40af", "#3b82f6"], blocks: ["header", "hero", "about", "cta", "footer"], design: { primary: "#1e40af", accent: "#3b82f6", font: "sans", radius: 8 } },
    { id: "agency", cat: "ธุรกิจ", name: "Agency", desc: "เอเจนซี ครีเอทีฟ", c: ["#7c3aed", "#a855f7"], blocks: ["header", "hero", "featured", "cta", "footer"], design: { primary: "#7c3aed", accent: "#a855f7", font: "sans", radius: 16 } },
    { id: "magazine", cat: "ข่าว/นิตยสาร", name: "Magazine", desc: "นิตยสารหลายคอลัมน์", c: ["#dc2626", "#f43f5e"], blocks: ["header", "featured", "postgrid", "postlist", "footer"], design: { primary: "#dc2626", accent: "#f43f5e", font: "serif", radius: 6 } },
    { id: "news", cat: "ข่าว/นิตยสาร", name: "News Portal", desc: "พอร์ทัลข่าว เนื้อหาแน่น", c: ["#0f172a", "#475569"], blocks: ["header", "featured", "postlist", "postgrid", "footer"], design: { primary: "#0f172a", accent: "#dc2626", font: "sans", radius: 4 } },
    { id: "school", cat: "การศึกษา", name: "School", desc: "โรงเรียน/สถาบัน", c: ["#2563eb", "#06b6d4"], blocks: ["header", "hero", "about", "postgrid", "footer"], design: { primary: "#2563eb", accent: "#06b6d4", font: "sans", radius: 12 } },
    { id: "course", cat: "การศึกษา", name: "Online Course", desc: "คอร์สเรียนออนไลน์", c: ["#9333ea", "#6366f1"], blocks: ["header", "hero", "featured", "cta", "footer"], design: { primary: "#9333ea", accent: "#6366f1", font: "sans", radius: 14 } },
    { id: "review", cat: "Affiliate", name: "Product Review", desc: "รีวิวสินค้า Affiliate", c: ["#ea580c", "#f59e0b"], blocks: ["header", "hero", "postgrid", "about", "footer"], design: { primary: "#ea580c", accent: "#f59e0b", font: "sans", radius: 10 } },
    { id: "deals", cat: "Affiliate", name: "Deals & Coupon", desc: "ดีล/คูปอง โปรโมชัน", c: ["#16a34a", "#22c55e"], blocks: ["header", "featured", "postgrid", "cta", "footer"], design: { primary: "#16a34a", accent: "#22c55e", font: "sans", radius: 12 } }
  ];

  /* ---------- STATE ---------- */
  var S = null;
  var SEL = null;        // selected block id
  var VIEW = "desktop";
  var HISTORY = [];
  var KEY = "bxb_project_v1";

  function freshProject(name, design) {
    return {
      name: name || "เว็บไซต์ของฉัน",
      lang: "th",
      design: design || { primary: "#6366f1", accent: "#8b5cf6", font: "sans", radius: 12 },
      seo: { title: "", desc: "", blogTitle: "MyBlog", labelIndex: false, schema: true, og: true,
             orgType: "Organization", logoUrl: "", siteUrl: "", sameAs: "" },
      blocks: []
    };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    flashSave();
  }
  var saveT;
  function flashSave() {
    var d = $("#saveDot"); if (!d) return;
    d.classList.add("saving"); d.querySelector("span").textContent = "กำลังบันทึก…";
    clearTimeout(saveT);
    saveT = setTimeout(function () { d.classList.remove("saving"); d.querySelector("span").textContent = "บันทึกแล้ว"; }, 500);
  }
  function pushHistory() { HISTORY.push(JSON.stringify(S.blocks)); if (HISTORY.length > 40) HISTORY.shift(); }
  function commit() { pushHistory(); renderCanvas(); renderSeo(); if (window.__bxbRenderLayers && $("#layersView") && $("#layersView").style.display !== "none") window.__bxbRenderLayers(); save(); }

  /* ---------- BLOCK RENDER (canvas) ---------- */
  function design() { return S.design; }
  function fontStack(f) { return f === "serif" ? "Georgia,'Times New Roman',serif" : f === "mono" ? "monospace" : "'IBM Plex Sans Thai',system-ui,sans-serif"; }
  // menu items: new model is array {label,url}; convert old comma-string if present
  function menuItemsOf(p) {
    if (Array.isArray(p.menuItems)) return p.menuItems;
    if (typeof p.menu === "string" && p.menu) return p.menu.split(",").map(function (m) { return { label: m.trim(), url: "/" }; });
    return [];
  }

  function renderBlockInner(b) {
    var d = design(), p = b.props, r = d.radius + "px", pr = d.primary, ac = d.accent;
    switch (b.type) {
      case "header":
        var mItems = menuItemsOf(p);
        var menu = mItems.map(function (m) { return '<a style="color:#1e2333;font-weight:500;font-size:15px;text-decoration:none">' + esc(m.label) + "</a>"; }).join("");
        var isMob = VIEW === "mobile";
        if (isMob) {
          // mobile: hamburger on chosen side + stacked menu peeking
          var burger = '<div style="width:34px;height:34px;display:grid;place-items:center;font-size:20px;color:' + pr + '">☰</div>';
          return '<div style="padding:14px 18px;background:#fff;border-bottom:1px solid #eef"><div style="display:flex;align-items:center;gap:12px">' +
            (p.mobileSide === "left" ? burger : "") +
            '<div style="font-family:' + fontStack(d.font) + ';font-weight:700;font-size:18px;color:' + pr + ';' + (p.mobileSide === "left" ? "" : "margin-right:auto") + '">' + esc(p.logoText) + "</div>" +
            (p.mobileSide === "left" ? '<div style="margin-left:auto"></div>' : burger) +
            '</div><div style="margin-top:10px;border-top:1px dashed #e8eaf2;padding-top:8px;font-size:12px;color:#9aa;text-align:' + p.mobileSide + '">เมนูเด้งจากด้าน' + (p.mobileSide === "left" ? "ซ้าย" : "ขวา") + ' ▾</div></div>';
        }
        return '<div style="display:flex;align-items:center;gap:24px;padding:18px 32px;background:#fff;border-bottom:1px solid #eef">' +
          '<div style="font-family:' + fontStack(d.font) + ';font-weight:700;font-size:21px;color:' + pr + '">' + esc(p.logoText) + "</div>" +
          '<nav style="display:flex;gap:22px;margin:0 auto">' + menu + "</nav>" +
          (p.showSearch ? '<div style="width:34px;height:34px;border-radius:50%;background:#f1f2f9;display:grid;place-items:center">🔍</div>' : "") + "</div>";
      case "hero":
        var bg = p.bg === "gradient" ? "linear-gradient(120deg," + pr + "," + ac + ")" : p.bg === "dark" ? "#0f172a" : "#f7f8fc";
        var fg = (p.bg === "soft") ? "#1e2333" : "#fff";
        return '<div style="padding:84px 32px;text-align:' + p.align + ';background:' + bg + ';color:' + fg + '">' +
          '<h1 style="font-family:' + fontStack(d.font) + ';font-size:42px;font-weight:700;margin:0;line-height:1.15;letter-spacing:-.02em">' + esc(p.title) + "</h1>" +
          '<p style="font-size:18px;margin:18px auto 0;max-width:560px;opacity:.9;' + (p.align === "center" ? "" : "margin-left:0;margin-right:0") + '">' + esc(p.subtitle) + "</p>" +
          '<a style="display:inline-block;margin-top:28px;background:' + (p.bg === "soft" ? pr : "#fff") + ';color:' + (p.bg === "soft" ? "#fff" : pr) + ';font-weight:600;padding:13px 26px;border-radius:' + r + '">' + esc(p.btnText) + "</a></div>";
      case "postgrid":
        var cols = p.columns || 3, cards = "";
        for (var i = 0; i < (p.count || 6); i++) cards += postCard(p.showImage, p.showExcerpt, d, ac);
        return section(p.heading, d, '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:20px">' + cards + "</div>");
      case "postlist":
        var rows = "";
        for (var j = 0; j < (p.count || 5); j++) rows += postRow(p.showImage, d, ac);
        return section(p.heading, d, '<div style="display:flex;flex-direction:column;gap:16px">' + rows + "</div>");
      case "featured":
        return section(p.heading, d, '<div style="position:relative;border-radius:' + r + ';overflow:hidden;aspect-ratio:21/9;background:linear-gradient(120deg,' + pr + ',' + ac + ');display:flex;align-items:flex-end;padding:28px"><div><span style="background:#fff;color:' + pr + ';font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px">บทความเด่น</span><h3 style="color:#fff;font-size:26px;margin:12px 0 0;font-family:' + fontStack(d.font) + '">หัวข้อบทความแนะนำที่น่าสนใจที่สุด</h3></div></div>');
      case "about":
        return '<div style="padding:56px 32px;background:#f7f8fc;display:flex;gap:24px;align-items:center;max-width:820px;margin:0 auto">' +
          (p.showAvatar ? '<div style="width:84px;height:84px;border-radius:50%;background:linear-gradient(120deg,' + pr + ',' + ac + ');flex:none"></div>' : "") +
          '<div><div style="font-size:13px;color:' + pr + ';font-weight:700;text-transform:uppercase;letter-spacing:.08em">เกี่ยวกับ</div><h3 style="font-family:' + fontStack(d.font) + ';font-size:24px;margin:6px 0 8px">' + esc(p.name) + "</h3><p style=\"color:#4a5063;font-size:15px;line-height:1.65;margin:0\">" + esc(p.bio) + "</p></div></div>";
      case "text":
        return '<div style="padding:40px 32px;text-align:' + p.align + ';max-width:760px;margin:0 auto"><h2 style="font-family:' + fontStack(d.font) + ';font-size:28px;margin:0 0 12px">' + esc(p.heading) + '</h2><p style="color:#4a5063;font-size:16px;line-height:1.7;margin:0">' + esc(p.body) + "</p></div>";
      case "columns":
        var cn = p.cols || 3, its = (p.items || []).slice(0, cn);
        var cells = its.map(function (it) { return '<div style="text-align:center;padding:8px"><div style="width:54px;height:54px;border-radius:14px;background:linear-gradient(120deg,' + pr + ',' + ac + ');color:#fff;display:grid;place-items:center;font-size:24px;margin:0 auto 14px">' + esc(it.icon || "\u2605") + '</div><h3 style="font-family:' + fontStack(d.font) + ';font-size:18px;margin:0 0 7px;color:#1e2333">' + esc(it.title) + '</h3><p style="color:#828aa0;font-size:14px;line-height:1.55;margin:0">' + esc(it.text) + '</p></div>'; }).join("");
        return section(p.heading, d, '<div style="display:grid;grid-template-columns:repeat(' + cn + ',1fr);gap:24px">' + cells + '</div>');
      case "cta":
        var cb = p.bg === "soft" ? "#f1f2f9" : "linear-gradient(120deg," + pr + "," + ac + ")";
        var cf = p.bg === "soft" ? "#1e2333" : "#fff";
        return '<div style="margin:32px;padding:48px 32px;text-align:center;border-radius:' + r + ';background:' + cb + ';color:' + cf + '"><h2 style="font-family:' + fontStack(d.font) + ';font-size:30px;margin:0">' + esc(p.title) + '</h2><a style="display:inline-block;margin-top:20px;background:' + (p.bg === "soft" ? pr : "#fff") + ';color:' + (p.bg === "soft" ? "#fff" : pr) + ';font-weight:600;padding:13px 28px;border-radius:' + r + '">' + esc(p.btnText) + "</a></div>";
      case "image":
        return '<div style="padding:24px 32px"><div style="aspect-ratio:' + (p.ratio || "16/9") + ';background:#e8eaf2;border-radius:' + r + ';display:grid;place-items:center;color:#9aa">🖼 ' + esc(p.alt) + "</div>" + (p.caption ? '<p style="text-align:center;color:#9aa;font-size:13px;margin-top:8px">' + esc(p.caption) + "</p>" : "") + "</div>";
      case "ad":
        return '<div style="padding:16px 32px"><div style="min-height:90px;border:1px dashed #ccd;border-radius:8px;display:grid;place-items:center;color:#aab;font-size:13px;background:#fafbff">ช่องโฆษณา — ' + esc(p.slot) + (p.label ? ' <span style="margin-left:6px;font-size:11px;color:#bbc">(โฆษณา)</span>' : "") + "</div></div>";
      case "footer":
        var fcols = "";
        for (var k = 0; k < (p.columns || 4); k++) {
          fcols += '<div><div style="height:9px;width:60%;background:rgba(255,255,255,.3);border-radius:3px;margin-bottom:14px"></div>' + '<div style="display:flex;flex-direction:column;gap:9px">' + Array(4).join().split(",").map(function () { return '<div style="height:7px;width:80%;background:rgba(255,255,255,.16);border-radius:3px"></div>'; }).join("") + "</div></div>";
        }
        return '<div style="background:#0f172a;color:#fff;padding:48px 32px 28px"><div style="display:grid;grid-template-columns:1.6fr repeat(' + ((p.columns || 4) - 1) + ',1fr);gap:32px;max-width:980px;margin:0 auto">' +
          '<div><div style="font-family:' + fontStack(d.font) + ';font-weight:700;font-size:19px;color:#fff">' + esc(S.seo.blogTitle || "MyBlog") + '</div><p style="color:rgba(255,255,255,.6);font-size:13.5px;margin-top:12px;line-height:1.6">' + esc(p.about) + "</p>" + (p.social ? '<div style="display:flex;gap:8px;margin-top:14px">' + Array(4).join().split(",").map(function () { return '<div style="width:30px;height:30px;border-radius:7px;background:rgba(255,255,255,.1)"></div>'; }).join("") + "</div>" : "") + "</div>" + fcols + "</div>" +
          '<div style="text-align:center;color:rgba(255,255,255,.4);font-size:12.5px;margin-top:36px;padding-top:20px;border-top:1px solid rgba(255,255,255,.1)">' + esc(p.copyright) + "</div></div>";
    }
    return "";
  }
  function section(heading, d, inner) {
    return '<div style="padding:48px 32px;max-width:1080px;margin:0 auto">' + (heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:26px;margin:0 0 24px;color:#1e2333">' + esc(heading) + "</h2>" : "") + inner + "</div>";
  }
  function postCard(img, exc, d, ac) {
    return '<div style="border:1px solid #eef;border-radius:' + d.radius + 'px;overflow:hidden;background:#fff">' + (img ? '<div style="aspect-ratio:16/9;background:linear-gradient(120deg,#e8eaf2,#f1f2f9)"></div>' : "") + '<div style="padding:16px"><span style="font-size:11px;color:' + ac + ';font-weight:700">หมวดหมู่</span><h3 style="font-size:17px;margin:6px 0 0;color:#1e2333;line-height:1.3">หัวข้อบทความตัวอย่างที่น่าสนใจ</h3>' + (exc ? '<p style="color:#828aa0;font-size:13.5px;margin:8px 0 0;line-height:1.55">สรุปเนื้อหาบทความสั้นๆ ให้ผู้อ่านเห็นภาพรวม…</p>' : "") + "</div></div>";
  }
  function postRow(img, d, ac) {
    return '<div style="display:flex;gap:16px;align-items:center;border-bottom:1px solid #eef;padding-bottom:16px">' + (img ? '<div style="width:120px;aspect-ratio:4/3;background:linear-gradient(120deg,#e8eaf2,#f1f2f9);border-radius:' + d.radius + 'px;flex:none"></div>' : "") + '<div><span style="font-size:11px;color:' + ac + ';font-weight:700">หมวดหมู่</span><h3 style="font-size:18px;margin:5px 0;color:#1e2333">หัวข้อบทความในรายการอ่านต่อ</h3><p style="color:#828aa0;font-size:13.5px;margin:0">สรุปเนื้อหาสั้นๆ ของบทความนี้…</p></div></div>';
  }

  function renderCanvas() {
    var f = $("#frame");
    if (!S.blocks.length) {
      f.innerHTML = '<div class="canvas-empty">' + svg(IC.cursor, 1.5) + "<b>ลากองค์ประกอบมาวางที่นี่</b><span>เลือกจากแผงด้านซ้าย ลากมาวางเพื่อเริ่มออกแบบหน้าเว็บของคุณ</span></div>";
      // make empty a dropzone
      f.firstChild.classList.add("dropzone");
      f.firstChild.dataset.idx = "0";
      return;
    }
    f.innerHTML = "";
    f.appendChild(dz(0));
    S.blocks.forEach(function (b, i) {
      var w = el("div", { class: "blk" + (b.id === SEL ? " sel" : ""), "data-id": b.id });
      var tag = el("div", { class: "blk-tag" });
      tag.innerHTML = '<span>' + blkLabel(b.type) + "</span>";
      var up = el("button", { title: "ขึ้น" }, "↑"), dn = el("button", { title: "ลง" }, "↓"), del = el("button", { title: "ลบ" }, "✕");
      up.onclick = function (e) { e.stopPropagation(); move(b.id, -1); };
      dn.onclick = function (e) { e.stopPropagation(); move(b.id, 1); };
      del.onclick = function (e) { e.stopPropagation(); removeBlock(b.id); };
      tag.appendChild(up); tag.appendChild(dn); tag.appendChild(del);
      w.appendChild(tag);
      var body = el("div"); body.innerHTML = renderBlockInner(b); w.appendChild(body);
      w.onclick = function (e) { e.stopPropagation(); select(b.id); };
      f.appendChild(w);
      f.appendChild(dz(i + 1));
    });
  }
  function dz(idx) { var d = el("div", { class: "dropzone", "data-idx": idx }); return d; }
  function blkLabel(t) {
    var m = { header: "ส่วนหัว", hero: "Hero", footer: "ส่วนท้าย", postgrid: "ตารางบทความ", postlist: "รายการบทความ", featured: "บทความเด่น", about: "เกี่ยวกับ", text: "ข้อความ", cta: "CTA", image: "รูปภาพ", ad: "โฆษณา" };
    return m[t] || t;
  }

  /* ---------- block ops ---------- */
  function addBlock(type, idx) {
    var b = { id: uid(), type: type, props: blockDefaults(type) };
    if (idx == null || idx > S.blocks.length) idx = S.blocks.length;
    S.blocks.splice(idx, 0, b);
    SEL = b.id; commit(); select(b.id);
  }
  function removeBlock(id) {
    S.blocks = S.blocks.filter(function (b) { return b.id !== id; });
    if (SEL === id) SEL = null;
    commit(); renderProps();
  }
  function move(id, dir) {
    var i = S.blocks.findIndex(function (b) { return b.id === id; });
    var j = i + dir; if (j < 0 || j >= S.blocks.length) return;
    var t = S.blocks[i]; S.blocks[i] = S.blocks[j]; S.blocks[j] = t; commit();
  }
  function select(id) { SEL = id; renderCanvas(); renderProps(); switchRight("props"); if (window.matchMedia("(max-width:1000px)").matches) showMob("right"); }

  /* ---------- drag & drop ---------- */
  var dragType = null, dragSort = null;
  var isTouch = window.matchMedia("(max-width:1000px)").matches || ("ontouchstart" in window);
  function setupLibDrag() {
    $$(".lib-item").forEach(function (it) {
      it.draggable = true;
      it.addEventListener("dragstart", function (e) { dragType = it.dataset.type; dragSort = null; it.classList.add("dragging"); e.dataTransfer.effectAllowed = "copy"; });
      it.addEventListener("dragend", function () { it.classList.remove("dragging"); clearDz(); });
      // TAP-TO-ADD: on touch/mobile, tapping an element appends it to the canvas
      it.addEventListener("click", function () {
        if (!window.matchMedia("(max-width:1000px)").matches) return;
        addBlock(it.dataset.type, S.blocks.length);
        showMob("canvas");
        toast("เพิ่ม " + blkLabel(it.dataset.type) + " แล้ว");
      });
    });
  }
  function clearDz() { $$(".dropzone").forEach(function (d) { d.classList.remove("over"); d.innerHTML = d.dataset.empty || ""; }); }
  $("#frame").addEventListener("dragover", function (e) {
    e.preventDefault();
    var d = e.target.closest(".dropzone"); if (!d) return;
    $$(".dropzone").forEach(function (x) { if (x !== d) x.classList.remove("over"); });
    d.classList.add("over");
  });
  $("#frame").addEventListener("drop", function (e) {
    e.preventDefault();
    var d = e.target.closest(".dropzone"); if (!d) return;
    var idx = parseInt(d.dataset.idx, 10) || 0;
    if (dragType) addBlock(dragType, idx);
    clearDz();
  });
  $("#canvasArea").addEventListener("click", function () { SEL = null; renderCanvas(); renderProps(); });

  /* ---------- properties panel ---------- */
  function renderProps() {
    var c = $("#rtProps");
    if (!SEL) { c.innerHTML = '<div class="props-empty">' + svg(IC.cursor, 1.5) + "<div>เลือกองค์ประกอบบนหน้าเว็บ<br>เพื่อปรับแต่งคุณสมบัติ</div></div>"; return; }
    var b = S.blocks.find(function (x) { return x.id === SEL; }); if (!b) { c.innerHTML = ""; return; }
    var f = fieldsFor(b);
    c.innerHTML = '<div class="sec-title">' + blkLabel(b.type) + "</div>" + f
      + '<div class="sec-divider"></div>'
      + '<div class="sec-title collapsed">เงื่อนไขการแสดงผล (ขั้นสูง)</div>'
      + condEditor(b);
    bindFields(b, c);
    bindCond(b, c);
    // collapse the advanced section by default
    var adv = c.querySelector(".sec-title.collapsed");
    if (adv) { var n = adv.nextElementSibling; while (n && !n.classList.contains("sec-title")) { n.classList.add("acc-hidden"); n = n.nextElementSibling; } }
    if (window.__bxbAccordion) window.__bxbAccordion(c);
    if (BL === "en") translateChrome();
  }
  function visOf(b) { if (!b.vis) b.vis = { scope: "all", hideMobile: false }; return b.vis; }
  function condEditor(b) {
    var v = visOf(b);
    return seg("__scope", "แสดงองค์ประกอบนี้ในหน้า", v.scope, [["all", "ทุกหน้า"], ["home", "หน้าแรก"], ["item", "บทความ"], ["page", "เพจ"], ["label", "ป้ายกำกับ"]])
      + tog("__hideMobile", "ซ่อนบนมือถือ", v.hideMobile, "ซ่อนองค์ประกอบนี้บนหน้าจอเล็ก (≤768px)")
      + '<div class="note info">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 2) + '<div>ระบบจะแปลงเป็น <code style="font-family:var(--fm);font-size:11px">&lt;b:if cond&gt;</code> ห่อองค์ประกอบนี้ตอน Export อัตโนมัติ</div></div>';
  }
  function bindCond(b, c) {
    var v = visOf(b);
    var sc = c.querySelector('[data-seg="__scope"]');
    if (sc) sc.addEventListener("click", function (e) { var btn = e.target.closest("button"); if (!btn) return; v.scope = btn.dataset.v; $$("button", sc).forEach(function (x) { x.classList.toggle("on", x === btn); }); commit(); });
    var hm = c.querySelector('[data-k="__hideMobile"]');
    if (hm) hm.addEventListener("change", function () { v.hideMobile = hm.checked; renderCanvas(); save(); });
  }
  function txt(key, label, val, hint) { return '<div class="field"><label>' + label + '</label><input class="inp" data-k="' + key + '" value="' + esc(val) + '">' + (hint ? '<div class="hint">' + hint + "</div>" : "") + "</div>"; }
  function area(key, label, val) { return '<div class="field"><label>' + label + '</label><textarea class="ta" data-k="' + key + '">' + esc(val) + "</textarea></div>"; }
  function seg(key, label, val, opts) { return '<div class="field"><label>' + label + '</label><div class="seg" data-seg="' + key + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === val ? ' class="on"' : "") + ">" + o[1] + "</button>"; }).join("") + "</div></div>"; }
  function tog(key, label, val, sub) { return '<label class="tg"><span class="lbl">' + label + (sub ? "<small>" + sub + "</small>" : "") + '</span><input type="checkbox" data-k="' + key + '"' + (val ? " checked" : "") + '><span class="sw-tg"></span></label>'; }
  function num(key, label, val, mn, mx) { return '<div class="field"><label>' + label + ' — ' + val + '</label><input class="inp" type="range" min="' + mn + '" max="' + mx + '" value="' + val + '" data-k="' + key + '" data-num="1"></div>'; }
  function menuEditor(p) {
    var items = menuItemsOf(p);
    var rows = items.map(function (m, i) {
      return '<div class="menu-row" data-mi="' + i + '">' +
        '<div class="menu-row-top"><span class="menu-grip">⋮⋮</span><input class="inp menu-label" data-ml="' + i + '" value="' + esc(m.label) + '" placeholder="ชื่อเมนู"><button class="menu-del" data-mdel="' + i + '" title="ลบ">✕</button></div>' +
        '<input class="inp menu-url" data-mu="' + i + '" value="' + esc(m.url) + '" placeholder="/p/about.html">' +
      '</div>';
    }).join("");
    return '<div class="field"><label>เมนูนำทาง — ใส่ลิงก์ได้แต่ละอัน</label><div class="menu-list">' + rows + '</div>' +
      '<button class="menu-add" data-madd="1">+ เพิ่มเมนู</button>' +
      '<div class="hint">แนะนำใช้ลิงก์แบบ Root-Relative เช่น <code>/p/about.html</code> — เปลี่ยนโดเมนได้โดยไม่ต้องแก้ลิงก์ ใช้ได้ทั้ง blogspot และโดเมนตัวเอง</div></div>';
  }

  function fieldsFor(b) {
    var p = b.props;
    switch (b.type) {
      case "header": return txt("logoText", "ข้อความโลโก้", p.logoText) + menuEditor(p) + seg("mobileSide", "เมนูมือถือเด้งจาก", p.mobileSide || "right", [["left", "◧ ซ้าย"], ["right", "ขวา ◨"]]) + tog("sticky", "ติดด้านบน (Sticky)", p.sticky) + tog("showSearch", "แสดงปุ่มค้นหา", p.showSearch);
      case "hero": return txt("title", "หัวข้อ", p.title) + area("subtitle", "คำโปรย", p.subtitle) + txt("btnText", "ข้อความปุ่ม", p.btnText) + seg("align", "จัดวาง", p.align, [["left", "ซ้าย"], ["center", "กลาง"]]) + seg("bg", "พื้นหลัง", p.bg, [["gradient", "ไล่สี"], ["dark", "เข้ม"], ["soft", "อ่อน"]]);
      case "footer": return area("about", "เกี่ยวกับ (คอลัมน์แรก)", p.about) + num("columns", "จำนวนคอลัมน์", p.columns, 2, 5) + txt("copyright", "ข้อความลิขสิทธิ์", p.copyright) + tog("social", "แสดงไอคอนโซเชียล", p.social);
      case "postgrid": return txt("heading", "หัวข้อส่วน", p.heading) + num("columns", "จำนวนคอลัมน์", p.columns, 2, 4) + num("count", "จำนวนบทความ", p.count, 2, 12) + tog("showImage", "แสดงรูปภาพ", p.showImage) + tog("showExcerpt", "แสดงคำโปรย", p.showExcerpt);
      case "postlist": return txt("heading", "หัวข้อส่วน", p.heading) + num("count", "จำนวนบทความ", p.count, 2, 10) + tog("showImage", "แสดงรูปภาพ", p.showImage);
      case "featured": return txt("heading", "หัวข้อส่วน", p.heading);
      case "about": return txt("name", "ชื่อ/ผู้เขียน", p.name) + area("bio", "ประวัติ (E-E-A-T)", p.bio) + tog("showAvatar", "แสดงรูปโปรไฟล์", p.showAvatar);
      case "text": return txt("heading", "หัวข้อ", p.heading) + area("body", "เนื้อหา", p.body) + seg("align", "จัดวาง", p.align, [["left", "ซ้าย"], ["center", "กลาง"]]);
      case "columns": return columnsFields(b, p);
      case "cta": return txt("title", "หัวข้อ", p.title) + txt("btnText", "ข้อความปุ่ม", p.btnText) + seg("bg", "พื้นหลัง", p.bg, [["gradient", "ไล่สี"], ["soft", "อ่อน"]]);
      case "image": return txt("alt", "ข้อความ ALT (SEO)", p.alt, "สำคัญต่อ SEO และการเข้าถึง") + txt("caption", "คำบรรยายใต้ภาพ", p.caption) + seg("ratio", "สัดส่วน", p.ratio, [["16/9", "16:9"], ["4/3", "4:3"], ["1/1", "1:1"]]);
      case "ad": return seg("slot", "ตำแหน่ง", p.slot, [["ใต้ส่วนหัว", "บน"], ["ในบทความ", "กลาง"], ["ไซด์บาร์", "ข้าง"]]) + tog("label", 'แสดงป้าย "โฆษณา"', p.label, "แนะนำตามนโยบาย AdSense");
    }
    return "";
  }
  function bindFields(b, c) {
    $$("[data-k]", c).forEach(function (inp) {
      var k = inp.dataset.k;
      if (inp.type === "checkbox") inp.addEventListener("change", function () { b.props[k] = inp.checked; commit(); });
      else if (inp.dataset.num) inp.addEventListener("input", function () { b.props[k] = parseInt(inp.value, 10); renderCanvas(); save(); var lb = inp.previousElementSibling; if (lb) lb.textContent = lb.textContent.replace(/—.*/, "— " + inp.value); });
      else inp.addEventListener("input", function () { b.props[k] = inp.value; renderCanvas(); save(); });
    });
    $$("[data-seg]", c).forEach(function (sg) {
      sg.addEventListener("click", function (e) { var btn = e.target.closest("button"); if (!btn) return; var v = btn.dataset.v; if (sg.dataset.seg === "cols") v = parseInt(v, 10); b.props[sg.dataset.seg] = v; $$("button", sg).forEach(function (x) { x.classList.toggle("on", x === btn); }); commit(); });
    });
    // menu editor bindings
    $$("[data-ml]", c).forEach(function (inp) { inp.addEventListener("input", function () { var arr = menuItemsOf(b.props); arr[+inp.dataset.ml].label = inp.value; b.props.menuItems = arr; renderCanvas(); save(); }); });
    $$("[data-mu]", c).forEach(function (inp) { inp.addEventListener("input", function () { var arr = menuItemsOf(b.props); arr[+inp.dataset.mu].url = inp.value; b.props.menuItems = arr; renderCanvas(); save(); }); });
    $$("[data-mdel]", c).forEach(function (btn) { btn.addEventListener("click", function () { var arr = menuItemsOf(b.props); arr.splice(+btn.dataset.mdel, 1); b.props.menuItems = arr; commit(); renderProps(); }); });
    var madd = c.querySelector("[data-madd]"); if (madd) madd.addEventListener("click", function () { var arr = menuItemsOf(b.props); arr.push({ label: "เมนูใหม่", url: "/" }); b.props.menuItems = arr; commit(); renderProps(); });
    // columns editor bindings
    $$("[data-ci]", c).forEach(function (inp) { inp.addEventListener("input", function () { var arr = b.props.items || []; arr[+inp.dataset.idx][inp.dataset.ci] = inp.value; b.props.items = arr; renderCanvas(); save(); }); });
    $$("[data-cdel]", c).forEach(function (btn) { btn.addEventListener("click", function () { var arr = b.props.items || []; arr.splice(+btn.dataset.cdel, 1); b.props.items = arr; if (b.props.cols > arr.length) b.props.cols = Math.max(1, arr.length); commit(); renderProps(); }); });
    var cadd = c.querySelector("[data-cadd]"); if (cadd) cadd.addEventListener("click", function () { var arr = b.props.items || []; if (arr.length >= 4) return; arr.push({ icon: "★", title: "หัวข้อใหม่", text: "คำอธิบายสั้นๆ" }); b.props.items = arr; commit(); renderProps(); });
  }
  function columnsFields(b, p) {
    var items = p.items || [];
    var rows = items.map(function (it, i) {
      return '<div class="menu-row" data-ci-row="' + i + '">' +
        '<div class="menu-row-top"><input class="inp" data-ci="icon" data-idx="' + i + '" value="' + esc(it.icon || "") + '" placeholder="★" style="max-width:54px;text-align:center"><input class="inp" data-ci="title" data-idx="' + i + '" value="' + esc(it.title) + '" placeholder="หัวข้อ"><button class="menu-del" data-cdel="' + i + '" title="ลบ">✕</button></div>' +
        '<textarea class="ta" data-ci="text" data-idx="' + i + '" placeholder="คำอธิบาย">' + esc(it.text) + '</textarea>' +
        '</div>';
    }).join("");
    return txt("heading", "หัวข้อส่วน", p.heading) +
      seg("cols", "จำนวนคอลัมน์", String(p.cols || 3), [["2", "2"], ["3", "3"]]) +
      '<div class="field"><label>รายการคอลัมน์</label><div class="menu-editor">' + rows + '</div>' +
      (items.length < 4 ? '<button class="menu-add" data-cadd>+ เพิ่มคอลัมน์</button>' : "") + '</div>';
  }

  /* ---------- SEO panel (incl. label indexing toggle) ---------- */
  function renderSeo() {
    var c = $("#rtSeo"), seo = S && S.seo;
    if (!seo) { if (c) c.innerHTML = ""; return; }
    var sc = seoScore();
    c.innerHTML =
      '<div class="seo-score-box"><div class="seo-ring" style="background:conic-gradient(' + sc.color + ' ' + sc.pct + '%, var(--surface-2) 0)"><i style="color:' + sc.color + '">' + sc.score + "</i></div><div><div style=\"font-family:var(--fd);font-weight:600;font-size:15px\">คะแนน SEO</div><div style=\"font-size:12px;color:var(--ink-3);margin-top:2px\">" + sc.label + "</div></div></div>" +
      '<div class="seo-checks">' + sc.checks.map(function (ck) { return '<div class="seo-chk ' + (ck[0] ? "pass" : "fail") + '"><span class="mk">' + svg(ck[0] ? '<path d="M20 6L9 17l-5-5"/>' : '<path d="M12 9v4M12 17h.01"/>', 2.5) + "</span>" + ck[1] + "</div>"; }).join("") + "</div>" +
      '<div class="sec-divider"></div>' +
      txt2("blogTitle", "ชื่อบล็อก", seo.blogTitle) +
      txt2("title", "Title (เว้นว่าง = ใช้ชื่อบล็อก)", seo.title) +
      area2("desc", "Meta description", seo.desc, (seo.desc || "").length + "/160 ตัวอักษร") +
      '<div class="sec-divider"></div>' +
      '<div class="sec-title">ป้ายกำกับ (Labels)</div>' +
      tog2("labelIndex", "อนุญาตให้ทำดัชนีหน้าป้ายกำกับ", seo.labelIndex, "ให้ Google เก็บหน้า Label เป็นหน้าหมวดหมู่") +
      labelNote(seo.labelIndex) +
      '<div class="sec-divider"></div>' +
      tog2("schema", "ใส่ Schema (JSON-LD) อัตโนมัติ", seo.schema, "Organization, WebSite, BlogPosting, Breadcrumb") +
      (seo.schema ? googleBox(seo) : "") +
      tog2("og", "Open Graph + Twitter Card", seo.og, "การ์ดแชร์สวยบน Facebook / LINE / X");
    bindSeo(c);
    if (window.__bxbAccordion) window.__bxbAccordion(c);
    if (BL === "en") translateChrome();
  }
  function txt2(k, l, v) { return '<div class="field"><label>' + l + '</label><input class="inp" data-sk="' + k + '" value="' + esc(v) + '"></div>'; }
  function area2(k, l, v, hint) { return '<div class="field"><label>' + l + '</label><textarea class="ta" data-sk="' + k + '">' + esc(v) + "</textarea>" + (hint ? '<div class="hint" data-cnt="' + k + '">' + hint + "</div>" : "") + "</div>"; }
  function tog2(k, l, v, sub) { return '<label class="tg"><span class="lbl">' + l + (sub ? "<small>" + sub + "</small>" : "") + '</span><input type="checkbox" data-sk="' + k + '"' + (v ? " checked" : "") + '><span class="sw-tg"></span></label>'; }
  function labelNote(on) {
    if (on) return '<div class="note warn">' + svg('<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', 2) + '<div><b>กฎสำคัญ: 1 บทความ ต่อ 1 ป้ายกำกับเท่านั้น</b><br>เมื่อเปิดให้ทำดัชนี Label ได้ ให้ติดป้ายกำกับ <b>เพียงป้ายเดียว</b> ต่อบทความ มิฉะนั้นบทความเดียวจะไปโผล่หลายหน้า Label → เกิดเนื้อหาซ้ำ (duplicate) และถูกมองว่าเป็น <b>หน้าขยะ/thin content</b> ระบบจะสร้าง CollectionPage + Breadcrumb ให้หน้า Label อัตโนมัติเพื่อให้มีคุณภาพพอ</div></div>';
    return '<div class="note info">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 2) + '<div>หน้าป้ายกำกับถูกตั้งเป็น <b>noindex, follow</b> (ค่าแนะนำ) — กันเนื้อหาซ้ำ แต่ยังส่งต่อค่าลิงก์ภายในได้</div></div>';
  }
  function googleBox(seo) {
    return '<div class="sec-title collapsed">ข้อมูลสำหรับ Google (Knowledge Graph)</div>'
      + seg("orgType", "ประเภทเว็บไซต์", seo.orgType, [["Organization", "องค์กร"], ["Person", "บุคคล"], ["LocalBusiness", "ร้านค้า"]])
      + txt2("siteUrl", "URL เว็บไซต์", seo.siteUrl)
      + txt2("logoUrl", "URL โลโก้ (แนะนำ 512×512)", seo.logoUrl)
      + area2b("sameAs", "ลิงก์โซเชียล (บรรทัดละ 1 ลิงก์)", seo.sameAs, "Facebook, X, YouTube, LINE — ช่วยให้ Google ยืนยันตัวตนเว็บ")
      + '<div class="note ok">' + svg('<path d="M20 6L9 17l-5-5"/>', 2.5) + '<div>ข้อมูลนี้จะถูกสร้างเป็น <b>@graph (Organization + WebSite)</b> ในส่วน head ของทุกหน้า — ตัวช่วยให้ Google เข้าใจว่าใครเป็นเจ้าของเว็บ (E-E-A-T)</div></div>';
  }
  function area2b(k, l, v, hint) { return '<div class="field"><label>' + l + '</label><textarea class="ta" data-sk="' + k + '" style="min-height:74px">' + esc(v) + "</textarea>" + (hint ? '<div class="hint">' + hint + "</div>" : "") + "</div>"; }
  function bindSeo(c) {
    $$("[data-sk]", c).forEach(function (inp) {
      var k = inp.dataset.sk;
      if (inp.type === "checkbox") inp.addEventListener("change", function () {
        S.seo[k] = inp.checked; save();
        if (k === "labelIndex" || k === "schema") renderSeo();
      });
      else inp.addEventListener("input", function () {
        S.seo[k] = inp.value; save();
        if (k === "desc") { var h = c.querySelector('[data-cnt="desc"]'); if (h) h.textContent = inp.value.length + "/160 ตัวอักษร"; }
        if (k === "blogTitle") renderCanvas();
        clearTimeout(seoT); seoT = setTimeout(renderSeoScoreOnly, 400);
      });
    });
    var ot = c.querySelector('[data-seg="orgType"]');
    if (ot) ot.addEventListener("click", function (e) { var btn = e.target.closest("button"); if (!btn) return; S.seo.orgType = btn.dataset.v; $$("button", ot).forEach(function (x) { x.classList.toggle("on", x === btn); }); save(); });
  }
  var seoT;
  function renderSeoScoreOnly() { /* re-render whole seo to refresh ring + checks */ var foc = document.activeElement; var k = foc && foc.dataset ? foc.dataset.sk : null; renderSeo(); if (k) { var n = $('[data-sk="' + k + '"]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } } }

  function seoScore() {
    var seo = S.seo, checks = [];
    var t = (seo.title || seo.blogTitle || ""), d = seo.desc || "";
    checks.push([t.length >= 10 && t.length <= 60, "ความยาว Title เหมาะสม (10–60)"]);
    checks.push([d.length >= 70 && d.length <= 160, "Meta description (70–160)"]);
    checks.push([S.blocks.some(function (b) { return b.type === "header"; }), "มีส่วนหัว (Header)"]);
    checks.push([S.blocks.some(function (b) { return b.type === "footer"; }), "มีส่วนท้าย (Footer)"]);
    checks.push([S.blocks.some(function (b) { return b.type === "about"; }), "มีหน้า/ส่วนเกี่ยวกับ (E-E-A-T)"]);
    checks.push([seo.schema, "เปิด Schema JSON-LD"]);
    checks.push([seo.og, "เปิด Open Graph"]);
    checks.push([S.blocks.some(function (b) { return /post|featured/.test(b.type); }), "มีส่วนแสดงบทความ"]);
    var pass = checks.filter(function (x) { return x[0]; }).length;
    var score = Math.round(pass / checks.length * 100);
    var color = score >= 80 ? "#22c55e" : score >= 55 ? "#f59e0b" : "#ef4444";
    var label = score >= 80 ? "ดีมาก พร้อมเผยแพร่" : score >= 55 ? "ดี ปรับเพิ่มได้" : "ควรปรับปรุง";
    return { score: score, pct: score, color: color, label: label, checks: checks };
  }

  /* ---------- design panel ---------- */
  var PALETTES = [["#6366f1", "#8b5cf6"], ["#0ea5e9", "#22d3ee"], ["#10b981", "#06b6d4"], ["#f97316", "#f59e0b"], ["#dc2626", "#f43f5e"], ["#7c3aed", "#a855f7"], ["#1e40af", "#3b82f6"], ["#0f172a", "#dc2626"]];
  function renderDesign() {
    var c = $("#rtDesign"), d = S && S.design;
    if (!d) { if (c) c.innerHTML = ""; return; }
    c.innerHTML =
      '<div class="sec-title">ชุดสี</div><div class="field"><div class="swatches" id="palSw">' +
      PALETTES.map(function (pl, i) { return '<div class="sw' + (pl[0] === d.primary ? " on" : "") + '" data-p="' + pl[0] + '" data-a="' + pl[1] + '" style="background:linear-gradient(120deg,' + pl[0] + "," + pl[1] + ')"></div>'; }).join("") + "</div></div>" +
      '<div class="row2" style="padding:0 16px 14px">' +
        '<div><label style="font-size:12px;font-weight:600;color:var(--ink-2)">สีหลัก</label><input class="inp" type="color" value="' + d.primary + '" data-dk="primary" style="height:38px;padding:3px"></div>' +
        '<div><label style="font-size:12px;font-weight:600;color:var(--ink-2)">สีเน้น</label><input class="inp" type="color" value="' + d.accent + '" data-dk="accent" style="height:38px;padding:3px"></div>' +
      '</div>' +
      contrastNote(d.primary) +
      '<div class="sec-divider"></div><div class="sec-title">ตัวอักษร</div>' +
      '<div class="field"><div class="seg" data-dseg="font">' + [["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]].map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === d.font ? ' class="on"' : "") + ">" + o[1] + "</button>"; }).join("") + "</div></div>" +
      '<div class="sec-divider"></div><div class="sec-title">ความมนขอบ</div>' +
      '<div class="field"><label>มุมโค้ง — ' + d.radius + 'px</label><input class="inp" type="range" min="0" max="24" value="' + d.radius + '" data-dk="radius" data-num="1"></div>';
    bindDesign(c);
    if (window.__bxbAccordion) window.__bxbAccordion(c);
    if (BL === "en") translateChrome();
  }
  function hexToRgb(h) { h = String(h || "").replace("#", ""); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
  function lum(c) { var a = [c.r, c.g, c.b].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
  function contrastRatio(h1, h2) { var l1 = lum(hexToRgb(h1)), l2 = lum(hexToRgb(h2)); var hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
  function contrastNote(primary) {
    var r = contrastRatio(primary, "#ffffff");
    var ratio = r.toFixed(2);
    if (r >= 4.5) return '<div class="note ok" style="margin:0 16px 14px">' + svg('<path d="M20 6L9 17l-5-5"/>', 2.5) + '<div>คอนทราสต์ตัวอักษรขาวบนปุ่มสีหลัก <b>' + ratio + ':1</b> — ผ่านมาตรฐาน WCAG AA ✓</div></div>';
    if (r >= 3) return '<div class="note warn" style="margin:0 16px 14px">' + svg('<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', 2) + '<div>คอนทราสต์ <b>' + ratio + ':1</b> — ผ่านเฉพาะข้อความขนาดใหญ่ ควรเข้มขึ้นเพื่ออ่านง่ายทุกขนาด</div></div>';
    return '<div class="note warn" style="margin:0 16px 14px">' + svg('<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', 2) + '<div><b>คอนทราสต์ต่ำ ' + ratio + ':1</b> — ข้อความขาวบนสีนี้อ่านยาก ไม่ผ่าน WCAG ควรเลือกสีเข้มขึ้น</div></div>';
  }
  function bindDesign(c) {
    $$(".sw", c).forEach(function (s) { s.addEventListener("click", function () { S.design.primary = s.dataset.p; S.design.accent = s.dataset.a; renderDesign(); renderCanvas(); save(); }); });
    $$('[data-dk]', c).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var k = inp.dataset.dk; S.design[k] = inp.dataset.num ? parseInt(inp.value, 10) : inp.value;
        if (inp.dataset.num) { var lb = inp.previousElementSibling; if (lb) lb.textContent = "มุมโค้ง — " + inp.value + "px"; }
        renderCanvas(); save();
      });
    });
    $$('[data-dseg]', c).forEach(function (sg) { sg.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; S.design.font = b.dataset.v; $$("button", sg).forEach(function (x) { x.classList.toggle("on", x === b); }); renderCanvas(); save(); }); });
  }

  /* ---------- right tab switch ---------- */
  function switchRight(t) {
    $$("#workspace, .p-tabs button").forEach(function () {});
    $$(".p-tabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.rt === t); });
    $("#rtProps").style.display = t === "props" ? "" : "none";
    $("#rtSeo").style.display = t === "seo" ? "" : "none";
    $("#rtDesign").style.display = t === "design" ? "" : "none";
    if (t === "seo") renderSeo();
    if (t === "design") renderDesign();
  }
  $$(".p-tabs button").forEach(function (b) { b.addEventListener("click", function () { switchRight(b.dataset.rt); }); });

  /* ---------- view (responsive) ---------- */
  $$("#viewTabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      VIEW = b.dataset.vw; $$("#viewTabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
      var w = $("#frameWrap");
      w.style.width = VIEW === "mobile" ? "390px" : VIEW === "tablet" ? "768px" : "100%";
    });
  });

  /* ---------- mobile switch ---------- */
  function showMob(which) {
    document.body.classList.remove("show-left", "show-right");
    if (which === "left") document.body.classList.add("show-left");
    if (which === "right") document.body.classList.add("show-right");
    $$("#mobSwitch button").forEach(function (b) { b.classList.toggle("on", b.dataset.mob === which); });
  }
  $("#mobSwitch").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) showMob(b.dataset.mob); });
  $$("[data-sheet-close]").forEach(function (btn) { btn.addEventListener("click", function () { showMob("canvas"); }); });

  /* ---------- accordion: click a .sec-title to collapse fields until next .sec-title ---------- */
  function bindAccordion(container) {
    $$(".sec-title", container).forEach(function (st) {
      st.addEventListener("click", function () {
        var collapsed = st.classList.toggle("collapsed");
        var n = st.nextElementSibling;
        while (n && !n.classList.contains("sec-title")) {
          n.classList.toggle("acc-hidden", collapsed);
          n = n.nextElementSibling;
        }
      });
    });
  }
  window.__bxbAccordion = bindAccordion;

  /* ---------- XML EXPORT ENGINE ---------- */
  function condWrap(html, b) {
    var v = b.vis || {};
    if (v.hideMobile) html = html.replace(/^(\s*<\w+)/, "$1 class='hide-mobile'");
    var condMap = { home: "data:view.isHomepage", item: "data:view.isSingleItem", page: "data:view.isPage", label: "data:view.isLabelSearch" };
    if (v.scope && condMap[v.scope]) html = "<b:if cond='" + condMap[v.scope] + "'>\n" + html + "\n</b:if>";
    return html;
  }
  var POST_BLOCKS = { postgrid: 1, postlist: 1, featured: 1 };
  function genXML() {
    var d = S.design, seo = S.seo;
    var titleExpr = "<b:if cond='data:view.isHomepage'><data:blog.title.escaped/><b:else/><data:view.title.escaped/> ~ <data:blog.title.escaped/></b:if>";
    var css = themeCSS(d);

    // Split blocks: post-driven blocks must live INSIDE the single Blog widget
    // (data:posts is only in scope there). Static blocks render directly in <body>.
    var postBlocks = S.blocks.filter(function (b) { return POST_BLOCKS[b.type]; });
    var firstPostIdx = S.blocks.findIndex(function (b) { return POST_BLOCKS[b.type]; });

    // The Blog widget includable: contains all post-driven sections in order.
    var includableBody = postBlocks.length
      ? postBlocks.map(function (b) { return condWrap(renderBlockStatic(b), b); }).join("\n")
      : "<b:if cond='data:view.isMultipleItems'><b:loop values='data:posts' var='post'><article class='bxb-post'><h2><a expr:href='data:post.url'><data:post.title/></a></h2><div class='post-body'><data:post.body/></div></article></b:loop></b:if><b:if cond='data:view.isSingleItem'><b:loop values='data:posts' var='post'><article><h1 class='post-title'><data:post.title/></h1><div class='post-body'><data:post.body/></div></article></b:loop></b:if>";
    var blogWidget =
      "<b:section id='main' class='main-section' showaddelement='no'>\n" +
      "<b:widget id='Blog1' locked='true' title='บทความ' type='Blog' version='2' visible='true'>\n" +
      "<b:includable id='main'>\n" + includableBody + "\n</b:includable>\n" +
      "</b:widget>\n</b:section>";

    // Assemble body in document order; drop the Blog widget in at the first post block's spot.
    var parts = [], placed = false;
    S.blocks.forEach(function (b, i) {
      if (POST_BLOCKS[b.type]) {
        if (i === firstPostIdx) { parts.push(blogWidget); placed = true; }
        return; // other post blocks already inside the widget
      }
      parts.push(condWrap(renderBlockStatic(b), b));
    });
    if (!placed) parts.push(blogWidget); // ensure exactly one Blog widget always exists
    var bodyHTML = parts.join("\n");

    // label robots logic
    var labelRobots = seo.labelIndex
      ? "<b:if cond='data:view.isLabelSearch'><meta content='index,follow,max-image-preview:large' name='robots'/></b:if>"
      : "<b:if cond='data:view.isLabelSearch'><meta content='noindex,follow' name='robots'/></b:if>";
    var schema = seo.schema ? schemaGraph(seo) : "";
    var og = seo.og ? ogTags(seo) : "";

    var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n" +
"<!DOCTYPE html>\n" +
"<html b:version='2' b:layoutsVersion='3' b:defaultwidgetversion='2' class='v2' expr:dir='data:blog.languageDirection' lang='" + (S.lang || "th") + "' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/gml/b' xmlns:data='http://www.google.com/2005/gml/data' xmlns:expr='http://www.google.com/2005/gml/expr'>\n" +
"<head>\n" +
"<meta charset='UTF-8'/>\n" +
"<meta content='width=device-width, initial-scale=1' name='viewport'/>\n" +
"<title>" + titleExpr + "</title>\n" +
"<b:include data='blog' name='all-head-content'/>\n" +
"<link expr:href='data:view.url.canonical' rel='canonical'/>\n" +
"<b:if cond='data:view.isHomepage'><meta content='index,follow,max-image-preview:large,max-snippet:-1' name='robots'/></b:if>\n" +
"<b:if cond='data:view.isSingleItem'><meta content='index,follow,max-image-preview:large,max-snippet:-1' name='robots'/></b:if>\n" +
"<b:if cond='data:view.isMultipleItems and !data:view.isHomepage and !data:view.isLabelSearch'><meta content='noindex,follow' name='robots'/></b:if>\n" +
labelRobots + "\n" +
"<b:if cond='data:view.isSearch'><meta content='noindex,follow' name='robots'/></b:if>\n" +
"<meta expr:content='data:view.description.escaped' name='description'/>\n" +
og + "\n" +
"<link href='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&amp;display=swap' rel='stylesheet'/>\n" +
"<b:skin><![CDATA[\n" + css + "\n]]></b:skin>\n" +
schema + "\n" +
"</head>\n" +
"<body>\n" +
"<a class='skip' href='#main'>ข้ามไปยังเนื้อหา</a>\n" +
bodyHTML + "\n" +
"</body>\n</html>";
    return xml;
  }

  function skinVariables(d) {
    var ff = d.font === "serif" ? "Georgia, 'Times New Roman', serif" : d.font === "mono" ? "'Courier New', monospace" : "'IBM Plex Sans Thai', system-ui, sans-serif";
    // Blogger Theme Designer variable definitions — editable in backend (การออกแบบ > ปรับแต่ง)
    return [
"/*",
"<Variable name=\"keycolor\" description=\"สีหลัก\" type=\"color\" default=\"" + d.primary + "\" value=\"" + d.primary + "\"/>",
"<Variable name=\"accentcolor\" description=\"สีเน้น\" type=\"color\" default=\"" + d.accent + "\" value=\"" + d.accent + "\"/>",
"<Variable name=\"textcolor\" description=\"สีตัวอักษร\" type=\"color\" default=\"#1e2333\" value=\"#1e2333\"/>",
"<Variable name=\"bgcolor\" description=\"สีพื้นหลัง\" type=\"color\" default=\"#ffffff\" value=\"#ffffff\"/>",
"<Variable name=\"bodyfont\" description=\"แบบอักษรเนื้อหา\" type=\"font\" default=\"normal normal 16px " + ff + "\" value=\"normal normal 16px " + ff + "\"/>",
"<Variable name=\"radius\" description=\"ความมนขอบ\" type=\"length\" default=\"" + d.radius + "px\" value=\"" + d.radius + "px\"/>",
"*/"
    ].join("\n");
  }
  function themeCSS(d) {
    var ff = d.font === "serif" ? "Georgia,serif" : d.font === "mono" ? "monospace" : "'IBM Plex Sans Thai',system-ui,sans-serif";
    return [
skinVariables(d),
"*{margin:0;padding:0;box-sizing:border-box}",
"body{font:$(bodyfont);color:$(textcolor);background:$(bgcolor);line-height:1.6;-webkit-font-smoothing:antialiased}",
"a{color:$(keycolor);text-decoration:none}",
"img{max-width:100%;height:auto}",
".skip{position:absolute;left:-9999px;top:0;background:$(keycolor);color:#fff;padding:10px 16px;z-index:999}",
".skip:focus{left:0}",
".wrap{max-width:1080px;margin:0 auto;padding:0 20px}",
":root{--primary:$(keycolor);--accent:$(accentcolor);--radius:$(radius)}",
"h1,h2,h3{line-height:1.2}",
".site-bar{display:flex;align-items:center;gap:24px;padding:16px 20px}",
".site-nav ul{display:flex;gap:22px;list-style:none;margin:0 0 0 auto;padding:0}",
".site-nav a{font-weight:500}",
".nav-toggle-cb,.nav-burger,.nav-scrim{display:none}",
".nav-burger{flex-direction:column;gap:5px;cursor:pointer;padding:8px;margin-left:auto}",
".nav-burger span{display:block;width:24px;height:2px;background:#1e2333;border-radius:2px}",
"@media(max-width:768px){",
".nav-burger{display:flex}",
".site-nav{position:fixed;top:0;bottom:0;width:78%;max-width:300px;background:#fff;z-index:60;padding:64px 22px 22px;transition:transform .28s ease;box-shadow:0 0 40px rgba(0,0,0,.2)}",
".site-nav ul{flex-direction:column;gap:4px;margin:0}",
".site-nav li a{display:block;padding:12px 10px;border-radius:8px;font-size:16px}",
".site-nav.nav-right{right:0;transform:translateX(100%)}",
".site-nav.nav-left{left:0;transform:translateX(-100%)}",
".nav-toggle-cb:checked~.site-bar .site-nav{transform:translateX(0)}",
".nav-toggle-cb:checked~.site-bar .nav-scrim{display:block;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:55}",
"}",
".hide-mobile{display:block}",
"@media(max-width:768px){.grid{grid-template-columns:1fr !important}.hide-mobile{display:none !important}}"
    ].join("\n");
  }

  /* static (server-rendered) markup for the theme body — semantic HTML5 */
  function renderBlockStatic(b) {
    var p = b.props, d = design();
    switch (b.type) {
      case "header":
        var hItems = menuItemsOf(p);
        var menu = hItems.map(function (m) { return "<li><a href='" + esc(m.url) + "'>" + esc(m.label) + "</a></li>"; }).join("");
        var side = p.mobileSide === "left" ? "left" : "right";
        return "<header role='banner' class='site-header'" + (p.sticky ? " style='position:sticky;top:0;z-index:50'" : "") + ">" +
          "<input type='checkbox' id='navtoggle' class='nav-toggle-cb' hidden='hidden'/>" +
          "<div class='wrap site-bar'>" +
          "<a href='/' class='site-logo' style='font-weight:700;font-size:21px;color:var(--primary)'>" + esc(p.logoText) + "</a>" +
          "<nav role='navigation' aria-label='เมนูหลัก' class='site-nav nav-" + side + "'><ul>" + menu + "</ul></nav>" +
          "<label for='navtoggle' class='nav-burger' aria-label='เปิดเมนู'><span></span><span></span><span></span></label>" +
          "<label for='navtoggle' class='nav-scrim'></label>" +
          "</div></header>";
      case "hero":
        return "<section class='hero' style='padding:80px 20px;text-align:" + p.align + ";background:linear-gradient(120deg,var(--primary),var(--accent));color:#fff'><div class='wrap'><h1 style='font-size:42px'>" + esc(p.title) + "</h1><p style='font-size:18px;margin-top:16px;opacity:.92'>" + esc(p.subtitle) + "</p><p style='margin-top:26px'><a href='#main' style='background:#fff;color:var(--primary);padding:13px 26px;border-radius:var(--radius);font-weight:600;display:inline-block'>" + esc(p.btnText) + "</a></p></div></section>";
      case "postgrid":
        return "<section style='padding:48px 0'><div class='wrap'><h2 style='font-size:26px;margin-bottom:24px'>" + esc(p.heading) + "</h2><div class='grid' style='display:grid;grid-template-columns:repeat(" + p.columns + ",1fr);gap:20px'>" +
          "<b:loop values='data:posts' var='post'><article style='border:1px solid #eef;border-radius:var(--radius);overflow:hidden'>" + (p.showImage ? "<b:if cond='data:post.featuredImage'><img expr:src='data:post.featuredImage' expr:alt='data:post.title' loading='lazy' width='400' height='225'/></b:if>" : "") + "<div style='padding:16px'><h3 style='font-size:17px'><a expr:href='data:post.url'><data:post.title/></a></h3>" + (p.showExcerpt ? "<p style='color:#828aa0;font-size:14px;margin-top:8px'><data:post.snippet/></p>" : "") + "</div></article></b:loop>" +
          "</div></div></section>";
      case "postlist":
        return "<section style='padding:48px 0'><div class='wrap'><h2 style='font-size:26px;margin-bottom:20px'>" + esc(p.heading) + "</h2><b:loop values='data:posts' var='post'><article style='display:flex;gap:16px;border-bottom:1px solid #eef;padding:16px 0'>" + (p.showImage ? "<b:if cond='data:post.featuredImage'><img expr:src='data:post.featuredImage' expr:alt='data:post.title' loading='lazy' width='120' height='90' style='border-radius:var(--radius)'/></b:if>" : "") + "<div><h3 style='font-size:18px'><a expr:href='data:post.url'><data:post.title/></a></h3><p style='color:#828aa0;font-size:14px;margin-top:4px'><data:post.snippet/></p></div></article></b:loop></div></section>";
      case "featured":
        return "<section style='padding:48px 0'><div class='wrap'><h2 style='font-size:26px;margin-bottom:20px'>" + esc(p.heading) + "</h2><b:loop values='data:posts' index='i' var='post'><b:if cond='data:i == 0'><article style='border-radius:var(--radius);overflow:hidden;background:linear-gradient(120deg,var(--primary),var(--accent));padding:32px;color:#fff'><h3 style='font-size:26px'><a expr:href='data:post.url' style='color:#fff'><data:post.title/></a></h3></article></b:if></b:loop></div></section>";
      case "about":
        return "<section style='padding:56px 20px;background:#f7f8fc'><div class='wrap' style='display:flex;gap:24px;align-items:center;max-width:820px'>" + (p.showAvatar ? "<div style='width:84px;height:84px;border-radius:50%;background:linear-gradient(120deg,var(--primary),var(--accent));flex:none'></div>" : "") + "<div><h2 style='font-size:24px'>" + esc(p.name) + "</h2><p style='color:#4a5063;margin-top:8px'>" + esc(p.bio) + "</p></div></div></section>";
      case "text":
        return "<section style='padding:40px 20px'><div class='wrap' style='max-width:760px;text-align:" + p.align + "'><h2 style='font-size:28px;margin-bottom:12px'>" + esc(p.heading) + "</h2><p style='color:#4a5063;font-size:16px'>" + esc(p.body) + "</p></div></section>";
      case "columns":
        var ccn = p.cols || 3, cits = (p.items || []).slice(0, ccn);
        var ccells = cits.map(function (it) { return "<div style='text-align:center;padding:8px'><div style='width:54px;height:54px;border-radius:14px;background:linear-gradient(120deg,var(--primary),var(--accent));color:#fff;display:grid;place-items:center;font-size:24px;margin:0 auto 14px'>" + esc(it.icon || "\u2605") + "</div><h3 style='font-size:18px;margin:0 0 7px'>" + esc(it.title) + "</h3><p style='color:#828aa0;font-size:14px'>" + esc(it.text) + "</p></div>"; }).join("");
        return "<section style='padding:48px 0'><div class='wrap'>" + (p.heading ? "<h2 style='font-size:26px;margin-bottom:24px;text-align:center'>" + esc(p.heading) + "</h2>" : "") + "<div class='grid' style='display:grid;grid-template-columns:repeat(" + ccn + ",1fr);gap:24px'>" + ccells + "</div></div></section>";
      case "cta":
        return "<section style='padding:20px'><div class='wrap'><div style='padding:48px 20px;text-align:center;border-radius:var(--radius);background:linear-gradient(120deg,var(--primary),var(--accent));color:#fff'><h2 style='font-size:30px'>" + esc(p.title) + "</h2><p style='margin-top:18px'><a href='#' style='background:#fff;color:var(--primary);padding:13px 28px;border-radius:var(--radius);font-weight:600;display:inline-block'>" + esc(p.btnText) + "</a></p></div></div></section>";
      case "image":
        return "<figure style='padding:24px 20px;margin:0'><div class='wrap'><div style='aspect-ratio:" + p.ratio + ";background:#e8eaf2;border-radius:var(--radius)'></div>" + (p.caption ? "<figcaption style='text-align:center;color:#9aa;font-size:13px;margin-top:8px'>" + esc(p.caption) + "</figcaption>" : "") + "</div></figure>";
      case "ad":
        return "<aside aria-label='โฆษณา' style='padding:16px 20px'><div class='wrap'>" + (p.label ? "<div style='text-align:center;font-size:11px;color:#bbc;margin-bottom:4px'>โฆษณา</div>" : "") + "<div style='min-height:90px;display:grid;place-items:center;background:#fafbff;border:1px dashed #ccd;border-radius:8px'><!-- AdSense slot: " + esc(p.slot) + " --></div></div></aside>";
      case "footer":
        return "<footer role='contentinfo' style='background:#0f172a;color:#fff;padding:48px 20px 28px'><div class='wrap'><div style='font-weight:700;font-size:19px'>" + esc(S.seo.blogTitle || "MyBlog") + "</div><p style='color:rgba(255,255,255,.6);margin-top:12px;max-width:420px'>" + esc(p.about) + "</p><div style='text-align:center;color:rgba(255,255,255,.4);font-size:12.5px;margin-top:36px;padding-top:20px;border-top:1px solid rgba(255,255,255,.1)'>" + esc(p.copyright) + "</div></div></footer>";
    }
    return "";
  }

  function schemaGraph(seo) {
    var bt = esc(seo.blogTitle || "MyBlog");
    var out = "";
    // Site-wide @graph: Organization/Person + WebSite, linked by @id
    var entityType = seo.orgType === "Person" ? "Person" : seo.orgType === "LocalBusiness" ? "LocalBusiness" : "Organization";
    var sameAsArr = String(seo.sameAs || "").split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var orgProps = ['"@type":"' + entityType + '"', '"@id":"#identity"', '"name":"' + bt + '"'];
    if (seo.siteUrl) orgProps.push('"url":"' + esc(seo.siteUrl) + '"');
    if (seo.logoUrl) orgProps.push('"logo":{"@type":"ImageObject","url":"' + esc(seo.logoUrl) + '"}');
    if (sameAsArr.length) orgProps.push('"sameAs":[' + sameAsArr.map(function (u) { return '"' + esc(u) + '"'; }).join(",") + "]");
    var siteProps = ['"@type":"WebSite"', '"@id":"#website"', '"name":"' + bt + '"', '"publisher":{"@id":"#identity"}'];
    if (seo.siteUrl) siteProps.push('"url":"' + esc(seo.siteUrl) + '"');
    var graph = '{"@context":"https://schema.org","@graph":[{' + orgProps.join(",") + "},{" + siteProps.join(",") + "}]}";
    out += "<script type='application/ld+json'>" + graph.replace(/"/g, "&quot;") + "</script>\n";
    // Per-post BlogPosting + Speakable
    out += "<b:if cond='data:view.isSingleItem'>\n<script type='application/ld+json'>{&quot;@context&quot;:&quot;https://schema.org&quot;,&quot;@type&quot;:&quot;BlogPosting&quot;,&quot;headline&quot;:&quot;<data:post.title.jsonEscaped/>&quot;,&quot;datePublished&quot;:&quot;<data:post.date.iso8601/>&quot;,&quot;dateModified&quot;:&quot;<data:post.lastUpdated.iso8601/>&quot;,&quot;author&quot;:{&quot;@type&quot;:&quot;Person&quot;,&quot;name&quot;:&quot;<data:post.author.name.jsonEscaped/>&quot;},&quot;publisher&quot;:{&quot;@id&quot;:&quot;#identity&quot;},&quot;mainEntityOfPage&quot;:{&quot;@type&quot;:&quot;WebPage&quot;,&quot;@id&quot;:&quot;<data:post.url.canonical/>&quot;},&quot;speakable&quot;:{&quot;@type&quot;:&quot;SpeakableSpecification&quot;,&quot;cssSelector&quot;:[&quot;h1&quot;,&quot;.post-body&quot;]}}</script>\n" +
    // BreadcrumbList: หน้าแรก > ป้ายกำกับ > บทความ
    "<script type='application/ld+json'>{&quot;@context&quot;:&quot;https://schema.org&quot;,&quot;@type&quot;:&quot;BreadcrumbList&quot;,&quot;itemListElement&quot;:[{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:1,&quot;name&quot;:&quot;หน้าแรก&quot;,&quot;item&quot;:&quot;<data:blog.homepageUrl/>&quot;},<b:if cond='data:post.labels'><b:loop values='data:post.labels' var='label' index='li'><b:if cond='data:li == 0'>{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:2,&quot;name&quot;:&quot;<data:label.name.jsonEscaped/>&quot;,&quot;item&quot;:&quot;<data:label.url.canonical/>&quot;},</b:if></b:loop></b:if>{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:3,&quot;name&quot;:&quot;<data:post.title.jsonEscaped/>&quot;}]}</script>\n</b:if>\n";
    // Label CollectionPage + Breadcrumb
    out += "<b:if cond='data:view.isLabelSearch'>\n<script type='application/ld+json'>{&quot;@context&quot;:&quot;https://schema.org&quot;,&quot;@type&quot;:&quot;CollectionPage&quot;,&quot;name&quot;:&quot;<data:blog.pageName.jsonEscaped/>&quot;,&quot;isPartOf&quot;:{&quot;@id&quot;:&quot;#website&quot;}}</script>\n</b:if>";
    return out;
  }
  function ogTags(seo) {
    return "<meta expr:content='data:view.title.escaped' property='og:title'/>\n<meta expr:content='data:view.description.escaped' property='og:description'/>\n<meta expr:content='data:view.url.canonical' property='og:url'/>\n<meta content='" + esc(seo.blogTitle || "MyBlog") + "' property='og:site_name'/>\n<meta content='summary_large_image' name='twitter:card'/>\n<b:if cond='data:view.featuredImage'><meta expr:content='data:view.featuredImage' property='og:image'/></b:if>";
  }

  /* validate well-formedness */
  function validateXML(xml) {
    try {
      var doc = new DOMParser().parseFromString(xml, "application/xml");
      var err = doc.querySelector("parsererror");
      return err ? { ok: false, msg: err.textContent.slice(0, 120) } : { ok: true };
    } catch (e) { return { ok: false, msg: String(e) }; }
  }
  function highlightXML(x) {
    return esc(x)
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="xml-cm">$1</span>')
      .replace(/(&lt;\/?[\w:.-]+)/g, '<span class="xml-tag">$1</span>')
      .replace(/([\w:-]+)=(&quot;[^&]*&quot;)/g, '<span class="xml-attr">$1</span>=<span class="xml-str">$2</span>');
  }

  /* ---------- export modal ---------- */
  var lastXML = "";
  function openExport() {
    lastXML = genXML();
    var v = validateXML(lastXML);
    var badge = $("#validBadge");
    badge.className = "vbadge " + (v.ok ? "ok" : "bad");
    badge.textContent = v.ok ? "✓ XML valid" : "✕ " + v.msg;
    $("#xmlOut").innerHTML = highlightXML(lastXML);
    $("#exportModal").classList.add("open");
  }
  $("#exportBtn").addEventListener("click", openExport);

  /* ---------- live preview in a new window (real, scrollable, responsive) ---------- */
  function previewHTML() {
    var css = themeCSS(S.design);
    var body = S.blocks.map(renderBlockStatic).join("\n")
      // strip Blogger-only tags so it renders as a normal page in the popup
      .replace(/<b:loop[^>]*>/g, "").replace(/<\/b:loop>/g, "")
      .replace(/<b:if[^>]*>/g, "").replace(/<b:else\/>/g, "").replace(/<\/b:if>/g, "")
      .replace(/<data:post\.title\/>/g, "หัวข้อบทความตัวอย่างที่น่าสนใจ")
      .replace(/<data:post\.snippet\/>/g, "สรุปเนื้อหาบทความสั้นๆ ให้ผู้อ่านเห็นภาพรวมก่อนคลิกอ่านต่อ…")
      .replace(/expr:src='data:post\.featuredImage'/g, "src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"225\"><rect width=\"400\" height=\"225\" fill=\"%23e8eaf2\"/></svg>'")
      .replace(/expr:alt='data:post\.title'/g, "alt='ตัวอย่างรูปภาพ'")
      .replace(/expr:href='data:post\.url'/g, "href='#'");
    return "<!DOCTYPE html><html lang='" + (S.lang || "th") + "'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>พรีวิว — " + esc(S.name) + "</title><link href='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap' rel='stylesheet'><style>" + css + "</style></head><body>" + body + "</body></html>";
  }
  var popWin = null;
  $("#popoutBtn").addEventListener("click", function () {
    if (!S || !S.blocks.length) { toast("ยังไม่มีบล็อก — เพิ่มองค์ประกอบก่อน"); return; }
    var html = previewHTML();
    try {
      if (popWin && !popWin.closed) popWin.close();
      popWin = window.open("", "bxb_preview", "width=420,height=820");
      popWin.document.open(); popWin.document.write(html); popWin.document.close();
      toast("เปิดพรีวิวหน้าต่างใหม่แล้ว");
    } catch (e) {
      // fallback: blob url
      var b = new Blob([html], { type: "text/html" }); var u = URL.createObjectURL(b); window.open(u, "_blank");
    }
  });

  $$("#exportModal [data-x]").forEach(function (x) { x.addEventListener("click", function () { $("#exportModal").classList.remove("open"); }); });
  $("#copyXml").addEventListener("click", function () { navigator.clipboard.writeText(lastXML).then(function () { toast("คัดลอก XML แล้ว"); }); });
  $("#dlXml").addEventListener("click", function () { download(lastXML, (slug(S.name) || "blogger-theme") + ".xml", "application/xml"); toast("ดาวน์โหลดแล้ว"); });
  $("#dlJson").addEventListener("click", function () { download(JSON.stringify(S, null, 2), (slug(S.name) || "project") + ".json", "application/json"); toast("บันทึกโปรเจกต์แล้ว"); });

  function download(text, name, mime) { var b = new Blob([text], { type: mime + ";charset=utf-8" }); var u = URL.createObjectURL(b); var a = el("a", { href: u, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1500); }
  function slug(s) { return String(s || "").trim().toLowerCase().replace(/[^\w\u0e00-\u0e7f]+/g, "-").replace(/^-+|-+$/g, ""); }
  function toast(m) { var t = $("#toast"); $("#toastMsg").textContent = m; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("show"); }, 1900); }

  /* ---------- top bar actions ---------- */
  $("#projName").addEventListener("input", function () { S.name = this.value; save(); });
  $("#undoBtn").addEventListener("click", function () { if (HISTORY.length > 1) { HISTORY.pop(); S.blocks = JSON.parse(HISTORY[HISTORY.length - 1]); SEL = null; renderCanvas(); renderProps(); renderSeo(); save(); toast("ย้อนกลับแล้ว"); } });
  $("#restartBtn").addEventListener("click", function () { if (confirm("เริ่มใหม่? โปรเจกต์ปัจจุบันจะถูกล้าง")) { localStorage.removeItem(KEY); location.reload(); } });

  /* ---------- start screen ---------- */
  var curCat = "ทั้งหมด";
  function renderStart() {
    $("#catTabs").innerHTML = CATS.map(function (c) { return '<button class="cat-tab' + (c === curCat ? " on" : "") + '" data-c="' + c + '">' + c + "</button>"; }).join("");
    var list = TEMPLATES.filter(function (t) { return curCat === "ทั้งหมด" || t.cat === curCat; });
    $("#startGrid").innerHTML = list.map(function (t) {
      return '<div class="tpl-card" data-tpl="' + t.id + '"><div class="thumb" style="background:linear-gradient(135deg,' + t.c[0] + "," + t.c[1] + ')"><div class="h"></div><div class="l"></div><div class="l s"></div><div class="g"><div></div><div></div><div></div></div></div><div class="meta"><h4>' + t.name + "</h4><p>" + t.desc + "</p></div></div>";
    }).join("");
    $$("#catTabs .cat-tab").forEach(function (b) { b.addEventListener("click", function () { curCat = b.dataset.c; renderStart(); }); });
    $$("#startGrid .tpl-card").forEach(function (card) { card.addEventListener("click", function () { startFromTemplate(card.dataset.tpl); }); });
  }
  function startFromTemplate(id) {
    var t = TEMPLATES.find(function (x) { return x.id === id; });
    S = freshProject(t.name, JSON.parse(JSON.stringify(t.design)));
    S.seo.blogTitle = t.name;
    S.blocks = t.blocks.map(function (type) { return { id: uid(), type: type, props: blockDefaults(type) }; });
    enterBuilder();
  }
  $("#blankBtn").addEventListener("click", function () { S = freshProject(); enterBuilder(); });

  /* ---------- onboarding gate ---------- */
  function obStep(name) {
    ["obGate", "obGuide", "obTpl"].forEach(function (id) { var e = $("#" + id); if (e) e.style.display = id === name ? "" : "none"; });
    try { $(".start").scrollTop = 0; } catch (e) {}
  }
  var GUIDE = [
    ["ไปที่ Blogger", "เปิด <code>blogger.com</code> แล้วลงชื่อเข้าใช้ด้วยบัญชี Google ของคุณ (ถ้ายังไม่มี สมัคร Gmail ก่อน)"],
    ["สร้างบล็อกใหม่", "กด <b>สร้างบล็อก (Create New Blog)</b> ในเมนูซ้าย"],
    ["ตั้งชื่อบล็อก", "ใส่ชื่อบล็อกที่ต้องการ — เป็นชื่อที่แสดงบนหัวเว็บ เปลี่ยนภายหลังได้"],
    ["ตั้งที่อยู่ (URL)", "เลือก URL เช่น <code>yourblog.blogspot.com</code> ระบบจะบอกว่าว่างหรือไม่ — เลือกให้สั้น จำง่าย"],
    ["ยืนยันสร้างบล็อก", "กด <b>บันทึก</b> — ตอนนี้คุณมีบล็อก Blogger พร้อมแล้ว"]
  ];
  var TIPS = [
    "ไปที่ <b>การตั้งค่า → ความเป็นส่วนตัว</b> แล้ว <b>ปิด</b> \"อนุญาตให้เครื่องมือค้นหาพบบล็อกของคุณ\" ไว้ก่อน",
    "ที่ <b>การตั้งค่า → สิทธิ์ → ผู้อ่านบล็อก</b> เลือก <b>\"เฉพาะผู้เขียนบล็อก\"</b> เพื่อซ่อนระหว่างเตรียมเนื้อหา",
    "อัปโหลดธีมที่สร้างจากเครื่องมือนี้ แล้วเขียนบทความคุณภาพสัก <b>2–3 บทความ</b> ให้เว็บดูสมบูรณ์",
    "เมื่อพร้อม ค่อย <b>เปิดสาธารณะ + เปิดให้ค้นหาเจอ</b> — Googlebot จะเข้ามาเก็บข้อมูลครั้งแรกแล้วเห็นเว็บที่จริงจัง มีเนื้อหาครบ สร้างความประทับใจที่ดีต่ออันดับ"
  ];
  (function initGuide() {
    var gl = $("#guideList"); if (gl) gl.innerHTML = GUIDE.map(function (g) { return "<li><b>" + g[0] + "</b><span>" + g[1] + "</span></li>"; }).join("");
    var tl = $("#tipList"); if (tl) tl.innerHTML = TIPS.map(function (t) { return "<li>" + t + "</li>"; }).join("");
  })();
  if ($("#gateYes")) $("#gateYes").addEventListener("click", function () { obStep("obTpl"); });
  if ($("#gateNo")) $("#gateNo").addEventListener("click", function () { obStep("obGuide"); });
  if ($("#guideDone")) $("#guideDone").addEventListener("click", function () { obStep("obTpl"); });
  $$("[data-back]").forEach(function (b) { b.addEventListener("click", function () { obStep("obGate"); }); });

  function enterBuilder() {
    $("#startScreen").style.display = "none";
    $("#projName").value = S.name;
    HISTORY = []; pushHistory();
    renderCanvas(); renderProps(); renderSeo(); renderDesign(); setupLibDrag(); save();
  }

  /* ---------- build left library ---------- */
  function buildLib() {
    $("#libGroups").innerHTML = LIB.map(function (g) {
      return '<div class="lib-group"><h4>' + g[0] + '</h4><div class="lib-wrap">' + g[1].map(function (it) {
        return '<div class="lib-item" data-type="' + it[0] + '"><span class="ic">' + svg(IC[it[0]] || IC.text) + '</span><span class="nm">' + it[1] + "<small>" + it[2] + "</small></span></div>";
      }).join("") + "</div></div>";
    }).join("");
  }

  /* ---------- layers tree view (DOC1) ---------- */
  function renderLayers() {
    var v = $("#layersView"); if (!v) return;
    if (!S || !S.blocks.length) { v.innerHTML = '<div class="layers-empty">ยังไม่มีองค์ประกอบบนหน้า<br>เพิ่มจากแท็บ “องค์ประกอบ”</div>'; return; }
    v.innerHTML = '<div class="layers-hd">โครงสร้างหน้า — ลากเพื่อจัดลำดับ</div>' + S.blocks.map(function (b) {
      var t = blkLabel(b.type);
      return '<div class="layer-row' + (b.id === SEL ? " sel" : "") + '" draggable="true" data-id="' + b.id + '">'
        + '<span class="lh">' + svg(IC[b.type] || IC.text) + '</span>'
        + '<span class="ln">' + esc(t) + '</span>'
        + '<span class="lg"><button data-lup title="ขึ้น">↑</button><button data-ldn title="ลง">↓</button><button data-ldel title="ลบ">✕</button></span>'
        + '</div>';
    }).join("");
    // bind
    var dragId = null;
    $$(".layer-row", v).forEach(function (row) {
      row.addEventListener("click", function (e) { if (e.target.closest("button")) return; select(row.dataset.id); });
      row.querySelector("[data-lup]").addEventListener("click", function (e) { e.stopPropagation(); move(row.dataset.id, -1); renderLayers(); });
      row.querySelector("[data-ldn]").addEventListener("click", function (e) { e.stopPropagation(); move(row.dataset.id, 1); renderLayers(); });
      row.querySelector("[data-ldel]").addEventListener("click", function (e) { e.stopPropagation(); removeBlock(row.dataset.id); renderLayers(); });
      row.addEventListener("dragstart", function () { dragId = row.dataset.id; row.classList.add("dragging"); });
      row.addEventListener("dragend", function () { row.classList.remove("dragging"); $$(".layer-row", v).forEach(function (r) { r.classList.remove("over"); }); });
      row.addEventListener("dragover", function (e) { e.preventDefault(); row.classList.add("over"); });
      row.addEventListener("dragleave", function () { row.classList.remove("over"); });
      row.addEventListener("drop", function (e) {
        e.preventDefault(); row.classList.remove("over");
        if (!dragId || dragId === row.dataset.id) return;
        var from = S.blocks.findIndex(function (x) { return x.id === dragId; });
        var to = S.blocks.findIndex(function (x) { return x.id === row.dataset.id; });
        if (from < 0 || to < 0) return;
        var moved = S.blocks.splice(from, 1)[0];
        S.blocks.splice(to, 0, moved);
        commit(); renderLayers();
      });
    });
  }
  window.__bxbRenderLayers = renderLayers;
  // left panel tab switch
  (function () {
    var tabs = $("#leftTabs"); if (!tabs) return;
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $$("button", tabs).forEach(function (x) { x.classList.toggle("on", x === b); });
      var lib = b.dataset.lt === "lib";
      $("#libGroups").style.display = lib ? "" : "none";
      $("#layersView").style.display = lib ? "none" : "";
      if (!lib) renderLayers();
    });
  })();

  /* ---------- i18n: translate structural labels only (never input values) ---------- */
  var BL = localStorage.getItem("bxb_lang") || "th";
  var DICT = {
    // topbar
    "เริ่มใหม่": "Restart", "Export XML": "Export XML", "บันทึกแล้ว": "Saved", "กำลังบันทึก…": "Saving…",
    // right tabs
    "คุณสมบัติ": "Properties", "SEO": "SEO", "ดีไซน์": "Design",
    // mob switch
    "องค์ประกอบ": "Elements", "หน้าเว็บ": "Page", "ปรับแต่ง": "Edit",
    // panel heads
    "องค์ประกอบ — ลากไปวางบนหน้า": "Elements — drag onto the page",
    "เลือกองค์ประกอบบนหน้าเว็บ": "Select an element on the page", "เพื่อปรับแต่งคุณสมบัติ": "to edit its properties",
    // library groups + items
    "โครงสร้างหลัก": "Layout", "เนื้อหา": "Content", "ส่วนเสริม": "Extras",
    "ส่วนหัว (Header)": "Header", "โลโก้ + เมนู": "Logo + menu",
    "Hero": "Hero", "แบนเนอร์หลัก + ปุ่ม": "Main banner + button",
    "ส่วนท้าย (Footer)": "Footer", "ลิงก์ + ลิขสิทธิ์": "Links + copyright",
    "ตารางบทความ": "Post Grid", "Post Grid": "Post Grid",
    "รายการบทความ": "Post List", "Post List": "Post List",
    "บทความเด่น": "Featured", "Featured": "Featured",
    "เกี่ยวกับ / ผู้เขียน": "About / Author", "About + E-E-A-T": "About + E-E-A-T",
    "ข้อความ": "Text", "หัวข้อ + ย่อหน้า": "Heading + paragraph",
    "Call To Action": "Call To Action", "กล่องชวนคลิก": "Promo box",
    "รูปภาพ": "Image", "Image": "Image",
    "ช่องโฆษณา": "Ad Slot", "AdSense Safe": "AdSense Safe",
    // block labels
    "เกี่ยวกับ": "About", "CTA": "CTA", "โฆษณา": "Ad",
    // field labels
    "ข้อความโลโก้": "Logo text", "เมนูนำทาง — ใส่ลิงก์ได้แต่ละอัน": "Navigation — set a link per item",
    "+ เพิ่มเมนู": "+ Add menu item", "เมนูมือถือเด้งจาก": "Mobile menu slides from",
    "◧ ซ้าย": "◧ Left", "ขวา ◨": "Right ◨", "ติดด้านบน (Sticky)": "Sticky top", "แสดงปุ่มค้นหา": "Show search",
    "หัวข้อ": "Heading", "คำโปรย": "Subtitle", "ข้อความปุ่ม": "Button text",
    "จัดวาง": "Align", "ซ้าย": "Left", "กลาง": "Center", "พื้นหลัง": "Background",
    "ไล่สี": "Gradient", "เข้ม": "Dark", "อ่อน": "Soft",
    "เกี่ยวกับ (คอลัมน์แรก)": "About (first column)", "จำนวนคอลัมน์": "Columns",
    "ข้อความลิขสิทธิ์": "Copyright text", "แสดงไอคอนโซเชียล": "Show social icons",
    "หัวข้อส่วน": "Section heading", "จำนวนบทความ": "Post count",
    "แสดงรูปภาพ": "Show image", "แสดงคำโปรย": "Show excerpt",
    "ชื่อ/ผู้เขียน": "Name / author", "ประวัติ (E-E-A-T)": "Bio (E-E-A-T)", "แสดงรูปโปรไฟล์": "Show avatar",
    "เนื้อหา": "Body", "ข้อความ ALT (SEO)": "ALT text (SEO)", "คำบรรยายใต้ภาพ": "Caption",
    "สัดส่วน": "Ratio", "ตำแหน่ง": "Position", "บน": "Top", "ข้าง": "Side",
    "ตั้งค่าพื้นหลัง": "Background",
    // SEO panel
    "คะแนน SEO": "SEO Score", "วิเคราะห์แบบเรียลไทม์ขณะออกแบบ": "Analyzed live as you design",
    "ชื่อบล็อก": "Blog title", "ป้ายกำกับ (Labels)": "Labels",
    "อนุญาตให้ทำดัชนีหน้าป้ายกำกับ": "Allow label pages to be indexed",
    "ใส่ Schema (JSON-LD) อัตโนมัติ": "Auto Schema (JSON-LD)", "Open Graph + Twitter Card": "Open Graph + Twitter Card",
    // design
    "ชุดสี": "Color palette", "ตัวอักษร": "Typography", "ความมนขอบ": "Corner radius", "สีหลัก": "Primary", "สีเน้น": "Accent",
    // onboarding
    "เริ่มต้นใช้งาน BloggerXMLBuilder": "Get started with BloggerXMLBuilder",
    "สมัครแล้ว": "I have one", "ยังไม่สมัคร": "Not yet",
    "เลือกแม่แบบเริ่มต้น": "Choose a starting template",
    "วิธีสมัคร Blogger ทีละขั้น": "How to sign up for Blogger, step by step",
    "← กลับ": "← Back", "ทั้งหมด": "All", "บล็อก": "Blog", "ธุรกิจ": "Business",
    "ข่าว/นิตยสาร": "News/Magazine", "การศึกษา": "Education", "Affiliate": "Affiliate"
  };
  function tr(s) { s = (s == null ? "" : String(s)).trim(); return (BL === "en" && DICT[s]) ? DICT[s] : s; }
  // translate a single leaf element's textContent if it fully matches the dict
  function trLeaf(elm) { var t = elm.textContent.trim(); if (DICT[t]) elm.textContent = DICT[t]; }
  // translate the leading text node of an element (keeps child <small>/<svg>)
  function trLeadText(elm) {
    var tn = [].filter.call(elm.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0];
    if (tn && DICT[tn.textContent.trim()]) tn.textContent = (elm.classList.contains("mob-btn") ? " " : "") + DICT[tn.textContent.trim()];
  }
  function translateChrome() {
    if (BL !== "en") return; // base = Thai
    // leaf structural labels
    $$(".lib-group h4, .sec-title, .p-head, label, .seg button, .tg .lbl, .p-tabs button, .gc-t, .cat-tab, .start h1, .lib-item .nm > small").forEach(trLeaf);
    // elements with leading text + child nodes
    $$(".lib-item .nm, .mob-switch button, #restartBtn, #exportBtn").forEach(trLeadText);
    // save dot
    var sd = document.querySelector("#saveDot span"); if (sd && DICT[sd.textContent.trim()]) sd.textContent = DICT[sd.textContent.trim()];
  }
  function applyBuilderLang(lang) {
    BL = lang; localStorage.setItem("bxb_lang", lang);
    document.querySelectorAll("#blLang button").forEach(function (b) { b.classList.toggle("on", b.dataset.bl === lang); });
    buildLib(); if (typeof renderProps === "function") renderProps(); renderSeo(); renderDesign();
    translateChrome();
  }
  var blEl = $("#blLang");
  if (blEl) blEl.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) applyBuilderLang(b.dataset.bl); });

  /* ---------- init ---------- */
  buildLib();
  renderStart();
  if (BL === "en") applyBuilderLang("en");
  // resume saved project?
  try {
    var saved = localStorage.getItem(KEY);
    if (saved) { S = JSON.parse(saved); if (S && S.blocks) { enterBuilder(); } }
  } catch (e) {}

  // expose minimal for debugging
  window.BXBApp = { genXML: function () { return genXML(); }, state: function () { return S; } };
})();
