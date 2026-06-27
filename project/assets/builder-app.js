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

  // DOM-based sanitizer: keeps safe inline tags only (b,i,u,s,em,strong,a,br)
  function richHTML(s) {
    if (!s) return "";
    try {
      var d = document.createElement("div");
      d.innerHTML = s;
      var bad = d.querySelectorAll("script,style,iframe,object,embed,form");
      for (var bi = 0; bi < bad.length; bi++) bad[bi].parentNode.removeChild(bad[bi]);
      var all = d.querySelectorAll("*");
      var ok = ["b","i","u","s","em","strong","a","br","span"];
      for (var ai = all.length - 1; ai >= 0; ai--) {
        var nd = all[ai], tn = nd.tagName.toLowerCase();
        if (ok.indexOf(tn) < 0) {
          var frag = document.createDocumentFragment();
          while (nd.firstChild) frag.appendChild(nd.firstChild);
          nd.parentNode.replaceChild(frag, nd);
        } else {
          for (var ci = nd.attributes.length - 1; ci >= 0; ci--) {
            var an = nd.attributes[ci].name.toLowerCase();
            if (!(tn === "a" && (an === "href" || an === "target" || an === "rel"))) nd.removeAttribute(nd.attributes[ci].name);
          }
          if (tn === "a") {
            var hr = nd.getAttribute("href") || "";
            if (/^(javascript|data):/i.test(hr)) nd.removeAttribute("href");
            nd.setAttribute("target", "_blank"); nd.setAttribute("rel", "noopener noreferrer");
          }
        }
      }
      return d.innerHTML;
    } catch (ex) { return esc(s); }
  }
  // Wrap textarea selection with an HTML tag
  function wrapSel(ta, tag) {
    var s = ta.selectionStart, e = ta.selectionEnd;
    if (s === e) return;
    var val = ta.value, sel = val.slice(s, e);
    var op = "<" + tag + ">", cl = "</" + tag + ">";
    ta.value = val.slice(0, s) + op + sel + cl + val.slice(e);
    ta.selectionStart = s + op.length;
    ta.selectionEnd = s + op.length + sel.length;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

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
    newsletter: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    history: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
    cursor: '<path d="M3 3l7 18 2.5-7.5L20 11z"/>',
    darkmode: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    aeo: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/>',
    toc: '<path d="M3 6h.01M3 12h.01M3 18h.01"/><path d="M7 6h14"/><path d="M7 12h10"/><path d="M7 18h7"/>',
    related: '<circle cx="9" cy="12" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="17" cy="18" r="2"/><line x1="11" y1="12" x2="15" y2="12"/><line x1="15" y1="7" x2="11" y2="10.5"/><line x1="15" y1="17" x2="11" y2="13.5"/>',
    progress: '<rect x="2" y="10" width="20" height="4" rx="2"/><rect x="2" y="10" width="11" height="4" rx="2" fill="currentColor" opacity=".4"/>'
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
    ["เลย์เอาต์", [
      ["sidebar", "Sidebar Layout", "เนื้อหา + ไซด์บาร์"],
      ["search", "ช่องค้นหา", "Search Box"]
    ]],
    ["ส่วนเสริม", [
      ["ad", "ช่องโฆษณา", "AdSense Safe"],
      ["newsletter", "Newsletter", "รับอีเมลสมัครสมาชิก"],
      ["share", "Social Share", "ปุ่มแชร์โซเชียล"]
    ]],
    ["บทความ & UX", [
      ["aeo", "AEO Summary Box", "สรุปสำหรับ AI / Google"],
      ["toc", "สารบัญ (TOC)", "สร้างจาก h2/h3 อัตโนมัติ"],
      ["related", "บทความที่เกี่ยวข้อง", "JSON Feed API"],
      ["progress", "Progress Bar", "แถบความคืบหน้าการอ่าน"],
      ["darkmode", "Dark Mode Toggle", "ปุ่มสลับธีมมืด/สว่าง"]
    ]]
  ];

  /* defaults per block type */
  function blockDefaults(type) {
    var d = {
      header: { logoText: "MyBlog", menuItems: [
        { id: "m1", type: "home",   label: "หน้าแรก", url: "/" },
        { id: "m2", type: "search", label: "บทความ",  url: "/search" },
        { id: "m3", type: "page",   label: "เกี่ยวกับ", pageSlug: "about",   pageCreated: true, url: "/p/about.html" },
        { id: "m4", type: "page",   label: "ติดต่อ",    pageSlug: "contact", pageCreated: true, url: "/p/contact.html" }
      ], sticky: true, showSearch: true, mobileSide: "right" },
      hero: { title: "ยินดีต้อนรับสู่บล็อกของเรา", subtitle: "แบ่งปันความรู้ บทความคุณภาพ อัปเดตใหม่ทุกสัปดาห์", btnText: "อ่านบทความล่าสุด", align: "center", bg: "gradient" },
      footer: { about: "บล็อกแบ่งปันความรู้และบทความคุณภาพ", copyright: "© 2026 MyBlog. สงวนลิขสิทธิ์",
        footerLinks: [{ label: "หน้าแรก", url: "/" }, { label: "บทความ", url: "/search" }, { label: "เกี่ยวกับ", url: "/p/about.html" }, { label: "ติดต่อ", url: "/p/contact.html" }],
        socialLinks: [] },
      postgrid: { heading: "บทความล่าสุด", columns: 3, count: 6, showImage: true, showExcerpt: true },
      postlist: { heading: "อ่านต่อ", count: 5, showImage: true },
      featured: { heading: "บทความแนะนำ", count: 1 },
      about: { name: "ทีมงาน MyBlog", bio: "เราคือทีมผู้เชี่ยวชาญที่แบ่งปันความรู้ผ่านบทความคุณภาพมากว่า 5 ปี", showAvatar: true },
      text: { heading: "หัวข้อของคุณ", body: "เขียนเนื้อหาตรงนี้ ใส่ข้อความที่ต้องการให้ผู้อ่านเห็น", align: "left" },
      cta: { title: "พร้อมเริ่มต้นแล้วหรือยัง?", btnText: "เริ่มเลย", bg: "soft" },
      image: { alt: "คำอธิบายรูปภาพ", caption: "", ratio: "16/9" },
      ad: { slot: "ใต้ส่วนหัว", label: true },
      newsletter: { heading: "รับข่าวสารก่อนใคร", sub: "กรอกอีเมลเพื่อรับบทความใหม่ทันที ฟรี ไม่มีสแปม", btnText: "สมัครเลย", bg: "soft" },
      share: { label: "แชร์บทความนี้ให้เพื่อน", facebook: true, twitter: true, line: true, copy: true },
      sidebar: { position: "right", width: "280px", showSearch: true, showCategories: true, showArchive: true, showAbout: false },
      search: { heading: "", placeholder: "ค้นหาในบล็อก…" },
      columns: { heading: "บริการของเรา", cols: 3, items: [
        { icon: "★", title: "คุณภาพสูง", text: "เนื้อหาคัดสรรอย่างพิถีพิถัน เชื่อถือได้" },
        { icon: "⚡", title: "รวดเร็ว", text: "โหลดไว ใช้งานลื่นทุกอุปกรณ์" },
        { icon: "♥", title: "ใส่ใจ", text: "ดูแลผู้อ่านทุกคนด้วยหัวใจ" }
      ] },
      darkmode: { position: "bottom-right" },
      aeo: { title: "สรุปบทความ", style: "card" },
      toc: { title: "สารบัญ", maxDepth: "3", numbered: true },
      related: { heading: "บทความที่เกี่ยวข้อง", count: 4, columns: 2, showImage: true },
      progress: { height: 3, color: "primary" }
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
    { id: "deals", cat: "Affiliate", name: "Deals & Coupon", desc: "ดีล/คูปอง โปรโมชัน", c: ["#16a34a", "#22c55e"], blocks: ["header", "featured", "postgrid", "cta", "footer"], design: { primary: "#16a34a", accent: "#22c55e", font: "sans", radius: 12 } },
    { id: "sidebar-blog", cat: "บล็อก", name: "Classic + Sidebar", desc: "2 คอลัมน์ เนื้อหา + ไซด์บาร์", c: ["#6366f1", "#8b5cf6"], blocks: ["header", "hero", "postgrid", "sidebar", "footer"], design: { primary: "#6366f1", accent: "#8b5cf6", font: "sans", radius: 10 } },
    { id: "sidebar-news", cat: "ข่าว/นิตยสาร", name: "News + Sidebar", desc: "พอร์ทัลข่าวพร้อมไซด์บาร์", c: ["#0f172a", "#475569"], blocks: ["header", "featured", "postlist", "sidebar", "footer"], design: { primary: "#0f172a", accent: "#dc2626", font: "sans", radius: 4 } }
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
             orgType: "Organization", logoUrl: "", siteUrl: "", sameAs: "", schemaSoftwareApp: false },
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
    d.classList.add("saving"); d.querySelector("span").textContent = tr("กำลังบันทึก…");
    clearTimeout(saveT);
    saveT = setTimeout(function () { d.classList.remove("saving"); d.querySelector("span").textContent = tr("บันทึกแล้ว"); }, 500);
  }
  function pushHistory() { HISTORY.push({ ts: Date.now(), snap: JSON.stringify(S.blocks) }); if (HISTORY.length > 40) HISTORY.shift(); }
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
  function footerLinksOf(p) { return Array.isArray(p.footerLinks) ? p.footerLinks : []; }
  function socialLinksOf(p) { return Array.isArray(p.socialLinks) ? p.socialLinks : []; }

  function pageNameToUrl(raw) {
    raw = (raw || "").trim();
    if (!raw || raw.charAt(0) === "/" || raw.charAt(0) === "#" || raw.indexOf("http") === 0) return raw;
    var slug = raw.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    return slug ? "/p/" + slug + ".html" : raw;
  }

  /* ---------- Smart Navigation ---------- */
  var MENU_TYPE_INFO = {
    home:     { icon: "🏠", label: "หน้าแรก",       hint: "→ /",                    autoUrl: true },
    page:     { icon: "📄", label: "หน้าเพจ",        hint: "→ /p/about.html",        autoUrl: false },
    label:    { icon: "🏷️", label: "ป้ายกำกับ",      hint: "→ /search/label/…",      autoUrl: false },
    search:   { icon: "🔍", label: "ค้นหา",          hint: "→ /search",              autoUrl: true },
    external: { icon: "🌐", label: "ลิงก์ภายนอก",    hint: "https://…",              autoUrl: false },
    custom:   { icon: "⚙️", label: "URL กำหนดเอง",   hint: "ทุกรูปแบบ",             autoUrl: false },
    dropdown: { icon: "▾",  label: "Dropdown",       hint: "มีเมนูย่อย",             autoUrl: false }
  };
  var PAGE_CHECKLIST = [
    { slug: "about",          label: "About" },
    { slug: "contact",        label: "Contact" },
    { slug: "privacy-policy", label: "Privacy Policy" },
    { slug: "terms",          label: "Terms & Conditions" },
    { slug: "disclaimer",     label: "Disclaimer" },
    { slug: "sitemap",        label: "Sitemap" }
  ];
  function menuUrlFor(item) {
    var t = item.type || "custom";
    if (t === "home")   return "/";
    if (t === "search") return "/search";
    if (t === "label") {
      var ln = (item.labelName || "").trim();
      return ln ? "/search/label/" + encodeURIComponent(ln) : "/search";
    }
    if (t === "page") {
      var raw = (item.pageSlug || item.url || "").trim();
      if (raw.indexOf("http") === 0) {
        var m = raw.match(/^https?:\/\/[^/]+(\/.*)?$/); raw = m ? (m[1] || "/") : raw;
      }
      if (/^\/p\/.+\.html$/.test(raw)) return raw;
      raw = raw.replace(/^\/p\//, "").replace(/\.html$/, "");
      var slug = raw.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
      return slug ? "/p/" + slug + ".html" : "/";
    }
    if (t === "dropdown") return item.url || "#";
    var u = (item.url || "").trim();
    if (!u) return "/";
    if (t === "custom" && u.indexOf("http") === 0) {
      var m2 = u.match(/^https?:\/\/[^/]+(\/.*)?$/); return m2 ? (m2[1] || "/") : u;
    }
    return u;
  }

  var SOCIAL_ICONS = {
    facebook:  { label: "Facebook",  color: "#1877f2", svg: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>' },
    instagram: { label: "Instagram", color: "#e1306c", svg: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>' },
    twitter:   { label: "Twitter/X", color: "#1d9bf0", svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>' },
    youtube:   { label: "YouTube",   color: "#ff0000", svg: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19.1C5.12 19.56 12 19.56 12 19.56s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 11.75a29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>' },
    tiktok:    { label: "TikTok",    color: "#010101", svg: '<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-6.08 6.26 6.27 6.27 0 0 0 6.27 6.27 6.27 6.27 0 0 0 6.26-6.27V8.69a8.2 8.2 0 0 0 4.8 1.52V6.79a4.85 4.85 0 0 1-1.94-.1z"/>' },
    line:      { label: "LINE",      color: "#06c755", svg: '<path d="M12 2C6.477 2 2 6.145 2 11.25c0 4.61 3.586 8.456 8.402 9.127.327.07.771.216.884.497.101.255.066.654.033.91l-.144.865c-.044.257-.201 1.005.88.548 1.08-.457 5.836-3.437 7.967-5.883C21.493 15.604 22 13.505 22 11.25 22 6.145 17.523 2 12 2zm-.988 7.139h-1.5V12.6h-.5V9.139H7.5v-.5H11v.5zm1.5-.5h.5V12.6h-.5V8.639zm3 4h-2V8.639h2v.5h-1.5v1.25H16v.5h-1.5V12.1H16v.539zm2.5.5h-.5V9.139h-.5v-.5H19.5v.5h-.5V12.6h-.5V9.139h-.488v-.5h1.488v.5h-.5V12.6z"/>' },
    pinterest: { label: "Pinterest", color: "#e60023", svg: '<path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.1.12.11.23.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146A12 12 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>' },
    linkedin:  { label: "LinkedIn",  color: "#0a66c2", svg: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>' },
    github:    { label: "GitHub",    color: "#333333", svg: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>' },
    telegram:  { label: "Telegram",  color: "#2ca5e0", svg: '<path d="M21.198 2.433a2.24 2.24 0 0 0-1.022.215L3.721 9.84c-1.281.585-1.224 1.362-.286 1.663l4.114 1.328 8.064-5.553c.38-.247.73-.114.443.145l-6.534 5.905-.232 4.166c.337 0 .488-.155.67-.33l1.61-1.569 3.354 2.474c.617.341 1.06.166 1.213-.573l2.196-10.35c.218-.994-.381-1.467-1.138-1.11z"/>' },
    discord:   { label: "Discord",   color: "#5865f2", svg: '<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.029.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.029.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>' }
  };

  function renderBlockInner(b) {
    var d = design(), p = b.props, r = d.radius + "px", pr = d.primary, ac = d.accent;
    switch (b.type) {
      case "header":
        var mItems = menuItemsOf(p);
        var isMob = VIEW === "mobile";
        var menu = mItems.map(function (m) {
          var t = m.type || "custom";
          var hasChildren = t === "dropdown" && Array.isArray(m.children) && m.children.length;
          if (hasChildren) {
            var subs = m.children.map(function (c) {
              return '<a style="display:block;padding:8px 14px;font-size:13px;color:#4a5063;white-space:nowrap">' + esc(c.label) + '</a>';
            }).join("");
            return '<div style="position:relative;display:inline-block">' +
              '<a style="color:#1e2333;font-weight:500;font-size:15px;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px">' + esc(m.label) + ' <span style="font-size:11px;color:#9aa">›</span></a>' +
              '<div style="position:absolute;top:100%;left:0;background:#fff;border:1px solid #eef;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.1);min-width:150px;padding:4px 0;margin-top:4px;z-index:2">' + subs + '</div>' +
              '</div>';
          }
          return '<a style="color:#1e2333;font-weight:500;font-size:15px;text-decoration:none">' + esc(m.label) + "</a>";
        }).join("");
        if (isMob) {
          var burger = '<div style="width:34px;height:34px;display:grid;place-items:center;font-size:20px;color:' + pr + '">☰</div>';
          return '<div style="padding:14px 18px;background:#fff;border-bottom:1px solid #eef"><div style="display:flex;align-items:center;gap:12px">' +
            (p.mobileSide === "left" ? burger : "") +
            '<div style="font-family:' + fontStack(d.font) + ';font-weight:700;font-size:18px;color:' + pr + ';' + (p.mobileSide === "left" ? "" : "margin-right:auto") + '">' + esc(p.logoText) + "</div>" +
            (p.mobileSide === "left" ? '<div style="margin-left:auto"></div>' : burger) +
            '</div><div style="margin-top:10px;border-top:1px dashed #e8eaf2;padding-top:8px;font-size:12px;color:#9aa;text-align:' + p.mobileSide + '">เมนูเด้งจากด้าน' + (p.mobileSide === "left" ? "ซ้าย" : "ขวา") + ' ▾</div></div>';
        }
        return '<div style="display:flex;align-items:center;gap:24px;padding:18px 32px;background:#fff;border-bottom:1px solid #eef">' +
          '<div style="font-family:' + fontStack(d.font) + ';font-weight:700;font-size:21px;color:' + pr + '">' + esc(p.logoText) + "</div>" +
          '<nav style="display:flex;gap:22px;margin:0 auto;align-items:center">' + menu + "</nav>" +
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
        var pgCols = VIEW === "mobile" ? 1 : VIEW === "tablet" ? Math.min(cols, 2) : cols;
        for (var i = 0; i < (p.count || 6); i++) cards += postCard(p.showImage, p.showExcerpt, d, ac);
        return section(p.heading, d, '<div style="display:grid;grid-template-columns:repeat(' + pgCols + ',1fr);gap:20px">' + cards + "</div>");
      case "postlist":
        var rows = "";
        for (var j = 0; j < (p.count || 5); j++) rows += postRow(p.showImage, d, ac);
        return section(p.heading, d, '<div style="display:flex;flex-direction:column;gap:16px">' + rows + "</div>");
      case "featured":
        return section(p.heading, d, '<div style="position:relative;border-radius:' + r + ';overflow:hidden;aspect-ratio:21/9;background:linear-gradient(120deg,' + pr + ',' + ac + ');display:flex;align-items:flex-end;padding:28px"><div><span style="background:#fff;color:' + pr + ';font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px">บทความเด่น</span><h3 style="color:#fff;font-size:26px;margin:12px 0 0;font-family:' + fontStack(d.font) + '">หัวข้อบทความแนะนำที่น่าสนใจที่สุด</h3></div></div>');
      case "about":
        return '<div style="padding:56px 32px;background:#f7f8fc;display:flex;gap:24px;align-items:center;max-width:820px;margin:0 auto">' +
          (p.showAvatar ? '<div style="width:84px;height:84px;border-radius:50%;background:linear-gradient(120deg,' + pr + ',' + ac + ');flex:none"></div>' : "") +
          '<div><div style="font-size:13px;color:' + pr + ';font-weight:700;text-transform:uppercase;letter-spacing:.08em">เกี่ยวกับ</div><h3 style="font-family:' + fontStack(d.font) + ';font-size:24px;margin:6px 0 8px">' + esc(p.name) + '</h3><p style="color:#4a5063;font-size:15px;line-height:1.65;margin:0">' + richHTML(p.bio) + '</p></div></div>';
      case "text":
        return '<div style="padding:40px 32px;text-align:' + p.align + ';max-width:760px;margin:0 auto"><h2 style="font-family:' + fontStack(d.font) + ';font-size:28px;margin:0 0 12px">' + esc(p.heading) + '</h2><p style="color:#4a5063;font-size:16px;line-height:1.7;margin:0">' + richHTML(p.body) + '</p></div>';
      case "columns":
        var cn = p.cols || 3, its = (p.items || []).slice(0, cn);
        var colsCols = VIEW === "mobile" ? "1fr" : "repeat(" + cn + ",1fr)";
        var cells = its.map(function (it) { return '<div style="text-align:center;padding:8px"><div style="width:54px;height:54px;border-radius:14px;background:linear-gradient(120deg,' + pr + ',' + ac + ');color:#fff;display:grid;place-items:center;font-size:24px;margin:0 auto 14px">' + esc(it.icon || "\u2605") + '</div><h3 style="font-family:' + fontStack(d.font) + ';font-size:18px;margin:0 0 7px;color:#1e2333">' + esc(it.title) + '</h3><p style="color:#828aa0;font-size:14px;line-height:1.55;margin:0">' + esc(it.text) + '</p></div>'; }).join("");
        return section(p.heading, d, '<div style="display:grid;grid-template-columns:' + colsCols + ';gap:24px">' + cells + '</div>');
      case "cta":
        var cb = p.bg === "soft" ? "#f1f2f9" : "linear-gradient(120deg," + pr + "," + ac + ")";
        var cf = p.bg === "soft" ? "#1e2333" : "#fff";
        return '<div style="margin:32px;padding:48px 32px;text-align:center;border-radius:' + r + ';background:' + cb + ';color:' + cf + '"><h2 style="font-family:' + fontStack(d.font) + ';font-size:30px;margin:0">' + esc(p.title) + '</h2><a style="display:inline-block;margin-top:20px;background:' + (p.bg === "soft" ? pr : "#fff") + ';color:' + (p.bg === "soft" ? "#fff" : pr) + ';font-weight:600;padding:13px 28px;border-radius:' + r + '">' + esc(p.btnText) + "</a></div>";
      case "image":
        return '<div style="padding:24px 32px"><div style="aspect-ratio:' + (p.ratio || "16/9") + ';background:#e8eaf2;border-radius:' + r + ';display:grid;place-items:center;color:#9aa">🖼 ' + esc(p.alt) + "</div>" + (p.caption ? '<p style="text-align:center;color:#9aa;font-size:13px;margin-top:8px">' + esc(p.caption) + "</p>" : "") + "</div>";
      case "ad":
        return '<div style="padding:16px 32px"><div style="min-height:90px;border:1px dashed #ccd;border-radius:8px;display:grid;place-items:center;color:#aab;font-size:13px;background:#fafbff">ช่องโฆษณา — ' + esc(p.slot) + (p.label ? ' <span style="margin-left:6px;font-size:11px;color:#bbc">(โฆษณา)</span>' : "") + "</div></div>";
      case "newsletter":
        var nlbg = p.bg === "gradient" ? "linear-gradient(120deg," + pr + "," + ac + ")" : p.bg === "dark" ? "#0f172a" : "linear-gradient(120deg," + pr + "0d," + ac + "1a)";
        var nlfg = p.bg === "dark" ? "#fff" : "#1e2333";
        var nlbtnbg = (p.bg === "soft" || !p.bg) ? pr : "#fff";
        var nlbtnfg = (p.bg === "soft" || !p.bg) ? "#fff" : pr;
        return '<div style="padding:52px 32px;text-align:center;background:' + nlbg + '">'
          + '<h2 style="font-family:' + fontStack(d.font) + ';font-size:26px;margin:0;color:' + nlfg + '">' + esc(p.heading) + '</h2>'
          + '<p style="font-size:15px;margin:12px auto 0;max-width:440px;color:' + (p.bg === "dark" ? "rgba(255,255,255,.75)" : "#4a5063") + '">' + esc(p.sub) + '</p>'
          + '<div style="display:flex;gap:10px;max-width:400px;margin:22px auto 0;flex-wrap:wrap;justify-content:center">'
          + '<input type="email" placeholder="อีเมลของคุณ" style="flex:1;min-width:180px;padding:12px 16px;border:1px solid ' + (p.bg === "dark" ? "rgba(255,255,255,.2)" : "#dde") + ';border-radius:' + r + ';font-size:14px;background:' + (p.bg === "dark" ? "rgba(255,255,255,.1)" : "#fff") + ';color:' + nlfg + '">'
          + '<button style="background:' + nlbtnbg + ';color:' + nlbtnfg + ';padding:12px 20px;border:0;border-radius:' + r + ';font-weight:600;font-size:14px;cursor:pointer;white-space:nowrap">' + esc(p.btnText) + '</button>'
          + '</div></div>';
      case "share":
        var shs = [
          p.facebook && { label: "Facebook", color: "#1877f2" },
          p.twitter && { label: "X (Twitter)", color: "#000" },
          p.line && { label: "LINE", color: "#06c755" },
          p.copy && { label: "คัดลอกลิงก์", color: "#6366f1" }
        ].filter(Boolean);
        return '<div style="padding:28px 32px;text-align:center">'
          + (p.label ? '<div style="font-size:13px;color:#828aa0;margin-bottom:14px">' + esc(p.label) + '</div>' : '')
          + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">'
          + shs.map(function (s) { return '<button style="padding:10px 18px;background:' + s.color + ';color:#fff;border:0;border-radius:' + r + ';font-weight:600;font-size:13px;cursor:pointer">' + s.label + '</button>'; }).join("")
          + '</div></div>';
      case "sidebar":
        var sbWid = p.width || "280px";
        var sbGridCols = p.position === "left" ? sbWid + " 1fr" : "1fr " + sbWid;
        var sbMain = '<div style="display:flex;flex-direction:column;gap:10px">'
          + [0,1,2].map(function() { return '<div style="border:1px solid #eef;border-radius:' + r + ';padding:14px;background:#fff"><div style="height:8px;width:72%;background:#e8eaf2;border-radius:3px;margin-bottom:8px"></div><div style="height:6px;width:90%;background:#f1f2f9;border-radius:3px;margin-bottom:5px"></div><div style="height:6px;width:55%;background:#f1f2f9;border-radius:3px"></div></div>'; }).join("")
          + '</div>';
        var sbAside = '<div style="display:flex;flex-direction:column;gap:10px">'
          + (p.showSearch ? '<div style="border:1px solid #e8eaf2;padding:10px 12px;border-radius:' + r + ';background:#f7f8fc;font-size:12.5px;color:#aab;display:flex;gap:8px;align-items:center">' + svg(IC.search, 2) + ' ค้นหา…</div>' : '')
          + (p.showCategories ? '<div style="border:1px solid #e8eaf2;padding:12px;border-radius:' + r + ';background:#f7f8fc"><div style="font-size:11px;font-weight:700;color:#1e2333;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">ป้ายกำกับ</div><div style="display:flex;flex-wrap:wrap;gap:5px">' + ["SEO","บทความ","แนะนำ"].map(function(l){return '<span style="background:' + pr + '22;color:' + pr + ';font-size:11px;padding:2px 9px;border-radius:20px">' + l + '</span>';}).join("") + '</div></div>' : '')
          + (p.showArchive ? '<div style="border:1px solid #e8eaf2;padding:12px;border-radius:' + r + ';background:#f7f8fc"><div style="font-size:11px;font-weight:700;color:#1e2333;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">คลังบทความ</div><div style="font-size:12.5px;color:#828aa0;display:flex;flex-direction:column;gap:5px"><span>มกราคม 2026 (12)</span><span>ธันวาคม 2025 (8)</span><span>พฤศจิกายน 2025 (5)</span></div></div>' : '')
          + (p.showAbout ? '<div style="border:1px solid #e8eaf2;padding:12px;border-radius:' + r + ';background:#f7f8fc;display:flex;gap:10px;align-items:center"><div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(120deg,' + pr + ',' + ac + ');flex:none"></div><div style="font-size:12.5px;color:#4a5063">เกี่ยวกับผู้เขียน</div></div>' : '')
          + '</div>';
        return '<div style="padding:20px 32px;background:#f7f8fc"><div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#aab;margin-bottom:12px;display:flex;align-items:center;gap:8px">' + svg(IC.sidebar, 1.5) + ' Sidebar Layout — ' + (p.position === "left" ? "ไซด์บาร์ซ้าย" : "ไซด์บาร์ขวา") + '</div>'
          + '<div style="display:grid;grid-template-columns:' + sbGridCols + ';gap:16px">'
          + (p.position === "left" ? sbAside + sbMain : sbMain + sbAside)
          + '</div></div>';
      case "search":
        return '<div style="padding:16px 32px">'
          + (p.heading ? '<h3 style="font-family:' + fontStack(d.font) + ';font-size:16px;color:#1e2333;margin-bottom:10px">' + esc(p.heading) + '</h3>' : '')
          + '<div style="display:flex;gap:0;max-width:420px"><input type="text" placeholder="' + esc(p.placeholder || "ค้นหาในบล็อก…") + '" style="flex:1;padding:12px 16px;border:1px solid #dde;border-radius:' + r + ' 0 0 ' + r + ';font-size:14px;color:#1e2333;background:#fff;outline:none"><button style="padding:12px 16px;background:' + pr + ';color:#fff;border:0;border-radius:0 ' + r + ' ' + r + ' 0;cursor:pointer;font-size:15px">🔍</button></div></div>';
      case "darkmode":
        var dmPos = p.position || "bottom-right";
        var dmPosStyle = (dmPos.indexOf("bottom") >= 0 ? "bottom:12px" : "top:12px") + ";" + (dmPos.indexOf("right") >= 0 ? "right:12px" : "left:12px");
        return '<div style="position:relative;padding:28px 32px;background:#f7f8fc;min-height:80px;display:flex;align-items:center;justify-content:center"><div style="text-align:center;color:#aab;font-size:13px"><b style="color:#828aa0">Dark Mode Toggle</b><br><small>ปุ่มลอยตัว — ติดขอบจอทุกหน้า</small></div>'
          + '<div style="position:absolute;' + dmPosStyle + ';width:40px;height:40px;border-radius:50%;background:' + pr + ';color:#fff;display:grid;place-items:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.2)">🌙</div></div>';
      case "aeo":
        var aeoSt = p.style === "highlight"
          ? "border-left:4px solid " + pr + ";background:" + pr + "0d;padding:16px 20px;border-radius:0 " + r + " " + r + " 0"
          : p.style === "minimal" ? "border-top:2px solid " + pr + ";border-bottom:1px solid #eef;padding:12px 0"
          : "border:1px solid " + pr + "33;background:" + pr + "08;padding:16px 20px;border-radius:" + r;
        return '<div style="padding:16px 32px"><aside style="' + aeoSt + '">'
          + '<div style="font-size:11px;font-weight:700;color:' + pr + ';text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px">&#128214; ' + esc(p.title || "สรุปบทความ") + '</div>'
          + '<p style="font-size:13.5px;color:#4a5063;margin:0;line-height:1.65">สรุปเนื้อหาบทความอัตโนมัติจาก snippet — เพิ่มโอกาสให้ Google และ AI ดึงข้อมูลนี้แสดงในผลการค้นหา</p>'
          + '</aside></div>';
      case "toc":
        return '<div style="padding:16px 32px"><nav style="padding:14px 16px;background:#f7f8fc;border-radius:' + r + ';border:1px solid #eef">'
          + '<div style="font-size:11px;font-weight:700;color:' + pr + ';text-transform:uppercase;letter-spacing:.07em;margin-bottom:9px">&#128209; ' + esc(p.title || "สารบัญ") + '</div>'
          + '<ol style="padding-left:18px;margin:0;font-size:13px;color:#4a5063;line-height:1.9">'
          + '<li>หัวข้อที่ 1 (h2)</li>'
          + '<li>หัวข้อที่ 2<ol style="padding-left:14px;margin:0"><li style="font-size:12px">หัวข้อย่อย (h3)</li></ol></li>'
          + '<li>หัวข้อที่ 3</li>'
          + '</ol></nav></div>';
      case "related":
        var rCols = p.columns || 2, rCards = "";
        for (var ri = 0; ri < Math.min(p.count || 4, rCols * 2); ri++) rCards += postCard(p.showImage, false, d, ac);
        return section(p.heading || "บทความที่เกี่ยวข้อง", d, '<div style="display:grid;grid-template-columns:repeat(' + rCols + ',1fr);gap:16px">' + rCards + '</div>');
      case "progress":
        var pClrPrev = p.color === "accent" ? ac : p.color === "gradient" ? "linear-gradient(90deg," + pr + "," + ac + ")" : pr;
        return '<div style="padding:20px 32px"><div style="background:#f7f8fc;border-radius:' + r + ';padding:16px">'
          + '<div style="width:100%;height:' + (p.height || 3) + 'px;background:#e8eaf2;border-radius:9px;overflow:hidden;margin-bottom:10px">'
          + '<div style="width:55%;height:100%;background:' + pClrPrev + ';border-radius:9px"></div></div>'
          + '<div style="font-size:12px;color:#aab;text-align:center">Reading Progress Bar — ติดด้านบนทุกหน้า</div>'
          + '</div></div>';
      case "footer":
        var fLinks = footerLinksOf(p);
        var fSocials = socialLinksOf(p);
        var fLinksCols = VIEW === "mobile" ? 1 : (fLinks.length > 4 ? 2 : 1);
        var fLinksHtml = fLinks.map(function (m) {
          return '<a style="display:block;color:rgba(255,255,255,.7);font-size:13.5px;text-decoration:none;padding:3px 0;transition:color .2s">' + esc(m.label) + '</a>';
        }).join("");
        var fSocialHtml = fSocials.map(function (s) {
          var ic = SOCIAL_ICONS[s.platform];
          if (!ic) return "";
          return '<div title="' + ic.label + '" style="width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.1);display:grid;place-items:center;flex-shrink:0">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#fff">' + ic.svg + '</svg></div>';
        }).join("");
        var fGridStyle = VIEW === "mobile"
          ? "display:flex;flex-direction:column;gap:24px"
          : "display:grid;grid-template-columns:1.5fr 1fr;gap:40px;align-items:start";
        return '<div style="background:#0f172a;color:#fff;padding:48px 32px 24px">' +
          '<div style="' + fGridStyle + ';max-width:980px;margin:0 auto">' +
          '<div>' +
            '<div style="font-family:' + fontStack(d.font) + ';font-weight:700;font-size:20px;color:#fff;margin-bottom:12px">' + esc(S.seo.blogTitle || "MyBlog") + '</div>' +
            '<p style="color:rgba(255,255,255,.6);font-size:13.5px;line-height:1.65;margin:0 0 18px;max-width:320px">' + esc(p.about) + '</p>' +
            (fSocials.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + fSocialHtml + '</div>' : '') +
          '</div>' +
          (fLinks.length ? '<div style="display:grid;grid-template-columns:repeat(' + fLinksCols + ',1fr);gap:6px 24px;padding-top:4px">' + fLinksHtml + '</div>' : '') +
          '</div>' +
          '<div style="text-align:center;color:rgba(255,255,255,.35);font-size:12px;margin-top:36px;padding-top:18px;border-top:1px solid rgba(255,255,255,.1);max-width:980px;margin-left:auto;margin-right:auto">' + esc(p.copyright) + '</div>' +
          '</div>';
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
      var up = el("button", { title: "ขึ้น" }, "↑"), dn = el("button", { title: "ลง" }, "↓"), dup = el("button", { title: "ทำซ้ำ" }, "⧉"), del = el("button", { title: "ลบ" }, "✕");
      up.onclick = function (e) { e.stopPropagation(); move(b.id, -1); };
      dn.onclick = function (e) { e.stopPropagation(); move(b.id, 1); };
      dup.onclick = function (e) { e.stopPropagation(); duplicate(b.id); };
      del.onclick = function (e) { e.stopPropagation(); removeBlock(b.id); };
      tag.appendChild(up); tag.appendChild(dn); tag.appendChild(dup); tag.appendChild(del);
      w.appendChild(tag);
      w.appendChild(el("div", { class: "blk-insp" }, blkLabel(b.type)));
      var body = el("div"); body.innerHTML = renderBlockInner(b); w.appendChild(body);
      w.onclick = function (e) { e.stopPropagation(); select(b.id); };
      f.appendChild(w);
      f.appendChild(dz(i + 1));
    });
  }
  function dz(idx) { var d = el("div", { class: "dropzone", "data-idx": idx }); return d; }
  function blkLabel(t) {
    var m = { header: "ส่วนหัว", hero: "Hero", footer: "ส่วนท้าย", postgrid: "ตารางบทความ", postlist: "รายการบทความ", featured: "บทความเด่น", about: "เกี่ยวกับ", text: "ข้อความ", cta: "CTA", image: "รูปภาพ", ad: "โฆษณา", newsletter: "Newsletter", share: "Social Share", columns: "คอลัมน์", sidebar: "Sidebar", search: "ค้นหา", darkmode: "Dark Mode Toggle", aeo: "AEO Summary Box", toc: "สารบัญ (TOC)", related: "บทความที่เกี่ยวข้อง", progress: "Progress Bar" };
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
  function duplicate(id) {
    var i = S.blocks.findIndex(function (b) { return b.id === id; });
    if (i < 0) return;
    var clone = JSON.parse(JSON.stringify(S.blocks[i]));
    clone.id = uid();
    S.blocks.splice(i + 1, 0, clone);
    SEL = clone.id;
    commit(); renderProps();
    toast("ทำซ้ำ " + blkLabel(clone.type) + " แล้ว");
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
  function createDragGhost(type) {
    var g = $("#dragGhost"); if (!g) return;
    var iconEl = $("#dragGhostIcon"); if (iconEl) iconEl.innerHTML = svg(IC[type] || IC.text);
    var lblEl = $("#dragGhostLabel"); if (lblEl) lblEl.textContent = blkLabel(type);
    g.classList.add("show");
  }
  function moveDragGhost(e) {
    var g = $("#dragGhost"); if (!g || !g.classList.contains("show")) return;
    g.style.left = (e.clientX + 16) + "px";
    g.style.top = (e.clientY - 18) + "px";
  }
  function removeDragGhost() {
    var g = $("#dragGhost"); if (g) g.classList.remove("show");
  }
  document.addEventListener("dragover", moveDragGhost);

  function setupLibDrag() {
    $$(".lib-item").forEach(function (it) {
      it.draggable = true;
      it.addEventListener("dragstart", function (e) { dragType = it.dataset.type; dragSort = null; it.classList.add("dragging"); e.dataTransfer.effectAllowed = "copy"; createDragGhost(dragType); });
      it.addEventListener("dragend", function () { it.classList.remove("dragging"); clearDz(); removeDragGhost(); });
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
  function area(key, label, val, rich) { return '<div class="field"><label>' + label + (rich ? ' <span style="font-size:10px;font-weight:400;color:var(--brand-2);opacity:.8">B I U 🔗</span>' : '') + '</label><textarea class="ta" data-k="' + key + '"' + (rich ? ' data-rich="1"' : '') + '>' + esc(val) + "</textarea></div>"; }
  function seg(key, label, val, opts) { return '<div class="field"><label>' + label + '</label><div class="seg" data-seg="' + key + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === val ? ' class="on"' : "") + ">" + o[1] + "</button>"; }).join("") + "</div></div>"; }
  function tog(key, label, val, sub) { return '<label class="tg"><span class="lbl">' + label + (sub ? "<small>" + sub + "</small>" : "") + '</span><input type="checkbox" data-k="' + key + '"' + (val ? " checked" : "") + '><span class="sw-tg"></span></label>'; }
  function num(key, label, val, mn, mx) { return '<div class="field"><label>' + label + ' — ' + val + '</label><input class="inp" type="range" min="' + mn + '" max="' + mx + '" value="' + val + '" data-k="' + key + '" data-num="1"></div>'; }
  function menuEditor(p) {
    var items = menuItemsOf(p);
    // linked URL set for checklist
    var linked = {};
    items.forEach(function (it) { linked[menuUrlFor(it)] = true; });
    // type select options HTML
    var typeOpts = Object.keys(MENU_TYPE_INFO).map(function (k) {
      var ti = MENU_TYPE_INFO[k];
      return '<option value="' + k + '">' + ti.icon + " " + ti.label + "</option>";
    }).join("");
    var rows = items.map(function (m, i) {
      var t = m.type || "custom";
      var computedUrl = menuUrlFor(m);
      var typeSelHtml = '<select class="inp menu-type-sel" data-mt="' + i + '">' +
        Object.keys(MENU_TYPE_INFO).map(function (k) {
          return '<option value="' + k + '"' + (t === k ? " selected" : "") + ">" + MENU_TYPE_INFO[k].icon + " " + MENU_TYPE_INFO[k].label + "</option>";
        }).join("") + "</select>";
      // secondary area
      var sec = "";
      if (t === "home" || t === "search") {
        sec = '<div class="url-chip auto">⚡ ' + computedUrl + "</div>";
      } else if (t === "page") {
        sec = '<input class="inp" data-mpslug="' + i + '" value="' + esc(m.pageSlug || "") + '" placeholder="ชื่อหน้า เช่น about, contact">' +
          '<div class="url-chip' + (m.pageSlug ? "" : " empty") + '">' + (m.pageSlug ? computedUrl : "กรอกชื่อหน้าก่อน") + "</div>" +
          '<div class="menu-page-status">' +
          '<label class="tg-mini"><input type="checkbox" data-mpc="' + i + '"' + (m.pageCreated ? " checked" : "") + '><span class="tg-lbl">สร้างหน้าเพจใน Blogger แล้ว</span></label>' +
          (!m.pageCreated ? ' <a href="/docs/create-page" target="_blank" class="help-link-sm">📖 วิธีสร้างหน้าเพจ</a>' : "") +
          "</div>";
      } else if (t === "label") {
        sec = '<input class="inp" data-mlname="' + i + '" value="' + esc(m.labelName || "") + '" placeholder="ชื่อป้ายกำกับ เช่น ข่าวสาร, รีวิว">' +
          '<div class="url-chip' + (m.labelName ? "" : " empty") + '">' + (m.labelName ? computedUrl : "กรอกชื่อป้ายกำกับก่อน") + "</div>";
      } else if (t === "dropdown") {
        var children = Array.isArray(m.children) ? m.children : [];
        var childRows = children.map(function (c, ci) {
          return '<div class="menu-child-row">' +
            '<span class="child-indent">↳</span>' +
            '<input class="inp" data-mclbl="' + i + "_" + ci + '" value="' + esc(c.label || "") + '" placeholder="ชื่อเมนูย่อย">' +
            '<input class="inp" data-mcurl="' + i + "_" + ci + '" value="' + esc(c.url || "") + '" placeholder="URL หรือชื่อหน้า">' +
            '<button class="menu-del menu-cdel" data-mcdel="' + i + "_" + ci + '">✕</button>' +
          "</div>";
        }).join("");
        sec = '<div class="menu-children">' + childRows +
          '<button class="menu-add-child" data-mcadd="' + i + '">+ เพิ่มเมนูย่อย</button></div>';
      } else {
        sec = '<input class="inp menu-url" data-mu="' + i + '" value="' + esc(m.url || "") + '" placeholder="' +
          (t === "external" ? "https://www.example.com" : "/p/about.html") + '">' +
          (t === "custom" ? '<div class="hint" style="margin:0">รองรับ <code>/p/…</code>, <code>/search/label/…</code>, <code>#id</code></div>' : "");
      }
      return '<div class="menu-row" data-mi="' + i + '">' +
        '<div class="menu-row-top">' +
        '<span class="menu-grip">⋮⋮</span>' + typeSelHtml +
        '<input class="inp menu-label" data-ml="' + i + '" value="' + esc(m.label) + '" placeholder="ชื่อเมนู">' +
        '<button class="menu-del" data-mdel="' + i + '" title="ลบ">✕</button>' +
        "</div>" +
        '<div class="menu-secondary">' + sec + "</div>" +
      "</div>";
    }).join("");
    // type picker (shown when adding new item)
    var pickerBtns = Object.keys(MENU_TYPE_INFO).map(function (k) {
      var ti = MENU_TYPE_INFO[k];
      return '<button class="mtp-btn" data-mt-pick="' + k + '"><span class="mtp-ico">' + ti.icon + "</span><span>" + ti.label + "</span></button>";
    }).join("");
    // page checklist
    var clHtml = PAGE_CHECKLIST.map(function (pc) {
      var url = "/p/" + pc.slug + ".html";
      return '<label class="cl-item"><input type="checkbox" disabled' + (linked[url] ? " checked" : "") + '><span>' + pc.label + ' <small>' + url + "</small></span></label>";
    }).join("");
    return '<div class="field"><label>เมนูนำทาง</label>' +
      '<div class="menu-list">' + rows + "</div>" +
      '<div class="menu-type-picker" id="mt-picker" style="display:none">' +
        '<div class="mtp-grid">' + pickerBtns + "</div>" +
        '<button class="menu-cancel-pick" id="mt-cancel">ยกเลิก</button>' +
      "</div>" +
      '<button class="menu-add" data-madd="1">+ เพิ่มเมนู</button>' +
      "</div>" +
      '<div class="field"><label>✅ หน้าเพจที่ควรสร้างก่อน</label>' +
      '<div class="page-checklist">' + clHtml + "</div>" +
      '<div class="hint">สร้างหน้าเหล่านี้ใน Blogger → หน้าเพจ แล้วนำ URL มาเชื่อมกับเมนูประเภท "หน้าเพจ"</div>' +
      "</div>";
  }

  function footerEditor(p) {
    var fItems = footerLinksOf(p);
    var sItems = socialLinksOf(p);
    var PLATFORMS = Object.keys(SOCIAL_ICONS);
    var linkRows = fItems.map(function (m, i) {
      return '<div class="menu-row"><div class="menu-row-top">' +
        '<span class="menu-grip">⋮⋮</span>' +
        '<input class="inp menu-label" data-fll="' + i + '" value="' + esc(m.label) + '" placeholder="ชื่อลิงก์">' +
        '<button class="menu-del" data-fldel="' + i + '" title="ลบ">✕</button>' +
        '</div>' +
        '<input class="inp menu-url" data-flu="' + i + '" value="' + esc(m.url) + '" placeholder="about">' +
        '</div>';
    }).join("");
    var socialRows = sItems.map(function (s, i) {
      var opts = PLATFORMS.map(function (k) {
        return '<option value="' + k + '"' + (s.platform === k ? " selected" : "") + ">" + SOCIAL_ICONS[k].label + "</option>";
      }).join("");
      return '<div class="menu-row"><div class="menu-row-top" style="gap:6px">' +
        '<select class="inp" data-si="' + i + '" style="flex:0 0 auto;width:120px;padding:6px 4px;font-size:12px">' + opts + '</select>' +
        '<input class="inp" data-su="' + i + '" value="' + esc(s.url) + '" placeholder="https://..." style="flex:1">' +
        '<button class="menu-del" data-sdel="' + i + '" title="ลบ">✕</button>' +
        '</div></div>';
    }).join("");
    return '<div class="field"><label>ลิงก์ใน Footer</label>' +
      '<div class="menu-list">' + linkRows + '</div>' +
      '<button class="menu-add" data-fladd="1">+ เพิ่มลิงก์</button>' +
      '<div class="hint">พิมพ์ชื่อหน้าเพจ เช่น <code>contact</code> → ระบบเปลี่ยนเป็น <code>/p/contact.html</code> อัตโนมัติ</div></div>' +
      '<div class="field"><label>โซเชียลมีเดีย</label>' +
      '<div class="menu-list">' + socialRows + '</div>' +
      '<button class="menu-add" data-sadd="1">+ เพิ่ม Social</button></div>';
  }

  function fieldsFor(b) {
    var p = b.props;
    switch (b.type) {
      case "header": return txt("logoText", "ข้อความโลโก้", p.logoText) + menuEditor(p) + seg("mobileSide", "เมนูมือถือเด้งจาก", p.mobileSide || "right", [["left", "◧ ซ้าย"], ["right", "ขวา ◨"]]) + tog("sticky", "ติดด้านบน (Sticky)", p.sticky) + tog("showSearch", "แสดงปุ่มค้นหา", p.showSearch);
      case "hero": return txt("title", "หัวข้อ", p.title) + area("subtitle", "คำโปรย", p.subtitle) + txt("btnText", "ข้อความปุ่ม", p.btnText) + seg("align", "จัดวาง", p.align, [["left", "ซ้าย"], ["center", "กลาง"]]) + seg("bg", "พื้นหลัง", p.bg, [["gradient", "ไล่สี"], ["dark", "เข้ม"], ["soft", "อ่อน"]]);
      case "footer": return area("about", "เกี่ยวกับ (คำอธิบายสั้น)", p.about) + footerEditor(p) + txt("copyright", "ข้อความลิขสิทธิ์", p.copyright);
      case "postgrid": return txt("heading", "หัวข้อส่วน", p.heading) + num("columns", "จำนวนคอลัมน์", p.columns, 2, 4) + num("count", "จำนวนบทความ", p.count, 2, 12) + tog("showImage", "แสดงรูปภาพ", p.showImage) + tog("showExcerpt", "แสดงคำโปรย", p.showExcerpt);
      case "postlist": return txt("heading", "หัวข้อส่วน", p.heading) + num("count", "จำนวนบทความ", p.count, 2, 10) + tog("showImage", "แสดงรูปภาพ", p.showImage);
      case "featured": return txt("heading", "หัวข้อส่วน", p.heading);
      case "about": return txt("name", "ชื่อ/ผู้เขียน", p.name) + area("bio", "ประวัติ (E-E-A-T)", p.bio, true) + tog("showAvatar", "แสดงรูปโปรไฟล์", p.showAvatar);
      case "text": return txt("heading", "หัวข้อ", p.heading) + area("body", "เนื้อหา", p.body, true) + seg("align", "จัดวาง", p.align, [["left", "ซ้าย"], ["center", "กลาง"]]);
      case "columns": return columnsFields(b, p);
      case "cta": return txt("title", "หัวข้อ", p.title) + txt("btnText", "ข้อความปุ่ม", p.btnText) + seg("bg", "พื้นหลัง", p.bg, [["gradient", "ไล่สี"], ["soft", "อ่อน"]]);
      case "image": return txt("alt", "ข้อความ ALT (SEO)", p.alt, "สำคัญต่อ SEO และการเข้าถึง") + txt("caption", "คำบรรยายใต้ภาพ", p.caption) + seg("ratio", "สัดส่วน", p.ratio, [["16/9", "16:9"], ["4/3", "4:3"], ["1/1", "1:1"]]);
      case "ad": return seg("slot", "ตำแหน่ง", p.slot, [["ใต้ส่วนหัว", "บน"], ["ในบทความ", "กลาง"], ["ไซด์บาร์", "ข้าง"]]) + tog("label", 'แสดงป้าย "โฆษณา"', p.label, "แนะนำตามนโยบาย AdSense");
      case "newsletter": return txt("heading", "หัวข้อ", p.heading) + area("sub", "คำโปรย", p.sub) + txt("btnText", "ข้อความปุ่ม", p.btnText) + seg("bg", "พื้นหลัง", p.bg || "soft", [["soft", "อ่อน"], ["gradient", "ไล่สี"], ["dark", "เข้ม"]]);
      case "share": return txt("label", "ข้อความนำ", p.label) + tog("facebook", "Facebook", p.facebook) + tog("twitter", "X (Twitter)", p.twitter) + tog("line", "LINE", p.line) + tog("copy", "คัดลอกลิงก์", p.copy);
      case "sidebar": return seg("position", "ตำแหน่ง Sidebar", p.position || "right", [["right", "ขวา ◨"], ["left", "◧ ซ้าย"]]) + txt("width", "ความกว้าง Sidebar", p.width || "280px") + tog("showSearch", "ช่องค้นหา", p.showSearch) + tog("showCategories", "ป้ายกำกับ / หมวดหมู่", p.showCategories) + tog("showArchive", "คลังบทความ", p.showArchive) + tog("showAbout", "เกี่ยวกับผู้เขียน", p.showAbout) + '<div class="note info">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 2) + '<div>ใส่ Sidebar ไว้ใกล้กลุ่มบทความ (postgrid/postlist/featured) — ระบบจะวาง Sidebar ข้างเนื้อหาหลักอัตโนมัติตอน Export XML</div></div>';
      case "search": return txt("heading", "หัวข้อ (เว้นว่าง = ซ่อน)", p.heading || "") + txt("placeholder", "Placeholder", p.placeholder || "ค้นหาในบล็อก…");
      case "darkmode": return seg("position", "ตำแหน่งปุ่ม", p.position || "bottom-right", [["bottom-right", "ขวาล่าง"], ["bottom-left", "ซ้ายล่าง"], ["top-right", "ขวาบน"], ["top-left", "ซ้ายบน"]])
        + '<div class="note info">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 2) + '<div>ปุ่ม Dark Mode จดจำการตั้งค่าใน localStorage และรองรับ <code>prefers-color-scheme</code> อัตโนมัติ</div></div>';
      case "aeo": return txt("title", "หัวข้อกล่องสรุป", p.title || "สรุปบทความ")
        + seg("style", "สไตล์", p.style || "card", [["card", "การ์ด"], ["highlight", "ไฮไลท์"], ["minimal", "เรียบ"]])
        + '<div class="note ok">' + svg('<path d="M20 6L9 17l-5-5"/>', 2.5) + '<div>ใช้ <code>.qt-aeo-summary</code> ซึ่งเชื่อมกับ SpeakableSpecification ใน Schema — ช่วยให้ Google Assistant และ AI อ่านสรุปบทความได้</div></div>';
      case "toc": return txt("title", "หัวข้อสารบัญ", p.title || "สารบัญ")
        + seg("maxDepth", "ความลึก heading", p.maxDepth || "3", [["2", "h2 เท่านั้น"], ["3", "h2 + h3"]])
        + tog("numbered", "แสดงลำดับตัวเลข", p.numbered !== false);
      case "related": return txt("heading", "หัวข้อส่วน", p.heading || "บทความที่เกี่ยวข้อง")
        + num("count", "จำนวนบทความ", p.count || 4, 2, 6)
        + num("columns", "จำนวนคอลัมน์", p.columns || 2, 1, 3)
        + tog("showImage", "แสดงรูปภาพ", p.showImage !== false)
        + '<div class="note info">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 2) + '<div>ดึงบทความผ่าน Blogger JSON Feed API ตามป้ายกำกับแรกของโพสต์ — ทำงานบนหน้าบทความเท่านั้น</div></div>';
      case "progress": return seg("color", "สีแถบ", p.color || "primary", [["primary", "สีหลัก"], ["accent", "สีเน้น"], ["gradient", "ไล่สี"]])
        + num("height", "ความสูง (px)", p.height || 3, 2, 6);
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
    // type change → recompute URL + re-render props
    $$("[data-mt]", c).forEach(function (sel) {
      sel.addEventListener("change", function () {
        var arr = menuItemsOf(b.props); var i = +sel.dataset.mt;
        arr[i].type = sel.value; arr[i].url = menuUrlFor(arr[i]);
        b.props.menuItems = arr; commit(); renderProps();
      });
    });
    // page slug
    $$("[data-mpslug]", c).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var arr = menuItemsOf(b.props); var i = +inp.dataset.mpslug;
        arr[i].pageSlug = inp.value; arr[i].url = menuUrlFor(arr[i]);
        b.props.menuItems = arr; renderCanvas(); save();
        var chip = inp.nextElementSibling;
        if (chip && chip.classList.contains("url-chip")) {
          chip.textContent = inp.value ? arr[i].url : "กรอกชื่อหน้าก่อน";
          chip.classList.toggle("empty", !inp.value);
        }
      });
    });
    // page created checkbox
    $$("[data-mpc]", c).forEach(function (cb) {
      cb.addEventListener("change", function () {
        var arr = menuItemsOf(b.props); arr[+cb.dataset.mpc].pageCreated = cb.checked;
        b.props.menuItems = arr; commit(); renderProps();
      });
    });
    // label name
    $$("[data-mlname]", c).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var arr = menuItemsOf(b.props); var i = +inp.dataset.mlname;
        arr[i].labelName = inp.value; arr[i].url = menuUrlFor(arr[i]);
        b.props.menuItems = arr; renderCanvas(); save();
        var chip = inp.nextElementSibling;
        if (chip && chip.classList.contains("url-chip")) {
          chip.textContent = inp.value ? arr[i].url : "กรอกชื่อป้ายกำกับก่อน";
          chip.classList.toggle("empty", !inp.value);
        }
      });
    });
    // external/custom URL
    $$("[data-mu]", c).forEach(function (inp) {
      inp.addEventListener("input", function () { var arr = menuItemsOf(b.props); arr[+inp.dataset.mu].url = inp.value; b.props.menuItems = arr; renderCanvas(); save(); });
      inp.addEventListener("blur", function () { var v = pageNameToUrl(inp.value); if (v !== inp.value) { inp.value = v; var arr = menuItemsOf(b.props); arr[+inp.dataset.mu].url = v; b.props.menuItems = arr; save(); } });
    });
    // delete menu item
    $$("[data-mdel]", c).forEach(function (btn) { btn.addEventListener("click", function () { var arr = menuItemsOf(b.props); arr.splice(+btn.dataset.mdel, 1); b.props.menuItems = arr; commit(); renderProps(); }); });
    // dropdown children
    $$("[data-mclbl]", c).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var parts = inp.dataset.mclbl.split("_"); var pi = +parts[0]; var ci = +parts[1];
        var arr = menuItemsOf(b.props);
        if (!arr[pi].children) arr[pi].children = [];
        arr[pi].children[ci].label = inp.value; b.props.menuItems = arr; renderCanvas(); save();
      });
    });
    $$("[data-mcurl]", c).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var parts = inp.dataset.mcurl.split("_"); var pi = +parts[0]; var ci = +parts[1];
        var arr = menuItemsOf(b.props);
        arr[pi].children[ci].url = inp.value; b.props.menuItems = arr; renderCanvas(); save();
      });
      inp.addEventListener("blur", function () {
        var v = pageNameToUrl(inp.value); if (v !== inp.value) { inp.value = v; }
      });
    });
    $$("[data-mcdel]", c).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var parts = btn.dataset.mcdel.split("_"); var pi = +parts[0]; var ci = +parts[1];
        var arr = menuItemsOf(b.props); arr[pi].children.splice(ci, 1);
        b.props.menuItems = arr; commit(); renderProps();
      });
    });
    $$("[data-mcadd]", c).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var arr = menuItemsOf(b.props); var pi = +btn.dataset.mcadd;
        if (!arr[pi].children) arr[pi].children = [];
        arr[pi].children.push({ label: "เมนูย่อย", url: "/" });
        b.props.menuItems = arr; commit(); renderProps();
      });
    });
    // type picker
    var madd = c.querySelector("[data-madd]");
    var picker = c.querySelector("#mt-picker");
    var mtCancel = c.querySelector("#mt-cancel");
    if (madd && picker) {
      madd.addEventListener("click", function () { picker.style.display = "block"; madd.style.display = "none"; });
      if (mtCancel) mtCancel.addEventListener("click", function () { picker.style.display = "none"; madd.style.display = ""; });
      $$("[data-mt-pick]", picker).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var t = btn.dataset.mtPick;
          var arr = menuItemsOf(b.props);
          var defaults = { id: uid(), type: t, label: MENU_TYPE_INFO[t].label, children: [] };
          if (t === "home")   { defaults.label = "หน้าแรก"; defaults.url = "/"; }
          if (t === "search") { defaults.label = "ค้นหา";    defaults.url = "/search"; }
          arr.push(defaults);
          b.props.menuItems = arr;
          picker.style.display = "none"; madd.style.display = "";
          commit(); renderProps();
        });
      });
    }
    // footer link bindings
    $$("[data-fll]", c).forEach(function (inp) { inp.addEventListener("input", function () { var arr = footerLinksOf(b.props); arr[+inp.dataset.fll].label = inp.value; b.props.footerLinks = arr; renderCanvas(); save(); }); });
    $$("[data-flu]", c).forEach(function (inp) {
      inp.addEventListener("input", function () { var arr = footerLinksOf(b.props); arr[+inp.dataset.flu].url = inp.value; b.props.footerLinks = arr; renderCanvas(); save(); });
      inp.addEventListener("blur", function () { var v = pageNameToUrl(inp.value); if (v !== inp.value) { inp.value = v; var arr = footerLinksOf(b.props); arr[+inp.dataset.flu].url = v; b.props.footerLinks = arr; save(); } });
    });
    $$("[data-fldel]", c).forEach(function (btn) { btn.addEventListener("click", function () { var arr = footerLinksOf(b.props); arr.splice(+btn.dataset.fldel, 1); b.props.footerLinks = arr; commit(); renderProps(); }); });
    var fladd = c.querySelector("[data-fladd]"); if (fladd) fladd.addEventListener("click", function () { var arr = footerLinksOf(b.props); arr.push({ label: "ลิงก์ใหม่", url: "/" }); b.props.footerLinks = arr; commit(); renderProps(); });
    // social link bindings
    $$("[data-si]", c).forEach(function (sel) { sel.addEventListener("change", function () { var arr = socialLinksOf(b.props); arr[+sel.dataset.si].platform = sel.value; b.props.socialLinks = arr; renderCanvas(); save(); }); });
    $$("[data-su]", c).forEach(function (inp) { inp.addEventListener("input", function () { var arr = socialLinksOf(b.props); arr[+inp.dataset.su].url = inp.value; b.props.socialLinks = arr; renderCanvas(); save(); }); });
    $$("[data-sdel]", c).forEach(function (btn) { btn.addEventListener("click", function () { var arr = socialLinksOf(b.props); arr.splice(+btn.dataset.sdel, 1); b.props.socialLinks = arr; commit(); renderProps(); }); });
    var sadd = c.querySelector("[data-sadd]"); if (sadd) sadd.addEventListener("click", function () { var arr = socialLinksOf(b.props); arr.push({ platform: "facebook", url: "" }); b.props.socialLinks = arr; commit(); renderProps(); });
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
    var a = seoAudit();

    // Overall ring + category bars
    var topHTML = '<div class="seo-score-box">'
      + '<div class="seo-ring" style="background:conic-gradient(' + a.color + ' ' + a.overall + '%, var(--surface-2) 0)">'
      + '<i style="color:' + a.color + '">' + a.overall + '</i></div>'
      + '<div><div style="font-family:var(--fd);font-weight:600;font-size:15px">SEO Score</div>'
      + '<div style="font-size:12px;color:var(--ink-3);margin-top:3px">' + a.label + '</div></div></div>'
      + '<div class="seo-cats">' + a.cats.map(function (cat) {
          return '<div class="seo-cat">'
            + '<div class="cl">' + esc(cat.label) + '</div>'
            + '<div class="cb"><div class="cf" style="width:' + cat.score + '%;background:' + cat.color + '"></div></div>'
            + '<div class="cv" style="color:' + cat.color + '">' + cat.score + '</div>'
            + '</div>';
        }).join("") + '</div>';

    // Accordion checks per category
    var detailHTML = '<div class="sec-divider"></div>';
    a.cats.forEach(function (cat) {
      detailHTML += '<div class="sec-title collapsed" style="justify-content:space-between">'
        + '<span style="display:inline-flex;align-items:center;gap:7px">'
        + '<span style="width:8px;height:8px;border-radius:50%;background:' + cat.color + ';display:inline-block;flex:none"></span>'
        + esc(cat.label) + '</span>'
        + '<span style="font-size:11.5px;font-weight:700;color:' + cat.color + ';margin-right:4px">'
        + cat.passCount + '/' + cat.checks.length + '</span></div>';
      detailHTML += '<div class="seo-checks">';
      cat.checks.forEach(function (ck) {
        var cls = ck.ok ? "info" : (ck.pass ? "pass" : "fail");
        var icon = ck.pass ? '<path d="M20 6L9 17l-5-5"/>' : '<path d="M12 9v4M12 17h.01"/>';
        detailHTML += '<div class="seo-chk ' + cls + '">'
          + '<span class="mk">' + svg(icon, 2.5) + '</span>'
          + '<div>' + esc(ck.label) + (ck.tip ? '<div class="seo-chk-tip">' + esc(ck.tip) + '</div>' : '') + '</div>'
          + '</div>';
      });
      detailHTML += '</div>';
    });

    c.innerHTML = topHTML + detailHTML + '<div class="sec-divider"></div>'
      + '<div class="sec-title collapsed">ตัวอย่างผลการค้นหา (SERP Preview)</div>'
      + serpPreviewHTML(seo)
      + '<div class="sec-divider"></div>'
      + txt2("blogTitle", "ชื่อบล็อก", seo.blogTitle)
      + txt2("title", "Title (เว้นว่าง = ใช้ชื่อบล็อก)", seo.title)
      + area2("desc", "Meta description", seo.desc, (seo.desc || "").length + "/160 ตัวอักษร")
      + '<div class="sec-divider"></div>'
      + '<div class="sec-title">ป้ายกำกับ (Labels)</div>'
      + tog2("labelIndex", "อนุญาตให้ทำดัชนีหน้าป้ายกำกับ", seo.labelIndex, "ให้ Google เก็บหน้า Label เป็นหน้าหมวดหมู่")
      + labelNote(seo.labelIndex)
      + '<div class="sec-divider"></div>'
      + tog2("schema", "ใส่ Schema (JSON-LD) อัตโนมัติ", seo.schema, "Organization, WebSite, WebPage, BlogPosting, BreadcrumbList")
      + (seo.schema ? googleBox(seo) : "")
      + tog2("og", "Open Graph + Twitter Card", seo.og, "การ์ดแชร์สวยบน Facebook / LINE / X")
      + (seo.og ? socialPreviewHTML(seo) : "");

    bindSeo(c);
    $$(".sec-title.collapsed", c).forEach(function (st) {
      var n = st.nextElementSibling;
      while (n && !n.classList.contains("sec-title")) { n.classList.add("acc-hidden"); n = n.nextElementSibling; }
    });
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
      + tog2("schemaSoftwareApp", "SoftwareApplication Schema", seo.schemaSoftwareApp, "เพิ่ม schema สำหรับบล็อก/เครื่องมือซอฟต์แวร์ — ช่วยให้ AI knowledge graphs จดจำได้")
      + '<div class="note ok">' + svg('<path d="M20 6L9 17l-5-5"/>', 2.5) + '<div>ข้อมูลนี้จะถูกสร้างเป็น <b>@graph (Organization + WebSite)</b> ในส่วน head ของทุกหน้า — ตัวช่วยให้ Google เข้าใจว่าใครเป็นเจ้าของเว็บ (E-E-A-T)</div></div>';
  }
  function area2b(k, l, v, hint) { return '<div class="field"><label>' + l + '</label><textarea class="ta" data-sk="' + k + '" style="min-height:74px">' + esc(v) + "</textarea>" + (hint ? '<div class="hint">' + hint + "</div>" : "") + "</div>"; }
  function socialPreviewHTML(seo) {
    var title = esc(seo.title || seo.blogTitle || "ชื่อบทความ");
    var desc = esc(seo.desc || "คำอธิบายบทความจะแสดงตรงนี้ ควรยาว 120–160 ตัวอักษรเพื่อแสดงผลครบ");
    var domain = (seo.siteUrl || "yourblog.blogspot.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
    var shortDesc = desc.length > 120 ? desc.slice(0, 117) + "…" : desc;
    var shortTitle = title.length > 65 ? title.slice(0, 62) + "…" : title;

    var fbCard = '<div style="border-radius:9px;overflow:hidden;border:1px solid #dde3ec;background:#f0f2f5;font-family:Arial,sans-serif;margin-bottom:12px;">'
      + '<div style="background:#e4e6ea;height:72px;display:flex;align-items:center;justify-content:center;color:#8a8d91;font-size:11px;letter-spacing:.5px">IMAGE PREVIEW (1200×630)</div>'
      + '<div style="padding:10px 12px;background:#f0f2f5;border-top:1px solid #dde3ec;">'
      + '<div style="font-size:10px;color:#8a8d91;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">' + esc(domain) + '</div>'
      + '<div style="font-size:14px;font-weight:600;color:#1c1e21;line-height:1.3;margin-bottom:3px">' + shortTitle + '</div>'
      + '<div style="font-size:13px;color:#606770;line-height:1.4">' + shortDesc + '</div>'
      + '</div></div>';

    var twCard = '<div style="border-radius:10px;overflow:hidden;border:1px solid #cfd9de;background:#fff;font-family:-apple-system,sans-serif;">'
      + '<div style="background:#e7ecee;height:64px;display:flex;align-items:center;justify-content:center;color:#8899a6;font-size:11px">IMAGE (1200×628)</div>'
      + '<div style="padding:10px 12px;border-top:1px solid #cfd9de;">'
      + '<div style="font-size:13px;font-weight:700;color:#0f1419;line-height:1.3;margin-bottom:3px">' + shortTitle + '</div>'
      + '<div style="font-size:13px;color:#536471;line-height:1.4;margin-bottom:4px">' + shortDesc + '</div>'
      + '<div style="font-size:12px;color:#536471;display:flex;align-items:center;gap:4px">'
      + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>'
      + esc(domain) + '</div>'
      + '</div></div>';

    return '<div class="sec-title collapsed">Social Preview (OG / Twitter Card)</div>'
      + '<div class="seo-social-prev">'
      + '<div style="padding:8px 16px 4px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)">Facebook / LINE</div>'
      + '<div style="padding:0 16px 10px">' + fbCard + '</div>'
      + '<div style="padding:8px 16px 4px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)">X (Twitter)</div>'
      + '<div style="padding:0 16px 14px">' + twCard + '</div>'
      + '</div>';
  }
  function serpPreviewHTML(seo) {
    var domain = (seo.siteUrl || "yourblog.blogspot.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
    var titleVal = (seo.title ? seo.title + " | " + (seo.blogTitle || "Blog") : seo.blogTitle) || "ชื่อบล็อก";
    var descVal = seo.desc || "คำอธิบายเว็บไซต์จะแสดงที่นี่ เพิ่ม meta description เพื่อเพิ่มโอกาสให้ผู้ใช้คลิก";
    var titleTrunc = titleVal.length > 60;
    var descTrunc = descVal.length > 160;
    var tDisp = esc(titleTrunc ? titleVal.slice(0, 57) + "…" : titleVal);
    var dDisp = esc(descTrunc ? descVal.slice(0, 157) + "…" : descVal);
    var tColor = titleTrunc ? "#ea4335" : "#1a0dab";
    var dNote = descTrunc ? '<span style="color:#ea4335;font-size:11px;margin-left:4px">⚠ ยาวเกิน 160</span>' : (descVal.length < 120 ? '<span style="color:#f59e0b;font-size:11px;margin-left:4px">⚠ สั้นเกินไป</span>' : '');
    return '<div style="padding:0 16px 14px">'
      + '<div style="background:#fff;border-radius:10px;border:1px solid #dde3ec;padding:16px 18px;font-family:Arial,sans-serif">'
      + '<div style="font-size:13px;color:#202124;line-height:1.3;margin-bottom:4px;display:flex;align-items:center;gap:8px"><div style="width:18px;height:18px;border-radius:50%;background:#e8eaf2;flex:none"></div>' + esc(domain) + ' › …</div>'
      + '<div style="font-size:18px;line-height:1.3;margin-bottom:4px;color:' + tColor + '">' + tDisp + (titleTrunc ? '<span style="font-size:11px;margin-left:6px;vertical-align:middle">⚠ ยาวเกิน 60</span>' : '') + '</div>'
      + '<div style="font-size:13.5px;color:#4d5156;line-height:1.5">' + dDisp + dNote + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:12px;margin-top:8px;font-size:11px;color:var(--ink-3)">'
      + '<span>ชื่อ: <b style="color:' + (titleTrunc ? "var(--bad)" : "var(--ok)") + '">' + titleVal.length + '/60</b></span>'
      + '<span>คำอธิบาย: <b style="color:' + (descVal.length < 120 ? "var(--warn)" : descTrunc ? "var(--bad)" : "var(--ok)") + '">' + descVal.length + '/160</b></span>'
      + '</div></div>';
  }
  function bindSeo(c) {
    $$("[data-sk]", c).forEach(function (inp) {
      var k = inp.dataset.sk;
      if (inp.type === "checkbox") inp.addEventListener("change", function () {
        S.seo[k] = inp.checked; save();
        if (k === "labelIndex" || k === "schema" || k === "schemaSoftwareApp") renderSeo();
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
  function renderSeoScoreOnly() {
    var foc = document.activeElement;
    var k = foc && foc.dataset ? foc.dataset.sk : null;
    renderSeo();
    if (k) { var n = $('[data-sk="' + k + '"]'); if (n && n.setSelectionRange) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }
  }

  function seoAudit() {
    var seo = S.seo;
    var t = seo.title || seo.blogTitle || "", d = seo.desc || "";
    var imgBlks = S.blocks.filter(function (b) { return b.type === "image"; });
    var allAlt = imgBlks.length === 0 || imgBlks.every(function (b) { return b.props && (b.props.alt || "").trim().length > 2; });
    var cats = [
      { key: "tech", label: "Technical SEO", color: "#0ea5e9", checks: [
        { pass: t.length >= 10 && t.length <= 60, label: "Title ความยาวเหมาะสม (10–60)", tip: t.length + " ตัวอักษร" },
        { pass: d.length >= 70 && d.length <= 160, label: "Meta description (70–160)", tip: d.length + " ตัวอักษร" },
        { pass: true, label: "Canonical URL อัตโนมัติ", ok: true },
        { pass: true, label: "Viewport meta ✓", ok: true },
        { pass: !!seo.siteUrl, label: "URL เว็บไซต์ตั้งค่าแล้ว", tip: "จำเป็นสำหรับ Schema & Canonical" }
      ]},
      { key: "struct", label: "โครงสร้างหน้า", color: "#8b5cf6", checks: [
        { pass: S.blocks.some(function (b) { return b.type === "header"; }), label: "Header (ส่วนหัว)" },
        { pass: S.blocks.some(function (b) { return b.type === "footer"; }), label: "Footer (ส่วนท้าย)" },
        { pass: S.blocks.some(function (b) { return b.type === "about"; }), label: "About / ผู้เขียน (E-E-A-T)" },
        { pass: S.blocks.some(function (b) { return /post|featured/.test(b.type); }), label: "ส่วนแสดงบทความ" },
        { pass: allAlt, label: "รูปภาพมี ALT text ครบ", tip: imgBlks.length ? imgBlks.length + " รูป" : "ไม่มีบล็อกรูป" }
      ]},
      { key: "schema", label: "Schema & Markup", color: "#10b981", checks: [
        { pass: !!seo.schema, label: "Schema JSON-LD เปิดอยู่" },
        { pass: !!(seo.schema && seo.siteUrl), label: "WebSite URL (Schema)" },
        { pass: !!(seo.schema && seo.logoUrl), label: "Logo URL (Organization.logo)" },
        { pass: !!(seo.schema && seo.sameAs && seo.sameAs.trim()), label: "Social sameAs links" },
        { pass: !!(seo.schema && seo.siteUrl), label: "WebPage @id fragments (Schema)" }
      ]},
      { key: "social", label: "Social & Sharing", color: "#f59e0b", checks: [
        { pass: !!seo.og, label: "Open Graph เปิดอยู่" },
        { pass: !!seo.og, label: "Twitter Card เปิดอยู่" },
        { pass: !!seo.blogTitle && seo.blogTitle.length > 2, label: "ชื่อบล็อกตั้งค่าแล้ว" },
        { pass: d.length > 50, label: "Description ยาวพอ (og:description)" }
      ]},
      { key: "ai", label: "AI Readiness", color: "#a855f7", checks: [
        { pass: !!seo.siteUrl, label: "Entity @id (siteUrl ตั้งค่าแล้ว)", tip: "จำเป็นสำหรับ @graph @id fragments ให้ AI จดจำเว็บ" },
        { pass: !!seo.logoUrl, label: "Logo URL (Organisation entity)", tip: "ช่วย AI knowledge graphs สร้าง entity ที่สมบูรณ์" },
        { pass: !!(seo.sameAs && seo.sameAs.trim()), label: "sameAs links (ยืนยันตัวตน)", tip: "Facebook, YouTube, X ฯลฯ เพิ่มความน่าเชื่อถือ" },
        { pass: S.blocks.some(function (b) { return b.type === "about"; }), label: "About block (E-E-A-T / Authorship)" },
        { pass: d.length >= 50, label: "Meta description ≥ 50 ตัวอักษร (AI snippet)", tip: d.length + " ตัวอักษร" },
        { pass: !!seo.schema, label: "Schema JSON-LD (BreadcrumbList + speakable)" }
      ]}
    ];
    cats.forEach(function (cat) {
      cat.passCount = cat.checks.filter(function (c) { return c.pass; }).length;
      cat.score = Math.round(cat.passCount / cat.checks.length * 100);
    });
    var totalPass = cats.reduce(function (s, c) { return s + c.passCount; }, 0);
    var totalAll = cats.reduce(function (s, c) { return s + c.checks.length; }, 0);
    var overall = Math.round(totalPass / totalAll * 100);
    var color = overall >= 80 ? "#22c55e" : overall >= 55 ? "#f59e0b" : "#ef4444";
    var label = overall >= 80 ? "ดีมาก พร้อมเผยแพร่" : overall >= 55 ? "ดี ปรับเพิ่มได้" : "ควรปรับปรุง";
    return { overall: overall, color: color, label: label, cats: cats };
  }

  /* ---------- internal link suggestions ---------- */
  function buildLinkSuggestions() {
    var base = [
      { label: "หน้าแรก", url: "/" },
      { label: "ค้นหา", url: "/search" },
      { label: "About", url: "/p/about.html" },
      { label: "ติดต่อ", url: "/p/contact.html" },
      { label: "แผนผังเว็บ", url: "/p/sitemap.html" }
    ];
    if (S) {
      S.blocks.forEach(function (b) {
        if (b.type === "header") {
          menuItemsOf(b.props).forEach(function (m) {
            if (m.url && !base.some(function (l) { return l.url === m.url; })) {
              base.push({ label: m.label, url: m.url });
            }
          });
        }
      });
    }
    return base;
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
  function setView(v) {
    VIEW = v;
    $$("#viewTabs button").forEach(function (x) { x.classList.toggle("on", x.dataset.vw === v); });
    var w = $("#frameWrap");
    w.style.width    = v === "mobile" ? "390px" : v === "tablet" ? "768px" : "100%";
    w.style.minWidth = v === "desktop" ? "960px" : "";
    renderCanvas();
  }
  $$("#viewTabs button").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.dataset.vw); });
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
    if (v.hideMobile) html = "<div class='hide-mobile'>" + html + "</div>";
    var condMap = { home: "data:view.isHomepage", item: "data:view.isSingleItem", page: "data:view.isPage", label: "data:view.isLabelSearch" };
    if (v.scope && condMap[v.scope]) html = "<b:if cond='" + condMap[v.scope] + "'>\n" + html + "\n</b:if>";
    return html;
  }
  var POST_BLOCKS = { postgrid: 1, postlist: 1, featured: 1 };
  function genXML() {
    var d = S.design, seo = S.seo;
    var titleExpr = "<b:if cond='data:view.isHomepage'><data:blog.title.escaped/><b:else/><data:view.title.escaped/> ~ <data:blog.title.escaped/></b:if>";
    var css = minifyCSS(themeCSS(d));

    // Split blocks: post-driven blocks must live INSIDE the single Blog widget
    // (data:posts is only in scope there). Static blocks render directly in <body>.
    var postBlocks = S.blocks.filter(function (b) { return POST_BLOCKS[b.type]; });
    var firstPostIdx = S.blocks.findIndex(function (b) { return POST_BLOCKS[b.type]; });

    // Post includable body — rendered inside <b:includable id='post' var='post'>.
    // data:post.* is valid here because Blogger scopes it from the b:loop in 'main'.
    var postIncludableBody =
      "<article class='bxb-post-single'><div class='wrap' style='max-width:780px;padding:40px 20px 64px'>" +
        "<b:if cond='data:post.labels'><div class='post-cats' style='margin-bottom:12px'>" +
          "<b:loop values='data:post.labels' var='label'><a expr:href='data:label.url' class='post-cat'><data:label.name/></a></b:loop>" +
        "</div></b:if>" +
        "<h1 class='post-title' style='font-size:clamp(26px,4vw,38px);font-weight:700;line-height:1.2;margin:0 0 16px'><data:post.title/></h1>" +
        "<b:if cond='data:view.isPost'>" +
          "<div class='post-meta' style='display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#828aa0;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #eef'>" +
            "<span><data:post.author.name/></span><span><data:post.date/></span>" +
          "</div>" +
        "</b:if>" +
        "<b:if cond='data:post.featuredImage'><img expr:src='resizeImage(data:post.featuredImage,1200,\"auto\")' expr:alt='data:post.title' style='width:100%;height:auto;border-radius:var(--radius);margin-bottom:28px;display:block' loading='eager'/></b:if>" +
        "<div class='post-body' style='font-size:16px;line-height:1.8'><data:post.body/></div>" +
      "</div></article>";

    // Multiple-items (homepage/label/search) branch — post grid/list blocks or fallback loop
    var multipleItemsHtml = postBlocks.length
      ? postBlocks.map(function (b) { return condWrap(renderBlockStatic(b), b); }).join("\n") + "\n<b:include name='nextprev'/>"
      : "<b:loop values='data:posts' var='post'><article class='bxb-post'><h2><a expr:href='data:post.url'><data:post.title/></a></h2><div class='post-body'><data:post.body/></div></article></b:loop><b:include name='nextprev'/>";

    // main includable: routes between single-item view and multiple-items view.
    // Single post/page → b:loop calls <b:include name='post'/> → post includable renders body.
    // This two-includable pattern matches working Blogger v2 templates.
    var mainIncludable =
      "<b:if cond='data:view.isPost or data:view.isPage'>\n" +
      "<b:loop values='data:posts' var='post'><b:include data='post' name='post'/></b:loop>\n" +
      "<b:else/>\n" +
      multipleItemsHtml + "\n" +
      "</b:if>";

    var blogWidget =
      "<b:section id='main' class='main-section' mobile='yes' showaddelement='no'>\n" +
      "<b:widget id='Blog1' title='บทความ' type='Blog' version='2' visible='true'>\n" +
      "<b:includable id='main'>\n" + mainIncludable + "\n</b:includable>\n" +
      "<b:includable id='post' var='post'>\n" + postIncludableBody + "\n</b:includable>\n" +
      "</b:widget>\n</b:section>";

    // If a sidebar block exists, wrap blogWidget + sidebar section in a layout div
    var sidebarBlock = S.blocks.find(function (b) { return b.type === "sidebar"; });
    var blogOrLayout = blogWidget;
    if (sidebarBlock) {
      var sbp = sidebarBlock.props;
      var sbGridCols = sbp.position === "left" ? (sbp.width || "280px") + " 1fr" : "1fr " + (sbp.width || "280px");
      var sbSection = renderBlockStatic(sidebarBlock);
      var sbCls = "bxb-page-layout" + (sbp.position === "left" ? " sidebar-left" : "");
      blogOrLayout = "<div class='" + sbCls + "' style='grid-template-columns:" + sbGridCols + "'>" +
        (sbp.position === "left" ? sbSection + "<div class='bxb-main-col'>" + blogWidget + "</div>" : "<div class='bxb-main-col'>" + blogWidget + "</div>" + sbSection) +
        "</div>";
    }

    // Assemble body in document order; drop the Blog widget in at the first post block's spot.
    var parts = [], placed = false;
    S.blocks.forEach(function (b, i) {
      if (POST_BLOCKS[b.type]) {
        if (i === firstPostIdx) { parts.push(blogOrLayout); placed = true; }
        return; // other post blocks already inside the widget
      }
      if (b.type === "sidebar") return; // already handled inside blogOrLayout
      parts.push(condWrap(renderBlockStatic(b), b));
    });
    if (!placed) parts.push(blogOrLayout); // ensure exactly one Blog widget always exists
    var bodyHTML = parts.join("\n");

    // label robots logic
    var labelRobotsVal = seo.labelIndex ? "index,follow,max-image-preview:large" : "noindex,follow";
    var labelRobots = "<b:if cond='data:view.isLabelSearch'><meta content='" + labelRobotsVal + "' name='robots'/><meta content='" + labelRobotsVal + "' name='googlebot'/><meta content='" + labelRobotsVal + "' name='bingbot'/></b:if>";
    var schema = seo.schema ? schemaGraph(seo) : "";
    var og = seo.og ? ogTags(seo) : "";

    var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n" +
"<!DOCTYPE html>\n" +
"<html b:css='false' b:defaultwidgetversion='2' b:js='false' b:layoutsVersion='3' b:responsive='true' b:version='2' expr:dir='data:blog.languageDirection' expr:lang='data:blog.locale' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/gml/b' xmlns:data='http://www.google.com/2005/gml/data' xmlns:expr='http://www.google.com/2005/gml/expr'>\n" +
"<head>\n" +
"<b:include data='blog' name='all-head-content'/>\n" +
"<link expr:href='data:blog.blogspotFaviconUrl' rel='icon' type='image/x-icon'/>\n" +
"<meta content='width=device-width, initial-scale=1' name='viewport'/>\n" +
"<title>" + titleExpr + "</title>\n" +
"<link expr:href='data:view.url.canonical' rel='canonical'/>\n" +
"<b:if cond='data:view.isHomepage'><meta content='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' name='robots'/><meta content='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' name='googlebot'/><meta content='index,follow,max-image-preview:large' name='bingbot'/></b:if>\n" +
"<b:if cond='data:view.isSingleItem'><meta content='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' name='robots'/><meta content='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' name='googlebot'/><meta content='index,follow,max-image-preview:large' name='bingbot'/></b:if>\n" +
"<b:if cond='data:view.isMultipleItems'><b:if cond='!data:view.isHomepage'><b:if cond='!data:view.isLabelSearch'><meta content='noindex,follow' name='robots'/><meta content='noindex,follow' name='googlebot'/><meta content='noindex,follow' name='bingbot'/></b:if></b:if></b:if>\n" +
labelRobots + "\n" +
"<b:if cond='data:view.isSearch'><meta content='noindex,follow' name='robots'/><meta content='noindex,follow' name='googlebot'/><meta content='noindex,follow' name='bingbot'/></b:if>\n" +
"<b:if cond='data:view.isError'><meta content='noindex,nofollow' name='robots'/></b:if>\n" +
"<b:if cond='data:view.isArchive'><meta content='noindex,follow' name='robots'/></b:if>\n" +
"<meta expr:content='data:view.description.escaped' name='description'/>\n" +
og + "\n" +
"<link rel='dns-prefetch' href='//1.bp.blogspot.com'/>\n" +
"<link rel='preconnect' href='https://fonts.googleapis.com'/>\n" +
"<link crossorigin='anonymous' rel='preconnect' href='https://fonts.gstatic.com'/>\n" +
"<link href='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&amp;display=swap' rel='stylesheet'/>\n" +
"<b:if cond='data:view.isSingleItem'><b:if cond='data:view.featuredImage'><link expr:href='data:view.featuredImage' rel='preload' as='image' fetchpriority='high'/></b:if></b:if>\n" +
schema + "\n" +
"<b:skin><![CDATA[\n" + css + "\n]]></b:skin>\n" +
"</head>\n" +
"<body>\n" +
"<a class='skip' href='#main'>ข้ามไปยังเนื้อหา</a>\n" +
bodyHTML + "\n" +
"<b:if cond='data:view.isError'><script>/*<![CDATA[*/setTimeout(function(){window.location.replace('/');},3000);/*]]>*/</script></b:if>\n" +
"</body>\n</html>";
    return xml;
  }

  /* ---------- CSS Performance Engine ---------- */
  function minifyCSS(css) {
    // Extract Blogger Variable block (must keep as comment for Theme Designer)
    var varBlock = "";
    css = css.replace(/(\/\*\s*<Variable[\s\S]*?\*\/)/, function (m) { varBlock = m; return "/*__VARS__*/"; });
    // Strip remaining comments
    css = css.replace(/\/\*(?!__VARS__)[\s\S]*?\*\//g, "");
    // Collapse whitespace
    css = css.replace(/\s+/g, " ")
             .replace(/\s*([{};:,>~+!])\s*/g, "$1")
             .replace(/;}/g, "}")
             .replace("/*__VARS__*/", varBlock);
    return css.trim();
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
".site-header{background:#fff;border-bottom:1px solid rgba(0,0,0,.07);position:relative;z-index:50}",
".site-bar{display:flex;align-items:center;gap:20px;padding:14px 20px;max-width:1080px;margin:0 auto}",
".site-logo{font-weight:700;font-size:21px;color:var(--primary);flex:none}",
".site-nav ul{display:flex;gap:4px;list-style:none;margin:0 0 0 auto;padding:0}",
".site-nav li a{font-weight:500;padding:8px 12px;border-radius:7px;display:block;transition:background .15s,color .15s}",
".site-nav li a:hover{background:rgba(0,0,0,.05);color:var(--primary)}",
".nav-toggle-cb,.nav-burger,.nav-scrim,.nav-close{display:none}",
".nav-burger{flex-direction:column;justify-content:center;gap:5px;cursor:pointer;width:40px;height:40px;border-radius:8px;background:transparent;border:1px solid rgba(0,0,0,.1);margin-left:auto;flex:none}",
".nav-burger span{display:block;width:20px;height:2px;background:#1e2333;border-radius:2px;margin:0 auto}",
".site-nav li{position:relative}",
".site-nav .has-children>a{display:inline-flex;align-items:center;gap:4px}",
".site-nav .dropdown{display:none;position:absolute;top:calc(100% + 6px);left:0;list-style:none;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:170px;padding:4px 0;z-index:80;opacity:0;transform:translateY(-6px);transition:opacity .18s,transform .18s}",
".site-nav li:hover>.dropdown{display:block;opacity:1;transform:translateY(0)}",
".site-nav .dropdown li a{display:block;padding:10px 16px;font-size:14px;color:#1e2333;white-space:nowrap;font-weight:400;border-radius:0}",
".site-nav .dropdown li a:hover{background:#f7f8fc;color:var(--primary)}",
".nav-search{display:flex;align-items:center;gap:4px;margin-left:auto}",
".nav-search input{padding:8px 12px;border:1px solid #dde;border-radius:var(--radius);font-size:13px;width:160px}",
".nav-search button{padding:8px 12px;background:var(--primary);color:#fff;border:0;border-radius:var(--radius);cursor:pointer}",
"@media(max-width:768px){",
"body.menu-open{overflow:hidden}",
".nav-search{display:none}",
".nav-burger{display:flex}",
".nav-close{display:flex;position:absolute;top:14px;right:14px;width:36px;height:36px;align-items:center;justify-content:center;border-radius:50%;background:rgba(0,0,0,.07);border:1px solid rgba(0,0,0,.1);font-size:18px;cursor:pointer;color:#1e2333;z-index:2}",
".site-nav{position:fixed;top:0;bottom:0;width:82%;max-width:320px;background:#fff;z-index:60;padding:70px 0 32px;transition:transform .28s cubic-bezier(.22,1,.36,1);box-shadow:0 0 48px rgba(0,0,0,.25);overflow-y:auto}",
".site-nav ul{flex-direction:column;gap:0;margin:0;padding:0 12px}",
".site-nav li a{display:flex;align-items:center;padding:0 12px;min-height:52px;border-radius:10px;font-size:16px}",
".site-nav.nav-right{right:0;transform:translateX(100%)}",
".site-nav.nav-left{left:0;transform:translateX(-100%)}",
".nav-toggle-cb:checked~.site-bar .site-nav{transform:translateX(0)}",
".nav-toggle-cb:checked~.site-bar .nav-scrim{display:block;position:fixed;inset:0;background:rgba(0,0,0,.48);backdrop-filter:blur(2px);z-index:55}",
".site-nav .dropdown{position:static;display:none;box-shadow:none;border:0;border-radius:0;background:rgba(99,102,241,.06);padding:4px 0;margin:0 0 4px 0;opacity:1;transform:none}",
".site-nav li:hover>.dropdown{display:none}",
".site-nav .has-children.open>.dropdown{display:block}",
".site-nav .has-children>a::after{content:'\\203A';margin-left:auto;font-size:20px;line-height:1;transition:transform .2s;color:var(--ink-3,#9aa)}",
".site-nav .has-children.open>a::after{transform:rotate(90deg)}",
".site-nav .has-children>a .drop-arrow{display:none}",
".site-nav .dropdown li a{padding-left:28px;min-height:44px;font-size:14.5px;color:#4a5063}",
"}",
".hide-mobile{display:block}",
"@media(max-width:768px){.grid{grid-template-columns:1fr !important}.hide-mobile{display:none !important}}",
".bxb-page-layout{display:grid;gap:28px;max-width:1080px;margin:0 auto;padding:28px 20px;align-items:start}",
".bxb-main-col{min-width:0}",
".bxb-sidebar-col{min-width:0}",
".bxb-sidebar-col .widget{margin-bottom:18px;background:#f7f8fc;border-radius:var(--radius);padding:16px}",
".bxb-sidebar-col .widget-title,.bxb-sidebar-col h2,.bxb-sidebar-col h3{font-size:15px;font-weight:700;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--primary)}",
"@media(max-width:768px){.bxb-page-layout{display:block;padding:16px 20px}.bxb-sidebar-col{margin-top:20px}}",
".widget{margin-bottom:1.5rem}",
".widget-title{font-size:1rem;font-weight:700;margin-bottom:.75rem;padding-bottom:.5rem;border-bottom:2px solid var(--primary)}",
".bxb-post-single{min-height:60vh}",
".post-cat{font-size:12px;font-weight:600;color:var(--primary);text-transform:uppercase;letter-spacing:.06em;margin-right:8px;text-decoration:none}",
".post-cat:hover{text-decoration:underline}",
".post-body img{border-radius:var(--radius);max-width:100%;height:auto;display:block;margin:24px 0}",
".post-body h2{font-size:24px;font-weight:700;margin:32px 0 12px;line-height:1.25}",
".post-body h3{font-size:20px;font-weight:700;margin:24px 0 10px;line-height:1.3}",
".post-body h4{font-size:17px;font-weight:600;margin:20px 0 8px}",
".post-body p{margin-bottom:16px}",
".post-body ul,.post-body ol{margin:0 0 16px 24px;line-height:1.8}",
".post-body a{color:var(--primary);text-decoration:underline}",
".post-body blockquote{border-left:4px solid var(--primary);padding:12px 16px;margin:20px 0;background:rgba(99,102,241,.05);border-radius:0 var(--radius) var(--radius) 0}",
".post-body pre{background:#f7f8fc;padding:16px;border-radius:var(--radius);overflow-x:auto;font-size:13px;line-height:1.6;margin-bottom:16px}",
".post-body code{font-family:monospace;background:#f0f1f7;padding:2px 6px;border-radius:4px;font-size:13px}",
".post-body pre code{background:none;padding:0}",
".site-footer{background:#0f172a;color:#fff;padding:52px 20px 28px}",
".footer-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:48px;max-width:980px;margin:0 auto;align-items:start}",
"@media(max-width:768px){.footer-grid{grid-template-columns:1fr;gap:28px}}",
".footer-logo{font-weight:700;font-size:20px;color:#fff;margin-bottom:12px;font-family:$(titlefont)}",
".footer-about{color:rgba(255,255,255,.6);font-size:14px;line-height:1.65;margin:0 0 20px;max-width:340px}",
".footer-social{display:flex;gap:8px;flex-wrap:wrap}",
".footer-social-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9px;background:rgba(255,255,255,.1);color:#fff;transition:background .2s,transform .15s}",
".footer-social-icon:hover{background:var(--ic-color,rgba(255,255,255,.25));transform:translateY(-2px)}",
".footer-social-icon svg{display:block}",
".footer-links{display:flex;flex-direction:column;gap:10px;padding-top:6px}",
".footer-link{color:rgba(255,255,255,.65);font-size:14px;text-decoration:none;transition:color .2s;display:block}",
".footer-link:hover{color:#fff}",
".footer-bottom{text-align:center;color:rgba(255,255,255,.35);font-size:12.5px;margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);max-width:980px;margin-left:auto;margin-right:auto}",
"@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}}"
    ].join("\n");
  }

  /* static (server-rendered) markup for the theme body — semantic HTML5 */
  function renderBlockStatic(b) {
    var p = b.props, d = design();
    switch (b.type) {
      case "header":
        var hItems = menuItemsOf(p);
        var side = p.mobileSide === "left" ? "left" : "right";
        var hMenu = hItems.map(function (m) {
          var href = esc(menuUrlFor(m));
          var t = m.type || "custom";
          if (t === "dropdown" && Array.isArray(m.children) && m.children.length) {
            var subs = m.children.map(function (c) {
              return "<li role='none'><a role='menuitem' href='" + esc(pageNameToUrl(c.url) || "#") + "'>" + esc(c.label) + "</a></li>";
            }).join("");
            return "<li class='has-children'>" +
              "<a href='" + href + "' aria-haspopup='true' aria-expanded='false'>" + esc(m.label) + "</a>" +
              "<ul class='dropdown' role='menu'>" + subs + "</ul></li>";
          }
          var cur = (t === "home") ? " aria-current='page'" : "";
          return "<li><a href='" + href + "'" + cur + ">" + esc(m.label) + "</a></li>";
        }).join("");
        var stickyStyle = p.sticky ? " style='position:sticky;top:0;z-index:50;background:#fff'" : "";
        return "<header role='banner' class='site-header'" + stickyStyle + ">" +
          "<input type='checkbox' id='navtoggle' class='nav-toggle-cb' hidden='hidden'/>" +
          "<div class='site-bar'>" +
          "<a href='/' class='site-logo'>" + esc(p.logoText) + "</a>" +
          "<nav role='navigation' aria-label='เมนูหลัก' class='site-nav nav-" + side + "'>" +
            "<label for='navtoggle' class='nav-close' aria-label='ปิดเมนู'>✕</label>" +
            "<ul>" + hMenu + "</ul>" +
          "</nav>" +
          (p.showSearch ? "<form action='/search' method='get' class='nav-search' role='search'><input name='q' type='search' placeholder='ค้นหา…' aria-label='ค้นหา'/><button type='submit' aria-label='ค้นหา'>🔍</button></form>" : "") +
          "<label for='navtoggle' class='nav-burger' aria-label='เปิดเมนู'><span></span><span></span><span></span></label>" +
          "<label for='navtoggle' class='nav-scrim'></label>" +
          "</div></header>" +
          "<script>/*<![CDATA[*/(function(){" +
            "var cb=document.getElementById('navtoggle');" +
            "if(cb){cb.addEventListener('change',function(){document.body.classList.toggle('menu-open',cb.checked);});}" +
            "document.querySelectorAll('.has-children>a').forEach(function(a){" +
              "a.addEventListener('click',function(e){" +
                "if(window.innerWidth<=768){e.preventDefault();var li=a.parentElement;li.classList.toggle('open');a.setAttribute('aria-expanded',li.classList.contains('open'));}" +
              "});" +
            "});" +
          "}());/*]]>*/<\/script>";
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
        return "<section style='padding:56px 20px;background:#f7f8fc'><div class='wrap' style='display:flex;gap:24px;align-items:center;max-width:820px'>" + (p.showAvatar ? "<div style='width:84px;height:84px;border-radius:50%;background:linear-gradient(120deg,var(--primary),var(--accent));flex:none'></div>" : "") + "<div><h2 style='font-size:24px'>" + esc(p.name) + "</h2><p style='color:#4a5063;margin-top:8px'>" + richHTML(p.bio) + "</p></div></div></section>";
      case "text":
        return "<section style='padding:40px 20px'><div class='wrap' style='max-width:760px;text-align:" + p.align + "'><h2 style='font-size:28px;margin-bottom:12px'>" + esc(p.heading) + "</h2><p style='color:#4a5063;font-size:16px'>" + richHTML(p.body) + "</p></div></section>";
      case "columns":
        var ccn = p.cols || 3, cits = (p.items || []).slice(0, ccn);
        var ccells = cits.map(function (it) { return "<div style='text-align:center;padding:8px'><div style='width:54px;height:54px;border-radius:14px;background:linear-gradient(120deg,var(--primary),var(--accent));color:#fff;display:grid;place-items:center;font-size:24px;margin:0 auto 14px'>" + esc(it.icon || "\u2605") + "</div><h3 style='font-size:18px;margin:0 0 7px'>" + esc(it.title) + "</h3><p style='color:#828aa0;font-size:14px'>" + esc(it.text) + "</p></div>"; }).join("");
        return "<section style='padding:48px 0'><div class='wrap'>" + (p.heading ? "<h2 style='font-size:26px;margin-bottom:24px;text-align:center'>" + esc(p.heading) + "</h2>" : "") + "<div class='grid' style='display:grid;grid-template-columns:repeat(" + ccn + ",1fr);gap:24px'>" + ccells + "</div></div></section>";
      case "cta":
        return "<section style='padding:20px'><div class='wrap'><div style='padding:48px 20px;text-align:center;border-radius:var(--radius);background:linear-gradient(120deg,var(--primary),var(--accent));color:#fff'><h2 style='font-size:30px'>" + esc(p.title) + "</h2><p style='margin-top:18px'><a href='#' style='background:#fff;color:var(--primary);padding:13px 28px;border-radius:var(--radius);font-weight:600;display:inline-block'>" + esc(p.btnText) + "</a></p></div></div></section>";
      case "image":
        return "<figure style='padding:24px 20px;margin:0'><div class='wrap'><div style='aspect-ratio:" + p.ratio + ";background:#e8eaf2;border-radius:var(--radius)'></div>" + (p.caption ? "<figcaption style='text-align:center;color:#9aa;font-size:13px;margin-top:8px'>" + esc(p.caption) + "</figcaption>" : "") + "</div></figure>";
      case "ad":
        var adH = p.size === "rect" ? "280px" : p.size === "banner" ? "90px" : "250px";
        return "<aside aria-label='โฆษณา' style='padding:16px 20px'><div class='wrap'>" + (p.label ? "<div style='text-align:center;font-size:11px;color:#bbc;margin-bottom:4px'>โฆษณา</div>" : "") + "<div style='min-height:" + adH + ";display:grid;place-items:center;background:#fafbff;border:1px dashed #ccd;border-radius:8px'><!-- AdSense slot: " + esc(p.slot) + " --></div></div></aside>";
      case "newsletter":
        return "<section style='padding:52px 20px;text-align:center;background:linear-gradient(120deg,var(--primary)0d,var(--accent)1a)'>"
          + "<div class='wrap'><h2 style='font-size:26px;margin-bottom:12px'>" + esc(p.heading) + "</h2>"
          + "<p style='color:#4a5063;margin-bottom:22px;max-width:440px;margin-left:auto;margin-right:auto'>" + esc(p.sub) + "</p>"
          + "<form style='display:flex;gap:10px;max-width:400px;margin:0 auto;flex-wrap:wrap'>"
          + "<input type='email' name='email' placeholder='อีเมลของคุณ' required style='flex:1;min-width:180px;padding:12px 16px;border:1px solid #dde;border-radius:var(--radius);font-size:14px'/>"
          + "<button type='submit' style='background:var(--primary);color:#fff;padding:12px 20px;border:0;border-radius:var(--radius);font-weight:600;cursor:pointer'>" + esc(p.btnText) + "</button>"
          + "</form></div></section>";
      case "share":
        return "<section style='padding:28px 20px;text-align:center'><div class='wrap'>"
          + (p.label ? "<div style='font-size:13px;color:#828aa0;margin-bottom:14px'>" + esc(p.label) + "</div>" : "")
          + "<b:if cond='data:view.isSingleItem'><div style='display:flex;gap:10px;justify-content:center;flex-wrap:wrap'>"
          + (p.facebook ? "<a expr:href='\"https://www.facebook.com/sharer/sharer.php?u=\" + data:post.url' target='_blank' rel='noopener noreferrer' style='padding:10px 18px;background:#1877f2;color:#fff;border-radius:var(--radius);font-weight:600;font-size:13px'>Facebook</a>" : "")
          + (p.twitter ? "<a expr:href='\"https://twitter.com/intent/tweet?url=\" + data:post.url + \"&text=\" + data:post.title' target='_blank' rel='noopener noreferrer' style='padding:10px 18px;background:#000;color:#fff;border-radius:var(--radius);font-weight:600;font-size:13px'>X (Twitter)</a>" : "")
          + (p.line ? "<a expr:href='\"https://social-plugins.line.me/lineit/share?url=\" + data:post.url' target='_blank' rel='noopener noreferrer' style='padding:10px 18px;background:#06c755;color:#fff;border-radius:var(--radius);font-weight:600;font-size:13px'>LINE</a>" : "")
          + "</div></b:if></div></section>";
      case "sidebar":
        var sWidgets = "";
        if (p.showSearch) sWidgets += "<b:widget id='BlogSearch1' type='BlogSearch' title='ค้นหา' version='1' visible='true'/>\n";
        if (p.showCategories) sWidgets += "<b:widget id='Label1' type='Label' title='ป้ายกำกับ' version='1' visible='true'>\n<b:widget-settings><b:widget-setting name='sorting'>ALPHA</b:widget-setting><b:widget-setting name='display'>list</b:widget-setting><b:widget-setting name='showFreqNumbers'>true</b:widget-setting></b:widget-settings></b:widget>\n";
        if (p.showArchive) sWidgets += "<b:widget id='BlogArchive1' type='BlogArchive' title='คลังบทความ' version='2' visible='true'>\n<b:widget-settings><b:widget-setting name='pageType'>MONTHLY</b:widget-setting><b:widget-setting name='showPostCount'>true</b:widget-setting></b:widget-settings></b:widget>\n";
        if (p.showAbout) sWidgets += "<b:widget id='Profile1' type='Profile' title='เกี่ยวกับฉัน' version='1' visible='true'/>\n";
        return "<b:section id='sidebar' class='bxb-sidebar-col' mobile='yes' showaddelement='yes' preferred='yes'>\n" + sWidgets + "</b:section>";
      case "search":
        return "<section style='padding:16px 20px'><div class='wrap'>" + (p.heading ? "<h3 style='font-size:16px;margin-bottom:10px'>" + esc(p.heading) + "</h3>" : "") + "<form action='/search' method='get' role='search'><div style='display:flex;max-width:420px'><input name='q' type='search' placeholder='" + esc(p.placeholder || "ค้นหาในบล็อก…") + "' style='flex:1;padding:12px 16px;border:1px solid #dde;border-radius:var(--radius) 0 0 var(--radius);font-size:14px'/><button type='submit' style='padding:12px 16px;background:var(--primary);color:#fff;border:0;border-radius:0 var(--radius) var(--radius) 0;cursor:pointer'>🔍</button></div></form></div></section>";
      case "footer":
        var sfLinks = footerLinksOf(p);
        var sfSocials = socialLinksOf(p);
        var sfLinksHtml = sfLinks.map(function (m) {
          return "<a href='" + esc(m.url) + "' class='footer-link'>" + esc(m.label) + "</a>";
        }).join("\n");
        var sfSocialHtml = sfSocials.map(function (s) {
          var ic = SOCIAL_ICONS[s.platform];
          if (!ic || !s.url) return "";
          return "<a href='" + esc(s.url) + "' target='_blank' rel='noopener noreferrer' class='footer-social-icon' aria-label='" + ic.label + "' style='--ic-color:" + ic.color + "'>" +
            "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" + ic.svg + "</svg></a>";
        }).join("\n");
        return "<footer role='contentinfo' class='site-footer'><div class='wrap'>" +
          "<div class='footer-grid'>" +
            "<div class='footer-brand'>" +
              "<div class='footer-logo'>" + esc(S.seo.blogTitle || "MyBlog") + "</div>" +
              "<p class='footer-about'>" + esc(p.about) + "</p>" +
              (sfSocials.length ? "<div class='footer-social'>" + sfSocialHtml + "</div>" : "") +
            "</div>" +
            (sfLinks.length ? "<nav class='footer-links' aria-label='Footer'>" + sfLinksHtml + "</nav>" : "") +
          "</div>" +
          "<div class='footer-bottom'>" + esc(p.copyright) + "</div>" +
          "</div></footer>";
      case "darkmode":
        var dmPosCSS = (p.position && p.position.indexOf("top") >= 0 ? "top:72px" : "bottom:24px") + ";" + (p.position && p.position.indexOf("left") >= 0 ? "left:24px" : "right:24px");
        return "<style>[data-theme=dark]{background:#0f172a !important;color:#e2e8f0 !important}"
          + "[data-theme=dark] .site-header,[data-theme=dark] header{background:#1e293b !important;border-color:#334155 !important}"
          + "[data-theme=dark] .post-body a,[data-theme=dark] a{color:#818cf8}"
          + ".bxb-dm-btn{position:fixed;" + dmPosCSS + ";z-index:9999;width:44px;height:44px;border-radius:50%;background:#f7f8fc;border:1px solid #e8eaf2;cursor:pointer;display:grid;place-items:center;font-size:20px;box-shadow:0 2px 10px rgba(0,0,0,.12);transition:transform .2s,background .2s}"
          + "[data-theme=dark] .bxb-dm-btn{background:#1e293b;border-color:#334155;color:#e2e8f0}"
          + ".bxb-dm-btn:hover{transform:scale(1.1)}</style>"
          + "<button class='bxb-dm-btn' id='bxbDmBtn' aria-label='สลับธีมสว่าง/มืด'>🌙</button>"
          + "<script>/*<![CDATA[*/(function(){"
          + "if(document.getElementById('bxbDmBtn2'))return;"
          + "var b=document.getElementById('bxbDmBtn');"
          + "var k='bxb-theme';"
          + "var t=localStorage.getItem(k)||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');"
          + "document.documentElement.dataset.theme=t;"
          + "b.textContent=t==='dark'?'☀️':'🌙';"
          + "b.addEventListener('click',function(){"
          + "var n=document.documentElement.dataset.theme==='dark'?'light':'dark';"
          + "document.documentElement.dataset.theme=n;"
          + "localStorage.setItem(k,n);"
          + "b.textContent=n==='dark'?'☀️':'🌙';"
          + "});"
          + "})();/*]]>*/<\/script>";
      case "aeo":
        var aeoTitle = esc(p.title || "สรุปบทความ");
        var aeoCSS = p.style === "highlight"
          ? "margin:20px 0;padding:18px 22px;background:var(--accent,#8b5cf6)0d;border-left:4px solid var(--accent,#8b5cf6);border-radius:0 var(--radius,8px) var(--radius,8px) 0"
          : p.style === "minimal" ? "margin:20px 0;padding:14px 0;border-top:2px solid var(--primary);border-bottom:1px solid #eef"
          : "margin:20px 0;padding:18px 22px;background:var(--primary)0d;border:1px solid var(--primary)22;border-radius:var(--radius,8px)";
        return "<b:if cond='data:view.isSingleItem'>"
          + "<aside class='qt-aeo-summary' aria-label='" + aeoTitle + "' style='" + aeoCSS + "'>"
          + "<div style='font-size:11.5px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px'>&#128214; " + aeoTitle + "</div>"
          + "<p style='font-size:15px;line-height:1.7;margin:0'><data:post.snippet/></p>"
          + "</aside></b:if>";
      case "toc":
        var tocTitle = esc(p.title || "สารบัญ");
        var tocDepth = parseInt(p.maxDepth || 3, 10);
        var tocSel = tocDepth >= 3 ? "'h2,h3'" : "'h2'";
        var tocTag = p.numbered !== false ? "ol" : "ul";
        return "<b:if cond='data:view.isSingleItem'>"
          + "<nav id='bxbToc' class='bxb-toc' aria-label='" + tocTitle + "' style='margin:20px 0;padding:16px 18px;background:var(--surface-2,#f7f8fc);border-radius:var(--radius,8px);border:1px solid var(--border,#eef)'>"
          + "<div style='font-size:11.5px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px'>&#128209; " + tocTitle + "</div>"
          + "<" + tocTag + " id='bxbTocList' style='padding-left:20px;margin:0;font-size:14px;line-height:1.9'></" + tocTag + ">"
          + "</nav>"
          + "<script>/*<![CDATA[*/(function(){"
          + "var toc=document.getElementById('bxbToc');"
          + "var list=document.getElementById('bxbTocList');"
          + "var body=document.querySelector('.post-body,.entry-content');"
          + "if(!toc||!list||!body)return;"
          + "var hs=body.querySelectorAll(" + tocSel + ");"
          + "if(hs.length<2){toc.remove();return;}"
          + "hs.forEach(function(h,i){"
          + "h.id='bxb-h'+i;"
          + "var li=document.createElement('li');"
          + (tocDepth >= 3 ? "if(h.tagName==='H3')li.style.paddingLeft='14px';" : "")
          + "var a=document.createElement('a');"
          + "a.href='#bxb-h'+i;"
          + "a.textContent=h.textContent;"
          + "a.style.color='inherit';"
          + "a.style.textDecoration='none';"
          + "li.appendChild(a);list.appendChild(li);"
          + "});"
          + "})();/*]]>*/<\/script>"
          + "</b:if>";
      case "related":
        var relHeading = esc(p.heading || "บทความที่เกี่ยวข้อง");
        var relCount = p.count || 4;
        var relCols = p.columns || 2;
        var relImg = p.showImage !== false;
        return "<b:if cond='data:view.isSingleItem'>"
          + "<section class='bxb-related' style='padding:32px 0'><div class='wrap'>"
          + "<h3 style='font-size:20px;font-weight:700;margin:0 0 18px'>" + relHeading + "</h3>"
          + "<div id='bxbRelGrid' style='display:grid;grid-template-columns:repeat(" + relCols + ",1fr);gap:16px'></div>"
          + "</div></section>"
          + "<b:if cond='data:post.labels'>"
          + "<b:loop values='data:post.labels' var='label' index='li'>"
          + "<b:if cond='data:li == 0'><div id='bxbRelMeta' expr:data-lbl='data:label.name' style='display:none'></div></b:if>"
          + "</b:loop></b:if>"
          + "<script>/*<![CDATA[*/(function(){"
          + "var meta=document.getElementById('bxbRelMeta');"
          + "var grid=document.getElementById('bxbRelGrid');"
          + "var sec=document.querySelector('.bxb-related');"
          + "if(!meta||!grid){if(sec)sec.remove();return;}"
          + "var lbl=encodeURIComponent(meta.dataset.lbl||'');"
          + "if(!lbl){if(sec)sec.remove();return;}"
          + "var cur=location.href.replace(/[?#].*/,'');"
          + "fetch('/feeds/posts/default/-/'+lbl+'?alt=json&max-results=" + (relCount + 1) + "')"
          + ".then(function(r){return r.json();})"
          + ".then(function(data){"
          + "var entries=data.feed&&data.feed.entry||[];"
          + "var posts=entries.filter(function(e){var al=(e.link||[]).find(function(l){return l.rel==='alternate';});return al&&al.href.replace(/[?#].*/,'')!==cur;}).slice(0," + relCount + ");"
          + "if(!posts.length){if(sec)sec.remove();return;}"
          + "posts.forEach(function(e){"
          + "var al=(e.link||[]).find(function(l){return l.rel==='alternate';});"
          + "var tm=e['media$thumbnail'];"
          + "var img=tm?tm.url.replace(/\\/s\\d+-c\\//,'/s400-c/'):null;"
          + "var t=e.title&&e.title.$t||'';"
          + "var card=document.createElement('article');"
          + "card.style.cssText='border:1px solid #eef;border-radius:var(--radius,8px);overflow:hidden;background:#fff';"
          + (relImg ? "if(img){var im=document.createElement('img');im.src=img;im.alt='';im.loading='lazy';im.style.cssText='width:100%;aspect-ratio:16/9;object-fit:cover';card.appendChild(im);}" : "")
          + "var di=document.createElement('div');di.style.padding='12px';"
          + "var h4=document.createElement('h4');h4.style.cssText='font-size:14px;font-weight:600;margin:0;line-height:1.4';"
          + "var an=document.createElement('a');an.href=al?al.href:'#';an.textContent=t;an.style.cssText='color:inherit;text-decoration:none';"
          + "h4.appendChild(an);di.appendChild(h4);card.appendChild(di);grid.appendChild(card);"
          + "});"
          + "}).catch(function(){if(sec)sec.remove();});"
          + "})();/*]]>*/<\/script>"
          + "</b:if>";
      case "progress":
        var prgColor = p.color === "accent" ? "var(--accent)" : p.color === "gradient" ? "linear-gradient(90deg,var(--primary),var(--accent))" : "var(--primary)";
        var prgH = (p.height || 3) + "px";
        return "<style>#bxbProg{position:fixed;top:0;left:0;width:0%;height:" + prgH + ";background:" + prgColor + ";z-index:10000;pointer-events:none;will-change:width}</style>"
          + "<div id='bxbProg' role='progressbar' aria-valuemin='0' aria-valuemax='100' aria-valuenow='0' aria-label='ความคืบหน้าการอ่าน'></div>"
          + "<script>/*<![CDATA[*/(function(){"
          + "var b=document.getElementById('bxbProg');if(!b)return;"
          + "function u(){var h=document.documentElement.scrollHeight-window.innerHeight;var p=h>0?Math.min(100,window.scrollY/h*100):0;b.style.width=p+'%';b.setAttribute('aria-valuenow',Math.round(p));}"
          + "window.addEventListener('scroll',u,{passive:true});u();"
          + "})();/*]]>*/<\/script>";
    }
    return "";
  }

  function jsonStr(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026"); }
  function schemaGraph(seo) {
    var bt = jsonStr(seo.blogTitle || "MyBlog");
    var su = seo.siteUrl ? jsonStr(seo.siteUrl) : "";
    var lang = jsonStr((S && S.lang) || "th");
    var out = "";
    // Absolute-URL @id fragments (schema.org canonical pattern)
    var orgId = su ? su + "#organization" : "#organization";
    var siteId = su ? su + "#website" : "#website";
    // Site-wide @graph: Organization/Person + WebSite
    // SearchAction/potentialAction intentionally omitted — Google retired Sitelinks Search Box schema Nov 21 2024
    var entityType = seo.orgType === "Person" ? "Person" : seo.orgType === "LocalBusiness" ? "LocalBusiness" : "Organization";
    var sameAsArr = String(seo.sameAs || "").split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var orgProps = ['"@type":"' + entityType + '"', '"@id":"' + orgId + '"', '"name":"' + bt + '"'];
    if (seo.siteUrl) orgProps.push('"url":"' + su + '"');
    if (seo.logoUrl) orgProps.push('"logo":{"@type":"ImageObject","url":"' + jsonStr(seo.logoUrl) + '"' + (su ? ',"@id":"' + su + '#logo"' : '') + '}');
    if (sameAsArr.length) orgProps.push('"sameAs":[' + sameAsArr.map(function (u) { return '"' + jsonStr(u) + '"'; }).join(",") + "]");
    var siteProps = ['"@type":"WebSite"', '"@id":"' + siteId + '"', '"name":"' + bt + '"', '"publisher":{"@id":"' + orgId + '"}'];
    if (seo.siteUrl) siteProps.push('"url":"' + su + '"');
    var siteGraph = '{"@context":"https://schema.org","@graph":[{' + orgProps.join(",") + "},{" + siteProps.join(",") + "}]}";
    out += "<script type='application/ld+json'>" + siteGraph.replace(/"/g, "&quot;") + "</script>\n";
    if (seo.schemaSoftwareApp) {
      var appProps = ['"@type":"SoftwareApplication"', '"name":"' + bt + '"'];
      if (seo.siteUrl) appProps.push('"url":"' + su + '"', '"applicationCategory":"WebApplication"', '"operatingSystem":"All"');
      appProps.push('"publisher":{"@id":"' + orgId + '"}');
      var appGraph = '{"@context":"https://schema.org","@graph":[{' + appProps.join(",") + "}]}";
      out += "<script type='application/ld+json'>" + appGraph.replace(/"/g, "&quot;") + "</script>\n";
    }
    // Per-post: unified @graph [WebPage + BlogPosting + BreadcrumbList]
    // IMPORTANT: use data:view.* only — data:post.* is only valid inside Blog widget b:loop
    // Use <b:eval expr='...'> for all dynamic values embedded in JSON strings
    out += "<b:if cond='data:view.isPost'>\n";
    out += "<script type='application/ld+json'>" +
      "{&quot;@context&quot;:&quot;https://schema.org&quot;,&quot;@graph&quot;:[" +
      // WebPage node
      "{&quot;@type&quot;:&quot;WebPage&quot;,&quot;@id&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>#webpage&quot;,&quot;url&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>&quot;,&quot;name&quot;:&quot;<b:eval expr='data:view.title.jsonEscaped'/>&quot;,&quot;isPartOf&quot;:{&quot;@id&quot;:&quot;" + siteId + "&quot;},&quot;inLanguage&quot;:&quot;" + lang + "&quot;,&quot;datePublished&quot;:&quot;<b:eval expr='data:view.publishDate'/>&quot;,&quot;dateModified&quot;:&quot;<b:eval expr='data:view.lastUpdated'/>&quot;}," +
      // BlogPosting node — author via org @id (data:post.author not available in <head>)
      "{&quot;@type&quot;:&quot;BlogPosting&quot;,&quot;@id&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>#article&quot;,&quot;headline&quot;:&quot;<b:eval expr='data:view.title.jsonEscaped'/>&quot;,&quot;datePublished&quot;:&quot;<b:eval expr='data:view.publishDate'/>&quot;,&quot;dateModified&quot;:&quot;<b:eval expr='data:view.lastUpdated'/>&quot;,&quot;author&quot;:{&quot;@id&quot;:&quot;" + orgId + "&quot;},&quot;publisher&quot;:{&quot;@id&quot;:&quot;" + orgId + "&quot;},&quot;mainEntityOfPage&quot;:{&quot;@id&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>#webpage&quot;},&quot;inLanguage&quot;:&quot;" + lang + "&quot;,&quot;speakable&quot;:{&quot;@type&quot;:&quot;SpeakableSpecification&quot;,&quot;cssSelector&quot;:[&quot;h1.post-title&quot;,&quot;.post-body p:first-of-type&quot;]}<b:if cond='data:view.featuredImage'>,&quot;image&quot;:{&quot;@type&quot;:&quot;ImageObject&quot;,&quot;url&quot;:&quot;<b:eval expr='resizeImage(data:view.featuredImage,1200,&quot;1200:630&quot;)'/>&quot;}</b:if>}," +
      // BreadcrumbList — data:view.* only, no data:post.labels loop in <head>
      "{&quot;@type&quot;:&quot;BreadcrumbList&quot;,&quot;@id&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>#breadcrumb&quot;,&quot;itemListElement&quot;:[{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:1,&quot;name&quot;:&quot;หน้าแรก&quot;,&quot;item&quot;:&quot;<b:eval expr='data:blog.homepageUrl.jsonEscaped'/>&quot;},{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:2,&quot;name&quot;:&quot;<b:eval expr='data:view.title.jsonEscaped'/>&quot;,&quot;item&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>&quot;}]}" +
      "]}</script>\n";
    out += "</b:if>\n";
    // Label page: CollectionPage + BreadcrumbList @graph
    out += "<b:if cond='data:view.isLabelSearch'>\n";
    out += "<script type='application/ld+json'>" +
      "{&quot;@context&quot;:&quot;https://schema.org&quot;,&quot;@graph&quot;:[" +
      "{&quot;@type&quot;:&quot;CollectionPage&quot;,&quot;@id&quot;:&quot;<data:view.url.canonical/>#webpage&quot;,&quot;url&quot;:&quot;<data:view.url.canonical/>&quot;,&quot;name&quot;:&quot;<data:blog.pageName.jsonEscaped/>&quot;,&quot;isPartOf&quot;:{&quot;@id&quot;:&quot;" + siteId + "&quot;},&quot;inLanguage&quot;:&quot;" + lang + "&quot;}," +
      "{&quot;@type&quot;:&quot;BreadcrumbList&quot;,&quot;itemListElement&quot;:[{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:1,&quot;name&quot;:&quot;หน้าแรก&quot;,&quot;item&quot;:&quot;<data:blog.homepageUrl/>&quot;},{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:2,&quot;name&quot;:&quot;<data:blog.pageName.jsonEscaped/>&quot;,&quot;item&quot;:&quot;<data:view.url.canonical/>&quot;}]}" +
      "]}</script>\n";
    out += "</b:if>";
    return out;
  }
  function ogTags(seo) {
    var sn = esc(seo.blogTitle || "MyBlog");
    return [
      "<meta expr:content='data:view.title.escaped' property='og:title'/>",
      "<meta expr:content='data:view.description.escaped' property='og:description'/>",
      "<meta expr:content='data:view.url.canonical' property='og:url'/>",
      "<meta content='" + sn + "' property='og:site_name'/>",
      "<meta expr:content='data:blog.locale' property='og:locale'/>",
      "<b:if cond='data:view.isHomepage'><meta content='website' property='og:type'/><b:else/><meta content='article' property='og:type'/></b:if>",
      "<b:if cond='data:view.featuredImage'>",
      "<meta expr:content='resizeImage(data:view.featuredImage, 1200, \"1200:630\")' property='og:image'/>",
      "<meta content='1200' property='og:image:width'/>",
      "<meta content='630' property='og:image:height'/>",
      "<meta expr:content='data:view.featuredImage' name='twitter:image'/>",
      "</b:if>",
      "<meta content='summary_large_image' name='twitter:card'/>",
      "<meta expr:content='data:view.title.escaped' name='twitter:title'/>",
      "<meta expr:content='data:view.description.escaped' name='twitter:description'/>"
    ].join("\n");
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

  /* ---------- export modal + Build Report ---------- */
  var lastXML = "";
  function buildStatBox(val, lbl, sub) {
    return '<div class="bld-stat"><div class="bld-stat-val">' + esc(String(val)) + '</div>'
      + '<div class="bld-stat-lbl">' + esc(lbl) + '</div>'
      + (sub ? '<div class="bld-stat-sub">' + esc(sub) + '</div>' : '')
      + '</div>';
  }
  function buildReportHTML() {
    var rawCSS = themeCSS(S.design);
    var minCSS = minifyCSS(rawCSS);
    var saved = Math.round((1 - minCSS.length / rawCSS.length) * 100);
    var rawKB = (rawCSS.length / 1024).toFixed(1);
    var minKB = (minCSS.length / 1024).toFixed(1);
    var a = seoAudit();
    var schemaTypes = [];
    if (S.seo.schema) {
      schemaTypes.push("Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "CollectionPage");
      if (S.seo.schemaSoftwareApp) schemaTypes.push("SoftwareApplication");
    }
    var blockCounts = {};
    S.blocks.forEach(function (b) { blockCounts[b.type] = (blockCounts[b.type] || 0) + 1; });
    var blockSummary = Object.keys(blockCounts).map(function (t) {
      return blkLabel(t) + (blockCounts[t] > 1 ? " ×" + blockCounts[t] : "");
    }).join(", ") || "ไม่มีบล็อก";
    var warnings = [];
    if (a.overall < 60) warnings.push("คะแนน SEO ต่ำกว่า 60 — ควรเติมข้อมูลก่อนเผยแพร่");
    if (!S.seo.siteUrl) warnings.push("ยังไม่ตั้งค่า URL เว็บไซต์ — Schema ไม่สมบูรณ์");
    if (!S.seo.logoUrl) warnings.push("ยังไม่ตั้งค่า Logo URL — ขาด Organization.logo");
    if (S.seo.schema && S.seo.siteUrl && !S.seo.siteUrl.startsWith("https")) warnings.push("URL เว็บไซต์ควรขึ้นต้นด้วย https://");
    if (S.seo.og && !S.seo.logoUrl && !S.blocks.some(function (b) { return b.type === "image"; })) warnings.push("OG เปิดอยู่แต่ไม่มี Logo URL หรือบล็อกรูปภาพ — og:image จะว่างเมื่อโพสต์ไม่มี Featured Image");
    var imgNoAlt = S.blocks.filter(function (b) { return b.type === "image" && (!b.props.alt || b.props.alt.trim().length < 3); });
    if (imgNoAlt.length) warnings.push("รูปภาพ " + imgNoAlt.length + " รายการขาด ALT text");

    return '<div style="padding:14px 18px 12px">'
      + '<div style="font-family:var(--fd);font-weight:600;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px">📊 Build Report</div>'
      + '<div class="bld-stats">'
      + buildStatBox(S.blocks.length, "Blocks", blockSummary.length > 40 ? blockSummary.slice(0, 38) + "…" : blockSummary)
      + buildStatBox(minKB + " KB", "CSS (minified)", "ลด " + saved + "% จาก " + rawKB + " KB")
      + buildStatBox(a.overall + "/100", "SEO Score", a.label)
      + '</div>'
      + '<div style="font-size:12px;color:var(--ink-3);margin-bottom:4px"><b style="color:var(--ink-2)">Blocks:</b> ' + esc(blockSummary) + '</div>'
      + (schemaTypes.length ? '<div style="font-size:12px;color:var(--ink-3);margin-bottom:8px"><b style="color:var(--ink-2)">Schema:</b> ' + esc(schemaTypes.join(", ")) + '</div>' : '')
      + (warnings.length
          ? warnings.map(function (w) { return '<div class="bld-warn">' + svg('<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', 2) + w + '</div>'; }).join("")
          : '<div style="font-size:12px;color:var(--ok)">✓ ไม่พบปัญหาในโปรเจกต์</div>')
      + '</div>';
  }
  function openExport() {
    lastXML = genXML();
    var v = validateXML(lastXML);
    var badge = $("#validBadge");
    badge.className = "vbadge " + (v.ok ? "ok" : "bad");
    badge.textContent = v.ok ? "✓ XML valid" : "✕ " + v.msg;
    var rpt = $("#buildReport");
    if (rpt) {
      rpt.innerHTML = buildReportHTML();
      rpt.style.maxHeight = "0";
    }
    $("#xmlOut").innerHTML = highlightXML(lastXML);
    $("#exportModal").classList.add("open");
  }
  $("#exportBtn").addEventListener("click", openExport);
  var reportOpen = false;
  var toggleRptBtn = $("#toggleReport");
  if (toggleRptBtn) toggleRptBtn.addEventListener("click", function () {
    var rpt = $("#buildReport"); if (!rpt) return;
    reportOpen = !reportOpen;
    rpt.style.maxHeight = reportOpen ? rpt.scrollHeight + "px" : "0";
    toggleRptBtn.style.background = reportOpen ? "var(--surface-2)" : "";
  });

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

  /* ---------- Export Center: install guide + .bxb ---------- */
  function installGuideHTML() {
    var su = (S && S.seo && S.seo.siteUrl) || "";
    var domain = su ? su.replace(/\/$/, "") : "https://yourblog.blogspot.com";
    var atomUrl = domain + "/atom.xml?redirect=false&start-index=1&max-results=500";
    var robotsTxt = "User-agent: *\nDisallow: /search\nAllow: /\n\nUser-agent: Googlebot\nDisallow: /search\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: " + atomUrl;
    return '<div style="padding:14px 18px 14px">'
      + '<div style="font-family:var(--fd);font-weight:600;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px">📖 วิธีนำธีมไปใช้บน Blogger</div>'
      + '<ol style="padding-left:22px;display:flex;flex-direction:column;gap:7px;font-size:13px;color:var(--ink-2);line-height:1.6">'
      + '<li>กดปุ่ม <b>"ดาวน์โหลด .xml"</b> ด้านล่างเพื่อบันทึกไฟล์ธีม</li>'
      + '<li>ไปที่ <b>blogger.com</b> → เลือกบล็อกของคุณ</li>'
      + '<li>เมนูซ้าย → <b>ธีม (Theme)</b> → กดปุ่มลูกศร <b>▾</b> ข้างปุ่ม "ปรับแต่ง"</li>'
      + '<li>เลือก <b>"กู้คืน (Restore)"</b> แล้วเลือกไฟล์ .xml ที่ดาวน์โหลดมา</li>'
      + '<li>กด <b>อัปโหลด (Upload)</b> — ธีมจะถูกใช้งานทันที ✓</li>'
      + '</ol>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">'
      + '<div style="padding:9px 11px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.22);border-radius:8px;font-size:12px;color:#fbbf24;line-height:1.5">⚠ <b>สำรองก่อน:</b> ธีม → ▾ → สำรองข้อมูล</div>'
      + '<div style="padding:9px 11px;background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.2);border-radius:8px;font-size:12px;color:#4ade80;line-height:1.5">💡 ไฟล์ .bxb เปิดกลับมาแก้ไขใน Builder ได้ทุกเมื่อ</div>'
      + '</div>'
      + '<div class="sec-divider" style="margin:12px 0 8px"></div>'
      + '<div style="font-family:var(--fd);font-weight:600;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px">🗺 Google Search Console Sitemap</div>'
      + '<div style="font-size:12px;color:var(--ink-3);margin-bottom:7px">ส่ง URL นี้ใน <b>GSC → Sitemaps</b> เพื่อให้ Google รู้จักบทความทั้งหมด</div>'
      + '<div style="display:flex;align-items:center;gap:6px">'
      + '<code style="flex:1;padding:6px 9px;background:var(--surface-2);border-radius:6px;font-size:11px;word-break:break-all;color:var(--ink-2);font-family:monospace">' + esc(atomUrl) + '</code>'
      + '<button data-action="copy-atom" data-value="' + esc(atomUrl) + '" style="flex:none;padding:6px 10px;background:var(--brand);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;white-space:nowrap">คัดลอก</button>'
      + '</div>'
      + '<div class="sec-divider" style="margin:12px 0 8px"></div>'
      + '<div style="font-family:var(--fd);font-weight:600;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px">🤖 robots.txt Template (AI Bots)</div>'
      + '<div style="font-size:12px;color:var(--ink-3);margin-bottom:7px">วางใน <b>Blogger → Settings → Custom robots.txt</b></div>'
      + '<pre data-robots-tmpl style="margin:0 0 7px;padding:9px 11px;background:var(--surface-2);border-radius:7px;font-size:11px;line-height:1.6;overflow-x:auto;white-space:pre;color:var(--ink-2);font-family:monospace">' + robotsTxt + '</pre>'
      + '<button data-action="copy-robots" style="padding:6px 12px;background:var(--surface-2);color:var(--ink-2);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer">คัดลอก robots.txt</button>'
      + '</div>';
  }
  var guideOpen = false;
  var toggleGuideBtn = $("#toggleGuide");
  if (toggleGuideBtn) toggleGuideBtn.addEventListener("click", function () {
    var ig = $("#installGuide"); if (!ig) return;
    guideOpen = !guideOpen;
    if (guideOpen && !ig.innerHTML.trim()) {
      ig.innerHTML = installGuideHTML();
      ig.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (btn.dataset.action === "copy-atom") {
            navigator.clipboard.writeText(btn.dataset.value || "").then(function () { toast("คัดลอก URL แล้ว"); });
          } else if (btn.dataset.action === "copy-robots") {
            var pre = ig.querySelector("[data-robots-tmpl]");
            if (pre) navigator.clipboard.writeText(pre.textContent).then(function () { toast("คัดลอก robots.txt แล้ว"); });
          }
        });
      });
    }
    ig.style.maxHeight = guideOpen ? ig.scrollHeight + "px" : "0";
    toggleGuideBtn.style.background = guideOpen ? "var(--surface-2)" : "";
  });
  var dlBxbBtn = $("#dlBxb");
  if (dlBxbBtn) dlBxbBtn.addEventListener("click", function () {
    if (!S) return;
    download(JSON.stringify(S, null, 2), (slug(S.name) || "project") + ".bxb", "application/json");
    toast("บันทึก .bxb แล้ว");
  });

  function download(text, name, mime) { var b = new Blob([text], { type: mime + ";charset=utf-8" }); var u = URL.createObjectURL(b); var a = el("a", { href: u, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1500); }
  function slug(s) { return String(s || "").trim().toLowerCase().replace(/[^\w\u0e00-\u0e7f]+/g, "-").replace(/^-+|-+$/g, ""); }
  function toast(m) { var t = $("#toast"); $("#toastMsg").textContent = m; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("show"); }, 1900); }

  /* ---------- top bar actions ---------- */
  $("#projName").addEventListener("input", function () { S.name = this.value; save(); });
  $("#undoBtn").addEventListener("click", function () { if (HISTORY.length > 1) { HISTORY.pop(); S.blocks = JSON.parse(HISTORY[HISTORY.length - 1].snap); SEL = null; renderCanvas(); renderProps(); renderSeo(); save(); toast("ย้อนกลับแล้ว"); } });
  $("#restartBtn").addEventListener("click", function () { if (confirm("เริ่มใหม่? โปรเจกต์ปัจจุบันจะถูกล้าง")) { localStorage.removeItem(KEY); location.reload(); } });

  /* ---------- start screen ---------- */
  var curCat = "ทั้งหมด";

  function tplThumb(t) {
    var c1 = t.c[0], c2 = t.c[1];
    var bl = t.blocks;
    var hasHero = bl.indexOf("hero") >= 0;
    var hasFeat = bl.indexOf("featured") >= 0;
    var hasGrid = bl.indexOf("postgrid") >= 0;
    var hasList = bl.indexOf("postlist") >= 0;
    var hasSide = bl.indexOf("sidebar") >= 0;

    var heroHtml = "";
    if (hasHero) {
      heroHtml = '<div class="t-hero-sec" style="background:linear-gradient(135deg,' + c1 + "," + c2 + ')">'
        + '<div class="th1"></div><div class="th2"></div><div class="tbtn"></div></div>';
    } else if (hasFeat) {
      heroHtml = '<div class="t-feat-sec" style="background:' + c1 + '18;border-left:3px solid ' + c1 + '"></div>';
    }

    var bodyHtml = "";
    if (hasGrid) {
      var ncols = hasSide ? 2 : 3;
      var cards = "";
      for (var i = 0; i < ncols; i++) {
        cards += '<div class="tgc"><div class="tgc-img" style="background:' + c1 + '28"></div><div class="tgc-body"></div></div>';
      }
      bodyHtml = '<div class="t-grid-row">' + cards + '</div>';
    } else if (hasList) {
      bodyHtml = '<div class="t-list-row"></div><div class="t-list-row ts"></div>'
               + '<div class="t-list-row"></div><div class="t-list-row ts"></div>';
    } else {
      bodyHtml = '<div class="t-list-row"></div><div class="t-list-row ts"></div>';
    }

    return '<div class="t-mini">'
      + '<div class="t-chrome"><span class="tc-r"></span><span class="tc-y"></span><span class="tc-g"></span><div class="tc-url"></div></div>'
      + '<div class="t-site-hdr" style="background:' + c1 + '">'
      + '<div class="t-site-logo"></div><div class="t-site-nav"><i></i><i></i><i></i></div></div>'
      + heroHtml
      + '<div class="t-body-sec">' + bodyHtml + '</div>'
      + '<div class="t-foot-sec" style="background:' + c1 + '28"></div>'
      + '</div>';
  }

  function renderStart() {
    $("#catTabs").innerHTML = CATS.map(function (c) { return '<button class="cat-tab' + (c === curCat ? " on" : "") + '" data-c="' + c + '">' + c + "</button>"; }).join("");
    var list = TEMPLATES.filter(function (t) { return curCat === "ทั้งหมด" || t.cat === curCat; });
    $("#startGrid").innerHTML = list.map(function (t) {
      return '<div class="tpl-card" data-tpl="' + t.id + '">'
        + '<div class="thumb">' + tplThumb(t) + '</div>'
        + '<div class="meta"><h4>' + t.name + '</h4><p>' + t.desc + '</p>'
        + '<span class="tpl-cat-badge">' + t.cat + '</span></div>'
        + '</div>';
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
    setView(VIEW); renderProps(); renderSeo(); renderDesign(); setupLibDrag(); save();
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
        + '<span class="lg"><button data-lup title="ขึ้น">↑</button><button data-ldn title="ลง">↓</button><button data-ldup title="ทำซ้ำ">⧉</button><button data-ldel title="ลบ">✕</button></span>'
        + '</div>';
    }).join("");
    // bind
    var dragId = null;
    $$(".layer-row", v).forEach(function (row) {
      row.addEventListener("click", function (e) { if (e.target.closest("button")) return; select(row.dataset.id); });
      row.querySelector("[data-lup]").addEventListener("click", function (e) { e.stopPropagation(); move(row.dataset.id, -1); renderLayers(); });
      row.querySelector("[data-ldn]").addEventListener("click", function (e) { e.stopPropagation(); move(row.dataset.id, 1); renderLayers(); });
      row.querySelector("[data-ldup]").addEventListener("click", function (e) { e.stopPropagation(); duplicate(row.dataset.id); renderLayers(); });
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
    "โครงสร้างหลัก": "Layout", "เนื้อหา": "Content", "ส่วนเสริม": "Extras", "บทความ & UX": "Article & UX",
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
    "Sidebar Layout": "Sidebar Layout", "เนื้อหา + ไซด์บาร์": "Content + Sidebar",
    "ช่องค้นหา": "Search Box", "Search Box": "Search Box",
    "สารบัญ (TOC)": "Table of Contents (TOC)", "บทความที่เกี่ยวข้อง": "Related Posts",
    "สรุปสำหรับ AI / Google": "AI / Google summary", "สร้างจาก h2/h3 อัตโนมัติ": "Auto-generated from h2/h3",
    "แถบความคืบหน้าการอ่าน": "Reading progress bar", "ปุ่มสลับธีมมืด/สว่าง": "Dark/light theme toggle",
    // block labels
    "เกี่ยวกับ": "About", "CTA": "CTA", "โฆษณา": "Ad", "Sidebar": "Sidebar", "ค้นหา": "Search",
    // field labels
    "ข้อความโลโก้": "Logo text", "เมนูนำทาง — ใส่ลิงก์ได้แต่ละอัน": "Navigation — set a link per item",
    "+ เพิ่มเมนู": "+ Add menu item", "เมนูมือถือเด้งจาก": "Mobile menu slides from",
    "◧ ซ้าย": "◧ Left", "ขวา ◨": "Right ◨", "ติดด้านบน (Sticky)": "Sticky top", "แสดงปุ่มค้นหา": "Show search",
    "หัวข้อ": "Heading", "คำโปรย": "Subtitle", "ข้อความปุ่ม": "Button text",
    "จัดวาง": "Align", "ซ้าย": "Left", "กลาง": "Center", "พื้นหลัง": "Background",
    "ไล่สี": "Gradient", "เข้ม": "Dark", "อ่อน": "Soft",
    "เกี่ยวกับ (คอลัมน์แรก)": "About (first column)", "เกี่ยวกับ (คำอธิบายสั้น)": "About (short description)", "จำนวนคอลัมน์": "Columns",
    "ลิงก์ใน Footer": "Footer links", "+ เพิ่มลิงก์": "+ Add link", "โซเชียลมีเดีย": "Social media", "+ เพิ่ม Social": "+ Add social",
    "ข้อความลิขสิทธิ์": "Copyright text", "แสดงไอคอนโซเชียล": "Show social icons",
    "หัวข้อส่วน": "Section heading", "จำนวนบทความ": "Post count",
    "แสดงรูปภาพ": "Show image", "แสดงคำโปรย": "Show excerpt",
    "ชื่อ/ผู้เขียน": "Name / author", "ประวัติ (E-E-A-T)": "Bio (E-E-A-T)", "แสดงรูปโปรไฟล์": "Show avatar",
    "เนื้อหา": "Body", "ข้อความ ALT (SEO)": "ALT text (SEO)", "คำบรรยายใต้ภาพ": "Caption",
    "สัดส่วน": "Ratio", "ตำแหน่ง": "Position", "บน": "Top", "ข้าง": "Side",
    "ตั้งค่าพื้นหลัง": "Background",
    // Phase 3 block fields
    "ตำแหน่งปุ่ม": "Button position", "ขวาล่าง": "Bottom right", "ซ้ายล่าง": "Bottom left", "ขวาบน": "Top right", "ซ้ายบน": "Top left",
    "หัวข้อกล่องสรุป": "Summary box heading", "สไตล์": "Style", "การ์ด": "Card", "ไฮไลท์": "Highlight", "เรียบ": "Minimal",
    "หัวข้อสารบัญ": "TOC heading", "ความลึก heading": "Heading depth", "h2 เท่านั้น": "h2 only", "แสดงลำดับตัวเลข": "Show numbering",
    "สีแถบ": "Bar color", "ความสูง (px)": "Height (px)",
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
    var mlb = document.getElementById("mobLangBtn"); if (mlb) mlb.textContent = lang.toUpperCase();
    buildLib(); setupLibDrag(); if (typeof renderProps === "function") renderProps(); renderSeo(); renderDesign();
    translateChrome();
  }
  var blEl = $("#blLang");
  if (blEl) blEl.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) applyBuilderLang(b.dataset.bl); });

  var mobLangBtn = $("#mobLangBtn");
  if (mobLangBtn) {
    mobLangBtn.addEventListener("click", function () {
      var next = BL === "th" ? "en" : "th";
      applyBuilderLang(next);
      mobLangBtn.textContent = next.toUpperCase();
    });
  }

  /* ---------- IMPORT JSON ---------- */
  var importFileEl = $("#importFile");
  var importBtnEl = $("#importBtn");
  if (importBtnEl && importFileEl) {
    importBtnEl.addEventListener("click", function () { importFileEl.click(); });
    importFileEl.addEventListener("change", function () {
      var file = importFileEl.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = JSON.parse(e.target.result);
          if (!data || !Array.isArray(data.blocks)) { toast("ไฟล์ไม่ถูกต้อง — ต้องเป็น .json ที่ export จาก BloggerXMLBuilder"); return; }
          S = data;
          if (!S.seo) S.seo = freshProject().seo;
          if (!S.design) S.design = freshProject().design;
          SEL = null; HISTORY = []; pushHistory();
          $("#startScreen").style.display = "none";
          $("#projName").value = S.name || "โปรเจกต์";
          renderCanvas(); renderProps(); renderSeo(); renderDesign(); buildLib(); setupLibDrag(); save();
          toast("โหลดโปรเจกต์แล้ว: " + (S.name || "ไม่มีชื่อ"));
        } catch (err) { toast("อ่านไฟล์ไม่ได้ — " + String(err).slice(0, 60)); }
      };
      reader.readAsText(file);
      importFileEl.value = "";
    });
  }

  /* ---------- VERSION HISTORY ---------- */
  function historyTimeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "เมื่อกี้";
    if (diff < 3600) return Math.floor(diff / 60) + " นาทีที่แล้ว";
    if (diff < 86400) return Math.floor(diff / 3600) + " ชั่วโมงที่แล้ว";
    return Math.floor(diff / 86400) + " วันที่แล้ว";
  }
  function showHistory() {
    var m = $("#historyModal"); if (!m) return;
    var list = $("#historyList"); if (!list) return;
    if (HISTORY.length <= 1) { list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--ink-3);font-size:13.5px">ยังไม่มีประวัติ<br>เริ่มแก้ไขโปรเจกต์เพื่อบันทึกอัตโนมัติ</div>'; }
    else {
      var items = HISTORY.slice().reverse();
      list.innerHTML = items.map(function (h, i) {
        var blocks = JSON.parse(h.snap);
        var isCurrent = i === 0;
        return '<div class="hist-row' + (isCurrent ? " hist-curr" : "") + '" data-hi="' + (HISTORY.length - 1 - i) + '">'
          + '<span class="hist-dot"></span>'
          + '<span class="hist-info">'
          + '<span class="hist-time">' + (isCurrent ? "ปัจจุบัน" : historyTimeAgo(h.ts)) + '</span>'
          + '<span class="hist-meta">' + blocks.length + ' blocks'
          + (blocks.length ? ' — ' + blocks.slice(0, 3).map(function (b) { return blkLabel(b.type); }).join(", ") + (blocks.length > 3 ? "…" : "") : "")
          + '</span></span>'
          + (isCurrent ? '' : '<button class="hist-restore btn btn-ghost btn-sm" data-hi="' + (HISTORY.length - 1 - i) + '">Restore</button>')
          + '</div>';
      }).join("");
      $$(".hist-restore", list).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var idx = parseInt(btn.dataset.hi, 10);
          S.blocks = JSON.parse(HISTORY[idx].snap);
          HISTORY = HISTORY.slice(0, idx + 1);
          SEL = null; renderCanvas(); renderProps(); renderSeo(); save();
          m.classList.remove("open");
          toast("กู้คืนแล้ว (" + historyTimeAgo(HISTORY[idx].ts) + ")");
        });
      });
    }
    m.classList.add("open");
  }
  var histBtnEl = $("#historyBtn");
  if (histBtnEl) histBtnEl.addEventListener("click", showHistory);
  var histModal = $("#historyModal");
  if (histModal) {
    histModal.querySelector("[data-hx]").addEventListener("click", function () { histModal.classList.remove("open"); });
    histModal.querySelector(".modal-scrim").addEventListener("click", function () { histModal.classList.remove("open"); });
  }

  /* ---------- COMMAND PALETTE (Ctrl+K / ⌘K) ---------- */
  var CMD_ACTIONS = [
    { group: "การดำเนินการ", label: "Export XML", sub: "สร้าง Blogger XML และดาวน์โหลด", icon: IC.cursor, kbd: "", fn: function () { openExport(); } },
    { group: "การดำเนินการ", label: "ย้อนกลับ (Undo)", sub: "ย้อนการเปลี่ยนแปลงล่าสุด", icon: IC.cursor, kbd: "⌘Z", fn: function () { $("#undoBtn").click(); } },
    { group: "การดำเนินการ", label: "ทำซ้ำ Block ที่เลือก", sub: "สร้างสำเนาของ block ปัจจุบัน", icon: IC.columns, kbd: "⌘D", fn: function () { if (SEL) duplicate(SEL); else toast("เลือก block ก่อน"); } },
    { group: "การดำเนินการ", label: "Version History", sub: "ดูและกู้คืนประวัติการแก้ไข", icon: IC.history, kbd: "", fn: function () { showHistory(); } },
    { group: "การดำเนินการ", label: "โหลดโปรเจกต์ (.json)", sub: "นำเข้าโปรเจกต์จากไฟล์ JSON", icon: IC.image, kbd: "", fn: function () { var f = $("#importFile"); if (f) f.click(); } },
    { group: "การดำเนินการ", label: "พรีวิวหน้าต่างใหม่", sub: "เปิดพรีวิวในแท็บใหม่", icon: IC.image, kbd: "", fn: function () { $("#popoutBtn").click(); } },
    { group: "มุมมอง", label: "Desktop (เดสก์ท็อป)", sub: "พรีวิวขนาดจอใหญ่", icon: IC.cursor, fn: function () { setView("desktop"); } },
    { group: "มุมมอง", label: "Tablet (แท็บเล็ต)", sub: "พรีวิวขนาด 768px", icon: IC.cursor, fn: function () { setView("tablet"); } },
    { group: "มุมมอง", label: "Mobile (มือถือ)", sub: "พรีวิวขนาด 390px", icon: IC.cursor, fn: function () { setView("mobile"); } },
    { group: "แผง", label: "แผงคุณสมบัติ", sub: "ปรับแต่ง block ที่เลือก", icon: IC.text, fn: function () { switchRight("props"); } },
    { group: "แผง", label: "แผง SEO", sub: "ตั้งค่า SEO และ Schema", icon: IC.cursor, fn: function () { switchRight("seo"); } },
    { group: "แผง", label: "แผงดีไซน์", sub: "เปลี่ยนสี ฟอนต์ และขอบ", icon: IC.cursor, fn: function () { switchRight("design"); } },
    { group: "แผง", label: "โครงสร้างหน้า (Layers)", sub: "ดูและจัดลำดับ block", icon: IC.columns, fn: function () { var t = $("#leftTabs"); if (t) { $$("button", t).forEach(function (b) { b.classList.toggle("on", b.dataset.lt === "layers"); }); var lv = $("#layersView"); var lg = $("#libGroups"); if (lv) lv.style.display = ""; if (lg) lg.style.display = "none"; renderLayers(); } } }
  ];
  // Build element-add commands from LIB
  var CMD_ELEMENTS = [];
  LIB.forEach(function (g) {
    g[1].forEach(function (it) {
      (function (type, name, desc) {
        CMD_ELEMENTS.push({ group: "เพิ่มองค์ประกอบ", label: "เพิ่ม " + name, sub: desc, icon: IC[type] || IC.text, fn: function () {
          if (!S) { toast("เปิดโปรเจกต์ก่อนนะครับ"); return; }
          addBlock(type);
        }});
      })(it[0], it[1], it[2]);
    });
  });
  var CMD_ALL = CMD_ACTIONS.concat(CMD_ELEMENTS);

  var cmdIsOpen = false, cmdHiIdx = -1;
  function openCmdPal() {
    var pal = $("#cmdPal"); if (!pal) return;
    pal.classList.add("open"); cmdIsOpen = true; cmdHiIdx = -1;
    var inp = $("#cmdInp"); if (inp) { inp.value = ""; inp.focus(); }
    renderCmdList("");
  }
  function closeCmdPal() {
    var pal = $("#cmdPal"); if (pal) pal.classList.remove("open");
    cmdIsOpen = false;
  }
  function cmdFiltered(q) {
    q = (q || "").toLowerCase().trim();
    if (!q) return CMD_ALL;
    return CMD_ALL.filter(function (c) {
      return c.label.toLowerCase().indexOf(q) >= 0 || (c.sub || "").toLowerCase().indexOf(q) >= 0 || c.group.toLowerCase().indexOf(q) >= 0;
    });
  }
  function renderCmdList(q) {
    var list = $("#cmdList"); if (!list) return;
    var flat = cmdFiltered(q);
    if (!flat.length) { list.innerHTML = '<div class="cmd-empty">ไม่พบคำสั่ง "<b>' + esc(q) + '</b>"<br><span style="font-size:12px;margin-top:4px;display:block">ลองค้นหาชื่อองค์ประกอบหรือการดำเนินการ</span></div>'; return; }
    var groups = {}, order = [];
    flat.forEach(function (c, i) {
      if (!groups[c.group]) { groups[c.group] = []; order.push(c.group); }
      groups[c.group].push({ cmd: c, idx: i });
    });
    var html = "";
    order.forEach(function (g) {
      html += '<div class="cmd-grp">' + esc(g) + '</div>';
      groups[g].forEach(function (item) {
        html += '<div class="cmd-row' + (item.idx === cmdHiIdx ? " hi" : "") + '" data-ci="' + item.idx + '">'
          + '<span class="ci">' + svg(item.cmd.icon || IC.text) + '</span>'
          + '<span class="cn">' + esc(item.cmd.label) + '</span>'
          + '<span class="cs">' + esc(item.cmd.sub || "") + '</span>'
          + (item.cmd.kbd ? '<span class="ck">' + item.cmd.kbd + '</span>' : '')
          + '</div>';
      });
    });
    list.innerHTML = html;
    $$(".cmd-row", list).forEach(function (row) {
      row.addEventListener("click", function () {
        var i = parseInt(row.dataset.ci, 10);
        var f = cmdFiltered($("#cmdInp") ? $("#cmdInp").value : "");
        if (f[i]) { closeCmdPal(); f[i].fn(); }
      });
    });
  }
  function cmdExecHighlighted() {
    var q = $("#cmdInp") ? $("#cmdInp").value : "";
    var flat = cmdFiltered(q);
    var pick = cmdHiIdx >= 0 ? flat[cmdHiIdx] : flat[0];
    if (pick) { closeCmdPal(); pick.fn(); }
  }
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); cmdIsOpen ? closeCmdPal() : openCmdPal(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === "d") { var tag = e.target.tagName; if (tag === "INPUT" || tag === "TEXTAREA") return; e.preventDefault(); if (SEL) duplicate(SEL); return; }
    if (!cmdIsOpen) return;
    if (e.key === "Escape") { closeCmdPal(); return; }
    if (e.key === "Enter") { e.preventDefault(); cmdExecHighlighted(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var q = $("#cmdInp") ? $("#cmdInp").value : "";
      var flat = cmdFiltered(q);
      if (!flat.length) return;
      cmdHiIdx = e.key === "ArrowDown" ? Math.min(cmdHiIdx + 1, flat.length - 1) : Math.max(cmdHiIdx - 1, 0);
      renderCmdList(q);
      var hi = $(".cmd-row.hi", $("#cmdList")); if (hi) hi.scrollIntoView({ block: "nearest" });
    }
  });
  var cmdInpEl = $("#cmdInp");
  if (cmdInpEl) cmdInpEl.addEventListener("input", function () { cmdHiIdx = -1; renderCmdList(this.value); });
  var cmdScrimEl = $("#cmdScrim");
  if (cmdScrimEl) cmdScrimEl.addEventListener("click", closeCmdPal);
  var cmdBtnEl = $("#cmdBtn");
  if (cmdBtnEl) cmdBtnEl.addEventListener("click", openCmdPal);

  /* ---------- FLOATING RICH TEXT TOOLBAR ---------- */
  (function () {
    var rtb = $("#richToolbar"), rtbLinks = $("#rtbLinks"), rtbLL = $("#rtbLinkList");
    if (!rtb) return;
    var activeRich = null;

    function showTB(x, y) {
      rtb.style.left = Math.max(4, Math.min(x - 80, window.innerWidth - 240)) + "px";
      rtb.style.top = Math.max(4, y - 48) + "px";
      rtb.classList.add("show");
    }
    function hideTB() {
      rtb.classList.remove("show");
      if (rtbLinks) rtbLinks.classList.remove("show");
    }

    // Show toolbar after mouseup if there is a text selection in a rich textarea
    document.addEventListener("mouseup", function (e) {
      if (rtb.contains(e.target) || (rtbLinks && rtbLinks.contains(e.target))) return;
      if (!activeRich) return;
      var s = activeRich.selectionStart, en = activeRich.selectionEnd;
      if (s !== en) showTB(e.clientX, e.clientY);
      else if (!rtb.contains(e.target)) rtb.classList.remove("show");
    });

    // Track which rich textarea is active
    document.addEventListener("focusin", function (e) {
      if (e.target && e.target.dataset && e.target.dataset.rich) {
        activeRich = e.target;
      } else if (!rtb.contains(e.target) && !(rtbLinks && rtbLinks.contains(e.target))) {
        activeRich = null; hideTB();
      }
    });
    document.addEventListener("focusout", function (e) {
      if (!e.target || !e.target.dataset || !e.target.dataset.rich) return;
      setTimeout(function () {
        var foc = document.activeElement;
        if (!foc || (!foc.dataset || !foc.dataset.rich) && !rtb.contains(foc) && !(rtbLinks && rtbLinks.contains(foc))) {
          hideTB();
        }
      }, 150);
    });

    // Toolbar button handler
    rtb.addEventListener("mousedown", function (e) {
      e.preventDefault();
      var btn = e.target.closest("[data-rtb]");
      if (!btn || !activeRich) return;
      var cmd = btn.dataset.rtb;
      if (cmd === "link") {
        showLinkDD(e.clientX, e.clientY + 8);
        return;
      }
      if (cmd === "clear") {
        var s = activeRich.selectionStart, en = activeRich.selectionEnd, val = activeRich.value;
        if (s !== en) {
          var cleaned = val.slice(s, en).replace(/<[^>]+>/g, "");
          activeRich.value = val.slice(0, s) + cleaned + val.slice(en);
        } else {
          activeRich.value = val.replace(/<[^>]+>/g, "");
        }
        activeRich.dispatchEvent(new Event("input", { bubbles: true }));
        rtb.classList.remove("show");
        return;
      }
      var tagMap = { bold: "b", italic: "i", underline: "u", strikethrough: "s" };
      if (tagMap[cmd]) { wrapSel(activeRich, tagMap[cmd]); }
    });

    // Link suggestion dropdown
    function showLinkDD(x, y) {
      if (!rtbLL || !rtbLinks) return;
      var sugg = buildLinkSuggestions();
      rtbLL.innerHTML = sugg.map(function (l) {
        return '<div class="rtb-link-row" data-url="' + esc(l.url) + '">'
          + '<span>' + esc(l.label) + '</span>'
          + '<span class="rtb-link-url">' + esc(l.url) + '</span>'
          + '</div>';
      }).join("");
      $$(".rtb-link-row", rtbLL).forEach(function (row) {
        row.addEventListener("mousedown", function (e) {
          e.preventDefault();
          applyLink(row.dataset.url);
          hideTB();
        });
      });
      rtbLinks.style.left = Math.max(4, Math.min(x, window.innerWidth - 250)) + "px";
      rtbLinks.style.top = y + "px";
      rtbLinks.classList.add("show");
      var cu = $("#rtbCustomUrl");
      if (cu) { cu.value = ""; cu.focus(); }
    }

    // Custom URL input handlers
    var cu = $("#rtbCustomUrl");
    if (cu) {
      cu.addEventListener("mousedown", function (e) { e.stopPropagation(); });
      cu.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          var url = cu.value.trim();
          if (url) { applyLink(url); hideTB(); if (activeRich) activeRich.focus(); }
        }
        if (e.key === "Escape") { hideTB(); if (activeRich) activeRich.focus(); }
      });
    }

    function applyLink(url) {
      if (!activeRich) return;
      var s = activeRich.selectionStart, en = activeRich.selectionEnd, val = activeRich.value;
      var sel = s !== en ? val.slice(s, en) : url;
      var link = "<a href='" + esc(url) + "'>" + sel + "</a>";
      activeRich.value = val.slice(0, s) + link + val.slice(en);
      activeRich.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Close on outside click
    document.addEventListener("mousedown", function (e) {
      if (!rtb.contains(e.target) && !(rtbLinks && rtbLinks.contains(e.target)) && e.target !== activeRich) {
        hideTB();
      }
    });
  })();

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
