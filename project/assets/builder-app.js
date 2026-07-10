/* ==========================================================================
   BlogKub · Visual Builder App (Vanilla JS, client-side)
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
    ]],
    ["หน้าพิเศษ", [
      ["notfound", "หน้า 404", "ออกแบบ Page Not Found"]
    ]]
  ];

  /* defaults per block type */
  function blockDefaults(type) {
    var d = BL === "en" ? {
      header: { logoText: "MyBlog", menuItems: [
        { id: "m1", type: "home",   label: "Home",    url: "/" },
        { id: "m2", type: "search", label: "Posts",   url: "/search" },
        { id: "m3", type: "page",   label: "About",   pageSlug: "about",   pageCreated: true, url: "/p/about.html" },
        { id: "m4", type: "page",   label: "Contact", pageSlug: "contact", pageCreated: true, url: "/p/contact.html" }
      ], sticky: true, showSearch: true, mobileSide: "right" },
      hero: { eyebrow: "✦ Personal Blog", title: "Welcome to Our Blog", subtitle: "Sharing knowledge and quality articles, updated every week", btnText: "Read Latest Posts", align: "center", bg: "gradient", showImage: true, imageUrl: "" },
      footer: { about: "A blog sharing knowledge and quality articles", copyright: "© 2026 MyBlog. All rights reserved.",
        footerLinks: [{ label: "Home", url: "/" }, { label: "Posts", url: "/search" }, { label: "About", url: "/p/about.html" }, { label: "Contact", url: "/p/contact.html" }],
        socialLinks: [], bgColor: "#0f172a" },
      postgrid: { heading: "Latest Posts", columns: 3, count: 6, showImage: true, showExcerpt: true, readMore: "Read more →", cardRadius: 14, cardStyle: "shadow" },
      postlist: { heading: "Read More", count: 5, showImage: true },
      featured: { heading: "Featured", count: 1, featLabel: "Featured" },
      about: { eyebrow: "About the Author", name: "MyBlog Team", bio: "We are a team of experts sharing knowledge through quality articles for over 5 years.", showAvatar: true, avatarUrl: "" },
      text: { heading: "Your Heading", body: "Write your content here. Add the text you want readers to see.", align: "left" },
      cta: { title: "Ready to get started?", btnText: "Get Started", btnUrl: "/", bg: "soft" },
      image: { alt: "Image description", caption: "", ratio: "16/9", src: "" },
      ad: { slot: "Below header", label: true },
      newsletter: { heading: "Get Updates First", sub: "Enter your email to receive new posts instantly · free, no spam", btnText: "Subscribe", bg: "soft" },
      share: { label: "Share this article", facebook: true, twitter: true, line: true, copy: true },
      sidebar: { position: "right", width: "280px", showSearch: true, showCategories: true, showArchive: true, showAbout: false },
      search: { heading: "", placeholder: "Search blog…" },
      columns: { heading: "Our Services", cols: 3, items: [
        { icon: "★", title: "High Quality", text: "Carefully curated content, reliable and trustworthy" },
        { icon: "⚡", title: "Fast", text: "Loads quickly, smooth on all devices" },
        { icon: "♥", title: "Caring", text: "We care about every reader" }
      ] },
      darkmode: { position: "bottom-right" },
      aeo: { title: "Article Summary", style: "card" },
      toc: { title: "Table of Contents", maxDepth: "3", numbered: true },
      related: { heading: "Related Posts", count: 4, columns: 2, showImage: true },
      progress: { height: 3, color: "primary" },
      notfound: { template: "minimal", heading: "404", sub: "Sorry · Page Not Found", desc: "The page you're looking for may have been moved, deleted, or the URL is incorrect.", btnText: "Back to Home", btnUrl: "/", showSearch: true }
    } : {
      header: { logoText: "MyBlog", menuItems: [
        { id: "m1", type: "home",   label: "หน้าแรก", url: "/" },
        { id: "m2", type: "search", label: "บทความ",  url: "/search" },
        { id: "m3", type: "page",   label: "เกี่ยวกับ", pageSlug: "about",   pageCreated: true, url: "/p/about.html" },
        { id: "m4", type: "page",   label: "ติดต่อ",    pageSlug: "contact", pageCreated: true, url: "/p/contact.html" }
      ], sticky: true, showSearch: true, mobileSide: "right" },
      hero: { eyebrow: "✦ Personal Blog", title: "ยินดีต้อนรับสู่บล็อกของเรา", subtitle: "แบ่งปันความรู้ บทความคุณภาพ อัปเดตใหม่ทุกสัปดาห์", btnText: "อ่านบทความล่าสุด", align: "center", bg: "gradient", showImage: true, imageUrl: "" },
      footer: { about: "บล็อกแบ่งปันความรู้และบทความคุณภาพ", copyright: "© 2026 MyBlog. สงวนลิขสิทธิ์",
        footerLinks: [{ label: "หน้าแรก", url: "/" }, { label: "บทความ", url: "/search" }, { label: "เกี่ยวกับ", url: "/p/about.html" }, { label: "ติดต่อ", url: "/p/contact.html" }],
        socialLinks: [], bgColor: "#0f172a" },
      postgrid: { heading: "บทความล่าสุด", columns: 3, count: 6, showImage: true, showExcerpt: true, readMore: "อ่านต่อ →", cardRadius: 14, cardStyle: "shadow" },
      postlist: { heading: "อ่านต่อ", count: 5, showImage: true },
      featured: { heading: "บทความแนะนำ", count: 1, featLabel: "แนะนำ" },
      about: { eyebrow: "เกี่ยวกับผู้เขียน", name: "ทีมงาน MyBlog", bio: "เราคือทีมผู้เชี่ยวชาญที่แบ่งปันความรู้ผ่านบทความคุณภาพมากว่า 5 ปี", showAvatar: true, avatarUrl: "" },
      text: { heading: "หัวข้อของคุณ", body: "เขียนเนื้อหาตรงนี้ ใส่ข้อความที่ต้องการให้ผู้อ่านเห็น", align: "left" },
      cta: { title: "พร้อมเริ่มต้นแล้วหรือยัง?", btnText: "เริ่มเลย", btnUrl: "/", bg: "soft" },
      image: { alt: "คำอธิบายรูปภาพ", caption: "", ratio: "16/9", src: "" },
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
      progress: { height: 3, color: "primary" },
      notfound: { template: "minimal", heading: "404", sub: "ขออภัย · ไม่พบหน้านี้", desc: "หน้าที่คุณต้องการอาจถูกย้าย ลบ หรือ URL ไม่ถูกต้อง", btnText: "กลับหน้าแรก", btnUrl: "/", showSearch: true }
    };
    return JSON.parse(JSON.stringify(d[type] || {}));
  }

  /* ---------- template presets ---------- */
  var CATS = [
    { val: "ทั้งหมด", th: "ทั้งหมด", en: "All" },
    { val: "บล็อก", th: "บล็อก", en: "Blog" },
    { val: "ธุรกิจ", th: "ธุรกิจ", en: "Business" },
    { val: "ข่าว/นิตยสาร", th: "ข่าว/นิตยสาร", en: "News / Magazine" },
    { val: "การศึกษา", th: "การศึกษา", en: "Education" },
    { val: "Affiliate", th: "Affiliate", en: "Affiliate" }
  ];
  var TEMPLATES = [
    { id: "personal", cat: "บล็อก", catEn: "Blog", name: "Personal Blog", desc: "บล็อกส่วนตัว อ่านง่าย", descEn: "Clean personal blog layout", c: ["#6366f1", "#8b5cf6"], blocks: ["header", "hero", "postgrid", "about", "footer"], design: { primary: "#6366f1", accent: "#8b5cf6", font: "sans", radius: 12 } },
    // hidden:true → keep the code/render branches but remove from the start-screen picker.
    // Focusing on Personal Blog for now; unhide later by removing the flag.
    { id: "travel", hidden: true, cat: "บล็อก", catEn: "Blog", name: "Travel Blog", desc: "บล็อกท่องเที่ยว ภาพใหญ่", descEn: "Full-bleed cinematic travel blog", c: ["#0ea5e9", "#22d3ee"], blocks: ["header", "hero", "featured", "postgrid", "footer"], design: { primary: "#0ea5e9", accent: "#22d3ee", font: "sans", radius: 16 } },
    { id: "tech", hidden: true, cat: "บล็อก", catEn: "Blog", name: "Tech Blog", desc: "บล็อกเทคโนโลยี มินิมอล", descEn: "Minimal tech & coding blog", c: ["#10b981", "#06b6d4"], blocks: ["header", "hero", "postlist", "postgrid", "footer"], design: { primary: "#10b981", accent: "#06b6d4", font: "sans", radius: 10 } },
    { id: "sidebar-blog", hidden: true, cat: "บล็อก", catEn: "Blog", name: "Classic + Sidebar", desc: "2 คอลัมน์ เนื้อหา + ไซด์บาร์", descEn: "Two-column blog with sidebar", c: ["#6366f1", "#8b5cf6"], blocks: ["header", "hero", "postgrid", "sidebar", "footer"], design: { primary: "#6366f1", accent: "#8b5cf6", font: "sans", radius: 10 } },
    { id: "magazine", cat: "ข่าว/นิตยสาร", catEn: "News / Magazine", name: "Magazine", desc: "นิตยสารหลายคอลัมน์", descEn: "Multi-column magazine layout", c: ["#dc2626", "#f43f5e"], blocks: ["header", "featured", "postgrid", "postlist", "footer"], design: { primary: "#dc2626", accent: "#f43f5e", font: "serif", radius: 6 } },
    { id: "company", hidden: true, cat: "ธุรกิจ", catEn: "Business", name: "Company", desc: "เว็บบริษัทมืออาชีพ", descEn: "Professional company website", c: ["#1e40af", "#3b82f6"], blocks: ["header", "hero", "about", "cta", "footer"], design: { primary: "#1e40af", accent: "#3b82f6", font: "sans", radius: 8 } },
    { id: "course", hidden: true, cat: "การศึกษา", catEn: "Education", name: "Online Course", desc: "คอร์สเรียนออนไลน์", descEn: "Online learning & courses", c: ["#9333ea", "#6366f1"], blocks: ["header", "hero", "featured", "cta", "footer"], design: { primary: "#9333ea", accent: "#6366f1", font: "sans", radius: 14 } },
    { id: "review", hidden: true, cat: "Affiliate", catEn: "Affiliate", name: "Product Review", desc: "รีวิวสินค้า Affiliate", descEn: "Product review & affiliate blog", c: ["#ea580c", "#f59e0b"], blocks: ["header", "hero", "postgrid", "about", "footer"], design: { primary: "#ea580c", accent: "#f59e0b", font: "sans", radius: 10 } }
  ];

  /* ---------- STATE ---------- */
  var S = null;
  var SEL = null;        // selected block id
  var VIEW = window.innerWidth <= 1000 ? "mobile" : "desktop";
  var HISTORY = [];
  var KEY = "bxb_project_v1";
  var DOCS_BASE = "/docs/";

  function freshProject(name, design) {
    return {
      name: name || "เว็บไซต์ของฉัน",
      lang: "th",
      templateId: null,
      design: design || { primary: "#6366f1", accent: "#8b5cf6", font: "sans", radius: 12 },
      seo: { title: "", desc: "", blogTitle: "MyBlog", labelIndex: false, schema: true, og: true,
             orgType: "Organization", logoUrl: "", favUrl: "", siteUrl: "", sameAs: "", schemaSoftwareApp: false, siteWww: false },
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
  // true if a hex color is dark enough to need light text on top
  function isDarkColor(hex) {
    hex = String(hex || "").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return true;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
  }
  // CSS vars for the footer, derived from the footer block's bgColor (exported skin)
  function footerVars() {
    var fb = S && S.blocks && S.blocks.find(function (b) { return b.type === "footer"; });
    var bg = (fb && fb.props && fb.props.bgColor) || "#0f172a";
    var base = isDarkColor(bg) ? "255,255,255" : "17,24,39";
    return ":root{--footer-bg:" + bg + ";--footer-fg:rgb(" + base + ");--footer-muted:rgba(" + base +
      ",.62);--footer-dim:rgba(" + base + ",.4);--footer-line:rgba(" + base + ",.12);--footer-chip:rgba(" + base + ",.1)}";
  }
  // Heading font per template personality (preview mirror of tplStyleVars --font)
  function tplHeadFont(d) {
    var id = S && S.templateId;
    if (id === "personal" || id === "sidebar-blog" || id === "magazine") return "Georgia,'Times New Roman',serif";
    if (id === "course") return "'Trebuchet MS','Segoe UI',sans-serif";
    if (id === "travel") return "'Helvetica Neue',Arial,sans-serif";
    return fontStack(d.font);
  }
  // menu items: new model is array {label,url}; convert old comma-string if present
  function menuItemsOf(p) {
    if (Array.isArray(p.menuItems)) return p.menuItems;
    if (typeof p.menu === "string" && p.menu) return p.menu.split(",").map(function (m) { return { label: m.trim(), url: "/" }; });
    return [];
  }
  function footerLinksOf(p) { return Array.isArray(p.footerLinks) ? p.footerLinks : []; }
  function socialLinksOf(p) { return Array.isArray(p.socialLinks) ? p.socialLinks : []; }
  // Ensure link URLs are absolute · if user enters "facebook.com" without a protocol, add https://
  function absUrl(url) {
    url = (url || "").trim();
    if (!url) return url;
    if (/^https?:\/\//i.test(url) || url.charAt(0) === "/" || url.charAt(0) === "#" || /^mailto:/i.test(url)) return url;
    return "https://" + url;
  }

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

  /* ---------- Menu icons (inline SVG, stroke style · matches theme) ---------- */
  var MENU_ICONS = {
    home:     { emoji: "🏠", p: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-6h5v6"/>' },
    blog:     { emoji: "📝", p: '<path d="M4 4h11l5 5v11H4z"/><path d="M15 4v5h5"/><path d="M8 13h8M8 16h6"/>' },
    about:    { emoji: "ℹ️", p: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>' },
    contact:  { emoji: "✉️", p: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>' },
    phone:    { emoji: "📞", p: '<path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L18 13l3 1v5a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>' },
    category: { emoji: "🏷️", p: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z"/><path d="M7.5 7.5h.01"/>' },
    folder:   { emoji: "📁", p: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
    search:   { emoji: "🔍", p: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>' },
    star:     { emoji: "⭐", p: '<path d="M12 3l2.7 5.9 6.3.7-4.7 4.3 1.3 6.2L12 17.8 6.1 20.4l1.3-6.2-4.7-4.3 6.3-.7z"/>' },
    cart:     { emoji: "🛒", p: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.3a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/>' },
    image:    { emoji: "🖼️", p: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-4 4 3 3-2 4 3"/>' },
    book:     { emoji: "📖", p: '<path d="M12 6C10 4 6 4 3 5v13c3-1 7-1 9 1 2-2 6-2 9-1V5c-3-1-7-1-9 1z"/><path d="M12 6v13"/>' },
    news:     { emoji: "📰", p: '<path d="M4 5h13v14H5a1 1 0 0 1-1-1z"/><path d="M17 8h3v9a2 2 0 0 1-2 2"/><path d="M7 8h7M7 11h7M7 14h5"/>' },
    fire:     { emoji: "🔥", p: '<path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 1.5 2S12 3 12 3z"/>' },
    heart:    { emoji: "❤️", p: '<path d="M12 20s-7-4.4-9.3-9A4.7 4.7 0 0 1 12 6.5 4.7 4.7 0 0 1 21.3 11C19 15.6 12 20 12 20z"/>' },
    user:     { emoji: "👤", p: '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>' },
    users:    { emoji: "👥", p: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 19a6.5 6.5 0 0 1 13 0"/><path d="M17 5a3.5 3.5 0 0 1 0 7"/><path d="M16 19a6.5 6.5 0 0 0-1.5-4"/>' },
    globe:    { emoji: "🌐", p: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>' },
    link:     { emoji: "🔗", p: '<path d="M9 15l6-6"/><path d="M11 6.5 13 4.5a4 4 0 0 1 6 6l-2 2"/><path d="M13 17.5 11 19.5a4 4 0 0 1-6-6l2-2"/>' },
    grid:     { emoji: "▦", p: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' },
    calendar: { emoji: "📅", p: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>' },
    bell:     { emoji: "🔔", p: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>' },
    shield:   { emoji: "🛡️", p: '<path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>' },
    none:     { emoji: "∅", p: "" }
  };
  var MENU_ICON_KEYS = Object.keys(MENU_ICONS);
  // keyword → icon (Thai + English) · first match wins
  var MENU_ICON_HINTS = [
    ["home",     "หน้าแรก|หน้าหลัก|home|homepage"],
    ["about",    "เกี่ยวกับ|about|ประวัติ|profile|เรื่องราว"],
    ["contact",  "ติดต่อ|contact|อีเมล|email|mail"],
    ["phone",    "โทร|phone|call|โทรศัพท์|เบอร์"],
    ["news",     "ข่าว|news|ประกาศ|announcement"],
    ["shield",   "นโยบาย|privacy|policy|เงื่อนไข|terms|disclaimer|ข้อกำหนด|ความเป็นส่วนตัว"],
    ["cart",     "ร้าน|สินค้า|shop|store|product|ซื้อ|cart|ขาย|market"],
    ["star",     "รีวิว|review|rating|คะแนน|แนะนำ|featured|recommend"],
    ["fire",     "ยอดนิยม|popular|trending|มาแรง|ฮิต|hot"],
    ["heart",    "ถูกใจ|favorite|favourite|ชอบ|like|หัวใจ"],
    ["image",    "รูป|ภาพ|gallery|photo|album|อัลบั้ม|portfolio|ผลงาน"],
    ["book",     "คอร์ส|เรียน|บทเรียน|course|lesson|สอน|tutorial|เอกสาร|guide|คู่มือ"],
    ["users",    "ชุมชน|community|สมาชิก|member|ทีม|team|about us"],
    ["calendar", "ปฏิทิน|calendar|กิจกรรม|event|ตาราง|schedule"],
    ["category", "หมวด|ป้าย|label|category|categories|tag|กลุ่ม|topic"],
    ["blog",     "บทความ|บล็อก|blog|post|โพสต์|article|เขียน"],
    ["search",   "ค้นหา|search"],
    ["user",     "บัญชี|account|โปรไฟล์|ผู้เขียน|author|user|login|เข้าสู่ระบบ"]
  ];
  function guessMenuIcon(m) {
    var lbl = (m.label || "").toLowerCase();
    if (lbl) {
      for (var i = 0; i < MENU_ICON_HINTS.length; i++) {
        if (new RegExp(MENU_ICON_HINTS[i][1], "i").test(lbl)) return MENU_ICON_HINTS[i][0];
      }
    }
    var t = m.type || "custom";
    if (t === "home")     return "home";
    if (t === "search")   return "search";
    if (t === "label")    return "category";
    if (t === "page")     return "blog";
    if (t === "external") return "globe";
    if (t === "dropdown") return "grid";
    return "link";
  }
  // resolve the SVG inner-path for a menu item (respects manual override / "none")
  function menuIconPath(m) {
    var ic = m.icon;
    if (ic === "none") return "";
    if (!ic || ic === "auto") ic = guessMenuIcon(m);
    var def = MENU_ICONS[ic];
    return def ? def.p : "";
  }
  // full <svg> string · mode "preview" (inline style) or "static" (CSS class)
  function menuIconSvg(m, mode) {
    var pth = menuIconPath(m);
    if (!pth) return "";
    if (mode === "preview") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none;opacity:.88">' + pth + '</svg>';
    }
    return "<svg class='nav-ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>" + pth + "</svg>";
  }

  /* ---------- Mobile bottom navigation bar ---------- */
  // shared dark-theme CSS vars (used by darkmode block + bottom-nav "Mode")
  var DARK_THEME_VARS = "[data-theme=dark]{--bg-body:#0f172a;--bg-surface:#1e293b;--bg-surface-2:#2d3748;--bg-header:#1a2438;--text-main:#e2e8f0;--text-muted:#94a3b8;--text-subtle:#64748b;--border:rgba(255,255,255,.08);--border-med:rgba(255,255,255,.18);--hover-bg:rgba(255,255,255,.06);--nav-shadow:0 0 48px rgba(0,0,0,.55);--drop-shadow:0 8px 24px rgba(0,0,0,.4)}";
  var BOTNAV_ICONS = {
    home:   '<path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    menu:   '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M9 5v14"/>',
    mode:   '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z"/>',
    share:  '<path d="M4 12v6.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V12"/><path d="M12 15V4"/><path d="m8 7.5 4-4 4 4"/>'
  };
  function botNavLabels() {
    return { home: tpl("หน้าแรก", "Home"), search: tpl("ค้นหา", "Search"), menu: tpl("เมนู", "Menu"), mode: tpl("โหมด", "Mode"), share: tpl("แชร์", "Share") };
  }
  // exported bottom nav (mobile-only) · Home / Search / Menu(drawer) / Mode(dark) / Share
  function botNavStatic() {
    var L = botNavLabels(), hasDark = false;
    for (var i = 0; i < S.blocks.length; i++) { if (S.blocks[i].type === "darkmode") { hasDark = true; break; } }
    function bi(pp) { return "<svg class='bn-ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>" + pp + "</svg>"; }
    var css = "<style>"
      + (hasDark ? "" : DARK_THEME_VARS)
      + ".bxb-botnav{display:none}"
      + "@media(max-width:768px){"
      + ".bxb-botnav{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:200;background:var(--bg-header,#fff);border-top:1px solid var(--border,#e8eaf2);padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px));box-shadow:0 -4px 20px rgba(0,0,0,.07);backdrop-filter:blur(10px)}"
      + ".bxb-bn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:0;cursor:pointer;text-decoration:none;color:var(--text-muted,#64748b);font-family:inherit;font-size:11px;font-weight:500;padding:6px 2px;border-radius:12px;-webkit-tap-highlight-color:transparent;transition:color .15s,background .15s}"
      + ".bxb-bn:active{background:var(--hover-bg,rgba(99,102,241,.08))}"
      + ".bxb-bn:hover,.bxb-bn:focus-visible{color:var(--primary,#6366f1)}"
      + ".bxb-bn .bn-ic{width:23px;height:23px}"
      + ".bxb-bn span{line-height:1}"
      + "body{padding-bottom:calc(62px + env(safe-area-inset-bottom,0px))}"
      + "}"
      + "</style>";
    var bar = "<nav class='bxb-botnav' aria-label='" + tpl("เมนูล่าง", "Bottom menu") + "'>"
      + "<a class='bxb-bn' href='/'>" + bi(BOTNAV_ICONS.home) + "<span>" + L.home + "</span></a>"
      + "<a class='bxb-bn' href='/search'>" + bi(BOTNAV_ICONS.search) + "<span>" + L.search + "</span></a>"
      + "<label class='bxb-bn' for='navtoggle'>" + bi(BOTNAV_ICONS.menu) + "<span>" + L.menu + "</span></label>"
      + "<button type='button' class='bxb-bn' id='bxbModeBtn'>" + bi(BOTNAV_ICONS.mode) + "<span>" + L.mode + "</span></button>"
      + "<button type='button' class='bxb-bn' id='bxbShareBtn'>" + bi(BOTNAV_ICONS.share) + "<span>" + L.share + "</span></button>"
      + "</nav>";
    var sc = "<script>/*<![CDATA[*/(function(){"
      + "var k='bxb-theme';"
      + "if(!document.documentElement.dataset.theme){document.documentElement.dataset.theme=localStorage.getItem(k)||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');}"
      + "var m=document.getElementById('bxbModeBtn');"
      + "if(m){m.addEventListener('click',function(){var n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;localStorage.setItem(k,n);});}"
      + "var s=document.getElementById('bxbShareBtn');"
      + "if(s){s.addEventListener('click',function(){var d={title:document.title,url:location.href};"
      + "if(navigator.share){navigator.share(d).catch(function(){});}"
      + "else if(navigator.clipboard){navigator.clipboard.writeText(location.href);var sp=s.querySelector('span');if(sp){var o=sp.textContent;sp.textContent='" + tpl("คัดลอกแล้ว", "Copied!") + "';setTimeout(function(){sp.textContent=o;},1500);}}"
      + "else{location.href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.href);}"
      + "});}"
      + "}());/*]]>*/<\/script>";
    return css + bar + sc;
  }
  // in-builder preview of the bottom nav (mobile view only)
  function botNavPreview() {
    var L = botNavLabels();
    function bi(pp) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:23px;height:23px">' + pp + '</svg>'; }
    function item(pp, lb) {
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;color:#64748b;font-size:11px;font-weight:500">' + bi(pp) + '<span>' + lb + '</span></div>';
    }
    return '<div style="position:sticky;bottom:0;display:flex;background:#fff;border-top:1px solid #e8eaf2;box-shadow:0 -4px 20px rgba(0,0,0,.07);padding:8px 4px 10px">' +
      item(BOTNAV_ICONS.home, L.home) + item(BOTNAV_ICONS.search, L.search) + item(BOTNAV_ICONS.menu, L.menu) + item(BOTNAV_ICONS.mode, L.mode) + item(BOTNAV_ICONS.share, L.share) +
      '</div>';
  }
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
        var showIcons = p.showMenuIcons !== false;
        var menu = mItems.map(function (m) {
          var t = m.type || "custom";
          var ic = showIcons ? menuIconSvg(m, "preview") : "";
          var hasChildren = t === "dropdown" && Array.isArray(m.children) && m.children.length;
          if (hasChildren) {
            var subs = m.children.map(function (c) {
              return '<a style="display:block;padding:8px 14px;font-size:13px;color:#4a5063;white-space:nowrap">' + esc(c.label) + '</a>';
            }).join("");
            return '<div style="position:relative;display:inline-block">' +
              '<a style="color:#1e2333;font-weight:500;font-size:15px;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px">' + ic + esc(m.label) + ' <span style="font-size:11px;color:#9aa">›</span></a>' +
              '<div style="position:absolute;top:100%;left:0;background:#fff;border:1px solid #eef;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.1);min-width:150px;padding:4px 0;margin-top:4px;z-index:2">' + subs + '</div>' +
              '</div>';
          }
          return '<a style="color:#1e2333;font-weight:500;font-size:15px;text-decoration:none;display:inline-flex;align-items:center;gap:6px">' + ic + esc(m.label) + "</a>";
        }).join("");
        var hdrLogoUrl = S.seo && S.seo.logoUrl;
        // logo image (auto-sized) + blog name on one row, image leading
        var hdrLogoDesktop = '<div style="display:flex;align-items:center;gap:10px;min-width:0">' +
          (hdrLogoUrl ? '<img src="' + esc(hdrLogoUrl) + '" alt="" style="height:34px;width:auto;max-width:120px;object-fit:contain;flex:none">' : '') +
          '<div style="font-family:' + fontStack(d.font) + ';font-weight:700;font-size:21px;color:' + pr + ';white-space:nowrap">' + esc(p.logoText) + '</div></div>';
        var hdrLogoMobile = '<div style="display:flex;align-items:center;gap:8px;min-width:0' + (p.mobileSide === "left" ? "" : ";margin-right:auto") + '">' +
          (hdrLogoUrl ? '<img src="' + esc(hdrLogoUrl) + '" alt="" style="height:26px;width:auto;max-width:100px;object-fit:contain;flex:none">' : '') +
          '<div style="font-family:' + fontStack(d.font) + ';font-weight:700;font-size:18px;color:' + pr + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.logoText) + '</div></div>';
        if (isMob) {
          var burger = '<div style="width:34px;height:34px;display:grid;place-items:center;font-size:20px;color:' + pr + '">☰</div>';
          return '<div style="padding:14px 18px;background:#fff;border-bottom:1px solid #eef"><div style="display:flex;align-items:center;gap:12px">' +
            (p.mobileSide === "left" ? burger : "") +
            hdrLogoMobile +
            (p.mobileSide === "left" ? '<div style="margin-left:auto"></div>' : burger) +
            '</div><div style="margin-top:10px;border-top:1px dashed #e8eaf2;padding-top:8px;font-size:12px;color:#9aa;text-align:' + p.mobileSide + '">' + tpl("เมนูเด้งจากด้าน" + (p.mobileSide === "left" ? "ซ้าย" : "ขวา"), "Drawer slides from the " + p.mobileSide) + ' ▾</div></div>';
        }
        return '<div style="display:flex;align-items:center;gap:24px;padding:18px 32px;background:#fff;border-bottom:1px solid #eef">' +
          hdrLogoDesktop +
          '<nav style="display:flex;gap:22px;margin:0 auto;align-items:center">' + menu + "</nav>" +
          (p.showSearch ? '<div style="width:34px;height:34px;border-radius:50%;background:#f1f2f9;display:grid;place-items:center">🔍</div>' : "") + "</div>";
      case "hero":
        if (S && S.templateId === "sidebar-blog") {
          var sbHeroTags = BL === "en"
            ? ["Blog", "Tutorials", "Tips & Tricks"]
            : ["บล็อก", "บทสอน", "เคล็ดลับ"];
          var sbTagsHtml = sbHeroTags.map(function(t) {
            return '<span style="font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;color:' + pr + ';border:1.5px solid ' + pr + '">' + t + '</span>';
          }).join("");
          return '<div style="padding:60px 32px;background:#fff;border-top:4px solid ' + pr + '">' +
            '<div style="max-width:820px;margin:0 auto">' +
              '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + pr + ';margin-bottom:14px">✦ Classic Blog</div>' +
              '<h1 style="font-family:' + fontStack(d.font) + ';font-size:clamp(26px,4.5vw,44px);font-weight:800;line-height:1.1;letter-spacing:-.02em;color:#0f172a;margin:0 0 14px">' + esc(p.title) + '</h1>' +
              '<p style="font-size:16px;color:#64748b;line-height:1.65;margin:0 0 22px;max-width:500px">' + esc(p.subtitle) + '</p>' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px">' + sbTagsHtml + '</div>' +
              '<a style="display:inline-block;background:' + pr + ';color:#fff;font-weight:700;padding:12px 26px;border-radius:' + r + ';text-decoration:none;font-size:15px">' + esc(p.btnText) + '</a>' +
            '</div>' +
          '</div>';
        }
        if (S && S.templateId === "review") {
          return '<div style="padding:80px 32px;background:linear-gradient(135deg,' + pr + ',' + ac + ');color:#fff">' +
            '<div style="max-width:860px;margin:0 auto">' +
              '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-bottom:18px">🏆 ' + tpl("รีวิวสินค้า", "Product Reviews") + '</div>' +
              '<h1 style="font-family:' + fontStack(d.font) + ';font-size:clamp(28px,5vw,50px);font-weight:800;line-height:1.06;letter-spacing:-.02em;color:#fff;margin:0 0 16px">' + esc(p.title) + '</h1>' +
              '<p style="font-size:17px;color:rgba(255,255,255,.85);line-height:1.65;margin:0 0 22px;max-width:500px">' + esc(p.subtitle) + '</p>' +
              '<div style="display:flex;align-items:center;gap:10px;margin-bottom:30px">' +
                '<span style="color:#fff;font-size:18px;letter-spacing:2px">★★★★★</span>' +
                '<span style="font-size:16px;font-weight:700;color:#fff">4.8/5</span>' +
                '<span style="font-size:14px;color:rgba(255,255,255,.7)">' + tpl("จาก 1,200+ รีวิว", "from 1,200+ reviews") + '</span>' +
              '</div>' +
              '<a style="display:inline-block;background:#fff;color:' + pr + ';font-weight:700;padding:13px 30px;border-radius:' + r + ';text-decoration:none;font-size:15px">' + esc(p.btnText) + '</a>' +
            '</div>' +
          '</div>';
        }
        if (S && S.templateId === "travel") {
          return '<div style="position:relative;min-height:380px;overflow:hidden;display:flex;align-items:flex-end">' +
            '<div style="position:absolute;inset:0;background:linear-gradient(135deg,' + pr + ',' + ac + ')"></div>' +
            '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.2) 55%,transparent 100%)"></div>' +
            '<div style="position:relative;z-index:1;padding:44px 32px;color:#fff;max-width:740px">' +
              '<div style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.88;margin-bottom:12px">✈ Travel Blog</div>' +
              '<h1 style="font-family:' + fontStack(d.font) + ';font-size:40px;font-weight:800;line-height:1.05;letter-spacing:-.02em;margin:0 0 16px">' + esc(p.title) + '</h1>' +
              '<p style="font-size:16px;opacity:.88;margin:0 0 22px;max-width:460px;line-height:1.6">' + esc(p.subtitle) + '</p>' +
              '<a style="display:inline-block;background:#fff;color:' + pr + ';font-weight:700;padding:12px 26px;border-radius:' + r + ';text-decoration:none;font-size:15px">' + esc(p.btnText) + ' →</a>' +
            '</div>' +
          '</div>';
        }
        if (S && S.templateId === "course") {
          var eduChips = BL === "en"
            ? ["Expert Instructors", "Certificate Included", "Lifetime Access"]
            : ["สอนโดยผู้เชี่ยวชาญ", "รับใบประกาศนียบัตร", "เข้าถึงได้ตลอดชีพ"];
          var chipsHtml = eduChips.map(function (c) {
            return '<div style="display:flex;align-items:center;gap:7px;font-size:13px;color:rgba(255,255,255,.9)">' +
              '<span style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:10px;flex:none">✓</span>' + c +
            '</div>';
          }).join("");
          return '<div style="padding:80px 32px;background:linear-gradient(135deg,' + pr + ',' + ac + ');color:#fff">' +
            '<div style="max-width:860px;margin:0 auto">' +
              '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.72);margin-bottom:20px">📚 ' + tpl("คอร์สออนไลน์", "Online Course") + '</div>' +
              '<h1 style="font-family:' + fontStack(d.font) + ';font-size:clamp(28px,5vw,50px);font-weight:800;line-height:1.06;letter-spacing:-.02em;color:#fff;margin:0 0 16px">' + esc(p.title) + '</h1>' +
              '<p style="font-size:17px;color:rgba(255,255,255,.82);line-height:1.65;margin:0 0 22px;max-width:520px">' + esc(p.subtitle) + '</p>' +
              '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:30px">' + chipsHtml + '</div>' +
              '<a style="display:inline-block;background:#fff;color:' + pr + ';font-weight:700;padding:13px 30px;border-radius:' + r + ';text-decoration:none;font-size:15px">' + esc(p.btnText) + '</a>' +
            '</div>' +
          '</div>';
        }
        if (S && S.templateId === "company") {
          return '<div style="padding:80px 32px;background:linear-gradient(135deg,' + pr + ',' + ac + ');color:#fff;position:relative;overflow:hidden">' +
            '<div style="max-width:860px;margin:0 auto;position:relative;z-index:1">' +
              '<div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.72);margin-bottom:20px;display:flex;align-items:center;gap:8px">' +
                '<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.55);display:inline-block"></span>' +
                tpl("บริษัทของเรา", "Our Company") +
              '</div>' +
              '<h1 style="font-family:' + fontStack(d.font) + ';font-size:clamp(28px,5vw,52px);font-weight:800;line-height:1.06;letter-spacing:-.02em;color:#fff;margin:0 0 18px">' + esc(p.title) + '</h1>' +
              '<p style="font-size:17px;color:rgba(255,255,255,.82);line-height:1.65;margin:0 0 32px;max-width:500px">' + esc(p.subtitle) + '</p>' +
              '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
                '<a style="display:inline-block;background:#fff;color:' + pr + ';font-weight:700;padding:13px 28px;border-radius:' + r + ';text-decoration:none;font-size:15px">' + esc(p.btnText) + '</a>' +
                '<a style="display:inline-block;background:transparent;color:#fff;font-weight:600;padding:12px 26px;border-radius:' + r + ';text-decoration:none;font-size:15px;border:2px solid rgba(255,255,255,.45)">' + tpl("เรียนรู้เพิ่มเติม", "Learn More") + '</a>' +
              '</div>' +
            '</div>' +
          '</div>';
        }
        if (S && S.templateId === "tech") {
          return '<div style="padding:68px 32px;background:#0f172a;color:#e2e8f0">' +
            '<div style="max-width:760px;margin:0 auto">' +
              '<div style="font-family:monospace;font-size:13px;color:' + pr + ';font-weight:700;letter-spacing:.05em;margin-bottom:18px">&gt;_ Tech Blog</div>' +
              '<h1 style="font-family:' + fontStack(d.font) + ';font-size:40px;font-weight:800;line-height:1.1;letter-spacing:-.02em;color:#f8fafc;margin:0 0 18px">' + esc(p.title) + '</h1>' +
              '<p style="font-size:17px;color:#94a3b8;line-height:1.65;margin:0 0 28px;max-width:480px">' + esc(p.subtitle) + '</p>' +
              '<a style="display:inline-block;background:' + pr + ';color:#fff;font-weight:700;padding:12px 26px;border-radius:' + r + ';text-decoration:none">' + esc(p.btnText) + '</a>' +
            '</div>' +
          '</div>';
        }
        if (S && S.templateId === "personal") {
          var pbHeroEb = (p.eyebrow != null ? p.eyebrow : "✦ Personal Blog");
          return '<div style="padding:60px 32px;background:#fffdf8;border-bottom:1px solid #f0ece2">' +
            '<div style="max-width:860px;margin:0 auto;display:flex;align-items:center;gap:40px;flex-wrap:wrap">' +
              '<div style="flex:1;min-width:220px">' +
                (pbHeroEb ? '<div style="font-size:11px;color:' + pr + ';font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px">' + esc(pbHeroEb) + '</div>' : '') +
                '<h1 style="font-family:' + tplHeadFont(d) + ';font-size:38px;font-weight:800;line-height:1.15;letter-spacing:-.01em;color:#1f2937;margin:0 0 14px">' + esc(p.title) + '</h1>' +
                '<p style="font-size:16px;color:#64748b;line-height:1.65;margin:0 0 24px;max-width:380px">' + esc(p.subtitle) + '</p>' +
                '<a style="display:inline-block;background:' + pr + ';color:#fff;font-weight:600;padding:12px 26px;border-radius:' + r + ';text-decoration:none">' + esc(p.btnText) + '</a>' +
              '</div>' +
              (p.showImage !== false
                ? '<div style="flex:none">' +
                    '<div style="width:150px;height:150px;border-radius:50%;padding:5px;background:linear-gradient(135deg,' + pr + ',' + ac + ')">' +
                      (p.imageUrl
                        ? '<img src="' + esc(p.imageUrl) + '" alt="' + esc(p.title) + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block">'
                        : '<div style="width:100%;height:100%;border-radius:50%;background:#f8fafc;display:flex;align-items:center;justify-content:center;font-size:52px">👤</div>') +
                    '</div>' +
                  '</div>'
                : '') +
            '</div>' +
          '</div>';
        }
        var bg = p.bg === "gradient" ? "linear-gradient(120deg," + pr + "," + ac + ")" : p.bg === "dark" ? "#0f172a" : "#f7f8fc";
        var fg = (p.bg === "soft") ? "#1e2333" : "#fff";
        return '<div style="padding:84px 32px;text-align:' + p.align + ';background:' + bg + ';color:' + fg + '">' +
          '<h1 style="font-family:' + fontStack(d.font) + ';font-size:42px;font-weight:700;margin:0;line-height:1.15;letter-spacing:-.02em">' + esc(p.title) + "</h1>" +
          '<p style="font-size:18px;margin:18px auto 0;max-width:560px;opacity:.9;' + (p.align === "center" ? "" : "margin-left:0;margin-right:0") + '">' + esc(p.subtitle) + "</p>" +
          '<a style="display:inline-block;margin-top:28px;background:' + (p.bg === "soft" ? pr : "#fff") + ';color:' + (p.bg === "soft" ? "#fff" : pr) + ';font-weight:600;padding:13px 26px;border-radius:' + r + '">' + esc(p.btnText) + "</a></div>";
      case "postgrid":
        if (S && S.templateId === "sidebar-blog") {
          var sbGCols = VIEW === "mobile" ? 1 : (p.columns || 2);
          var sbGCards = "";
          var sbGCats = BL === "en"
            ? ["Technology", "Lifestyle", "Travel", "Food", "Health", "Tips"]
            : ["เทคโนโลยี", "ไลฟ์สไตล์", "ท่องเที่ยว", "อาหาร", "สุขภาพ", "เคล็ดลับ"];
          var sbGDate = tpl("24 มิ.ย. 2569", "Jun 24, 2026");
          for (var sbgi = 0; sbgi < (p.count || 4); sbgi++) {
            sbGCards += '<article style="border-radius:' + r + ';overflow:hidden;background:#fff;border:1px solid #e8eaf2">' +
              (p.showImage ? '<div style="aspect-ratio:16/9;background:linear-gradient(135deg,' + pr + '12,' + ac + '25)"></div>' : '') +
              '<div style="padding:14px 16px 16px">' +
                '<div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:' + pr + ';margin-bottom:5px">' + sbGCats[sbgi % 6] + '</div>' +
                '<h3 style="font-family:' + fontStack(d.font) + ';font-size:17px;font-weight:700;line-height:1.35;margin:0 0 7px;color:#0f172a">' + tpl("หัวข้อบทความที่ ", "Article #") + (sbgi + 1) + '</h3>' +
                (p.showExcerpt ? '<p style="font-size:13px;color:#64748b;line-height:1.55;margin:0 0 10px">' + tpl("คำโปรยบทความสั้นๆ แสดงก่อนคลิกอ่านบทความฉบับเต็ม...", "A short excerpt giving readers a preview before reading the full post...") + '</p>' : '') +
                '<div style="display:flex;align-items:center;justify-content:space-between">' +
                  '<span style="font-size:12px;color:#94a3b8">' + sbGDate + '</span>' +
                  '<a style="font-size:13px;font-weight:600;color:' + pr + ';text-decoration:none">' + tpl("อ่านต่อ →", "Read more →") + '</a>' +
                '</div>' +
              '</div>' +
            '</article>';
          }
          return '<section style="padding:36px 0"><div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:20px;font-weight:800;margin:0 0 18px;color:#0f172a">' + esc(p.heading) + '</h2>' : '') +
            '<div style="display:grid;grid-template-columns:repeat(' + sbGCols + ',1fr);gap:18px">' + sbGCards + '</div>' +
          '</div></section>';
        }
        if (S && S.templateId === "review") {
          var rvCols = VIEW === "mobile" ? 1 : VIEW === "tablet" ? 2 : (p.columns || 3);
          var rvCats = BL === "en"
            ? ["Electronics", "Kitchen", "Fitness", "Home", "Beauty", "Tech"]
            : ["อิเล็กทรอนิกส์", "ครัว", "ออกกำลังกาย", "บ้าน", "ความงาม", "เทคโนโลยี"];
          var rvScores = [9.8, 9.5, 9.2, 9.0, 8.8, 8.5];
          var rvCards = "";
          for (var rvi = 0; rvi < (p.count || 6); rvi++) {
            var rvCat = rvCats[rvi % 6];
            var rvScore = rvScores[rvi % 6];
            var rvIsBest = rvi < 2;
            rvCards += '<article style="border-radius:' + r + ';overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08)">' +
              '<div style="aspect-ratio:16/9;background:linear-gradient(135deg,' + (rvi % 2 === 0 ? pr + ',' + ac : ac + ',' + pr) + ');position:relative">' +
                (rvIsBest ? '<span style="position:absolute;top:10px;left:10px;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:20px;background:' + pr + ';color:#fff">' + tpl("แนะนำ", "BEST PICK") + '</span>' : '') +
                '<span style="position:absolute;top:10px;right:10px;font-size:14px;font-weight:800;padding:5px 10px;border-radius:8px;background:rgba(255,255,255,.96);color:' + pr + '">' + rvScore + '</span>' +
              '</div>' +
              '<div style="padding:14px 17px 4px">' +
                '<div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:' + pr + ';margin-bottom:5px">' + rvCat + '</div>' +
                '<h3 style="font-family:' + fontStack(d.font) + ';font-size:16px;font-weight:700;line-height:1.35;margin:0 0 7px;color:#0f172a">' + tpl("รีวิว: ", "Review: ") + rvCat + ' #' + (rvi + 1) + '</h3>' +
                '<div style="color:#f59e0b;font-size:13px;letter-spacing:1px;margin-bottom:8px">★★★★★</div>' +
                (p.showExcerpt ? '<p style="font-size:13px;color:#64748b;line-height:1.55;margin-bottom:10px">' + tpl("สรุปข้อดีข้อเสียของสินค้า พร้อมบอกว่าเหมาะกับใคร...", "A quick summary of pros, cons, and who this product is best for...") + '</p>' : '') +
              '</div>' +
              '<div style="border-top:1px solid #f0f0f8;padding:11px 17px;display:flex;justify-content:space-between;align-items:center">' +
                '<span style="font-size:10px;color:#94a3b8">' + tpl("* ลิงก์พันธมิตร", "* Affiliate link") + '</span>' +
                '<a style="font-size:13px;font-weight:700;color:#fff;background:' + pr + ';padding:8px 16px;border-radius:8px;text-decoration:none">' + tpl("ดูดีลเลย →", "See Deal →") + '</a>' +
              '</div>' +
            '</article>';
          }
          return '<section style="padding:60px 0"><div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:22px;font-weight:800;margin:0 0 24px;color:#0f172a">' + esc(p.heading) + '</h2>' : '') +
            '<div style="display:grid;grid-template-columns:repeat(' + rvCols + ',1fr);gap:20px">' + rvCards + '</div>' +
          '</div></section>';
        }
        if (S && S.templateId === "tech") {
          var techGCols = VIEW === "mobile" ? 1 : VIEW === "tablet" ? 2 : (p.columns || 3);
          var techGCards = "";
          var techGTags = ["JavaScript", "Python", "CSS", "Go", "Linux", "DevOps"];
          for (var tgi = 0; tgi < (p.count || 6); tgi++) {
            var gTag = techGTags[tgi % 6];
            techGCards += '<article style="border-radius:' + r + ';overflow:hidden;border:1px solid #e8eaf2;background:#fff">' +
              '<div style="aspect-ratio:16/9;background:linear-gradient(135deg,' + pr + '18,' + ac + '28);position:relative">' +
                '<div style="position:absolute;top:10px;left:10px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:' + pr + ';color:#fff">' + gTag + '</div>' +
              '</div>' +
              '<div style="padding:15px 17px 19px">' +
                '<div style="font-size:11px;color:#94a3b8;margin-bottom:5px">' + tpl("24 มิ.ย. 2569", "Jun 24, 2026") + '</div>' +
                '<h3 style="font-size:16px;font-weight:700;line-height:1.35;margin:0 0 8px;color:#0f172a">' + tpl("หัวข้อบทความที่ ", "Article #") + (tgi + 1) + '</h3>' +
                (p.showExcerpt ? '<p style="font-size:13px;color:#64748b;line-height:1.55;margin:0 0 9px">' + tpl("คำอธิบายบทความสั้นๆ ก่อนคลิกอ่านเพิ่มเติม...", "Short description before clicking to read more...") + '</p>' : '') +
                '<a style="font-size:13px;color:' + pr + ';font-weight:600;text-decoration:none">' + tpl("อ่านต่อ →", "Read more →") + '</a>' +
              '</div>' +
            '</article>';
          }
          return '<section style="padding:48px 0"><div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:22px;font-weight:800;margin:0 0 24px;color:#0f172a">' + esc(p.heading) + '</h2>' : '') +
            '<div style="display:grid;grid-template-columns:repeat(' + techGCols + ',1fr);gap:20px">' + techGCards + '</div>' +
          '</div></section>';
        }
        if (S && S.templateId === "magazine") {
          var magGCols = VIEW === "mobile" ? 1 : VIEW === "tablet" ? 2 : (p.columns || 3);
          var magGCards = "";
          var magGCats = BL === "en" ? ["Politics", "Economy", "Tech", "Culture", "Sports", "Health"] : ["การเมือง", "เศรษฐกิจ", "เทคโนโลยี", "วัฒนธรรม", "กีฬา", "สุขภาพ"];
          for (var mgi = 0; mgi < (p.count || 6); mgi++) {
            var mgCat = magGCats[mgi % 6];
            magGCards += '<article style="border-radius:' + r + ';overflow:hidden;border:1px solid #eef;background:#fff">' +
              '<div style="aspect-ratio:16/9;background:linear-gradient(135deg,' + pr + '18,' + ac + '28)"></div>' +
              '<div style="padding:13px 15px 17px">' +
                '<span style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:' + pr + ';display:block;margin-bottom:6px">' + mgCat + '</span>' +
                '<h3 style="font-family:' + fontStack(d.font) + ';font-size:17px;font-weight:700;line-height:1.3;margin:0 0 8px;color:#0f172a">' + tpl("หัวข้อข่าว/บทความที่ ", "Article #") + (mgi + 1) + '</h3>' +
                (p.showExcerpt ? '<p style="font-size:13px;color:#64748b;line-height:1.55;margin:0 0 9px">' + tpl("เนื้อหาโดยสรุปสั้นๆ ก่อนคลิกอ่านบทความฉบับเต็ม...", "A brief summary before reading the full article...") + '</p>' : '') +
                '<div style="font-size:12px;color:#94a3b8">' + tpl("24 มิ.ย. 2569", "Jun 24, 2026") + '</div>' +
              '</div>' +
            '</article>';
          }
          return '<section style="padding:48px 0"><div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:20px;font-weight:800;margin:0 0 18px;color:#0f172a;text-transform:uppercase;letter-spacing:.04em;border-left:4px solid ' + pr + ';padding-left:12px">' + esc(p.heading) + '</h2>' : '') +
            '<div style="display:grid;grid-template-columns:repeat(' + magGCols + ',1fr);gap:18px">' + magGCards + '</div>' +
          '</div></section>';
        }
        if (S && S.templateId === "travel") {
          var tbCols = VIEW === "mobile" ? 1 : VIEW === "tablet" ? 2 : (p.columns || 3);
          var tbCards = "";
          var tbLocs = BL === "en"
            ? ["Chiang Mai", "Phuket", "Bangkok", "Koh Samui", "Pattaya", "Kanchanaburi"]
            : ["เชียงใหม่", "ภูเก็ต", "กรุงเทพฯ", "เกาะสมุย", "พัทยา", "กาญจนบุรี"];
          var tbDateLabel = tpl("24 มิ.ย. 2569", "Jun 24, 2026");
          for (var ti = 0; ti < (p.count || 6); ti++) {
            tbCards += '<article style="border-radius:' + r + ';overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08)">' +
              '<div style="aspect-ratio:4/3;background:linear-gradient(' + (ti % 2 === 0 ? '135deg,' + pr + ',' + ac : '135deg,' + ac + ',' + pr) + ');position:relative">' +
                '<div style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,.5);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px">📍 ' + tbLocs[ti % 6] + '</div>' +
              '</div>' +
              '<div style="padding:14px 16px 17px">' +
                '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px">' + tbDateLabel + '</div>' +
                '<h3 style="font-size:16px;font-weight:700;line-height:1.35;margin:0 0 9px;color:#0f172a">' + tpl("ที่เที่ยวน่าไป #", "Places to Visit #") + (ti + 1) + '</h3>' +
                '<a style="font-size:13px;color:' + pr + ';font-weight:600;text-decoration:none">' + tpl("สำรวจ →", "Explore →") + '</a>' +
              '</div>' +
            '</article>';
          }
          return '<section style="padding:48px 0"><div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:22px;font-weight:800;margin:0 0 22px;color:#0f172a">' + esc(p.heading) + '</h2>' : '') +
            '<div style="display:grid;grid-template-columns:repeat(' + tbCols + ',1fr);gap:18px">' + tbCards + '</div>' +
          '</div></section>';
        }
        if (S && S.templateId === "personal") {
          var pbCols = VIEW === "mobile" ? 1 : VIEW === "tablet" ? 2 : (p.columns || 3);
          var pbCards = "";
          var pbDateLabel = tpl("24 มิ.ย. 2569", "Jun 24, 2026");
          var pbReadLbl = (p.readMore != null ? p.readMore : tpl("อ่านต่อ →", "Read more →"));
          var pbRad = (p.cardRadius != null ? p.cardRadius : 14);
          var pbCs = p.cardStyle || "shadow";
          var pbDeco = pbCs === "border" ? "background:#fff;border:1px solid #e6e8f0" : pbCs === "flat" ? "background:transparent" : "background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.07)";
          for (var pi = 0; pi < (p.count || 6); pi++) {
            pbCards += '<article style="border-radius:' + pbRad + 'px;overflow:hidden;' + pbDeco + '">' +
              (p.showImage ? '<div style="height:160px;background:linear-gradient(120deg,' + pr + '18,' + ac + '28)"></div>' : '') +
              '<div style="padding:15px 17px 18px">' +
                '<div style="font-size:11px;color:#94a3b8;margin-bottom:5px">' + pbDateLabel + '</div>' +
                '<h3 style="font-family:' + tplHeadFont(d) + ';font-size:17px;font-weight:700;line-height:1.4;margin:0 0 6px;color:#1f2937">' + tpl("หัวข้อบทความที่ ", "Article #") + (pi + 1) + '</h3>' +
                (p.showExcerpt ? '<p style="font-size:13px;color:#64748b;line-height:1.55;margin:0 0 9px">' + tpl("คำโปรยบทความแสดงตัวอย่างเนื้อหาสั้นๆ...", "A short excerpt giving readers a preview before they click to read more...") + '</p>' : '') +
                (pbReadLbl ? '<a style="font-size:13px;color:' + pr + ';font-weight:600;text-decoration:none">' + esc(pbReadLbl) + '</a>' : '') +
              '</div>' +
            '</article>';
          }
          return '<section style="padding:48px 0"><div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + tplHeadFont(d) + ';font-size:26px;font-weight:800;margin:0 0 24px;color:#1f2937">' + esc(p.heading) + '</h2>' : '') +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,' + Math.max(220, Math.round(1040 / (p.columns || 3))) + 'px),1fr));gap:20px">' + pbCards + '</div>' +
            '</div></section>';
        }
        var cols = p.columns || 3, cards = "";
        var pgCols = VIEW === "mobile" ? 1 : VIEW === "tablet" ? Math.min(cols, 2) : cols;
        for (var i = 0; i < (p.count || 6); i++) cards += postCard(p.showImage, p.showExcerpt, d, ac);
        return section(p.heading, d, '<div style="display:grid;grid-template-columns:repeat(' + pgCols + ',1fr);gap:20px">' + cards + "</div>");
      case "postlist":
        if (S && S.templateId === "magazine") {
          var magLCats = BL === "en" ? ["Breaking", "Politics", "Economy", "Tech", "Culture"] : ["ข่าวด่วน", "การเมือง", "เศรษฐกิจ", "เทคโนโลยี", "วัฒนธรรม"];
          var magLRows = "";
          for (var mli = 0; mli < (p.count || 5); mli++) {
            magLRows += '<div style="display:flex;gap:10px;align-items:center;border-bottom:1px solid #eef;padding:13px 0">' +
              '<span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:' + pr + ';padding:2px 8px;border-radius:3px;white-space:nowrap;flex:none">' + magLCats[mli % 5] + '</span>' +
              '<div style="font-family:' + fontStack(d.font) + ';font-size:15px;font-weight:600;color:#0f172a;flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + tpl("หัวข้อข่าว/บทความที่ ", "Headline #") + (mli + 1) + '</div>' +
              '<span style="font-size:12px;color:#94a3b8;white-space:nowrap;flex:none">' + tpl("24 มิ.ย.", "Jun 24") + '</span>' +
            '</div>';
          }
          return '<section style="padding:44px 0"><div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:20px;font-weight:800;margin:0 0 4px;color:#0f172a;text-transform:uppercase;letter-spacing:.04em;border-left:4px solid ' + pr + ';padding-left:12px">' + esc(p.heading) + '</h2>' : '') +
            magLRows +
          '</div></section>';
        }
        if (S && S.templateId === "tech") {
          var techListTags = ["JavaScript", "Python", "CSS", "Go", "Linux"];
          var techListRows = "";
          for (var tli = 0; tli < (p.count || 5); tli++) {
            var tliTag = techListTags[tli % 5];
            techListRows += '<div style="border-bottom:1px solid #e8eaf2;padding:18px 0;display:flex;gap:14px;align-items:flex-start">' +
              '<div style="font-family:monospace;font-size:12px;color:#94a3b8;padding-top:3px;flex:none;width:28px">' + (tli + 1 < 10 ? "0" : "") + (tli + 1) + '</div>' +
              '<div style="flex:1;min-width:0">' +
                '<div style="display:flex;gap:6px;margin-bottom:8px">' +
                  '<span style="font-size:11px;font-weight:700;letter-spacing:.04em;padding:3px 9px;border-radius:20px;background:' + pr + '18;color:' + pr + '">' + tliTag + '</span>' +
                '</div>' +
                '<div style="font-size:17px;font-weight:700;line-height:1.35;color:#0f172a;margin-bottom:5px">' + tpl("หัวข้อบทความที่ ", "Article #") + (tli + 1) + '</div>' +
                '<div style="font-size:12px;color:#94a3b8">' + tpl("24 มิ.ย. 2569 · 5 นาที", "Jun 24, 2026 · 5 min read") + '</div>' +
              '</div>' +
            '</div>';
          }
          return '<section style="padding:40px 0"><div style="max-width:800px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:22px;font-weight:800;margin:0 0 4px;color:#0f172a">' + esc(p.heading) + '</h2>' : '') +
            techListRows +
          '</div></section>';
        }
        var rows = "";
        for (var j = 0; j < (p.count || 5); j++) rows += postRow(p.showImage, d, ac);
        return section(p.heading, d, '<div style="display:flex;flex-direction:column;gap:16px">' + rows + "</div>");
      case "featured":
        if (S && S.templateId === "course") {
          var eduGCols = VIEW === "mobile" ? 1 : VIEW === "tablet" ? 2 : 3;
          var eduSubjects = BL === "en"
            ? ["Web Development", "Data Science", "UI/UX Design"]
            : ["พัฒนาเว็บไซต์", "วิทยาศาสตร์ข้อมูล", "UI/UX Design"];
          var eduCards = eduSubjects.map(function (subj, idx) {
            var rating = (4.7 + idx * 0.1).toFixed(1);
            var students = BL === "en" ? (1200 + idx * 300) + " students" : (1200 + idx * 300) + " นักเรียน";
            var price = BL === "en" ? "Free" : "ฟรี";
            return '<article style="border-radius:' + r + ';overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.07)">' +
              '<div style="aspect-ratio:16/9;background:linear-gradient(135deg,' + (idx % 2 === 0 ? pr + ',' + ac : ac + ',' + pr) + ');position:relative">' +
                '<span style="position:absolute;top:10px;left:10px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:rgba(255,255,255,.95);color:' + pr + '">' + subj + '</span>' +
              '</div>' +
              '<div style="padding:15px 17px 4px">' +
                '<h3 style="font-family:' + fontStack(d.font) + ';font-size:16px;font-weight:700;line-height:1.35;margin:0 0 8px;color:#0f172a">' + tpl("คอร์ส: ", "Course: ") + subj + '</h3>' +
                '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
                  '<span style="color:#f59e0b;font-size:12px;letter-spacing:1px">★★★★★</span>' +
                  '<span style="font-size:12px;font-weight:700;color:#0f172a">' + rating + '</span>' +
                '</div>' +
                '<div style="font-size:12px;color:#94a3b8;margin-bottom:12px">' + students + '</div>' +
              '</div>' +
              '<div style="border-top:1px solid #eef;padding:10px 17px;display:flex;justify-content:space-between;align-items:center">' +
                '<span style="font-size:18px;font-weight:800;color:' + pr + '">' + price + '</span>' +
                '<a style="font-size:13px;font-weight:700;color:#fff;background:' + pr + ';padding:7px 16px;border-radius:8px;text-decoration:none">' + tpl("ลงทะเบียน", "Enroll") + '</a>' +
              '</div>' +
            '</article>';
          });
          return '<section style="padding:60px 0"><div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:24px;font-weight:800;margin:0 0 26px;color:#0f172a">' + esc(p.heading) + '</h2>' : '') +
            '<div style="display:grid;grid-template-columns:repeat(' + eduGCols + ',1fr);gap:20px">' + eduCards.join("") + '</div>' +
          '</div></section>';
        }
        if (S && S.templateId === "magazine") {
          var magCats = BL === "en" ? ["Breaking", "Politics", "Economy"] : ["ข่าวด่วน", "การเมือง", "เศรษฐกิจ"];
          var magMain = '<div style="position:relative;border-radius:' + r + ';overflow:hidden;background:linear-gradient(135deg,' + pr + ',' + ac + ');min-height:340px;display:flex;align-items:flex-end">' +
            '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.55) 38%,rgba(0,0,0,.18) 70%,rgba(0,0,0,.04) 100%)"></div>' +
            '<div style="position:relative;padding:20px 22px;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6)">' +
              '<span style="font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;background:' + pr + ';padding:3px 9px;border-radius:3px;margin-bottom:10px;display:inline-block">' + magCats[0] + '</span>' +
              '<h3 style="font-family:' + fontStack(d.font) + ';font-size:22px;font-weight:800;line-height:1.2;margin:0 0 7px;color:#fff">' + tpl("หัวข้อข่าวสำคัญประจำวัน", "Top Story of the Day") + '</h3>' +
              '<div style="font-size:12px;color:rgba(255,255,255,.65)">' + tpl("24 มิ.ย. 2569", "Jun 24, 2026") + '</div>' +
            '</div>' +
          '</div>';
          var magSideItems = [1, 2].map(function (n) {
            return '<div style="position:relative;border-radius:' + r + ';overflow:hidden;background:linear-gradient(135deg,' + ac + ',' + pr + ');flex:1;min-height:140px;display:flex;align-items:flex-end">' +
              '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.55) 45%,rgba(0,0,0,.18) 78%,rgba(0,0,0,.05) 100%)"></div>' +
              '<div style="position:relative;padding:10px 12px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.6)">' +
                '<div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;background:' + pr + ';color:#fff;padding:2px 9px;border-radius:3px;display:inline-block;margin-bottom:5px">' + magCats[n] + '</div>' +
                '<div style="font-family:' + fontStack(d.font) + ';font-size:14px;font-weight:700;line-height:1.25;color:#fff">' + tpl("หัวข้อบทความย่อย " + n, "Sub Story " + n) + '</div>' +
              '</div>' +
            '</div>';
          });
          return '<section style="padding:44px 0;border-bottom:3px solid ' + pr + '">' +
            '<div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:20px;font-weight:800;margin:0 0 18px;color:#0f172a;text-transform:uppercase;letter-spacing:.04em;border-left:4px solid ' + pr + ';padding-left:12px">' + esc(p.heading) + '</h2>' : '') +
            '<div style="display:grid;grid-template-columns:2fr 1fr;gap:14px">' +
              magMain +
              '<div style="display:flex;flex-direction:column;gap:10px">' + magSideItems.join("") + '</div>' +
            '</div>' +
            '</div></section>';
        }
        if (S && S.templateId === "travel") {
          var tbDestinations = [
            { bg: pr, label: tpl("📍 จุดหมายหลัก", "📍 Top Destination"), title: tpl("บทความท่องเที่ยวเด่น", "Featured Travel Story"), size: "20px" },
            { bg: ac, label: tpl("📍 ที่เที่ยว 2", "📍 Destination 2"), title: tpl("บทความ 2", "Story 2"), size: "15px" },
            { bg: pr + "cc", label: tpl("📍 ที่เที่ยว 3", "📍 Destination 3"), title: tpl("บทความ 3", "Story 3"), size: "15px" }
          ];
          var tbFeatCards = tbDestinations.map(function (dest, idx) {
            var isMain = idx === 0;
            return '<div style="position:relative;border-radius:' + r + ';overflow:hidden;background:linear-gradient(135deg,' + dest.bg + ',' + ac + ');' + (isMain ? 'grid-row:span 2;min-height:320px' : 'min-height:130px') + ';display:flex;align-items:flex-end">' +
              '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%)"></div>' +
              '<div style="position:relative;padding:' + (isMain ? '16px 18px' : '10px 14px') + ';color:#fff">' +
                '<div style="font-size:10px;font-weight:700;letter-spacing:.07em;opacity:.85;margin-bottom:3px">' + dest.label + '</div>' +
                '<h3 style="font-size:' + dest.size + ';font-weight:700;margin:0;font-family:' + fontStack(d.font) + '">' + dest.title + '</h3>' +
              '</div>' +
            '</div>';
          });
          return '<section style="padding:40px 0"><div style="max-width:1180px;margin:0 auto;padding:0 20px">' +
            (p.heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:22px;font-weight:800;margin:0 0 20px;color:#0f172a">' + esc(p.heading) + '</h2>' : '') +
            '<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:14px">' + tbFeatCards.join("") + '</div>' +
          '</div></section>';
        }
        return section(p.heading, d, '<div style="position:relative;border-radius:' + r + ';overflow:hidden;aspect-ratio:21/9;background:linear-gradient(120deg,' + pr + ',' + ac + ');display:flex;align-items:flex-end;padding:28px"><div><span style="background:#fff;color:' + pr + ';font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px">' + tpl("บทความเด่น", "Featured") + '</span><h3 style="color:#fff;font-size:26px;margin:12px 0 0;font-family:' + fontStack(d.font) + '">' + tpl("หัวข้อบทความแนะนำที่น่าสนใจที่สุด", "The Most Recommended Article This Week") + '</h3></div></div>');
      case "about":
        if (S && S.templateId === "review") {
          var rvTrustItems = BL === "en"
            ? [{n:"500+", l:"Reviews"}, {n:"8", l:"Years Exp."}, {n:"100%", l:"Independent"}]
            : [{n:"500+", l:"รีวิวสินค้า"}, {n:"8", l:"ปีประสบการณ์"}, {n:"100%", l:"อิสระ"}];
          var rvTrustHtml = rvTrustItems.map(function(t) {
            return '<div style="text-align:center">' +
              '<div style="font-family:' + fontStack(d.font) + ';font-size:22px;font-weight:800;color:' + pr + ';line-height:1">' + t.n + '</div>' +
              '<div style="font-size:11px;color:#94a3b8;margin-top:3px">' + t.l + '</div>' +
            '</div>';
          }).join("");
          return '<section style="padding:60px 32px;background:#f8fafc">' +
            '<div style="max-width:780px;margin:0 auto;display:flex;gap:36px;align-items:center;flex-wrap:wrap">' +
              (p.avatarUrl
                ? '<div style="width:100px;height:100px;border-radius:50%;overflow:hidden;flex:none"><img src="' + esc(p.avatarUrl) + '" alt="' + esc(p.name) + '" style="width:100%;height:100%;object-fit:cover"></div>'
                : '<div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,' + pr + ',' + ac + ');display:flex;align-items:center;justify-content:center;font-size:38px;flex:none">👤</div>') +
              '<div style="flex:1;min-width:200px">' +
                '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + pr + ';margin-bottom:6px">' + tpl("นักรีวิวสินค้า", "Product Reviewer") + '</div>' +
                '<h2 style="font-family:' + fontStack(d.font) + ';font-size:24px;font-weight:800;color:#0f172a;margin:0 0 10px">' + esc(p.name) + '</h2>' +
                '<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 18px">' + richHTML(p.bio) + '</p>' +
                '<div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:14px">' + rvTrustHtml + '</div>' +
                '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:' + pr + ';padding:5px 12px;border-radius:20px;border:1.5px solid ' + pr + '">✓ ' + tpl("ผู้รีวิวอิสระที่ได้รับการรับรอง", "Independent Verified Reviewer") + '</span>' +
              '</div>' +
            '</div>' +
          '</section>';
        }
        if (S && S.templateId === "company") {
          var corpStats = BL === "en"
            ? [{ n: "10+", l: "Years" }, { n: "500+", l: "Clients" }, { n: "99%", l: "Satisfaction" }]
            : [{ n: "10+", l: "ปีประสบการณ์" }, { n: "500+", l: "ลูกค้า" }, { n: "99%", l: "ความพึงพอใจ" }];
          var statsHtml = corpStats.map(function (s) {
            return '<div>' +
              '<div style="font-family:' + fontStack(d.font) + ';font-size:30px;font-weight:800;color:' + pr + ';line-height:1">' + s.n + '</div>' +
              '<div style="font-size:12px;color:#64748b;margin-top:5px">' + s.l + '</div>' +
            '</div>';
          }).join("");
          var visualHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div style="border-radius:' + r + ';aspect-ratio:1;background:linear-gradient(135deg,' + pr + ',' + ac + ')"></div>' +
            '<div style="border-radius:' + r + ';aspect-ratio:1;background:linear-gradient(135deg,' + pr + '18,' + ac + '28)"></div>' +
            '<div style="border-radius:' + r + ';aspect-ratio:1;background:linear-gradient(135deg,' + ac + ',' + pr + ')"></div>' +
            '<div style="border-radius:' + r + ';aspect-ratio:1;background:linear-gradient(135deg,' + ac + '18,' + pr + '18)"></div>' +
          '</div>';
          return '<div style="padding:72px 32px">' +
            '<div style="max-width:1020px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center">' +
              '<div>' +
                '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + pr + ';margin-bottom:16px">' + tpl("เกี่ยวกับเรา", "About Us") + '</div>' +
                '<h2 style="font-family:' + fontStack(d.font) + ';font-size:clamp(22px,3.5vw,36px);font-weight:800;line-height:1.15;color:#0f172a;margin:0 0 18px">' + esc(p.name) + '</h2>' +
                '<p style="font-size:16px;color:#64748b;line-height:1.7;margin:0 0 32px">' + richHTML(p.bio) + '</p>' +
                '<div style="display:flex;gap:28px;flex-wrap:wrap">' + statsHtml + '</div>' +
              '</div>' +
              visualHtml +
            '</div>' +
          '</div>';
        }
        if (S && S.templateId === "personal") {
          var pbAboutEb = (p.eyebrow != null ? p.eyebrow : tpl("เกี่ยวกับผู้เขียน", "About the Author"));
          return '<div style="padding:52px 32px;background:#faf6ee">' +
            '<div style="max-width:780px;margin:0 auto;display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap">' +
              (p.showAvatar ?
                (p.avatarUrl
                  ? '<div style="width:110px;height:110px;border-radius:50%;overflow:hidden;flex:none"><img src="' + esc(p.avatarUrl) + '" alt="' + esc(p.name) + '" style="width:100%;height:100%;object-fit:cover"></div>'
                  : '<div style="width:110px;height:110px;border-radius:50%;padding:5px;background:linear-gradient(135deg,' + pr + ',' + ac + ');flex:none"><div style="width:100%;height:100%;border-radius:50%;background:#faf6ee;display:flex;align-items:center;justify-content:center;font-size:38px">👤</div></div>')
                : '') +
              '<div style="flex:1;min-width:200px">' +
                (pbAboutEb ? '<div style="font-size:11px;color:' + pr + ';font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">' + esc(pbAboutEb) + '</div>' : '') +
                '<h3 style="font-family:' + tplHeadFont(d) + ';font-size:24px;font-weight:800;color:#1f2937;margin:0 0 10px;line-height:1.2">' + esc(p.name) + '</h3>' +
                '<p style="color:#64748b;font-size:15px;line-height:1.7;margin:0">' + richHTML(p.bio) + '</p>' +
              '</div>' +
            '</div>' +
          '</div>';
        }
        return '<div style="padding:56px 32px;background:#f7f8fc;display:flex;gap:24px;align-items:center;max-width:820px;margin:0 auto">' +
          (p.showAvatar ? (p.avatarUrl ? '<div style="width:84px;height:84px;border-radius:50%;overflow:hidden;flex:none"><img src="' + esc(p.avatarUrl) + '" alt="' + esc(p.name) + '" style="width:100%;height:100%;object-fit:cover"></div>' : '<div style="width:84px;height:84px;border-radius:50%;background:linear-gradient(120deg,' + pr + ',' + ac + ');flex:none"></div>') : "") +
          '<div><div style="font-size:13px;color:' + pr + ';font-weight:700;text-transform:uppercase;letter-spacing:.08em">' + tpl("เกี่ยวกับ", "About") + '</div><h3 style="font-family:' + fontStack(d.font) + ';font-size:24px;margin:6px 0 8px">' + esc(p.name) + '</h3><p style="color:#4a5063;font-size:15px;line-height:1.65;margin:0">' + richHTML(p.bio) + '</p></div></div>';
      case "text":
        return '<div style="padding:40px 32px;text-align:' + p.align + ';max-width:760px;margin:0 auto"><h2 style="font-family:' + fontStack(d.font) + ';font-size:28px;margin:0 0 12px">' + esc(p.heading) + '</h2><p style="color:#4a5063;font-size:16px;line-height:1.7;margin:0">' + richHTML(p.body) + '</p></div>';
      case "columns":
        var cn = p.cols || 3, its = (p.items || []).slice(0, cn);
        var colsCols = VIEW === "mobile" ? "1fr" : "repeat(" + cn + ",1fr)";
        var cells = its.map(function (it) { return '<div style="text-align:center;padding:8px"><div style="width:54px;height:54px;border-radius:14px;background:linear-gradient(120deg,' + pr + ',' + ac + ');color:#fff;display:grid;place-items:center;font-size:24px;margin:0 auto 14px">' + esc(it.icon || "\u2605") + '</div><h3 style="font-family:' + fontStack(d.font) + ';font-size:18px;margin:0 0 7px;color:#1e2333">' + esc(it.title) + '</h3><p style="color:#828aa0;font-size:14px;line-height:1.55;margin:0">' + esc(it.text) + '</p></div>'; }).join("");
        return section(p.heading, d, '<div style="display:grid;grid-template-columns:' + colsCols + ';gap:24px">' + cells + '</div>');
      case "cta":
        if (S && S.templateId === "course") {
          var eduTrust = BL === "en"
            ? [{n:"20,000+", l:"Students"}, {n:"50+", l:"Courses"}, {n:"100+", l:"Instructors"}]
            : [{n:"20,000+", l:"นักเรียน"}, {n:"50+", l:"คอร์ส"}, {n:"100+", l:"ผู้สอน"}];
          var eduTrustHtml = eduTrust.map(function(t) {
            return '<div style="text-align:center">' +
              '<div style="font-family:' + fontStack(d.font) + ';font-size:28px;font-weight:800;color:#fff;line-height:1">' + t.n + '</div>' +
              '<div style="font-size:12px;color:rgba(255,255,255,.72);margin-top:5px">' + t.l + '</div>' +
            '</div>';
          }).join("");
          return '<div style="padding:84px 32px;background:linear-gradient(135deg,' + pr + ',' + ac + ');text-align:center;color:#fff">' +
            '<h2 style="font-family:' + fontStack(d.font) + ';font-size:clamp(24px,4.5vw,42px);font-weight:800;line-height:1.08;color:#fff;margin:0 0 14px">' + esc(p.title) + '</h2>' +
            '<p style="font-size:17px;color:rgba(255,255,255,.82);margin:0 auto 32px;max-width:480px;line-height:1.6">' + tpl("เริ่มต้นเรียนรู้วันนี้ ไม่มีค่าใช้จ่ายซ่อนเร้น", "Start learning today. No hidden fees.") + '</p>' +
            '<div style="display:flex;justify-content:center;gap:44px;flex-wrap:wrap;margin-bottom:36px">' + eduTrustHtml + '</div>' +
            '<a style="display:inline-block;background:#fff;color:' + pr + ';font-weight:700;padding:14px 34px;border-radius:' + r + ';text-decoration:none;font-size:16px">' + esc(p.btnText) + '</a>' +
          '</div>';
        }
        if (S && S.templateId === "company") {
          return '<div style="padding:84px 32px;background:linear-gradient(135deg,' + pr + ',' + ac + ');text-align:center;color:#fff">' +
            '<h2 style="font-family:' + fontStack(d.font) + ';font-size:clamp(24px,4.5vw,42px);font-weight:800;line-height:1.08;color:#fff;margin:0 0 14px">' + esc(p.title) + '</h2>' +
            '<p style="font-size:17px;color:rgba(255,255,255,.8);margin:0 auto 32px;max-width:480px;line-height:1.6">' + tpl("พร้อมที่จะเริ่มต้นกับเราแล้วหรือยัง?", "Ready to get started with us?") + '</p>' +
            '<a style="display:inline-block;background:#fff;color:' + pr + ';font-weight:700;padding:14px 34px;border-radius:' + r + ';text-decoration:none;font-size:16px">' + esc(p.btnText) + '</a>' +
          '</div>';
        }
        var cb = p.bg === "soft" ? "#f1f2f9" : "linear-gradient(120deg," + pr + "," + ac + ")";
        var cf = p.bg === "soft" ? "#1e2333" : "#fff";
        return '<div style="margin:32px;padding:48px 32px;text-align:center;border-radius:' + r + ';background:' + cb + ';color:' + cf + '"><h2 style="font-family:' + fontStack(d.font) + ';font-size:30px;margin:0">' + esc(p.title) + '</h2><a style="display:inline-block;margin-top:20px;background:' + (p.bg === "soft" ? pr : "#fff") + ';color:' + (p.bg === "soft" ? "#fff" : pr) + ';font-weight:600;padding:13px 28px;border-radius:' + r + '">' + esc(p.btnText) + "</a></div>";
      case "image":
        return '<div style="padding:24px 32px"><div style="aspect-ratio:' + (p.ratio || "16/9") + ';background:#e8eaf2;border-radius:' + r + ';overflow:hidden;display:grid;place-items:center;color:#9aa">' +
          (p.src ? '<img src="' + esc(p.src) + '" alt="' + esc(p.alt) + '" style="width:100%;height:100%;object-fit:cover">' : '🖼 ' + esc(p.alt)) +
          "</div>" + (p.caption ? '<p style="text-align:center;color:#9aa;font-size:13px;margin-top:8px">' + esc(p.caption) + "</p>" : "") + "</div>";
      case "ad":
        return '<div style="padding:16px 32px"><div style="min-height:90px;border:1px dashed #ccd;border-radius:8px;display:grid;place-items:center;color:#aab;font-size:13px;background:#fafbff">' + tpl("ช่องโฆษณา","Ad Slot") + ' · ' + esc(p.slot) + (p.label ? ' <span style="margin-left:6px;font-size:11px;color:#bbc">(' + tpl("โฆษณา","Ad") + ')</span>' : "") + "</div></div>";
      case "newsletter":
        var nlbg = p.bg === "gradient" ? "linear-gradient(120deg," + pr + "," + ac + ")" : p.bg === "dark" ? "#0f172a" : "linear-gradient(120deg," + pr + "0d," + ac + "1a)";
        var nlfg = p.bg === "dark" ? "#fff" : "#1e2333";
        var nlbtnbg = (p.bg === "soft" || !p.bg) ? pr : "#fff";
        var nlbtnfg = (p.bg === "soft" || !p.bg) ? "#fff" : pr;
        return '<div style="padding:52px 32px;text-align:center;background:' + nlbg + '">'
          + '<h2 style="font-family:' + fontStack(d.font) + ';font-size:26px;margin:0;color:' + nlfg + '">' + esc(p.heading) + '</h2>'
          + '<p style="font-size:15px;margin:12px auto 0;max-width:440px;color:' + (p.bg === "dark" ? "rgba(255,255,255,.75)" : "#4a5063") + '">' + esc(p.sub) + '</p>'
          + '<div style="display:flex;gap:10px;max-width:400px;margin:22px auto 0;flex-wrap:wrap;justify-content:center">'
          + '<input type="email" placeholder="' + tpl("อีเมลของคุณ","Your email") + '" style="flex:1;min-width:180px;padding:12px 16px;border:1px solid ' + (p.bg === "dark" ? "rgba(255,255,255,.2)" : "#dde") + ';border-radius:' + r + ';font-size:14px;background:' + (p.bg === "dark" ? "rgba(255,255,255,.1)" : "#fff") + ';color:' + nlfg + '">'
          + '<button style="background:' + nlbtnbg + ';color:' + nlbtnfg + ';padding:12px 20px;border:0;border-radius:' + r + ';font-weight:600;font-size:14px;cursor:pointer;white-space:nowrap">' + esc(p.btnText) + '</button>'
          + '</div></div>';
      case "share":
        var shs = [
          p.facebook && { label: "Facebook", color: "#1877f2" },
          p.twitter && { label: "X (Twitter)", color: "#000" },
          p.line && { label: "LINE", color: "#06c755" },
          p.copy && { label: tpl("คัดลอกลิงก์","Copy link"), color: "#6366f1" }
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
          + (p.showSearch ? '<div style="border:1px solid #e8eaf2;padding:10px 12px;border-radius:' + r + ';background:#f7f8fc;font-size:12.5px;color:#aab;display:flex;gap:8px;align-items:center">' + svg(IC.search, 2) + ' ' + tpl("ค้นหา…","Search…") + '</div>' : '')
          + (p.showCategories ? '<div style="border:1px solid #e8eaf2;padding:12px;border-radius:' + r + ';background:#f7f8fc"><div style="font-size:11px;font-weight:700;color:#1e2333;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">' + tpl("ป้ายกำกับ","Labels") + '</div><div style="display:flex;flex-wrap:wrap;gap:5px">' + (BL === "en" ? ["SEO","Posts","Tips"] : ["SEO","บทความ","แนะนำ"]).map(function(l){return '<span style="background:' + pr + '22;color:' + pr + ';font-size:11px;padding:2px 9px;border-radius:20px">' + l + '</span>';}).join("") + '</div></div>' : '')
          + (p.showArchive ? '<div style="border:1px solid #e8eaf2;padding:12px;border-radius:' + r + ';background:#f7f8fc"><div style="font-size:11px;font-weight:700;color:#1e2333;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">' + tpl("คลังบทความ","Archive") + '</div><div style="font-size:12.5px;color:#828aa0;display:flex;flex-direction:column;gap:5px">' + (BL === "en" ? "<span>January 2026 (12)</span><span>December 2025 (8)</span><span>November 2025 (5)</span>" : "<span>มกราคม 2026 (12)</span><span>ธันวาคม 2025 (8)</span><span>พฤศจิกายน 2025 (5)</span>") + '</div></div>' : '')
          + (p.showAbout ? '<div style="border:1px solid #e8eaf2;padding:12px;border-radius:' + r + ';background:#f7f8fc;display:flex;gap:10px;align-items:center"><div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(120deg,' + pr + ',' + ac + ');flex:none"></div><div style="font-size:12.5px;color:#4a5063">' + tpl("เกี่ยวกับผู้เขียน","About author") + '</div></div>' : '')
          + '</div>';
        return '<div style="padding:20px 32px;background:#f7f8fc"><div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#aab;margin-bottom:12px;display:flex;align-items:center;gap:8px">' + svg(IC.sidebar, 1.5) + ' Sidebar Layout · ' + tpl(p.position === "left" ? "ไซด์บาร์ซ้าย" : "ไซด์บาร์ขวา", p.position === "left" ? "Left sidebar" : "Right sidebar") + '</div>'
          + '<div style="display:grid;grid-template-columns:' + sbGridCols + ';gap:16px">'
          + (p.position === "left" ? sbAside + sbMain : sbMain + sbAside)
          + '</div></div>';
      case "search":
        return '<div style="padding:16px 32px">'
          + (p.heading ? '<h3 style="font-family:' + fontStack(d.font) + ';font-size:16px;color:#1e2333;margin-bottom:10px">' + esc(p.heading) + '</h3>' : '')
          + '<div style="display:flex;gap:0;max-width:420px"><input type="text" placeholder="' + esc(p.placeholder || "ค้นหาในบล็อก…") + '" style="flex:1;padding:12px 16px;border:1px solid #dde;border-radius:' + r + ' 0 0 ' + r + ';font-size:14px;color:#1e2333;background:#fff;outline:none"><button style="padding:12px 16px;background:' + pr + ';color:#fff;border:0;border-radius:0 ' + r + ' ' + r + ' 0;cursor:pointer;font-size:15px">🔍</button></div></div>';
      case "darkmode":
        return '<div style="position:relative;padding:16px 32px;background:#f7f8fc;min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:12px">'
          + '<div style="color:#aab;font-size:13px"><b style="color:#828aa0">Dark Mode Toggle</b><br><small>' + tpl("ฝังในแถบ Header · มือถือ: ก่อนปุ่ม ☰ | Desktop: หลังช่องค้นหา","In header bar · mobile: before ☰ | desktop: after search") + '</small></div>'
          + '<div style="display:flex;align-items:center;gap:8px;opacity:.55;font-size:12px;color:#828aa0">'
          + '<div style="width:38px;height:38px;border-radius:8px;border:1px solid rgba(0,0,0,.15);display:grid;place-items:center;font-size:17px;background:#fff">🌙</div>'
          + '<span>|</span>'
          + '<div style="width:38px;height:38px;border-radius:8px;border:1px solid rgba(0,0,0,.1);display:flex;flex-direction:column;justify-content:center;gap:4px;padding:0 9px"><span style="display:block;height:2px;background:#1e2333;border-radius:2px"></span><span style="display:block;height:2px;background:#1e2333;border-radius:2px"></span><span style="display:block;height:2px;background:#1e2333;border-radius:2px"></span></div>'
          + '</div></div>';
      case "aeo":
        var aeoSt = p.style === "highlight"
          ? "border-left:4px solid " + pr + ";background:" + pr + "0d;padding:16px 20px;border-radius:0 " + r + " " + r + " 0"
          : p.style === "minimal" ? "border-top:2px solid " + pr + ";border-bottom:1px solid #eef;padding:12px 0"
          : "border:1px solid " + pr + "33;background:" + pr + "08;padding:16px 20px;border-radius:" + r;
        return '<div style="padding:16px 32px"><aside style="' + aeoSt + '">'
          + '<div style="font-size:11px;font-weight:700;color:' + pr + ';text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px">&#128214; ' + esc(p.title || "สรุปบทความ") + '</div>'
          + '<p style="font-size:13.5px;color:#4a5063;margin:0;line-height:1.65">' + tpl("สรุปเนื้อหาบทความอัตโนมัติจาก snippet · เพิ่มโอกาสให้ Google และ AI ดึงข้อมูลนี้แสดงในผลการค้นหา","Article summary auto-pulled from snippet · improves chances for Google & AI to show in search results") + '</p>'
          + '</aside></div>';
      case "toc":
        return '<div style="padding:16px 32px"><nav style="border-left:3px solid ' + pr + ';border-radius:0 ' + r + ' ' + r + ' 0;background:#f7f8fc;overflow:hidden">'
          + '<div style="display:flex;align-items:center;gap:7px;padding:10px 14px;font-size:11px;font-weight:700;color:#4a5063;text-transform:uppercase;letter-spacing:.06em;cursor:pointer">'
          + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
          + ' ' + esc(p.title || "สารบัญ") + '<span style="margin-left:auto;font-size:10px">&#9660;</span></div>'
          + '<div style="padding:0 4px 0 14px"><ol style="padding-left:18px;margin:4px 0 12px;font-size:13px;color:#1e2333;line-height:1.85">'
          + '<li><a style="color:inherit;text-decoration:none">' + tpl("หัวข้อที่ 1 (h2)","Heading 1 (h2)") + '</a></li>'
          + '<li><a style="color:inherit;text-decoration:none">' + tpl("หัวข้อที่ 2","Heading 2") + '</a><ol style="padding-left:14px;margin:0"><li style="font-size:12px;color:#4a5063"><a style="color:inherit;text-decoration:none">' + tpl("หัวข้อย่อย (h3)","Subheading (h3)") + '</a></li></ol></li>'
          + '<li><a style="color:inherit;text-decoration:none">' + tpl("หัวข้อที่ 3","Heading 3") + '</a></li>'
          + '</ol></div></nav></div>';
      case "related":
        var rCols = p.columns || 2, rCards = "";
        for (var ri = 0; ri < Math.min(p.count || 4, rCols * 2); ri++) rCards += postCard(p.showImage, false, d, ac);
        return section(p.heading || "บทความที่เกี่ยวข้อง", d, '<div style="display:grid;grid-template-columns:repeat(' + rCols + ',1fr);gap:16px">' + rCards + '</div>');
      case "progress":
        var pClrPrev = p.color === "accent" ? ac : p.color === "gradient" ? "linear-gradient(90deg," + pr + "," + ac + ")" : pr;
        return '<div style="padding:20px 32px"><div style="background:#f7f8fc;border-radius:' + r + ';padding:16px">'
          + '<div style="width:100%;height:' + (p.height || 3) + 'px;background:#e8eaf2;border-radius:9px;overflow:hidden;margin-bottom:10px">'
          + '<div style="width:55%;height:100%;background:' + pClrPrev + ';border-radius:9px"></div></div>'
          + '<div style="font-size:12px;color:#aab;text-align:center">Reading Progress Bar · ' + tpl("ติดด้านบนทุกหน้า","fixed to top on all pages") + '</div>'
          + '</div></div>';
      case "notfound":
        var nfTpl = p.template || "minimal";
        var nfBg = nfTpl === "dark" ? "#0f172a" : nfTpl === "space" ? "linear-gradient(160deg," + pr + "," + ac + ")" : "#f7f8fc";
        var nfFg = nfTpl === "minimal" ? "#1e2333" : "#fff";
        var nfCodeClr = nfTpl === "minimal" ? pr : "rgba(255,255,255,.22)";
        var nfDescClr = nfTpl === "minimal" ? "#828aa0" : "rgba(255,255,255,.75)";
        var nfBtnBg = nfTpl === "minimal" ? pr : nfTpl === "space" ? "#fff" : pr;
        var nfBtnFg = nfTpl === "minimal" ? "#fff" : nfTpl === "space" ? pr : "#fff";
        var nfIcon = nfTpl === "space" ? "🚀" : nfTpl === "dark" ? "🌌" : "🔍";
        var nfInputBg = nfTpl === "minimal" ? "#fff" : "rgba(255,255,255,.18)";
        var nfInputBd = nfTpl === "minimal" ? "#dde" : "rgba(255,255,255,.3)";
        var nfInputClr = nfTpl === "minimal" ? "#1e2333" : "#fff";
        return '<div style="padding:64px 32px;text-align:center;background:' + nfBg + ';min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center">'
          + '<div style="font-size:11px;font-weight:700;color:' + (nfTpl === "minimal" ? pr : "rgba(255,255,255,.55)") + ';text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px">' + tpl("ตัวอย่าง หน้า 404","Preview: 404 Page") + '</div>'
          + '<div style="font-size:52px;margin-bottom:4px">' + nfIcon + '</div>'
          + '<div style="font-size:88px;font-weight:900;line-height:1;color:' + nfCodeClr + ';font-family:' + fontStack(d.font) + ';letter-spacing:-.04em">' + esc(p.heading || "404") + '</div>'
          + '<h2 style="font-size:20px;font-weight:700;color:' + nfFg + ';margin:12px 0 0;font-family:' + fontStack(d.font) + '">' + esc(p.sub || "ขออภัย · ไม่พบหน้านี้") + '</h2>'
          + '<p style="font-size:14px;color:' + nfDescClr + ';margin:8px auto 0;max-width:400px;line-height:1.6">' + esc(p.desc || "หน้าที่คุณต้องการอาจถูกย้าย ลบ หรือ URL ไม่ถูกต้อง") + '</p>'
          + '<a style="display:inline-block;margin-top:22px;padding:12px 26px;background:' + nfBtnBg + ';color:' + nfBtnFg + ';font-weight:600;border-radius:' + r + ';text-decoration:none;font-size:14px">' + esc(p.btnText || "กลับหน้าแรก") + '</a>'
          + (p.showSearch !== false ? '<div style="margin-top:18px;display:flex;gap:0;max-width:340px;margin-left:auto;margin-right:auto"><input type="text" placeholder="' + tpl("ค้นหาในบล็อก…","Search blog…") + '" style="flex:1;padding:10px 13px;border:1px solid ' + nfInputBd + ';border-radius:' + r + ' 0 0 ' + r + ';font-size:13px;background:' + nfInputBg + ';color:' + nfInputClr + ';outline:none"><button style="padding:10px 14px;background:' + nfBtnBg + ';color:' + nfBtnFg + ';border:0;border-radius:0 ' + r + ' ' + r + ' 0;cursor:pointer">🔍</button></div>' : '')
          + '</div>';
      case "footer":
        var fLinks = footerLinksOf(p);
        var fSocials = socialLinksOf(p);
        // footer palette: bg from prop, text auto dark/light for contrast
        var fBg = p.bgColor || "#0f172a";
        var fBase = isDarkColor(fBg) ? "255,255,255" : "17,24,39";
        var fFg = "rgb(" + fBase + ")", fMuted = "rgba(" + fBase + ",.62)",
            fDim = "rgba(" + fBase + ",.4)", fLine = "rgba(" + fBase + ",.12)", fChip = "rgba(" + fBase + ",.1)";
        var fLinksCols = VIEW === "mobile" ? 1 : (fLinks.length > 4 ? 2 : 1);
        var showFIcons = p.showFooterIcons !== false;
        var fLinksHtml = fLinks.map(function (m) {
          var fic = showFIcons ? menuIconSvg(m, "preview") : "";
          return '<a style="display:inline-flex;align-items:center;gap:7px;color:' + fMuted + ';font-size:13.5px;text-decoration:none;padding:3px 0;transition:color .2s">' + fic + esc(m.label) + '</a>';
        }).join("");
        var fSocialHtml = fSocials.map(function (s) {
          var ic = SOCIAL_ICONS[s.platform];
          if (!ic) return "";
          return '<div title="' + ic.label + '" style="width:34px;height:34px;border-radius:8px;background:' + fChip + ';display:grid;place-items:center;flex-shrink:0">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:' + fFg + '">' + ic.svg + '</svg></div>';
        }).join("");
        var fGridStyle = VIEW === "mobile"
          ? "display:flex;flex-direction:column;gap:24px"
          : "display:grid;grid-template-columns:1.5fr 1fr;gap:40px;align-items:start";
        var fLogoUrl = S.seo && S.seo.logoUrl;
        var fLogoPart = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
          (fLogoUrl ? '<img src="' + esc(fLogoUrl) + '" alt="" style="height:28px;width:auto;max-width:120px;object-fit:contain;flex:none">' : '') +
          '<div style="font-family:' + fontStack(d.font) + ';font-weight:700;font-size:20px;color:' + fFg + '">' + esc(S.seo.blogTitle || "MyBlog") + '</div></div>';
        return '<div style="background:' + fBg + ';color:' + fFg + ';padding:48px 32px 24px">' +
          '<div style="' + fGridStyle + ';max-width:980px;margin:0 auto">' +
          '<div>' +
            fLogoPart +
            '<p style="color:' + fMuted + ';font-size:13.5px;line-height:1.65;margin:0 0 18px;max-width:320px">' + esc(p.about) + '</p>' +
            (fSocials.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + fSocialHtml + '</div>' : '') +
          '</div>' +
          (fLinks.length ? '<div style="display:grid;grid-template-columns:repeat(' + fLinksCols + ',1fr);gap:6px 24px;padding-top:4px">' + fLinksHtml + '</div>' : '') +
          '</div>' +
          '<div style="text-align:center;color:' + fDim + ';font-size:12px;margin-top:36px;padding-top:18px;border-top:1px solid ' + fLine + ';max-width:980px;margin-left:auto;margin-right:auto">' + esc(p.copyright) + '</div>' +
          '</div>';
    }
    return "";
  }
  function section(heading, d, inner) {
    return '<div style="padding:48px 32px;max-width:1080px;margin:0 auto">' + (heading ? '<h2 style="font-family:' + fontStack(d.font) + ';font-size:26px;margin:0 0 24px;color:#1e2333">' + esc(heading) + "</h2>" : "") + inner + "</div>";
  }
  function postCard(img, exc, d, ac) {
    return '<div style="border:1px solid #eef;border-radius:' + d.radius + 'px;overflow:hidden;background:#fff">' + (img ? '<div style="aspect-ratio:16/9;background:linear-gradient(120deg,#e8eaf2,#f1f2f9)"></div>' : "") + '<div style="padding:16px"><span style="font-size:11px;color:' + ac + ';font-weight:700">' + tpl("หมวดหมู่","Category") + '</span><h3 style="font-size:17px;margin:6px 0 0;color:#1e2333;line-height:1.3">' + tpl("หัวข้อบทความตัวอย่างที่น่าสนใจ","Sample Article Heading") + '</h3>' + (exc ? '<p style="color:#828aa0;font-size:13.5px;margin:8px 0 0;line-height:1.55">' + tpl("สรุปเนื้อหาบทความสั้นๆ ให้ผู้อ่านเห็นภาพรวม…","Brief article summary for readers…") + '</p>' : "") + "</div></div>";
  }
  function postRow(img, d, ac) {
    return '<div style="display:flex;gap:16px;align-items:center;border-bottom:1px solid #eef;padding-bottom:16px">' + (img ? '<div style="width:120px;aspect-ratio:4/3;background:linear-gradient(120deg,#e8eaf2,#f1f2f9);border-radius:' + d.radius + 'px;flex:none"></div>' : "") + '<div><span style="font-size:11px;color:' + ac + ';font-weight:700">' + tpl("หมวดหมู่","Category") + '</span><h3 style="font-size:18px;margin:5px 0;color:#1e2333">' + tpl("หัวข้อบทความในรายการอ่านต่อ","Article Heading in List") + '</h3><p style="color:#828aa0;font-size:13.5px;margin:0">' + tpl("สรุปเนื้อหาสั้นๆ ของบทความนี้…","Brief article content summary…") + '</p></div></div>';
  }

  function renderCanvas() {
    updateLibSingletonState();
    var f = $("#frame");
    if (!S.blocks.length) {
      var isMobEmpty = window.matchMedia("(max-width:1000px)").matches;
      f.innerHTML = '<div class="canvas-empty">' + svg(IC.cursor, 1.5) +
        "<b>" + (isMobEmpty ? tpl("ยังไม่มีบล็อกบนหน้าเว็บ", "No blocks on the page yet") : tr("ลากองค์ประกอบมาวางที่นี่")) + "</b>" +
        "<span>" + (isMobEmpty ? tpl("แตะปุ่มด้านล่างเพื่อเลือกบล็อกแรกของคุณ", "Tap the button below to pick your first block") : tr("เลือกจากแผงด้านซ้าย ลากมาวางเพื่อเริ่มออกแบบหน้าเว็บของคุณ")) + "</span>" +
        '<button id="emptyAddBtn" style="margin-top:4px;background:linear-gradient(120deg,#6366f1,#8b5cf6);color:#fff;border:0;border-radius:10px;padding:11px 22px;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer">' + tpl("+ เพิ่มบล็อกแรก", "+ Add your first block") + '</button>' +
        "</div>";
      // make empty a dropzone
      f.firstChild.classList.add("dropzone");
      f.firstChild.dataset.idx = "0";
      var eab = f.querySelector("#emptyAddBtn");
      if (eab) eab.addEventListener("click", function (e) {
        e.stopPropagation();
        if (window.matchMedia("(max-width:1000px)").matches) { showMob("left"); }
        else { var lp = $(".panel.left"); if (lp) { lp.style.animation = "coachUp .35s"; setTimeout(function () { lp.style.animation = ""; }, 400); } }
      });
      return;
    }
    f.innerHTML = "";
    f.appendChild(dz(0));
    S.blocks.forEach(function (b, i) {
      var w = el("div", { class: "blk" + (b.id === SEL ? " sel" : ""), "data-id": b.id });
      var tag = el("div", { class: "blk-tag" });
      tag.innerHTML = '<span>' + blkLabel(b.type) + "</span>";
      var up = el("button", { title: "ขึ้น" }, "↑"), dn = el("button", { title: "ลง" }, "↓"), dup = el("button", { title: "ทำซ้ำ" }, "⧉"), del = el("button", { title: "ลบ" }, "✕");
      var locked = b.type === "header" || b.type === "footer";
      if (locked) { up.style.display = "none"; dn.style.display = "none"; }
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
    // mobile preview: show the fixed bottom nav if the header enables it
    if (VIEW === "mobile") {
      var hdrB = null;
      for (var hi = 0; hi < S.blocks.length; hi++) { if (S.blocks[hi].type === "header") { hdrB = S.blocks[hi]; break; } }
      if (hdrB && hdrB.props.mobileBottomNav !== false) {
        var bnWrap = el("div"); bnWrap.innerHTML = botNavPreview(); f.appendChild(bnWrap);
      }
    }
  }
  function dz(idx) { var d = el("div", { class: "dropzone", "data-idx": idx }); return d; }
  function blkLabel(t) {
    var m = BL === "en"
      ? { header: "Header", hero: "Hero", footer: "Footer", postgrid: "Post Grid", postlist: "Post List", featured: "Featured", about: "About", text: "Text", cta: "CTA", image: "Image", ad: "Ad", newsletter: "Newsletter", share: "Social Share", columns: "Columns", sidebar: "Sidebar", search: "Search", darkmode: "Dark Mode Toggle", aeo: "AEO Summary Box", toc: "Table of Contents", related: "Related Posts", progress: "Progress Bar", notfound: "404 Page" }
      : { header: "ส่วนหัว", hero: "Hero", footer: "ส่วนท้าย", postgrid: "ตารางบทความ", postlist: "รายการบทความ", featured: "บทความเด่น", about: "เกี่ยวกับ", text: "ข้อความ", cta: "CTA", image: "รูปภาพ", ad: "โฆษณา", newsletter: "Newsletter", share: "Social Share", columns: "คอลัมน์", sidebar: "Sidebar", search: "ค้นหา", darkmode: "Dark Mode Toggle", aeo: "AEO Summary Box", toc: "สารบัญ (TOC)", related: "บทความที่เกี่ยวข้อง", progress: "Progress Bar", notfound: "หน้า 404" };
    return m[t] || t;
  }

  /* ---------- block ops ---------- */
  // ฟีเจอร์ที่มีได้ 1 อันต่อหน้า · กดเพิ่ม/ทำสำเนาซ้ำจะแจ้งเตือนแทน
  // toc/darkmode/notfound/progress/aeo/related = utility ที่ inject ครั้งเดียว,
  // sidebar = โครงหน้า 2 คอลัมน์มีได้ชุดเดียว, header/footer = โครงบน-ล่างของทุกหน้า
  var SINGLETON_BLOCKS = { toc: 1, darkmode: 1, notfound: 1, progress: 1, sidebar: 1, header: 1, footer: 1, aeo: 1, related: 1 };
  function singletonExists(type) {
    return !!SINGLETON_BLOCKS[type] && S.blocks.some(function (b) { return b.type === type; });
  }
  function updateLibSingletonState() {
    $$(".lib-item").forEach(function (el) {
      var t = el.dataset.type;
      if (SINGLETON_BLOCKS[t]) el.classList.toggle("added", S.blocks.some(function (b) { return b.type === t; }));
    });
  }
  function addBlock(type, idx) {
    if (singletonExists(type)) {
      toast(tpl("คุณได้เพิ่ม “" + blkLabel(type) + "” ไว้แล้ว · ฟีเจอร์นี้มีได้ 1 อันต่อหน้า", "“" + blkLabel(type) + "” is already added · only one per page"));
      return;
    }
    var b = { id: uid(), type: type, props: blockDefaults(type) };
    if (idx == null || idx > S.blocks.length) idx = S.blocks.length;
    var minIdx = (S.blocks.length > 0 && S.blocks[0].type === "header") ? 1 : 0;
    var maxIdx = (S.blocks.length > 0 && S.blocks[S.blocks.length - 1].type === "footer") ? S.blocks.length - 1 : S.blocks.length;
    idx = Math.max(minIdx, Math.min(idx, maxIdx));
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
    if (SINGLETON_BLOCKS[S.blocks[i].type]) {
      toast(tpl("“" + blkLabel(S.blocks[i].type) + "” มีได้ 1 อันต่อหน้า · ทำสำเนาไม่ได้", "“" + blkLabel(S.blocks[i].type) + "” is limited to one per page · cannot duplicate"));
      return;
    }
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
    if (S.blocks[i].type === "header" || S.blocks[i].type === "footer") return;
    if (S.blocks[j].type === "header" || S.blocks[j].type === "footer") return;
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
    if (!SEL) { c.innerHTML = '<div class="props-empty">' + svg(IC.cursor, 1.5) + "<div>" + tr("เลือกองค์ประกอบบนหน้าเว็บ") + "<br>" + tr("เพื่อปรับแต่งคุณสมบัติ") + "</div></div>"; return; }
    var b = S.blocks.find(function (x) { return x.id === SEL; }); if (!b) { c.innerHTML = ""; return; }
    var f = fieldsFor(b);
    c.innerHTML = '<div class="sec-title">' + blkLabel(b.type) + "</div>" + f
      + '<div class="sec-divider"></div>'
      + '<div class="sec-title collapsed">' + tr("เงื่อนไขการแสดงผล (ขั้นสูง)") + '</div>'
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
  function txt(key, label, val, hint) { return '<div class="field"><label>' + tr(label) + '</label><input class="inp" data-k="' + key + '" value="' + esc(val) + '">' + (hint ? '<div class="hint">' + hint + "</div>" : "") + "</div>"; }
  function area(key, label, val, rich) { return '<div class="field"><label>' + tr(label) + (rich ? ' <span style="font-size:10px;font-weight:400;color:var(--brand-2);opacity:.8">B I U 🔗</span>' : '') + '</label><textarea class="ta" data-k="' + key + '"' + (rich ? ' data-rich="1"' : '') + '>' + esc(val) + "</textarea></div>"; }
  function seg(key, label, val, opts) { return '<div class="field"><label>' + tr(label) + '</label><div class="seg" data-seg="' + key + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === val ? ' class="on"' : "") + ">" + tr(o[1]) + "</button>"; }).join("") + "</div></div>"; }
  function tog(key, label, val, sub) { return '<label class="tg"><span class="lbl">' + tr(label) + (sub ? "<small>" + tr(sub) + "</small>" : "") + '</span><input type="checkbox" data-k="' + key + '"' + (val ? " checked" : "") + '><span class="sw-tg"></span></label>'; }
  function num(key, label, val, mn, mx) { return '<div class="field"><label>' + tr(label) + ' · ' + val + '</label><input class="inp" type="range" min="' + mn + '" max="' + mx + '" value="' + val + '" data-k="' + key + '" data-num="1"></div>'; }
  function col(key, label, val, hint) { return '<div class="field"><label>' + tr(label) + '</label><input class="inp" type="color" data-k="' + key + '" value="' + esc(val) + '" style="height:42px;padding:4px;cursor:pointer">' + (hint ? '<div class="hint">' + tr(hint) + '</div>' : '') + '</div>'; }
  function imgUrl(key, label, val) {
    val = val || "";
    var pvw = '<div class="img-pvw" data-img-for="' + key + '"' + (val ? '' : ' style="display:none"') + '>' +
      '<img class="img-pvw-img"' + (val ? ' src="' + esc(val) + '"' : '') + ' alt="">' +
      '<div class="img-pvw-st"></div>' +
      '</div>';
    var guide = '<details class="img-guide"><summary>' + tpl('📸 วิธีได้ URL รูปจาก Blogger', '📸 How to get image URL from Blogger') + '</summary>' +
      '<ol class="img-guide-steps">' +
      '<li>' + tpl('เปิด Blogger → สร้างโพสต์ใหม่', 'Open Blogger → Create new post') + '</li>' +
      '<li>' + tpl('กด <b>แทรกรูปภาพ</b> → อัปโหลดรูป', 'Click <b>Insert Image</b> → Upload') + '</li>' +
      '<li>' + tpl('กด ✏️ <b>HTML View</b>', 'Click ✏️ <b>HTML View</b>') + '</li>' +
      '<li>' + tpl('หาโค้ด <code>&lt;img src="https://blogger.googleusercontent.com/..."&gt;</code>', 'Find <code>&lt;img src="https://blogger.googleusercontent.com/..."&gt;</code>') + '</li>' +
      '<li>' + tpl('คัดลอก URL ใน <code>src="..."</code>', 'Copy the URL inside <code>src="..."</code>') + '</li>' +
      '</ol>' +
      '<div class="img-guide-note">' + tpl('รองรับ: blogger.googleusercontent.com · Cloudinary · Imgur · GitHub/jsDelivr · Cloudflare R2 · และ URL รูปภาพ .jpg .png .webp .gif .avif', 'Supports: blogger.googleusercontent.com · Cloudinary · Imgur · GitHub/jsDelivr · Cloudflare R2 · and direct image URLs (.jpg .png .webp .gif .avif)') + '</div>' +
      '</details>';
    return '<div class="field"><label>' + tr(label) + '</label><input class="inp img-url-inp" data-k="' + key + '" data-img-key="' + key + '" value="' + esc(val) + '" placeholder="https://...">' + pvw + guide + '</div>';
  }
  function imgUrlSeo(key, label, val) {
    val = val || "";
    var pvwKey = "seo-" + key;
    var pvw = '<div class="img-pvw" data-img-for="' + pvwKey + '"' + (val ? '' : ' style="display:none"') + '>' +
      '<img class="img-pvw-img"' + (val ? ' src="' + esc(val) + '"' : '') + ' alt="">' +
      '<div class="img-pvw-st"></div>' +
      '</div>';
    var guide = '<details class="img-guide"><summary>' + tpl('📸 วิธีได้ URL รูปจาก Blogger', '📸 How to get image URL from Blogger') + '</summary>' +
      '<ol class="img-guide-steps">' +
      '<li>' + tpl('เปิด Blogger → สร้างโพสต์ใหม่', 'Open Blogger → Create new post') + '</li>' +
      '<li>' + tpl('กด <b>แทรกรูปภาพ</b> → อัปโหลดโลโก้', 'Click <b>Insert Image</b> → Upload your logo') + '</li>' +
      '<li>' + tpl('กด ✏️ <b>HTML View</b>', 'Click ✏️ <b>HTML View</b>') + '</li>' +
      '<li>' + tpl('หาโค้ด <code>&lt;img src="https://blogger.googleusercontent.com/..."&gt;</code>', 'Find <code>&lt;img src="https://blogger.googleusercontent.com/..."&gt;</code>') + '</li>' +
      '<li>' + tpl('คัดลอก URL ใน <code>src="..."</code>', 'Copy the URL inside <code>src="..."</code>') + '</li>' +
      '</ol>' +
      '<div class="img-guide-note">' + tpl('รองรับ: blogger.googleusercontent.com · Cloudinary · Imgur · GitHub/jsDelivr · Cloudflare R2 · และ URL รูปภาพ .jpg .png .webp', 'Supports: blogger.googleusercontent.com · Cloudinary · Imgur · GitHub/jsDelivr · Cloudflare R2 · and image URLs (.jpg .png .webp)') + '</div>' +
      '</details>';
    return '<div class="field"><label>' + tr(label) + '</label><input class="inp img-url-inp" data-sk="' + key + '" data-img-key="' + pvwKey + '" value="' + esc(val) + '" placeholder="https://...">' + pvw + guide + '</div>';
  }
  function menuEditor(p) {
    var items = menuItemsOf(p);
    // linked URL set for checklist
    var linked = {};
    items.forEach(function (it) { linked[menuUrlFor(it)] = true; });
    // type select options HTML
    var typeOpts = Object.keys(MENU_TYPE_INFO).map(function (k) {
      var ti = MENU_TYPE_INFO[k];
      return '<option value="' + k + '">' + ti.icon + " " + tr(ti.label) + "</option>";
    }).join("");
    var rows = items.map(function (m, i) {
      var t = m.type || "custom";
      var computedUrl = menuUrlFor(m);
      var typeSelHtml = '<select class="inp menu-type-sel" data-mt="' + i + '">' +
        Object.keys(MENU_TYPE_INFO).map(function (k) {
          return '<option value="' + k + '"' + (t === k ? " selected" : "") + ">" + MENU_TYPE_INFO[k].icon + " " + tr(MENU_TYPE_INFO[k].label) + "</option>";
        }).join("") + "</select>";
      // secondary area
      var sec = "";
      if (t === "home" || t === "search") {
        sec = '<div class="url-chip auto">⚡ ' + computedUrl + "</div>";
      } else if (t === "page") {
        sec = '<input class="inp" data-mpslug="' + i + '" value="' + esc(m.pageSlug || "") + '" placeholder="' + tpl("ชื่อหน้า เช่น about, contact", "Page slug (e.g. about, contact)") + '">' +
          '<div class="url-chip' + (m.pageSlug ? "" : " empty") + '">' + (m.pageSlug ? computedUrl : tpl("กรอกชื่อหน้าก่อน", "Enter page slug first")) + "</div>" +
          '<div class="menu-page-status">' +
          '<label class="tg-mini"><input type="checkbox" data-mpc="' + i + '"' + (m.pageCreated ? " checked" : "") + '><span class="tg-lbl">' + tpl("สร้างหน้าเพจใน Blogger แล้ว", "Page created in Blogger") + '</span></label>' +
          (!m.pageCreated ? ' <a href="/docs/create-page" target="_blank" class="help-link-sm">' + tpl("📖 วิธีสร้างหน้าเพจ", "📖 How to create a page") + '</a>' : "") +
          "</div>";
      } else if (t === "label") {
        sec = '<input class="inp" data-mlname="' + i + '" value="' + esc(m.labelName || "") + '" placeholder="' + tpl("ชื่อป้ายกำกับ เช่น ข่าวสาร, รีวิว", "Label name (e.g. news, reviews)") + '">' +
          '<div class="url-chip' + (m.labelName ? "" : " empty") + '">' + (m.labelName ? computedUrl : tpl("กรอกชื่อป้ายกำกับก่อน", "Enter label name first")) + "</div>";
      } else if (t === "dropdown") {
        var children = Array.isArray(m.children) ? m.children : [];
        var childRows = children.map(function (c, ci) {
          return '<div class="menu-child-row">' +
            '<span class="child-indent">↳</span>' +
            '<input class="inp" data-mclbl="' + i + "_" + ci + '" value="' + esc(c.label || "") + '" placeholder="' + tpl("ชื่อเมนูย่อย", "Sub-menu name") + '">' +
            '<input class="inp" data-mcurl="' + i + "_" + ci + '" value="' + esc(c.url || "") + '" placeholder="' + tpl("URL หรือชื่อหน้า", "URL or page slug") + '">' +
            '<button class="menu-del menu-cdel" data-mcdel="' + i + "_" + ci + '">✕</button>' +
          "</div>";
        }).join("");
        sec = '<div class="menu-children">' + childRows +
          '<button class="menu-add-child" data-mcadd="' + i + '">' + tr("+ เพิ่มเมนูย่อย") + '</button></div>';
      } else {
        sec = '<input class="inp menu-url" data-mu="' + i + '" value="' + esc(m.url || "") + '" placeholder="' +
          (t === "external" ? "https://www.example.com" : "/p/about.html") + '">' +
          (t === "custom" ? '<div class="hint" style="margin:0">' + tpl("รองรับ", "Supports") + ' <code>/p/…</code>, <code>/search/label/…</code>, <code>#id</code></div>' : "");
      }
      var iconSel = '<select class="inp menu-icon-sel" data-micon="' + i + '" title="' + tpl("ไอคอนหน้าเมนู", "Menu icon") + '" style="flex:0 0 auto;width:50px;padding:6px 2px;text-align:center;font-size:15px">' +
        '<option value="auto"' + (!m.icon || m.icon === "auto" ? " selected" : "") + '>✦</option>' +
        MENU_ICON_KEYS.map(function (k) { return '<option value="' + k + '"' + (m.icon === k ? " selected" : "") + '>' + MENU_ICONS[k].emoji + '</option>'; }).join("") +
        '</select>';
      return '<div class="menu-row" data-mi="' + i + '">' +
        '<div class="menu-row-top">' +
        '<span class="menu-grip">⋮⋮</span>' + typeSelHtml +
        '<input class="inp menu-label" data-ml="' + i + '" value="' + esc(m.label) + '" placeholder="' + tpl("ชื่อเมนู", "Menu label") + '">' +
        iconSel +
        '<button class="menu-del" data-mdel="' + i + '" title="' + tpl("ลบ", "Delete") + '">✕</button>' +
        "</div>" +
        '<div class="menu-secondary">' + sec + "</div>" +
      "</div>";
    }).join("");
    // type picker (shown when adding new item)
    var pickerBtns = Object.keys(MENU_TYPE_INFO).map(function (k) {
      var ti = MENU_TYPE_INFO[k];
      return '<button class="mtp-btn" data-mt-pick="' + k + '"><span class="mtp-ico">' + ti.icon + "</span><span>" + tr(ti.label) + "</span></button>";
    }).join("");
    // page checklist
    var clHtml = PAGE_CHECKLIST.map(function (pc) {
      var url = "/p/" + pc.slug + ".html";
      return '<label class="cl-item"><input type="checkbox" disabled' + (linked[url] ? " checked" : "") + '><span>' + pc.label + ' <small>' + url + "</small></span></label>";
    }).join("");
    return '<div class="field"><label>' + tr("เมนูนำทาง") + '</label>' +
      '<div class="menu-list">' + rows + "</div>" +
      '<div class="hint" style="margin-top:6px">' + tpl('ช่องไอคอน ✦ = เลือกอัตโนมัติจากชื่อเมนู · หรือเลือกไอคอนเองได้ · ปิดไอคอนทั้งหมดได้ที่สวิตช์ด้านล่าง', 'Icon box ✦ = auto-pick from the label · or choose your own · turn all icons off with the switch below') + '</div>' +
      '<div class="menu-type-picker" id="mt-picker" style="display:none">' +
        '<div class="mtp-grid">' + pickerBtns + "</div>" +
        '<button class="menu-cancel-pick" id="mt-cancel">' + tpl("ยกเลิก", "Cancel") + '</button>' +
      "</div>" +
      '<button class="menu-add" data-madd="1">' + tr("+ เพิ่มเมนู") + '</button>' +
      "</div>" +
      '<div class="field"><label>' + tr("✅ หน้าเพจที่ควรสร้างก่อน") + '</label>' +
      '<div class="page-checklist">' + clHtml + "</div>" +
      '<div class="hint">' + tpl('สร้างหน้าเหล่านี้ใน Blogger → หน้าเพจ แล้วนำ URL มาเชื่อมกับเมนูประเภท "หน้าเพจ"', 'Create these pages in Blogger → Pages, then link them using a "Page" menu type') + '</div>' +
      "</div>";
  }

  function footerEditor(p) {
    var fItems = footerLinksOf(p);
    var sItems = socialLinksOf(p);
    var PLATFORMS = Object.keys(SOCIAL_ICONS);
    var linkRows = fItems.map(function (m, i) {
      var iconSel = '<select class="inp menu-icon-sel" data-ficon="' + i + '" title="' + tpl("ไอคอน", "Icon") + '" style="flex:0 0 auto;width:50px;padding:6px 2px;text-align:center;font-size:15px">' +
        '<option value="auto"' + (!m.icon || m.icon === "auto" ? " selected" : "") + '>✦</option>' +
        MENU_ICON_KEYS.map(function (k) { return '<option value="' + k + '"' + (m.icon === k ? " selected" : "") + '>' + MENU_ICONS[k].emoji + '</option>'; }).join("") +
        '</select>';
      return '<div class="menu-row"><div class="menu-row-top">' +
        '<span class="menu-grip">⋮⋮</span>' +
        '<input class="inp menu-label" data-fll="' + i + '" value="' + esc(m.label) + '" placeholder="' + tpl("ชื่อลิงก์", "Link label") + '">' +
        iconSel +
        '<button class="menu-del" data-fldel="' + i + '" title="' + tpl("ลบ", "Delete") + '">✕</button>' +
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
        '<button class="menu-del" data-sdel="' + i + '" title="' + tpl("ลบ", "Delete") + '">✕</button>' +
        '</div></div>';
    }).join("");
    return '<div class="field"><label>' + tr("ลิงก์ใน Footer") + '</label>' +
      '<div class="menu-list">' + linkRows + '</div>' +
      '<button class="menu-add" data-fladd="1">' + tr("+ เพิ่มลิงก์") + '</button>' +
      '<div class="hint">' + tpl('พิมพ์ชื่อหน้าเพจ เช่น <code>contact</code> → ระบบเปลี่ยนเป็น <code>/p/contact.html</code> อัตโนมัติ · ช่องไอคอน ✦ = เลือกอัตโนมัติจากชื่อลิงก์', 'Type a page name, e.g. <code>contact</code> → auto-converts to <code>/p/contact.html</code> · Icon box ✦ = auto-pick from the label') + '</div>' +
      tog("showFooterIcons", "แสดงไอคอนหน้าลิงก์", p.showFooterIcons !== false) + '</div>' +
      '<div class="field"><label>' + tr("โซเชียลมีเดีย") + '</label>' +
      '<div class="menu-list">' + socialRows + '</div>' +
      '<button class="menu-add" data-sadd="1">' + tr("+ เพิ่ม Social") + '</button></div>';
  }

  function fieldsFor(b) {
    var p = b.props;
    switch (b.type) {
      case "header": return imgUrlSeo("logoUrl", "URL รูปโลโก้ (Header & Footer & Schema)", S.seo && S.seo.logoUrl || "")
        + '<div class="note info">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 2) + '<div>' + tpl('แนะนำ 512×512px · PNG โปร่งใส · ≤200KB · ซิงก์กับ Knowledge Graph "URL โลโก้" อัตโนมัติ', 'Recommended 512×512px · PNG transparent · ≤200KB · synced with Knowledge Graph "Logo URL"') + '</div></div>'
        + txt("logoText", "ชื่อบล็อก / ข้อความโลโก้", p.logoText, tpl('ซิงก์ไปยัง SEO → ชื่อบล็อก อัตโนมัติ', 'Auto-synced to SEO → Blog name'))
        + menuEditor(p) + tog("showMenuIcons", "แสดงไอคอนหน้าเมนู", p.showMenuIcons !== false) + seg("mobileSide", "เมนูมือถือเด้งจาก", p.mobileSide || "right", [["left", "◧ ซ้าย"], ["right", "ขวา ◨"]]) + tog("sticky", "ติดด้านบน (Sticky)", p.sticky) + tog("showSearch", "แสดงปุ่มค้นหา", p.showSearch) + tog("mobileBottomNav", "แถบเมนูล่าง (มือถือ)", p.mobileBottomNav !== false, tpl("หน้าแรก · ค้นหา · เมนู · โหมด · แชร์", "Home · Search · Menu · Mode · Share"));
      case "hero": return txt("eyebrow", "ป้ายกำกับเล็ก (Eyebrow)", p.eyebrow || "", tpl("เว้นว่าง = ซ่อน", "Leave blank to hide")) + txt("title", "หัวข้อ", p.title) + area("subtitle", "คำโปรย", p.subtitle) + txt("btnText", "ข้อความปุ่ม", p.btnText) + seg("align", "จัดวาง", p.align, [["left", "ซ้าย"], ["center", "กลาง"]]) + seg("bg", "พื้นหลัง", p.bg, [["gradient", "ไล่สี"], ["dark", "เข้ม"], ["soft", "อ่อน"]]) + tog("showImage", "แสดงรูปภาพ (วงกลม)", p.showImage !== false) + imgUrl("imageUrl", "URL รูปภาพ Hero", p.imageUrl || "");
      case "footer": return col("bgColor", "สีพื้นหลัง Footer", p.bgColor || "#0f172a", tpl("ตัวอักษรจะปรับเป็นสีขาว/ดำให้อ่านง่ายอัตโนมัติ", "Text auto-switches to white/black for readability")) + area("about", "เกี่ยวกับ (คำอธิบายสั้น)", p.about) + footerEditor(p) + txt("copyright", "ข้อความลิขสิทธิ์", p.copyright);
      case "postgrid": return txt("heading", "หัวข้อส่วน", p.heading) + num("columns", "จำนวนคอลัมน์", p.columns, 2, 4) + num("count", "จำนวนบทความ", p.count, 2, 12) + tog("showImage", "แสดงรูปภาพ", p.showImage) + tog("showExcerpt", "แสดงคำโปรย", p.showExcerpt) + txt("readMore", "ข้อความปุ่มอ่านต่อ", p.readMore || "", tpl("เว้นว่าง = ซ่อนลิงก์", "Leave blank to hide the link")) + num("cardRadius", "มุมโค้งการ์ด (px)", p.cardRadius != null ? p.cardRadius : 14, 0, 28) + seg("cardStyle", "สไตล์การ์ด", p.cardStyle || "shadow", [["shadow", "เงา"], ["border", "เส้นขอบ"], ["flat", "แบน"]]);
      case "postlist": return txt("heading", "หัวข้อส่วน", p.heading) + num("count", "จำนวนบทความ", p.count, 2, 10) + tog("showImage", "แสดงรูปภาพ", p.showImage);
      case "featured": return txt("heading", "หัวข้อส่วน", p.heading) +
        (S && S.templateId === "magazine"
          ? txt("featLabel", "ป้ายกำกับปักหมุดบทความแนะนำ", (p.featLabel != null ? p.featLabel : tpl("แนะนำ", "Featured")),
              tpl("📌 วิธีใช้: เข้า blogger.com → แก้ไขโพสต์ที่ต้องการ → ช่อง \"ป้ายกำกับ\" ใส่คำว่า <b>แนะนำ</b> (หรือคำที่ตั้งไว้ข้างบน) → เผยแพร่ · โพสต์นั้นจะขึ้นเป็นบทความแนะนำทันที ปักหมุดได้หลายโพสต์ (ใบแรก = ข่าวเด่นใหญ่) • ถ้ายังไม่มีโพสต์ติดป้ายนี้เลย ระบบจะแสดงบทความล่าสุดให้อัตโนมัติ • เว้นว่าง = ใช้บทความล่าสุดเสมอ",
                  "📌 How to: in blogger.com → edit a post → add the label <b>Featured</b> (or the word you set above) → publish · that post is pinned as featured. Pin several posts (first = the big lead). • If no post has this label yet, the newest posts show automatically. • Leave blank = always use latest posts"))
          : "");
      case "about": return txt("eyebrow", "ป้ายกำกับเล็ก (Eyebrow)", p.eyebrow || "", tpl("เว้นว่าง = ซ่อน", "Leave blank to hide")) + txt("name", "ชื่อ/ผู้เขียน", p.name) + area("bio", "ประวัติ (E-E-A-T)", p.bio, true) + tog("showAvatar", "แสดงรูปโปรไฟล์", p.showAvatar) + imgUrl("avatarUrl", "URL รูปโปรไฟล์", p.avatarUrl || "");
      case "text": return txt("heading", "หัวข้อ", p.heading) + area("body", "เนื้อหา", p.body, true) + seg("align", "จัดวาง", p.align, [["left", "ซ้าย"], ["center", "กลาง"]]);
      case "columns": return columnsFields(b, p);
      case "cta": return txt("title", "หัวข้อ", p.title) + txt("btnText", "ข้อความปุ่ม", p.btnText) + txt("btnUrl", "ลิงก์ปุ่ม", p.btnUrl || "", tpl("เช่น /p/contact.html หรือ https://…", "e.g. /p/contact.html or https://…")) + seg("bg", "พื้นหลัง", p.bg, [["gradient", "ไล่สี"], ["soft", "อ่อน"]]);
      case "image": return imgUrl("src", "URL รูปภาพ", p.src || "") + txt("alt", "ข้อความ ALT (SEO)", p.alt, "สำคัญต่อ SEO และการเข้าถึง") + txt("caption", "คำบรรยายใต้ภาพ", p.caption) + seg("ratio", "สัดส่วน", p.ratio, [["16/9", "16:9"], ["4/3", "4:3"], ["1/1", "1:1"]]);
      case "ad": return seg("slot", "ตำแหน่ง", p.slot, [["ใต้ส่วนหัว", "บน"], ["ในบทความ", "กลาง"], ["ไซด์บาร์", "ข้าง"]]) + tog("label", 'แสดงป้าย "โฆษณา"', p.label, "แนะนำตามนโยบาย AdSense");
      case "newsletter": return txt("heading", "หัวข้อ", p.heading) + area("sub", "คำโปรย", p.sub) + txt("btnText", "ข้อความปุ่ม", p.btnText) + seg("bg", "พื้นหลัง", p.bg || "soft", [["soft", "อ่อน"], ["gradient", "ไล่สี"], ["dark", "เข้ม"]]);
      case "share": return txt("label", "ข้อความนำ", p.label) + tog("facebook", "Facebook", p.facebook) + tog("twitter", "X (Twitter)", p.twitter) + tog("line", "LINE", p.line) + tog("copy", "คัดลอกลิงก์", p.copy);
      case "sidebar": return seg("position", "ตำแหน่ง Sidebar", p.position || "right", [["right", "ขวา ◨"], ["left", "◧ ซ้าย"]]) + txt("width", "ความกว้าง Sidebar", p.width || "280px") + tog("showSearch", "ช่องค้นหา", p.showSearch) + tog("showCategories", "ป้ายกำกับ / หมวดหมู่", p.showCategories) + tog("showArchive", "คลังบทความ", p.showArchive) + tog("showAbout", "เกี่ยวกับผู้เขียน", p.showAbout) + '<div class="note info">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 2) + '<div>ใส่ Sidebar ไว้ใกล้กลุ่มบทความ (postgrid/postlist/featured) · ระบบจะวาง Sidebar ข้างเนื้อหาหลักอัตโนมัติตอน Export XML</div></div>';
      case "search": return txt("heading", "หัวข้อ (เว้นว่าง = ซ่อน)", p.heading || "") + txt("placeholder", "Placeholder", p.placeholder || "ค้นหาในบล็อก…");
      case "darkmode": return '<div class="note ok">' + svg('<path d="M20 6L9 17l-5-5"/>', 2.5) + '<div>ปุ่มฝังใน Header โดยอัตโนมัติ · <b>มือถือ</b>: วางก่อนปุ่มเมนู ☰ | <b>Desktop</b>: วางหลังช่องค้นหา 🔍<br>หากไม่มีบล็อก Header จะลอยตัวมุมขวาล่างแทน<br><small>รองรับ <code>prefers-color-scheme</code> + จดจำใน localStorage</small></div></div>';
      case "aeo": return txt("title", "หัวข้อกล่องสรุป", p.title || "สรุปบทความ")
        + seg("style", "สไตล์", p.style || "card", [["card", "การ์ด"], ["highlight", "ไฮไลท์"], ["minimal", "เรียบ"]])
        + '<div class="note ok">' + svg('<path d="M20 6L9 17l-5-5"/>', 2.5) + '<div>ใช้ <code>.qt-aeo-summary</code> ซึ่งเชื่อมกับ SpeakableSpecification ใน Schema · ช่วยให้ Google Assistant และ AI อ่านสรุปบทความได้</div></div>';
      case "toc": return txt("title", "หัวข้อสารบัญ", p.title || "สารบัญ")
        + seg("maxDepth", "ความลึก heading", p.maxDepth || "3", [["2", "h2 เท่านั้น"], ["3", "h2 + h3"]])
        + tog("numbered", "แสดงลำดับตัวเลข", p.numbered !== false);
      case "related": return txt("heading", "หัวข้อส่วน", p.heading || "บทความที่เกี่ยวข้อง")
        + num("count", "จำนวนบทความ", p.count || 4, 2, 6)
        + num("columns", "จำนวนคอลัมน์", p.columns || 2, 1, 3)
        + tog("showImage", "แสดงรูปภาพ", p.showImage !== false)
        + '<div class="note info">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 2) + '<div>ดึงบทความผ่าน Blogger JSON Feed API ตามป้ายกำกับแรกของโพสต์ · ทำงานบนหน้าบทความเท่านั้น</div></div>';
      case "progress": return seg("color", "สีแถบ", p.color || "primary", [["primary", "สีหลัก"], ["accent", "สีเน้น"], ["gradient", "ไล่สี"]])
        + num("height", "ความสูง (px)", p.height || 3, 2, 6);
      case "notfound": return seg("template", "แม่แบบ", p.template || "minimal", [["minimal", "เรียบ"], ["space", "ไล่สี"], ["dark", "มืด"]])
        + txt("heading", "ตัวเลข/ข้อความหลัก", p.heading || "404")
        + txt("sub", "หัวข้อรอง", p.sub || "ขออภัย · ไม่พบหน้านี้")
        + area("desc", "คำอธิบาย", p.desc || "หน้าที่คุณต้องการอาจถูกย้าย ลบ หรือ URL ไม่ถูกต้อง")
        + txt("btnText", "ข้อความปุ่ม", p.btnText || "กลับหน้าแรก")
        + txt("btnUrl", "ลิงก์ปุ่ม", p.btnUrl || "/")
        + tog("showSearch", "แสดงช่องค้นหา", p.showSearch !== false)
        + '<div class="note ok">' + svg('<path d="M20 6L9 17l-5-5"/>', 2.5) + '<div>บล็อกนี้แสดงเฉพาะเมื่อ Blogger ตรวจพบหน้า 404 (<code>data:view.isError</code>) อัตโนมัติ · ไม่ต้องตั้งค่าเพิ่มเติม</div></div>';
    }
    return "";
  }
  function bindFields(b, c) {
    $$("[data-k]", c).forEach(function (inp) {
      var k = inp.dataset.k;
      if (inp.type === "checkbox") inp.addEventListener("change", function () { b.props[k] = inp.checked; commit(); });
      else if (inp.dataset.num) inp.addEventListener("input", function () { b.props[k] = parseInt(inp.value, 10); renderCanvas(); save(); var lb = inp.previousElementSibling; if (lb) lb.textContent = lb.textContent.replace(/·.*/, "· " + inp.value); });
      else inp.addEventListener("input", function () {
        b.props[k] = inp.value;
        // sync blog name to SEO BEFORE repainting so the footer (which reads
        // S.seo.blogTitle) updates in the same keystroke, not one behind
        if (k === "logoText" && b.type === "header") {
          S.seo.blogTitle = inp.value;
          var btDisp = document.querySelector(".blog-title-display");
          if (btDisp) btDisp.textContent = inp.value || "MyBlog";
          clearTimeout(seoT); seoT = setTimeout(renderSeoScoreOnly, 400);
        }
        renderCanvas(); save();
      });
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
    // icon change → live preview
    $$("[data-micon]", c).forEach(function (sel) {
      sel.addEventListener("change", function () {
        var arr = menuItemsOf(b.props); arr[+sel.dataset.micon].icon = sel.value;
        b.props.menuItems = arr; renderCanvas(); save();
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
          var defaults = { id: uid(), type: t, label: tr(MENU_TYPE_INFO[t].label), children: [] };
          if (t === "home")   { defaults.label = tpl("หน้าแรก", "Home");   defaults.url = "/"; }
          if (t === "search") { defaults.label = tpl("ค้นหา", "Search"); defaults.url = "/search"; }
          arr.push(defaults);
          b.props.menuItems = arr;
          picker.style.display = "none"; madd.style.display = "";
          commit(); renderProps();
        });
      });
    }
    // footer link bindings
    $$("[data-fll]", c).forEach(function (inp) { inp.addEventListener("input", function () { var arr = footerLinksOf(b.props); arr[+inp.dataset.fll].label = inp.value; b.props.footerLinks = arr; renderCanvas(); save(); }); });
    $$("[data-ficon]", c).forEach(function (sel) { sel.addEventListener("change", function () { var arr = footerLinksOf(b.props); arr[+sel.dataset.ficon].icon = sel.value; b.props.footerLinks = arr; renderCanvas(); save(); }); });
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
    // image URL preview bindings
    $$(".img-url-inp", c).forEach(function (inp) {
      var key = inp.dataset.imgKey;
      function updateImgPvw(url) {
        var pvw = c.querySelector('.img-pvw[data-img-for="' + key + '"]');
        if (!pvw) return;
        var img = pvw.querySelector(".img-pvw-img");
        var st = pvw.querySelector(".img-pvw-st");
        if (!url) { pvw.style.display = "none"; return; }
        pvw.style.display = "";
        st.className = "img-pvw-st loading";
        st.textContent = tpl("กำลังโหลด…", "Loading…");
        img.onload = function () { st.className = "img-pvw-st ok"; st.textContent = tpl("✓ โหลดสำเร็จ", "✓ Loaded"); };
        img.onerror = function () { st.className = "img-pvw-st err"; st.textContent = tpl("✕ ไม่พบรูป / URL ไม่ถูกต้อง", "✕ Image not found / invalid URL"); };
        img.src = url;
      }
      inp.addEventListener("input", function () { updateImgPvw(inp.value.trim()); });
      if (inp.value) updateImgPvw(inp.value.trim());
    });
    // data-sk fields inside block props panel · write to S.seo[k] and re-render canvas
    $$("[data-sk]", c).forEach(function (inp) {
      var k = inp.dataset.sk;
      inp.addEventListener("input", function () { S.seo[k] = inp.value; renderCanvas(); save(); });
    });
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
      + '<div class="sec-title collapsed">' + tr("ตัวอย่างผลการค้นหา (SERP Preview)") + '</div>'
      + '<div class="seo-key-card">' + favField(seo) + '</div>'
      + '<div id="serpPreviewWrap">' + serpPreviewHTML(seo) + '</div>'
      + '<div class="sec-divider"></div>'
      + '<div class="seo-key-card">'
      + '<div class="field"><label>' + tr("ชื่อบล็อก") + '</label><div class="blog-title-display" style="padding:7px 10px;background:var(--surface-2);border-radius:7px;font-size:14px;font-weight:600;color:var(--ink)">' + esc(seo.blogTitle || "MyBlog") + '</div><div class="hint">' + tpl('ดึงจาก "ชื่อบล็อก / ข้อความโลโก้" ใน Header โดยอัตโนมัติ · หากต้องการแก้ไข ให้ไปที่ฟีเจอร์ส่วนหัว → กดที่องค์ประกอบหน้าเว็บ หรือเลือกโครงสร้าง (มุมขวาบน) → เลือก ส่วนหัว แล้วพิมพ์ข้อความได้เลย', 'Auto-synced from "Blog name / Logo text" in Header block · To edit: go to Header feature → click the element on canvas or use Structure panel (top-right) → select Header → type your text') + '</div></div>'
      + txt2("title", "Title (เว้นว่าง = ใช้ชื่อบล็อก)", seo.title)
      + area2("desc", "Meta description", seo.desc, (seo.desc || "").length + tpl("/160 ตัวอักษร", "/160 chars"))
      + '</div>'
      + '<div class="sec-divider"></div>'
      + '<div class="sec-title">' + tr("ป้ายกำกับ (Labels)") + '</div>'
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
  function txt2(k, l, v) { return '<div class="field"><label>' + tr(l) + '</label><input class="inp" data-sk="' + k + '" value="' + esc(v) + '"></div>'; }
  function area2(k, l, v, hint) { return '<div class="field"><label>' + tr(l) + '</label><textarea class="ta" data-sk="' + k + '">' + esc(v) + "</textarea>" + (hint ? '<div class="hint" data-cnt="' + k + '">' + hint + "</div>" : "") + "</div>"; }
  function tog2(k, l, v, sub) { return '<label class="tg"><span class="lbl">' + tr(l) + (sub ? "<small>" + tr(sub) + "</small>" : "") + '</span><input type="checkbox" data-sk="' + k + '"' + (v ? " checked" : "") + '><span class="sw-tg"></span></label>'; }
  function robotsTxtContent(rawUrl, useWww) {
    var url = (rawUrl || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!url) return '';
    var isCustom = !/\.blogspot\.com$/i.test(url);
    if (isCustom && useWww && !/^www\./i.test(url)) url = 'www.' + url;
    return 'User-agent: Mediapartners-Google\nDisallow:\n\nUser-agent: *\nDisallow: /search?q=\nDisallow: /share-widget\nAllow: /search/\nAllow: /\n\nSitemap: https://' + url + '/sitemap.xml';
  }
  function labelNote(on) {
    var infoNote = '<div class="note info">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', 2) + '<div>' + tpl('หน้าป้ายกำกับถูกตั้งเป็น <b>noindex, follow</b> (ค่าแนะนำ) · กันเนื้อหาซ้ำ แต่ยังส่งต่อค่าลิงก์ภายในได้', 'Label pages are set to <b>noindex, follow</b> (recommended) · prevents duplicate content while still passing internal link equity.') + '</div></div>';
    if (!on) return infoNote;
    var warnNote = '<div class="note warn">' + svg('<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', 2) + '<div>' + tpl('<b>กฎสำคัญ: 1 บทความ ต่อ 1 ป้ายกำกับเท่านั้น</b><br>เมื่อเปิดให้ทำดัชนี Label ได้ ให้ติดป้ายกำกับ <b>เพียงป้ายเดียว</b> ต่อบทความ มิฉะนั้นบทความเดียวจะไปโผล่หลายหน้า Label → เกิดเนื้อหาซ้ำ (duplicate) และถูกมองว่าเป็น <b>หน้าขยะ/thin content</b> ระบบจะสร้าง CollectionPage + Breadcrumb ให้หน้า Label อัตโนมัติเพื่อให้มีคุณภาพพอ', '<b>Important: 1 article → 1 label only</b><br>With label indexing enabled, each article must use <b>only one label</b>. Multiple labels cause duplicate content across label pages, flagged as <b>thin content</b>. The builder auto-generates CollectionPage + Breadcrumb for label pages to maintain quality.') + '</div></div>';
    var learnMore = '<div style="padding:4px 16px 12px"><a href="' + esc(DOCS_BASE + 'label-indexing') + '" target="_blank" rel="noopener noreferrer" class="docs-learn-btn">' + tpl('📖 อ่านคู่มือแบบละเอียด', '📖 Read the full guide') + ' →</a></div>';
    var stepData = [
      tpl('เปิด <a href="https://www.blogger.com" target="_blank" rel="noopener" style="color:var(--brand)"><b>Blogger.com</b></a> → เลือกบล็อกของคุณ', 'Open <a href="https://www.blogger.com" target="_blank" rel="noopener" style="color:var(--brand)"><b>Blogger.com</b></a> → select your blog'),
      tpl('กดเมนู <b>☰</b> มุมซ้ายบน', 'Click <b>☰</b> menu (top-left corner)'),
      tpl('กด <b>ตั้งค่า</b> (Settings)', 'Click <b>Settings</b>'),
      tpl('เลื่อนหาหัวข้อ <b>Crawler และการจัดทำดัชนี</b>', 'Scroll to <b>Crawler and Indexing</b>'),
      tpl('เปิดใช้งาน <b>robots.txt ที่กำหนดเอง</b> แล้ววางโค้ดที่สร้างด้านล่าง', 'Enable <b>Custom robots.txt</b> then paste the generated code below'),
    ];
    var stepsHtml = '<div class="rtx-steps">' + stepData.map(function (s, i) {
      return '<div class="rtx-step"><span class="rtx-n">' + (i + 1) + '</span><span>' + s + '</span></div>';
    }).join('') + '</div>';
    var siteUrl = (S.seo && S.seo.siteUrl) || '';
    var siteWww = !!(S.seo && S.seo.siteWww);
    var rawDomain = siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    var isCustom = !!rawDomain && !/\.blogspot\.com$/i.test(rawDomain);
    var rtxTxt = robotsTxtContent(siteUrl, siteWww);
    var wwwQ = '<div class="rtx-www-q"' + (isCustom ? '' : ' style="display:none"') + '>'
      + '<label class="tg" style="padding:8px 0 4px"><span class="lbl">' + tpl('Redirect ไป www.yourdomain.com', 'Redirect to www.yourdomain.com') + '<small>' + tpl('โดเมนของคุณ Redirect ไป www หรือไม่?', 'Does your domain redirect to www?') + '</small></span>'
      + '<input type="checkbox" id="rtxWww"' + (siteWww ? ' checked' : '') + '><span class="sw-tg"></span></label>'
      + '</div>';
    var genHtml = '<div class="rtx-gen">'
      + '<div class="field"><label>' + tpl('URL เว็บไซต์ของคุณ', 'Your website URL') + '</label>'
      + '<input class="inp" id="rtxUrlInp" value="' + esc(siteUrl) + '" placeholder="' + tpl('yourblog.blogspot.com หรือ yourdomain.com', 'yourblog.blogspot.com or yourdomain.com') + '"></div>'
      + wwwQ
      + '<pre class="rtx-pre" id="rtxPre">' + esc(rtxTxt || tpl('กรอก URL เพื่อดูตัวอย่าง…', 'Enter URL to preview…')) + '</pre>'
      + '<div style="padding:0 0 14px"><button class="btn-rtx-copy" id="rtxCopyBtn">' + tpl('📋 คัดลอก robots.txt', '📋 Copy robots.txt') + '</button></div>'
      + '</div>';
    return warnNote + learnMore + '<div class="sec-divider"></div>'
      + '<div class="rtx-section-title">' + tpl('⚙️ ตั้งค่า robots.txt ใน Blogger (5 ขั้นตอน)', '⚙️ Set up robots.txt in Blogger (5 steps)') + '</div>'
      + stepsHtml + genHtml;
  }
  function favField(seo) {
    var val = seo.favUrl || "";
    var pvw = '<div class="fav-pvw" id="favPvwWrap"' + (val ? '' : ' style="display:none"') + '>'
      + '<img id="favPvwImg"' + (val ? ' src="' + esc(val) + '"' : '') + ' alt="" style="width:28px;height:28px;border-radius:5px;object-fit:contain;border:1px solid var(--border);background:#fff">'
      + '<span id="favPvwSt" class="fav-pvw-st"></span>'
      + '</div>';
    var guide = '<details class="img-guide"><summary>' + tpl('🌐 วิธีหา URL Favicon ของเว็บ', '🌐 How to find your website\'s favicon URL') + '</summary>'
      + '<ol class="img-guide-steps">'
      + '<li>' + tpl('<b>Blogspot:</b> URL Favicon คือ <code>https://yourblog.blogspot.com/favicon.ico</code>', '<b>Blogspot:</b> Favicon URL is <code>https://yourblog.blogspot.com/favicon.ico</code>') + '</li>'
      + '<li>' + tpl('<b>โดเมนตัวเอง:</b> ลอง <code>https://yourdomain.com/favicon.ico</code>', '<b>Custom domain:</b> Try <code>https://yourdomain.com/favicon.ico</code>') + '</li>'
      + '<li>' + tpl('หรืออัปโหลดรูป 32×32px ขึ้น Blogger แล้วคัดลอก URL', 'Or upload a 32×32px image to Blogger and copy the URL') + '</li>'
      + '</ol>'
      + '<div class="img-guide-note">' + tpl('Favicon แสดงบน browser tab และผลการค้นหา Google · แนะนำขนาด 32×32 หรือ 64×64px', 'Favicon shows on browser tabs and Google results · recommended 32×32 or 64×64px') + '</div>'
      + '<div style="padding:6px 11px 10px"><a href="' + esc(DOCS_BASE + 'favicon') + '" target="_blank" rel="noopener noreferrer" class="docs-learn-btn">' + tpl('📖 วิธีอัพโหลด Favicon ใน Blogger', '📖 How to upload a Favicon in Blogger') + ' →</a></div>'
      + '</details>';
    return '<div class="field"><label>' + tr("URL รูป Favicon") + '</label>'
      + '<input class="inp fav-url-inp" id="favUrlInp" data-sk="favUrl" value="' + esc(val) + '" placeholder="https://yourblog.blogspot.com/favicon.ico">'
      + pvw + guide + '</div>';
  }
  function googleBox(seo) {
    return '<div class="sec-title collapsed">' + tr("ข้อมูลสำหรับ Google (Knowledge Graph)") + '</div>'
      + '<div class="seo-key-card">'
      + seg("orgType", "ประเภทเว็บไซต์", seo.orgType, [["Organization", "องค์กร"], ["Person", "บุคคล"], ["LocalBusiness", "ร้านค้า"]])
      + txt2("siteUrl", "URL เว็บไซต์", seo.siteUrl)
      + txt2("logoUrl", "URL โลโก้ (แนะนำ 512×512)", seo.logoUrl)
      + area2b("sameAs", "ลิงก์โซเชียล (บรรทัดละ 1 ลิงก์)", seo.sameAs, "Facebook, X, YouTube, LINE · ช่วยให้ Google ยืนยันตัวตนเว็บ")
      + '</div>'
      + tog2("schemaSoftwareApp", "SoftwareApplication Schema", seo.schemaSoftwareApp, "เพิ่ม schema สำหรับบล็อก/เครื่องมือซอฟต์แวร์ · ช่วยให้ AI knowledge graphs จดจำได้")
      + '<div class="note ok">' + svg('<path d="M20 6L9 17l-5-5"/>', 2.5) + '<div>' + tpl('ข้อมูลนี้จะถูกสร้างเป็น <b>@graph (Organization + WebSite)</b> ในส่วน head ของทุกหน้า · ตัวช่วยให้ Google เข้าใจว่าใครเป็นเจ้าของเว็บ (E-E-A-T)', 'This data generates a <b>@graph (Organization + WebSite)</b> in the &lt;head&gt; of every page · helps Google understand who owns the site (E-E-A-T).') + '</div></div>';
  }
  function area2b(k, l, v, hint) { return '<div class="field"><label>' + tr(l) + '</label><textarea class="ta" data-sk="' + k + '" style="min-height:74px">' + esc(v) + "</textarea>" + (hint ? '<div class="hint">' + tr(hint) + "</div>" : "") + "</div>"; }
  function socialPreviewHTML(seo) {
    var title = esc(seo.title || seo.blogTitle || tpl("ชื่อบทความ", "Article title"));
    var desc = esc(seo.desc || tpl("คำอธิบายบทความจะแสดงตรงนี้ ควรยาว 120–160 ตัวอักษรเพื่อแสดงผลครบ", "Article description appears here. Keep it 120–160 characters for best display."));
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
    var titleVal = (seo.title ? seo.title + " | " + (seo.blogTitle || "Blog") : seo.blogTitle) || tr("ชื่อบล็อก");
    var descVal = seo.desc || tpl("คำอธิบายเว็บไซต์จะแสดงที่นี่ เพิ่ม meta description เพื่อเพิ่มโอกาสให้ผู้ใช้คลิก", "Website description appears here. Add a meta description to improve click-through rate.");
    var titleTrunc = titleVal.length > 60;
    var descTrunc = descVal.length > 160;
    var tDisp = esc(titleTrunc ? titleVal.slice(0, 57) + "…" : titleVal);
    var dDisp = esc(descTrunc ? descVal.slice(0, 157) + "…" : descVal);
    var tColor = titleTrunc ? "#ea4335" : "#1a0dab";
    var dNote = descTrunc ? '<span style="color:#ea4335;font-size:11px;margin-left:4px">⚠ ' + tpl("ยาวเกิน 160", "over 160 chars") + '</span>' : (descVal.length < 120 ? '<span style="color:#f59e0b;font-size:11px;margin-left:4px">⚠ ' + tpl("สั้นเกินไป", "too short") + '</span>' : '');
    var favUrl = seo.favUrl || "";
    var favIcon = '<div style="width:18px;height:18px;border-radius:3px;overflow:hidden;flex:none;background:#e8eaf2">'
      + (favUrl ? '<img src="' + esc(favUrl) + '" style="width:100%;height:100%;object-fit:contain" onerror="this.style.display=\'none\'">' : '')
      + '</div>';
    var siteName = seo.blogTitle || domain;
    return '<div style="padding:0 16px 14px">'
      + '<div style="background:#fff;border-radius:10px;border:1px solid #dde3ec;padding:16px 18px;font-family:Arial,sans-serif">'
      + '<div style="font-size:13px;color:#202124;line-height:1.3;margin-bottom:4px;display:flex;align-items:center;gap:8px">'
      + favIcon
      + '<div><div style="font-size:12px;font-weight:500;color:#202124;line-height:1.2">' + esc(siteName) + '</div>'
      + '<div style="font-size:12px;color:#4d5156">' + esc(domain) + ' › …</div></div></div>'
      + '<div style="font-size:18px;line-height:1.3;margin-bottom:4px;color:' + tColor + '">' + tDisp + (titleTrunc ? '<span style="font-size:11px;margin-left:6px;vertical-align:middle">⚠ ' + tpl("ยาวเกิน 60", "over 60 chars") + '</span>' : '') + '</div>'
      + '<div style="font-size:13.5px;color:#4d5156;line-height:1.5">' + dDisp + dNote + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:12px;margin-top:8px;font-size:11px;color:var(--ink-3)">'
      + '<span>' + tpl("ชื่อ: ", "Title: ") + '<b style="color:' + (titleTrunc ? "var(--bad)" : "var(--ok)") + '">' + titleVal.length + '/60</b></span>'
      + '<span>' + tpl("คำอธิบาย: ", "Description: ") + '<b style="color:' + (descVal.length < 120 ? "var(--warn)" : descTrunc ? "var(--bad)" : "var(--ok)") + '">' + descVal.length + '/160</b></span>'
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
        if (k === "desc") { var h = c.querySelector('[data-cnt="desc"]'); if (h) h.textContent = inp.value.length + tpl("/160 ตัวอักษร", "/160 chars"); }
        if (k === "blogTitle") renderCanvas();
        clearTimeout(seoT); seoT = setTimeout(renderSeoScoreOnly, 400);
      });
    });
    var ot = c.querySelector('[data-seg="orgType"]');
    if (ot) ot.addEventListener("click", function (e) { var btn = e.target.closest("button"); if (!btn) return; S.seo.orgType = btn.dataset.v; $$("button", ot).forEach(function (x) { x.classList.toggle("on", x === btn); }); save(); });
    // favicon preview binding
    var favInp = c.querySelector(".fav-url-inp");
    if (favInp) {
      function updateFavPvw(url) {
        var wrap = c.querySelector("#favPvwWrap");
        var img = c.querySelector("#favPvwImg");
        var st = c.querySelector("#favPvwSt");
        if (!wrap || !img) return;
        if (!url) { wrap.style.display = "none"; return; }
        wrap.style.display = "";
        if (st) { st.className = "fav-pvw-st loading"; st.textContent = tpl("กำลังโหลด…", "Loading…"); }
        img.onload = function () { if (st) { st.className = "fav-pvw-st ok"; st.textContent = tpl("✓ โหลดสำเร็จ", "✓ Loaded"); } };
        img.onerror = function () { if (st) { st.className = "fav-pvw-st err"; st.textContent = tpl("✕ ไม่พบ / URL ไม่ถูกต้อง", "✕ Not found / invalid URL"); } };
        img.src = url;
      }
      favInp.addEventListener("input", function () { updateFavPvw(favInp.value.trim()); });
      if (favInp.value) updateFavPvw(favInp.value.trim());
    }
    // robots.txt generator bindings
    var rtxUrlInp = c.querySelector('#rtxUrlInp');
    var rtxWwwInp = c.querySelector('#rtxWww');
    var rtxPre = c.querySelector('#rtxPre');
    var rtxCopyBtn = c.querySelector('#rtxCopyBtn');
    function updateRtxPre() {
      if (!rtxPre) return;
      var rawUrl = rtxUrlInp ? rtxUrlInp.value : (S.seo.siteUrl || '');
      var useWww = rtxWwwInp ? rtxWwwInp.checked : !!(S.seo && S.seo.siteWww);
      var domain = rawUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      var isCustom = !!domain && !/\.blogspot\.com$/i.test(domain);
      var wwwQ = c.querySelector('.rtx-www-q');
      if (wwwQ) wwwQ.style.display = isCustom ? '' : 'none';
      var txt = robotsTxtContent(rawUrl, useWww);
      rtxPre.textContent = txt || tpl('กรอก URL เพื่อดูตัวอย่าง…', 'Enter URL to preview…');
    }
    if (rtxUrlInp) {
      rtxUrlInp.addEventListener('input', function () {
        S.seo.siteUrl = rtxUrlInp.value; save();
        var kgUrl = c.querySelector('[data-sk="siteUrl"]');
        if (kgUrl && kgUrl !== rtxUrlInp) kgUrl.value = rtxUrlInp.value;
        updateRtxPre();
      });
    }
    if (rtxWwwInp) {
      rtxWwwInp.addEventListener('change', function () {
        if (!S.seo) S.seo = {};
        S.seo.siteWww = rtxWwwInp.checked; save();
        updateRtxPre();
      });
    }
    if (rtxCopyBtn) {
      rtxCopyBtn.addEventListener('click', function () {
        var txt = rtxPre ? rtxPre.textContent : '';
        var placeholder = tpl('กรอก URL เพื่อดูตัวอย่าง…', 'Enter URL to preview…');
        if (!txt || txt === placeholder) return;
        var lbl = tpl('📋 คัดลอก robots.txt', '📋 Copy robots.txt');
        var done = tpl('✓ คัดลอกแล้ว!', '✓ Copied!');
        function onCopied() { rtxCopyBtn.textContent = done; setTimeout(function () { rtxCopyBtn.textContent = lbl; }, 2000); }
        if (navigator.clipboard) { navigator.clipboard.writeText(txt).then(onCopied).catch(function () { fallbackCopy(txt); onCopied(); }); }
        else { fallbackCopy(txt); onCopied(); }
        function fallbackCopy(t) { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
      });
    }
  }
  var seoT;
  function renderSeoScoreOnly() {
    var foc = document.activeElement;
    // While user is typing in a SEO field: only update SERP preview in-place to avoid keyboard dismissal
    if (foc && foc.dataset && foc.dataset.sk) {
      var rtSeo = $("#rtSeo");
      if (rtSeo && rtSeo.contains(foc)) {
        var serpWrap = $("#serpPreviewWrap");
        if (serpWrap) serpWrap.innerHTML = serpPreviewHTML(S.seo);
        return;
      }
    }
    var k = foc && foc.dataset ? foc.dataset.sk : null;
    renderSeo();
    if (k) { var n = $('[data-sk="' + k + '"]'); if (n && n.setSelectionRange) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }
  }

  function seoAudit() {
    var seo = S.seo;
    var t = seo.title || seo.blogTitle || "", d = seo.desc || "";
    var imgBlks = S.blocks.filter(function (b) { return b.type === "image"; });
    var allAlt = imgBlks.length === 0 || imgBlks.every(function (b) { return b.props && (b.props.alt || "").trim().length > 2; });
    var chars = tpl(" ตัวอักษร", " chars"), pics = tpl(" รูป", " images");
    var cats = [
      { key: "tech", label: "Technical SEO", color: "#0ea5e9", checks: [
        { pass: t.length >= 10 && t.length <= 60, label: tr("Title ความยาวเหมาะสม (10–60)"), tip: t.length + chars },
        { pass: d.length >= 70 && d.length <= 160, label: "Meta description (70–160)", tip: d.length + chars },
        { pass: true, label: tr("Canonical URL อัตโนมัติ"), ok: true },
        { pass: true, label: "Viewport meta ✓", ok: true },
        { pass: !!seo.siteUrl, label: tr("URL เว็บไซต์ตั้งค่าแล้ว"), tip: tr("จำเป็นสำหรับ Schema & Canonical") }
      ]},
      { key: "struct", label: tr("โครงสร้างหน้า"), color: "#8b5cf6", checks: [
        { pass: S.blocks.some(function (b) { return b.type === "header"; }), label: tr("Header (ส่วนหัว)") },
        { pass: S.blocks.some(function (b) { return b.type === "footer"; }), label: tr("Footer (ส่วนท้าย)") },
        { pass: S.blocks.some(function (b) { return b.type === "about"; }), label: tr("About / ผู้เขียน (E-E-A-T)") },
        { pass: S.blocks.some(function (b) { return /post|featured/.test(b.type); }), label: tr("ส่วนแสดงบทความ") },
        { pass: allAlt, label: tr("รูปภาพมี ALT text ครบ"), tip: imgBlks.length ? imgBlks.length + pics : tr("ไม่มีบล็อกรูป") }
      ]},
      { key: "schema", label: "Schema & Markup", color: "#10b981", checks: [
        { pass: !!seo.schema, label: tr("Schema JSON-LD เปิดอยู่") },
        { pass: !!(seo.schema && seo.siteUrl), label: "WebSite URL (Schema)" },
        { pass: !!(seo.schema && seo.logoUrl), label: "Logo URL (Organization.logo)" },
        { pass: !!(seo.schema && seo.sameAs && seo.sameAs.trim()), label: "Social sameAs links" },
        { pass: !!(seo.schema && seo.siteUrl), label: "WebPage @id fragments (Schema)" }
      ]},
      { key: "social", label: "Social & Sharing", color: "#f59e0b", checks: [
        { pass: !!seo.og, label: tr("Open Graph เปิดอยู่") },
        { pass: !!seo.og, label: tr("Twitter Card เปิดอยู่") },
        { pass: !!seo.blogTitle && seo.blogTitle.length > 2, label: tr("ชื่อบล็อกตั้งค่าแล้ว") },
        { pass: d.length > 50, label: tr("Description ยาวพอ (og:description)") }
      ]},
      { key: "ai", label: "AI Readiness", color: "#a855f7", checks: [
        { pass: !!seo.siteUrl, label: tr("Entity @id (siteUrl ตั้งค่าแล้ว)"), tip: tr("จำเป็นสำหรับ @graph @id fragments ให้ AI จดจำเว็บ") },
        { pass: !!seo.logoUrl, label: "Logo URL (Organisation entity)", tip: tr("ช่วย AI knowledge graphs สร้าง entity ที่สมบูรณ์") },
        { pass: !!(seo.sameAs && seo.sameAs.trim()), label: tr("sameAs links (ยืนยันตัวตน)"), tip: tr("Facebook, YouTube, X ฯลฯ เพิ่มความน่าเชื่อถือ") },
        { pass: S.blocks.some(function (b) { return b.type === "about"; }), label: "About block (E-E-A-T / Authorship)" },
        { pass: d.length >= 50, label: tr("Meta description ≥ 50 ตัวอักษร (AI snippet)"), tip: d.length + chars },
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
    var label = overall >= 80 ? tr("ดีมาก พร้อมเผยแพร่") : overall >= 55 ? tr("ดี ปรับเพิ่มได้") : tr("ควรปรับปรุง");
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
      '<div class="sec-title">' + tr("ชุดสี") + '</div><div class="field"><div class="swatches" id="palSw">' +
      PALETTES.map(function (pl, i) { return '<div class="sw' + (pl[0] === d.primary ? " on" : "") + '" data-p="' + pl[0] + '" data-a="' + pl[1] + '" style="background:linear-gradient(120deg,' + pl[0] + "," + pl[1] + ')"></div>'; }).join("") + "</div></div>" +
      '<div class="row2" style="padding:0 16px 14px">' +
        '<div><label style="font-size:12px;font-weight:600;color:var(--ink-2)">' + tr("สีหลัก") + '</label><input class="inp" type="color" value="' + d.primary + '" data-dk="primary" style="height:38px;padding:3px"></div>' +
        '<div><label style="font-size:12px;font-weight:600;color:var(--ink-2)">' + tr("สีเน้น") + '</label><input class="inp" type="color" value="' + d.accent + '" data-dk="accent" style="height:38px;padding:3px"></div>' +
      '</div>' +
      contrastNote(d.primary) +
      '<div class="sec-divider"></div><div class="sec-title">' + tr("ตัวอักษร") + '</div>' +
      '<div class="field"><div class="seg" data-dseg="font">' + [["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]].map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === d.font ? ' class="on"' : "") + ">" + o[1] + "</button>"; }).join("") + "</div></div>" +
      '<div class="sec-divider"></div><div class="sec-title">' + tr("ความมนขอบ") + '</div>' +
      '<div class="field"><label>' + tr("มุมโค้ง") + ' · ' + d.radius + 'px</label><input class="inp" type="range" min="0" max="24" value="' + d.radius + '" data-dk="radius" data-num="1"></div>';
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
    if (r >= 4.5) return '<div class="note ok" style="margin:0 16px 14px">' + svg('<path d="M20 6L9 17l-5-5"/>', 2.5) + '<div>' + tpl('คอนทราสต์ตัวอักษรขาวบนปุ่มสีหลัก <b>' + ratio + ':1</b> · ผ่านมาตรฐาน WCAG AA ✓', 'White text on primary button contrast <b>' + ratio + ':1</b> · passes WCAG AA ✓') + '</div></div>';
    if (r >= 3) return '<div class="note warn" style="margin:0 16px 14px">' + svg('<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', 2) + '<div>' + tpl('คอนทราสต์ <b>' + ratio + ':1</b> · ผ่านเฉพาะข้อความขนาดใหญ่ ควรเข้มขึ้นเพื่ออ่านง่ายทุกขนาด', 'Contrast <b>' + ratio + ':1</b> · passes for large text only. Use a darker color for all text sizes.') + '</div></div>';
    return '<div class="note warn" style="margin:0 16px 14px">' + svg('<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', 2) + '<div>' + tpl('<b>คอนทราสต์ต่ำ ' + ratio + ':1</b> · ข้อความขาวบนสีนี้อ่านยาก ไม่ผ่าน WCAG ควรเลือกสีเข้มขึ้น', '<b>Low contrast ' + ratio + ':1</b> · white text is hard to read on this color. Fails WCAG · choose a darker shade.') + '</div></div>';
  }
  function bindDesign(c) {
    $$(".sw", c).forEach(function (s) { s.addEventListener("click", function () { S.design.primary = s.dataset.p; S.design.accent = s.dataset.a; renderDesign(); renderCanvas(); save(); }); });
    $$('[data-dk]', c).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var k = inp.dataset.dk; S.design[k] = inp.dataset.num ? parseInt(inp.value, 10) : inp.value;
        if (inp.dataset.num) { var lb = inp.previousElementSibling; if (lb) lb.textContent = tr("มุมโค้ง") + " · " + inp.value + "px"; }
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
    var isMobDevice = window.matchMedia("(max-width:1000px)").matches;
    w.style.width    = v === "mobile" ? (isMobDevice ? "100%" : "390px") : v === "tablet" ? "768px" : "100%";
    w.style.maxWidth = v === "mobile" ? "390px" : "";
    w.style.minWidth = v === "desktop" ? "960px" : "";
    renderCanvas();
  }
  $$("#viewTabs button").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.dataset.vw); });
  });

  /* ---------- mobile switch ---------- */
  var _sheetSettleT;
  function showMob(which) {
    document.body.classList.remove("show-left", "show-right", "sheet-settled");
    if (which === "left") document.body.classList.add("show-left");
    if (which === "right") document.body.classList.add("show-right");
    $$("#mobSwitch button").forEach(function (b) { b.classList.toggle("on", b.dataset.mob === which); });
    // After the slide-up animation finishes, disable it so keyboard-resize won't re-trigger it
    clearTimeout(_sheetSettleT);
    if (which === "left" || which === "right") {
      _sheetSettleT = setTimeout(function () { document.body.classList.add("sheet-settled"); }, 300);
    }
  }
  $("#mobSwitch").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) showMob(b.dataset.mob); });
  $$("[data-sheet-close]").forEach(function (btn) { btn.addEventListener("click", function () { showMob("canvas"); }); });
  var _mobScrim = $("#mobScrim"); if (_mobScrim) _mobScrim.addEventListener("click", function () { showMob("canvas"); });

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
    // Blocks with a specific page-scope already won't show on 404.
    // Blocks shown on "all pages" need explicit 404 exclusion · except navigation/utility/404 blocks.
    var SHOW_ON_ERROR = { header: 1, footer: 1, darkmode: 1, notfound: 1 };
    if (!SHOW_ON_ERROR[b.type] && (!v.scope || !condMap[v.scope])) {
      html = "<b:if cond='!data:view.isError'>\n" + html + "\n</b:if>";
    }
    return html;
  }
  var POST_BLOCKS = { postgrid: 1, postlist: 1, featured: 1 };
  function genXML() {
    var d = S.design, seo = S.seo;
    var lang = String((S && S.lang) || "th");
    var titleExpr = "<b:if cond='data:view.isHomepage'><data:blog.title.escaped/><b:else/><data:view.title.escaped/> ~ <data:blog.title.escaped/></b:if>";
    var css = minifyCSS(themeCSS(d));

    // Split blocks: post-driven blocks must live INSIDE the single Blog widget
    // (data:posts is only in scope there). Static blocks render directly in <body>.
    var postBlocks = S.blocks.filter(function (b) { return POST_BLOCKS[b.type]; });
    var firstPostIdx = S.blocks.findIndex(function (b) { return POST_BLOCKS[b.type]; });

    // BlogPosting JSON-LD is now emitted in <head> via data:view.* (available outside Blog widget).
    // data:post.* is not reliably available outside Blog widget includables.
    var blogPostingSchema = "";

    // TOC block is injected inline right after the post title inside postIncludable,
    // so it always appears before the post body regardless of block order in the palette.
    var tocBlock = S.blocks.find(function (b) { return b.type === "toc"; });
    var inlineTocHtml = tocBlock ? genTocHtml(tocBlock.props || {}, true) : "";

    // Post includable body · clean and simple. JSON-LD is in mainIncludable's loop
    // (before <b:include name='post'/>) to keep data:post.* scope without risking
    // a nested b:if/b:eval runtime abort inside this includable.
    // NOTE: article uses class 'bxb-post-article' (not 'post-body') to avoid colliding
    // with the inner .post-body content div that genTocHtml's script targets.
    var postIncludableBody =
      "<article class='bxb-post-article' expr:id='&quot;post-body-&quot; + data:post.id'>" +
      "<div class='wrap' style='max-width:780px;padding:40px 20px 64px'>" +
        "<b:if cond='data:post.labels'><div class='post-cats' style='margin-bottom:12px'>" +
          "<b:loop values='data:post.labels' var='label'><a expr:href='data:label.url' class='post-cat'><data:label.name/></a></b:loop>" +
        "</div></b:if>" +
        "<h1 class='post-title' style='font-size:clamp(26px,4vw,38px);font-weight:700;line-height:1.2;margin:0 0 16px'><data:post.title/></h1>" +
        "<b:if cond='data:view.isPost'>" +
          "<div class='post-meta' style='display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--text-subtle);margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border)'>" +
            "<span><data:post.author.name/></span><span><data:post.date/></span>" +
          "</div>" +
        "</b:if>" +
        "<div class='post-body entry-content' style='font-size:16px;line-height:1.8'>" +
          inlineTocHtml +
          "<data:post.body/>" +
        "</div>" +
      "</div></article>" +
      "<b:if cond='data:view.isSingleItem'><div class='wrap comments-wrap' style='max-width:780px;padding:0 20px 64px'><b:include data='post' name='commentPicker'/></div></b:if>";

    // Multiple-items (homepage/label/search) branch · post grid/list blocks or fallback loop
    var multipleItemsHtml = postBlocks.length
      ? postBlocks.map(function (b) { return condWrap(renderBlockStatic(b), b); }).join("\n") + "\n<b:include name='nextprev'/>"
      : "<b:loop values='data:posts' var='post'><article class='bxb-post'><h2><a expr:href='data:post.url'><data:post.title/></a></h2><div class='post-body'><data:post.body/></div></article></b:loop><b:include name='nextprev'/>";

    // main includable: routes between single-item view and multiple-items view.
    // BlogPosting JSON-LD is emitted inside the b:loop (before post include) so
    // data:post.* is in scope and isolated from the post includable rendering.
    var mainIncludable =
      "<b:if cond='data:view.isPost or data:view.isPage'>\n" +
      "<b:loop values='data:posts' var='post'>\n" +
      blogPostingSchema + "\n" +
      "<b:include data='post' name='postCommentsAndAd'/>\n" +
      "</b:loop>\n" +
      "<b:else/>\n" +
      multipleItemsHtml + "\n" +
      "</b:if>";

    // Both reference templates (QuestThai + KongKoom) define <b:includable id='nextprev'> explicitly.
    // Blogger validates ALL b:include references at parse time · calling nextprev without defining
    // it in the same widget causes a silent parse failure that prevents the entire widget from rendering.
    var nextprevIncludable =
      "<b:includable id='nextprev'>\n" +
      "<nav class='blog-pager' id='blog-pager' aria-label='" + tpl("การนำทางหน้าบทความ","Post navigation") + "'>\n" +
      "<b:if cond='data:newerPageUrl'><a class='blog-pager-newer-link' expr:href='data:newerPageUrl' rel='prev'>&#8592; " + tpl("บทความใหม่กว่า","Newer posts") + "</a></b:if>\n" +
      "<b:if cond='data:olderPageUrl'><a class='blog-pager-older-link' expr:href='data:olderPageUrl' rel='next'>" + tpl("บทความเก่ากว่า","Older posts") + " &#8594;</a></b:if>\n" +
      "</nav>\n" +
      "</b:includable>\n";

    // b:widget-settings removed · it was rendering as visible text on the page
    // when the Blog widget failed to parse properly. Custom templates don't need it.
    var widgetSettings = "";

    // Standard Blogger Blog widget v2 includables · required for Blogger to parse the
    // widget correctly. Without them, widget initialization fails and b:widget-settings /
    // script content leaks as visible text on the page.
    var standardBlogIncludables =
      "<b:includable id='aboutPostAuthor'>\n" +
      "<div class='author-name'><a class='g-profile' expr:href='data:post.author.profileUrl' rel='author' title='author profile'><span><data:post.author.name/></span></a></div>\n" +
      "<div><span class='author-desc'><data:post.author.aboutMe/></span></div>\n" +
      "</b:includable>\n" +
      "<b:includable id='addComments'>\n" +
      "<a expr:href='data:post.commentsUrl' expr:onclick='data:post.commentsUrlOnclick'><b:message name='messages.postAComment'/></a>\n" +
      "</b:includable>\n" +
      "<b:includable id='commentAuthorAvatar'>\n" +
      "<div class='avatar-image-container'><img class='author-avatar' expr:src='data:comment.authorAvatarSrc' height='35' width='35'/></div>\n" +
      "</b:includable>\n" +
      "<b:includable id='commentDeleteIcon' var='comment'>\n" +
      "<span expr:class='&quot;item-control &quot; + data:comment.adminClass'>" +
      "<b:if cond='data:showCmtPopup'><div class='goog-toggle-button'><div class='goog-inline-block comment-action-icon'/></div>" +
      "<b:else/><a class='comment-delete' expr:href='data:comment.deleteUrl' expr:title='data:messages.deleteComment'><img src='https://resources.blogblog.com/img/icon_delete13.gif'/></a></b:if></span>\n" +
      "</b:includable>\n" +
      "<b:includable id='commentForm' var='post'>\n" +
      "<div class='comment-form'><a name='comment-form'/><h4 id='comment-post-message'><data:messages.postAComment/></h4>" +
      "<b:include data='post' name='commentFormIframeSrc'/>" +
      "<iframe allowtransparency='true' class='blogger-iframe-colorize blogger-comment-from-post' expr:height='data:cmtIframeInitialHeight ?: &quot;90px&quot;' frameborder='0' id='comment-editor' name='comment-editor' src='' width='100%'/>" +
      "<data:post.cmtfpIframe/>" +
      "<script type='text/javascript'>BLOG_CMT_createIframe(&#39;<data:post.appRpcRelayPath/>&#39;);</script></div>\n" +
      "</b:includable>\n" +
      "<b:includable id='commentFormIframeSrc' var='post'>\n" +
      "<a expr:href='data:post.commentFormIframeSrc' id='comment-editor-src'/>\n" +
      "</b:includable>\n" +
      "<b:includable id='commentItem' var='comment'>\n" +
      "<div class='comment' expr:id='&quot;c&quot; + data:comment.id'>" +
      "<b:include cond='data:blog.enabledCommentProfileImages' name='commentAuthorAvatar'/>" +
      "<div class='comment-block'><div class='comment-author'>" +
      "<b:if cond='data:comment.authorUrl'><b:message name='messages.authorSaidWithLink'><b:param expr:value='data:comment.author' name='authorName'/><b:param expr:value='data:comment.authorUrl' name='authorUrl'/></b:message>" +
      "<b:else/><b:message name='messages.authorSaid'><b:param expr:value='data:comment.author' name='authorName'/></b:message></b:if></div>" +
      "<div expr:class='&quot;comment-body&quot; + (data:comment.isDeleted ? &quot; deleted&quot; : &quot;&quot;)'><data:comment.body/></div>" +
      "<div class='comment-footer'><span class='comment-timestamp'><a expr:href='data:comment.url' title='comment permalink'><data:comment.timestamp/></a><b:include data='comment' name='commentDeleteIcon'/></span></div></div></div>\n" +
      "</b:includable>\n" +
      "<b:includable id='commentList' var='comments'>\n" +
      "<div id='comments-block'><b:loop values='data:comments' var='comment'><b:include data='comment' name='commentItem'/></b:loop></div>\n" +
      "</b:includable>\n" +
      "<b:includable id='commentPicker' var='post'>\n" +
      "<b:if cond='data:post.showThreadedComments'><b:include data='post' name='threadedComments'/><b:else/><b:include data='post' name='comments'/></b:if>\n" +
      "</b:includable>\n" +
      "<b:includable id='comments' var='post'>\n" +
      "<section expr:class='&quot;comments&quot; + (data:post.embedCommentForm ? &quot; embed&quot; : &quot;&quot;)' expr:data-num-comments='data:post.numberOfComments' id='comments'><a name='comments'/>" +
      "<b:if cond='data:post.allowComments'><b:include name='commentsTitle'/>" +
      "<div expr:id='data:widget.instanceId + &quot;_comments-block-wrapper&quot;'><b:include cond='data:post.comments' data='post.comments' name='commentList'/></div>" +
      "<b:if cond='data:post.commentPagingRequired'><div class='paging-control-container'>" +
      "<b:if cond='data:post.hasOlderLinks'><a expr:class='data:post.oldLinkClass' expr:href='data:post.oldestLinkUrl'><data:messages.oldest/></a><a expr:class='data:post.oldLinkClass' expr:href='data:post.olderLinkUrl'><data:messages.older/></a></b:if>" +
      "<span class='comment-range-text'><data:post.commentRangeText/></span>" +
      "<b:if cond='data:post.hasNewerLinks'><a expr:class='data:post.newLinkClass' expr:href='data:post.newerLinkUrl'><data:messages.newer/></a><a expr:class='data:post.newLinkClass' expr:href='data:post.newestLinkUrl'><data:messages.newest/></a></b:if>" +
      "</div></b:if>" +
      "<div class='footer'><b:if cond='data:post.embedCommentForm'><b:if cond='data:post.allowNewComments'><b:include data='post' name='commentForm'/><b:else/><data:post.noNewCommentsText/></b:if>" +
      "<b:else/><b:if cond='data:post.allowComments'><b:include data='post' name='addComments'/></b:if></b:if></div></b:if>" +
      "<b:if cond='data:showCmtPopup'><div id='comment-popup'><iframe allowtransparency='true' frameborder='0' id='comment-actions' name='comment-actions' scrolling='no'/></div></b:if></section>\n" +
      "</b:includable>\n" +
      "<b:includable id='commentsTitle'><h3 class='title'><data:messages.comments/></h3></b:includable>\n" +
      "<b:includable id='feedLinks'>\n" +
      "<b:if cond='!data:view.isPost'><b:if cond='data:feedLinks'><div class='blog-feeds'><b:include data='feedLinks' name='feedLinksBody'/></div></b:if>" +
      "<b:else/><div class='post-feeds'><b:loop values='data:posts' var='post'><b:if cond='data:post.allowComments and data:post.feedLinks'><b:include data='post.feedLinks' name='feedLinksBody'/></b:if></b:loop></div></b:if>\n" +
      "</b:includable>\n" +
      "<b:includable id='feedLinksBody' var='links'>\n" +
      "<div class='feed-links'><data:messages.subscribeTo/><b:loop values='data:links' var='f'><a class='feed-link' expr:href='data:f.url' expr:type='data:f.mimeType' target='_blank'><data:f.name/> (<data:f.feedType/>)</a></b:loop></div>\n" +
      "</b:includable>\n" +
      "<b:includable id='homePageLink'><a class='home-link' expr:href='data:blog.homepageUrl'><data:messages.home/></a></b:includable>\n" +
      "<b:includable id='iframeComments' var='post'></b:includable>\n" +
      "<b:includable id='inlineAd' var='post'>\n" +
      "<b:if cond='!data:view.isPreview'><b:if cond='data:this.adCode or data:this.adClientId or data:blog.adsenseClientId'><div class='inline-ad'><b:if cond='data:this.adCode != &quot;&quot;'><data:this.adCode/><b:else/><b:include cond='data:this.adClientId or data:blog.adsenseClientId' name='defaultAdUnit'/></b:if></div></b:if>" +
      "<b:else/><div class='inline-ad'><div class='inline-ad-placeholder'><span><b:message name='messages.adsGoHere'/></span></div></div></b:if>\n" +
      "</b:includable>\n" +
      "<b:includable id='nextPageLink'><a class='blog-pager-older-link' expr:href='data:olderPageUrl' expr:id='data:widget.instanceId + &quot;_blog-pager-older-link&quot;' expr:title='data:messages.olderPosts'><data:messages.olderPosts/></a></b:includable>\n" +
      "<b:includable id='postBody' var='post'>\n" +
      "<div class='post-body entry-content float-container' expr:id='&quot;post-body-&quot; + data:post.id'><data:post.body/></div>\n" +
      "</b:includable>\n" +
      "<b:includable id='postBodySnippet' var='post'><b:include data='post' name='postBody'/></b:includable>\n" +
      "<b:includable id='postCommentsAndAd' var='post'>\n" +
      "<div class='post-outer-container'><div class='post-outer'><b:include data='post' name='post'/></div>" +
      "<b:include cond='data:view.isSingleItem and data:post.includeAd' data='post' name='inlineAd'/></div>" +
      "<b:include cond='data:view.isMultipleItems and data:post.includeAd' data='post' name='inlineAd'/>\n" +
      "</b:includable>\n" +
      "<b:includable id='postCommentsLink'>\n" +
      "<b:if cond='data:view.isMultipleItems'><span class='byline post-comment-link container'><b:include cond='data:post.commentSource != 1' name='commentsLink'/></span></b:if>\n" +
      "</b:includable>\n" +
      "<b:includable id='postFooter' var='post'><div class='post-footer'><b:include name='footerBylines'/><b:include data='post' name='postFooterAuthorProfile'/></div></b:includable>\n" +
      "<b:includable id='postFooterAuthorProfile' var='post'>\n" +
      "<b:if cond='data:post.author.aboutMe and data:view.isPost'><div class='author-profile'>" +
      "<b:if cond='data:post.author.authorPhoto.url'><img class='author-image' expr:src='data:post.author.authorPhoto.url' width='50px'/><div class='author-about'><b:include data='post' name='aboutPostAuthor'/></div>" +
      "<b:else/><b:include data='post' name='aboutPostAuthor'/></b:if></div></b:if>\n" +
      "</b:includable>\n" +
      "<b:includable id='postHeader' var='post'><b:include name='headerByline'/></b:includable>\n" +
      "<b:includable id='postMeta' var='post'><b:include data='post' name='postMetadataJSON'/></b:includable>\n" +
      "<b:includable id='postPagination'>\n" +
      "<div class='blog-pager container' id='blog-pager'>" +
      "<b:include cond='data:newerPageUrl' name='previousPageLink'/>" +
      "<b:include cond='data:olderPageUrl' name='nextPageLink'/>" +
      "<b:include cond='data:view.url != data:blog.homepageUrl' name='homePageLink'/></div>\n" +
      "</b:includable>\n" +
      "<b:includable id='postTitle' var='post'>\n" +
      "<a expr:name='data:post.id'/><b:if cond='data:post.title != &quot;&quot;'><h3 class='post-title entry-title'>" +
      "<b:if cond='data:post.link or (data:post.url and data:view.url != data:post.url)'><a expr:href='data:post.link ?: data:post.url'><data:post.title/></a><b:else/><data:post.title/></b:if>" +
      "</h3></b:if>\n" +
      "</b:includable>\n" +
      "<b:includable id='previousPageLink'><a class='blog-pager-newer-link' expr:href='data:newerPageUrl' expr:id='data:widget.instanceId + &quot;_blog-pager-newer-link&quot;' expr:title='data:messages.newerPosts'><data:messages.newerPosts/></a></b:includable>\n" +
      "<b:includable id='threadedCommentForm' var='post'>\n" +
      "<div class='comment-form'><a name='comment-form'/><h4 id='comment-post-message'><data:messages.postAComment/></h4>" +
      "<b:include data='post' name='commentFormIframeSrc'/>" +
      "<iframe allowtransparency='true' class='blogger-iframe-colorize blogger-comment-from-post' expr:height='data:cmtIframeInitialHeight ?: &quot;90px&quot;' frameborder='0' id='comment-editor' name='comment-editor' src='' width='100%'/>" +
      "<data:post.cmtfpIframe/>" +
      "<script type='text/javascript'>BLOG_CMT_createIframe(&#39;<data:post.appRpcRelayPath/>&#39;);</script></div>\n" +
      "</b:includable>\n" +
      "<b:includable id='threadedCommentJs' var='post'>\n" +
      "<script async='async' expr:src='data:post.commentSrc' type='text/javascript'/>" +
      "<b:template-script inline='true' name='threaded_comments'/>" +
      "<script type='text/javascript'>blogger.widgets.blog.initThreadedComments(<data:post.commentJso/>,<data:post.commentMsgs/>,<data:post.commentConfig/>);</script>\n" +
      "</b:includable>\n" +
      "<b:includable id='threadedComments' var='post'>\n" +
      "<section class='comments threaded' expr:data-embed='data:post.embedCommentForm' expr:data-num-comments='data:post.numberOfComments' id='comments'><a name='comments'/>" +
      "<b:include name='commentsTitle'/>" +
      "<div class='comments-content'><b:if cond='data:post.embedCommentForm'><b:include data='post' name='threadedCommentJs'/></b:if><div id='comment-holder'><data:post.commentHtml/></div></div>" +
      "<p class='comment-footer'><b:if cond='data:post.allowNewComments'><b:include data='post' name='threadedCommentForm'/><b:else/><data:post.noNewCommentsText/></b:if>" +
      "<b:if cond='data:post.showManageComments'><b:include data='post' name='manageComments'/></b:if></p>" +
      "<b:if cond='data:showCmtPopup'><div id='comment-popup'><iframe allowtransparency='true' frameborder='0' id='comment-actions' name='comment-actions' scrolling='no'/></div></b:if></section>\n" +
      "</b:includable>\n" +
      "<b:includable id='tooltipCss'></b:includable>\n";

    // Blog widget settings · required for Blogger to enable comment display,
    // threaded comments, author info, etc. Without these, data:post.allowComments
    // and data:post.showThreadedComments evaluate false → comment picker is skipped.
    var blogWidgetSettings =
      "<b:widget-settings>\n" +
      "<b:widget-setting name='showDateHeader'>true</b:widget-setting>\n" +
      "<b:widget-setting name='style.textcolor'>#333333</b:widget-setting>\n" +
      "<b:widget-setting name='showCommentDateHeader'>false</b:widget-setting>\n" +
      "<b:widget-setting name='endDate'></b:widget-setting>\n" +
      "<b:widget-setting name='feedLinks'>true</b:widget-setting>\n" +
      "<b:widget-setting name='style.bordercolor'>#eeeeee</b:widget-setting>\n" +
      "<b:widget-setting name='showPostCategories'>true</b:widget-setting>\n" +
      "<b:widget-setting name='title'></b:widget-setting>\n" +
      "<b:widget-setting name='showThumbnails'>true</b:widget-setting>\n" +
      "<b:widget-setting name='style.arrow'>1</b:widget-setting>\n" +
      "<b:widget-setting name='postsPerAd'>1</b:widget-setting>\n" +
      "<b:widget-setting name='pageType'>ALL</b:widget-setting>\n" +
      "<b:widget-setting name='style.bgcolor'>#ffffff</b:widget-setting>\n" +
      "<b:widget-setting name='postLabels'>true</b:widget-setting>\n" +
      "<b:widget-setting name='showMobileShareButtons'>true</b:widget-setting>\n" +
      "<b:widget-setting name='style.linkcolor'>#2288bb</b:widget-setting>\n" +
      "<b:widget-setting name='showCommentAuthorPhoto'>true</b:widget-setting>\n" +
      "<b:widget-setting name='showAuthor'>true</b:widget-setting>\n" +
      "<b:widget-setting name='style.urltype'>0</b:widget-setting>\n" +
      "<b:widget-setting name='postsToShow'>7</b:widget-setting>\n" +
      "<b:widget-setting name='style.visitedlinkcolor'>#888888</b:widget-setting>\n" +
      "<b:widget-setting name='inlineAdsMobileOnly'>false</b:widget-setting>\n" +
      "<b:widget-setting name='style.type'>0</b:widget-setting>\n" +
      "<b:widget-setting name='style.imagesize'>medium</b:widget-setting>\n" +
      "<b:widget-setting name='style.unittype'>TextAndImage</b:widget-setting>\n" +
      "<b:widget-setting name='showMobileShareLinks'>true</b:widget-setting>\n" +
      "<b:widget-setting name='showTimestamp'>true</b:widget-setting>\n" +
      "<b:widget-setting name='showLocation'>false</b:widget-setting>\n" +
      "<b:widget-setting name='displayOldestFirst'>false</b:widget-setting>\n" +
      "<b:widget-setting name='disableGooglePlus'>true</b:widget-setting>\n" +
      "<b:widget-setting name='showCommentLink'>true</b:widget-setting>\n" +
      "<b:widget-setting name='inlineAds'>true</b:widget-setting>\n" +
      "<b:widget-setting name='style.titlecolor'>#111111</b:widget-setting>\n" +
      "<b:widget-setting name='showAuthorProfile'>false</b:widget-setting>\n" +
      "<b:widget-setting name='showThreadedComments'>true</b:widget-setting>\n" +
      "<b:widget-setting name='showSnippet'>true</b:widget-setting>\n" +
      "</b:widget-settings>\n";

    var blogWidget =
      "<b:section class='main-section' id='main' showaddelement='yes'>\n" +
      "<b:widget id='Blog1' locked='true' mobile='yes' title='บทความบล็อก' type='Blog' version='2' visible='true'>\n" +
      blogWidgetSettings +
      "<b:includable id='main'>\n" + mainIncludable + "\n</b:includable>\n" +
      nextprevIncludable +
      "<b:includable id='post' var='post'>\n" + postIncludableBody + "\n</b:includable>\n" +
      standardBlogIncludables +
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
    // Footer is always moved to the very end so it sits below the 404 block on error pages.
    var parts = [], footerParts = [], placed = false;
    S.blocks.forEach(function (b, i) {
      if (POST_BLOCKS[b.type]) {
        if (i === firstPostIdx) {
          parts.push("<b:if cond='!data:view.isError'>\n" + blogOrLayout + "\n</b:if>");
          placed = true;
        }
        return; // other post blocks already inside the widget
      }
      if (b.type === "sidebar") return; // already handled inside blogOrLayout
      if (b.type === "toc") return; // injected inline inside postIncludable, after <h1>
      if (b.type === "footer") { footerParts.push(condWrap(renderBlockStatic(b), b)); return; }
      parts.push(condWrap(renderBlockStatic(b), b));
    });
    if (!placed) parts.push("<b:if cond='!data:view.isError'>\n" + blogOrLayout + "\n</b:if>");
    // Append footer after all other blocks (including 404 block) so it's always at page bottom
    footerParts.forEach(function (f) { parts.push(f); });
    var bodyHTML = parts.join("\n");

    // label robots logic
    var labelRobotsVal = seo.labelIndex ? "index,follow,max-image-preview:large" : "noindex,follow";
    var labelRobots = "<b:if cond='data:view.isLabelSearch'><meta content='" + labelRobotsVal + "' name='robots'/><meta content='" + labelRobotsVal + "' name='googlebot'/><meta content='" + labelRobotsVal + "' name='bingbot'/></b:if>";
    var schema = seo.schema ? schemaGraph(seo) : "";
    var og = seo.og ? ogTags(seo) : "";

    var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n" +
"<!DOCTYPE html>\n" +
"<html b:css='false' b:defaultwidgetversion='2' b:js='true' b:layoutsVersion='3' b:responsive='true' b:version='2' expr:dir='data:blog.languageDirection' expr:lang='data:blog.locale' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/gml/b' xmlns:data='http://www.google.com/2005/gml/data' xmlns:expr='http://www.google.com/2005/gml/expr'>\n" +
"<head>\n" +
"<b:include data='blog' name='all-head-content'/>\n" +
"<link expr:href='data:blog.blogspotFaviconUrl' rel='icon' type='image/x-icon'/>\n" +
"<meta content='width=device-width, initial-scale=1' name='viewport'/>\n" +
"<title>" + titleExpr + "</title>\n" +
"<b:if cond='data:view.isHomepage'><meta content='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' name='robots'/><meta content='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' name='googlebot'/><meta content='index,follow,max-image-preview:large' name='bingbot'/></b:if>\n" +
"<b:if cond='data:view.isSingleItem'><meta content='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' name='robots'/><meta content='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' name='googlebot'/><meta content='index,follow,max-image-preview:large' name='bingbot'/></b:if>\n" +
"<b:if cond='data:view.isMultipleItems'><b:if cond='!data:view.isHomepage'><b:if cond='!data:view.isLabelSearch'><meta content='noindex,follow' name='robots'/><meta content='noindex,follow' name='googlebot'/><meta content='noindex,follow' name='bingbot'/></b:if></b:if></b:if>\n" +
labelRobots + "\n" +
"<b:if cond='data:view.isSearch'><meta content='noindex,follow' name='robots'/><meta content='noindex,follow' name='googlebot'/><meta content='noindex,follow' name='bingbot'/></b:if>\n" +
"<b:if cond='data:view.isError'><meta content='noindex,nofollow' name='robots'/></b:if>\n" +
"<b:if cond='data:view.isArchive'><meta content='noindex,follow' name='robots'/></b:if>\n" +
"<b:if cond='data:view.description'>\n" +
"<meta expr:content='data:view.description.escaped' name='description'/>\n" +
"<meta expr:content='data:view.description.escaped' property='og:description'/>\n" +
"<b:else/>\n" +
"<meta expr:content='data:blog.metaDescription ? data:blog.metaDescription.escaped : data:blog.title.escaped' name='description'/>\n" +
"<meta expr:content='data:blog.metaDescription ? data:blog.metaDescription.escaped : data:blog.title.escaped' property='og:description'/>\n" +
"</b:if>\n" +
og + "\n" +
"<link rel='dns-prefetch' href='//1.bp.blogspot.com'/>\n" +
"<link rel='dns-prefetch' href='//2.bp.blogspot.com'/>\n" +
"<link rel='dns-prefetch' href='//3.bp.blogspot.com'/>\n" +
"<link rel='dns-prefetch' href='//4.bp.blogspot.com'/>\n" +
"<link rel='preconnect' href='https://fonts.googleapis.com'/>\n" +
"<link crossorigin='anonymous' rel='preconnect' href='https://fonts.gstatic.com'/>\n" +
"<link rel='preconnect' href='https://blogger.googleusercontent.com'/>\n" +
// Non-blocking font load (preload + onload swap, like both reference files)
"<link as='style' href='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&amp;display=swap' onload=\"this.onload=null;this.rel='stylesheet'\" rel='preload'/>\n" +
"<noscript><link href='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&amp;display=swap' rel='stylesheet'/></noscript>\n" +
// RSS/Atom feeds · helps feed crawlers and freshness signals
(seo.siteUrl
  ? "<link href='" + esc(seo.siteUrl.replace(/\/?$/, "/")) + "feeds/posts/default' rel='alternate' title='" + esc(seo.blogTitle || "Blog") + " Atom' type='application/atom+xml'/>\n" +
    "<link href='" + esc(seo.siteUrl.replace(/\/?$/, "/")) + "feeds/posts/default?alt=rss' rel='alternate' title='" + esc(seo.blogTitle || "Blog") + " RSS' type='application/rss+xml'/>\n"
  : "") +
"<b:if cond='data:view.isSingleItem'><b:if cond='data:view.featuredImage'><link expr:href='resizeImage(data:view.featuredImage,1200,\"1200:630\")' rel='preload' as='image' fetchpriority='high'/></b:if></b:if>\n" +
schema + "\n" +
"<b:skin><![CDATA[\n" + css + "\n]]></b:skin>\n" +
"</head>\n" +
"<body>\n" +
"<a class='skip' href='#main'>" + tpl("ข้ามไปยังเนื้อหา","Skip to content") + "</a>\n" +
bodyHTML + "\n" +
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
    // Blogger Theme Designer variable definitions · editable in backend (การออกแบบ > ปรับแต่ง)
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
  /* Per-template style variables · declares --font (heading font) and --bg-base/--bg-surface tints.
     Pure CSS inside b:skin CDATA: cannot affect Blogger XML validity. */
  function tplStyleVars() {
    var FONTS = {
      personal: "Georgia,'Times New Roman','IBM Plex Sans Thai',serif",
      travel: "'Helvetica Neue',Arial,'IBM Plex Sans Thai',sans-serif",
      tech: "ui-sans-serif,system-ui,'Segoe UI','IBM Plex Sans Thai',sans-serif",
      "sidebar-blog": "Georgia,'Times New Roman','IBM Plex Sans Thai',serif",
      magazine: "Georgia,'Times New Roman','IBM Plex Sans Thai',serif",
      company: "ui-sans-serif,system-ui,'Segoe UI',Arial,'IBM Plex Sans Thai',sans-serif",
      course: "'Trebuchet MS','Segoe UI','IBM Plex Sans Thai',sans-serif",
      review: "ui-sans-serif,system-ui,'Segoe UI','IBM Plex Sans Thai',sans-serif"
    };
    var TINT = {
      personal: { base: "#fffdf8", surface: "#faf6ee" },
      travel: { base: "#ffffff", surface: "#f6f9fb" },
      tech: { base: "#ffffff", surface: "#f1f5f9" },
      "sidebar-blog": { base: "#fffefb", surface: "#f7f5f0" },
      magazine: { base: "#ffffff", surface: "#f6f6f7" },
      company: { base: "#ffffff", surface: "#f4f7ff" },
      course: { base: "#ffffff", surface: "#faf7ff" },
      review: { base: "#ffffff", surface: "#fff8f1" }
    };
    var id = (S && S.templateId) || "";
    var f = FONTS[id] || "'IBM Plex Sans Thai',system-ui,sans-serif";
    var t = TINT[id] || { base: "#ffffff", surface: "#f7f8fc" };
    return ":root{--font:" + f + ";--bg-base:" + t.base + ";--bg-surface:" + t.surface + "}";
  }
  function themeCSS(d) {
    var ff = d.font === "serif" ? "Georgia,serif" : d.font === "mono" ? "monospace" : "'IBM Plex Sans Thai',system-ui,sans-serif";
    return [
skinVariables(d),
"*{margin:0;padding:0;box-sizing:border-box}",
footerVars(),
"html{background:var(--footer-bg)}",
"body{font:$(bodyfont);color:var(--text-main);background:var(--bg-body);line-height:1.6;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;min-height:100vh;min-height:100dvh}",
"a{color:var(--primary);text-decoration:none}",
"img{max-width:100%;height:auto}",
".skip{position:absolute;left:-9999px;top:0;background:$(keycolor);color:#fff;padding:10px 16px;z-index:999}",
".skip:focus{left:0}",
".wrap{max-width:1080px;margin:0 auto;padding:0 20px}",
":root{--primary:$(keycolor);--accent:$(accentcolor);--radius:$(radius);--bg-body:#fff;--bg-surface:#f7f8fc;--bg-surface-2:#f0f1f7;--bg-header:#fff;--text-main:#1e2333;--text-muted:#4a5063;--text-subtle:#828aa0;--border:rgba(0,0,0,.07);--border-med:rgba(0,0,0,.1);--hover-bg:rgba(0,0,0,.05);--nav-shadow:0 0 48px rgba(0,0,0,.25);--drop-shadow:0 8px 24px rgba(0,0,0,.12)}",
tplStyleVars(),
"h1,h2,h3{line-height:1.2}",
".site-header{background:var(--bg-header);border-bottom:1px solid var(--border);position:relative;z-index:50}",
".site-bar{display:flex;align-items:center;gap:20px;padding:14px 20px;max-width:1080px;margin:0 auto}",
".site-logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:21px;color:var(--primary);flex:none;min-width:0}",
".site-logo img{height:34px;width:auto;max-width:130px;object-fit:contain;display:block}",
"@media(max-width:768px){.site-logo{font-size:18px;gap:8px}.site-logo img{height:26px;max-width:104px}}",
".site-nav ul{display:flex;gap:4px;list-style:none;margin:0 0 0 auto;padding:0}",
".site-nav li a{font-weight:500;padding:8px 12px;border-radius:8px;display:inline-flex;align-items:center;gap:8px;transition:background .15s,color .15s}",
".site-nav li a:hover{background:var(--hover-bg);color:var(--primary)}",
".site-nav li a[aria-current='page']{color:var(--primary);background:var(--hover-bg)}",
".site-nav .nav-ic{width:17px;height:17px;flex:none;opacity:.82;transition:opacity .15s}",
".site-nav li a:hover .nav-ic,.site-nav li a[aria-current='page'] .nav-ic{opacity:1}",
".nav-toggle-cb,.nav-burger,.nav-scrim,.nav-close{display:none}",
".nav-burger{flex-direction:column;justify-content:center;gap:5px;cursor:pointer;width:40px;height:40px;border-radius:8px;background:transparent;border:1px solid var(--border-med);margin-left:auto;flex:none}",
".nav-burger span{display:block;width:20px;height:2px;background:var(--text-main);border-radius:2px;margin:0 auto}",
".site-nav li{position:relative}",
".site-nav .has-children>a{display:inline-flex;align-items:center;gap:7px}",
".site-nav .dropdown{display:none;position:absolute;top:calc(100% + 6px);left:0;list-style:none;background:var(--bg-header);border:1px solid var(--border);border-radius:10px;box-shadow:var(--drop-shadow);min-width:170px;padding:4px 0;z-index:80;opacity:0;transform:translateY(-6px);transition:opacity .18s,transform .18s}",
".site-nav li:hover>.dropdown{display:block;opacity:1;transform:translateY(0)}",
".site-nav .dropdown li a{display:block;padding:10px 16px;font-size:14px;color:var(--text-main);white-space:nowrap;font-weight:400;border-radius:0}",
".site-nav .dropdown li a:hover{background:var(--hover-bg);color:var(--primary)}",
".nav-search{display:flex;align-items:center;gap:4px;margin-left:auto}",
".nav-search input{padding:8px 12px;border:1px solid var(--border-med);border-radius:var(--radius);font-size:13px;width:160px;background:var(--bg-surface);color:var(--text-main)}",
".nav-search button{padding:8px 12px;background:var(--primary);color:#fff;border:0;border-radius:var(--radius);cursor:pointer}",
"@media(max-width:768px){",
"body.menu-open{overflow:hidden}",
".nav-search{display:none}",
".nav-burger{display:flex}",
".nav-close{display:flex;position:absolute;top:14px;right:14px;width:36px;height:36px;align-items:center;justify-content:center;border-radius:50%;background:var(--hover-bg);border:1px solid var(--border-med);font-size:18px;cursor:pointer;color:var(--text-main);z-index:2}",
".site-nav{position:fixed;top:0;bottom:0;width:82%;max-width:320px;background:var(--bg-header);z-index:60;padding:70px 0 32px;transition:transform .28s cubic-bezier(.22,1,.36,1);box-shadow:var(--nav-shadow);overflow-y:auto}",
".site-nav ul{flex-direction:column;gap:0;margin:0;padding:0 12px}",
".site-nav li a{display:flex;align-items:center;padding:0 12px;min-height:52px;border-radius:10px;font-size:16px}",
".site-nav.nav-right{right:0;transform:translateX(100%)}",
".site-nav.nav-left{left:0;transform:translateX(-100%)}",
".nav-toggle-cb:checked~.site-bar .site-nav{transform:translateX(0)}",
".nav-toggle-cb:checked~.site-bar .nav-scrim{display:block;position:fixed;inset:0;background:rgba(0,0,0,.48);backdrop-filter:blur(2px);z-index:55}",
".site-nav .dropdown{position:static;display:none;box-shadow:none;border:0;border-radius:0;background:rgba(99,102,241,.06);padding:4px 0;margin:0 0 4px 0;opacity:1;transform:none}",
".site-nav li:hover>.dropdown{display:none}",
".site-nav .has-children.open>.dropdown{display:block}",
".site-nav .has-children>a::after{content:'\\203A';margin-left:auto;font-size:20px;line-height:1;transition:transform .2s;color:var(--text-subtle)}",
".site-nav .has-children.open>a::after{transform:rotate(90deg)}",
".site-nav .has-children>a .drop-arrow{display:none}",
".site-nav .dropdown li a{padding-left:28px;min-height:44px;font-size:14.5px;color:var(--text-muted)}",
"}",
".hide-mobile{display:block}",
"@media(max-width:768px){.grid{grid-template-columns:1fr !important}.hide-mobile{display:none !important}}",
".bxb-page-layout{display:grid;gap:28px;max-width:1080px;margin:0 auto;padding:28px 20px;align-items:start}",
".bxb-main-col{min-width:0}",
".bxb-sidebar-col{min-width:0}",
".bxb-sidebar-col .widget{margin-bottom:18px;background:var(--bg-surface);border-radius:var(--radius);padding:16px}",
".bxb-sidebar-col .widget-title,.bxb-sidebar-col h2,.bxb-sidebar-col h3{font-size:15px;font-weight:700;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--primary)}",
"@media(max-width:768px){.bxb-page-layout{display:block;padding:16px 20px}.bxb-sidebar-col{margin-top:20px}}",
".blog-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;max-width:1080px;margin:6px auto 44px;padding:0 20px}",
".blog-pager a{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border:1.5px solid var(--border-med);border-radius:999px;background:var(--bg-surface);color:var(--text-main);font-weight:600;font-size:14px;text-decoration:none;transition:background .18s,color .18s,border-color .18s,transform .18s,box-shadow .18s;box-shadow:0 1px 3px rgba(0,0,0,.05)}",
".blog-pager a:hover{background:var(--primary);border-color:var(--primary);color:#fff;transform:translateY(-2px);box-shadow:0 10px 22px -8px rgba(0,0,0,.35)}",
".blog-pager .blog-pager-older-link{margin-left:auto}",
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
".post-body blockquote{border-left:4px solid var(--primary);padding:12px 16px;margin:20px 0;background:var(--hover-bg);border-radius:0 var(--radius) var(--radius) 0}",
".post-body pre{background:var(--bg-surface);color:var(--text-main);padding:16px;border-radius:var(--radius);overflow-x:auto;font-size:13px;line-height:1.6;margin-bottom:16px}",
".post-body code{font-family:monospace;background:var(--bg-surface-2);color:var(--text-main);padding:2px 6px;border-radius:4px;font-size:13px}",
".post-body pre code{background:none;padding:0}",
".site-footer{background:var(--footer-bg);color:var(--footer-fg);padding:52px 20px 28px}",
".footer-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:48px;max-width:980px;margin:0 auto;align-items:start}",
"@media(max-width:768px){.footer-grid{grid-template-columns:1fr;gap:28px}}",
".footer-logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;color:var(--footer-fg);margin-bottom:12px;font-family:$(titlefont)}",
".footer-logo img{height:28px;width:auto;max-width:120px;object-fit:contain;display:block}",
".footer-about{color:var(--footer-muted);font-size:14px;line-height:1.65;margin:0 0 20px;max-width:340px}",
".footer-social{display:flex;gap:8px;flex-wrap:wrap}",
".footer-social-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9px;background:var(--footer-chip);color:var(--footer-fg);transition:background .2s,transform .15s}",
".footer-social-icon:hover{background:var(--ic-color,rgba(255,255,255,.25));transform:translateY(-2px)}",
".footer-social-icon svg{display:block}",
".footer-links{display:flex;flex-direction:column;gap:10px;padding-top:6px}",
".footer-link{color:var(--footer-muted);font-size:14px;text-decoration:none;transition:color .2s;display:inline-flex;align-items:center;gap:8px}",
".footer-link:hover{color:var(--footer-fg)}",
".footer-link .nav-ic{width:15px;height:15px;flex:none;opacity:.66;transition:opacity .2s}",
".footer-link:hover .nav-ic{opacity:1}",
".footer-bottom{text-align:center;color:var(--footer-dim);font-size:12.5px;margin-top:40px;padding-top:20px;border-top:1px solid var(--footer-line);max-width:980px;margin-left:auto;margin-right:auto}",
"@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}}",
"#bxbToc{margin:0 0 24px;border-left:3px solid var(--primary);border-radius:0 var(--radius,8px) var(--radius,8px) 0;background:var(--bg-surface);overflow:hidden}",
"#bxbTocHead{display:flex;align-items:center;gap:7px;padding:10px 14px;font-size:11.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;background:none;border:none;width:100%;text-align:left;cursor:pointer;transition:background .15s}",
"#bxbTocHead:hover{background:var(--hover-bg)}",
"#bxbTocChev{margin-left:auto;font-size:10px;transition:transform .25s}",
"#bxbTocBody{overflow:hidden;transition:max-height .3s ease}",
"#bxbTocList{margin:4px 0 12px;padding:0 14px 0 28px;font-size:14px;line-height:1.85;color:var(--text-main)}",
"#bxbTocList a{color:inherit;text-decoration:none;transition:color .15s}",
"#bxbTocList a:hover{color:var(--primary)}",
"#bxbTocList .toc-h3{padding-left:14px;font-size:13px;color:var(--text-muted)}",
".bxb-share-btn{padding:10px 18px;color:#fff;border-radius:var(--radius);font-weight:600;font-size:13px;text-decoration:none;display:inline-flex;align-items:center;transition:transform .15s,opacity .15s}",
".bxb-share-btn:hover{transform:translateY(-2px);opacity:.92}",
".pb-hero{padding:64px 20px;background:var(--bg-base);border-bottom:1px solid var(--border)}",
".pb-hero .wrap{display:flex;align-items:center;gap:48px;flex-wrap:wrap;max-width:900px}",
".pb-eyebrow{font-size:11px;color:var(--primary);font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px}",
".pb-avatar-ring{width:180px;height:180px;border-radius:50%;padding:6px;background:linear-gradient(135deg,var(--primary),var(--accent));flex:none}",
".pb-avatar-inner{width:100%;height:100%;border-radius:50%;background:var(--bg-base);display:flex;align-items:center;justify-content:center}",
".pb-grid{display:grid;gap:24px}",
".pb-card{border-radius:var(--radius);overflow:hidden;background:var(--bg-surface);box-shadow:0 1px 4px rgba(0,0,0,.06);transition:transform .2s,box-shadow .2s}",
".pb-card:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(0,0,0,.1)}",
".pb-card-img{height:180px;overflow:hidden;background:var(--hover-bg)}",
".pb-card-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s}",
".pb-card:hover .pb-card-img img{transform:scale(1.05)}",
".pb-card-body{padding:16px 18px 20px}",
".pb-card-date{font-size:11.5px;color:var(--text-muted);margin-bottom:5px}",
".pb-card-title{font-size:17px;font-weight:700;line-height:1.4;margin:0 0 7px;font-family:var(--font)}",
".pb-card-title a{color:var(--text-main);text-decoration:none}",
".pb-card-title a:hover{color:var(--primary)}",
".pb-card-excerpt{font-size:13.5px;color:var(--text-muted);line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin:0 0 10px}",
".pb-card-read{font-size:13px;color:var(--primary);font-weight:600;text-decoration:none}",
".pb-card--border{box-shadow:none;border:1px solid var(--border)}",
".pb-card--border:hover{box-shadow:0 8px 22px rgba(0,0,0,.09)}",
".pb-card--flat{box-shadow:none;background:transparent}",
".pb-card--flat .pb-card-body{padding-left:2px;padding-right:2px}",
".pb-card--flat:hover{transform:none}",
".pb-about{padding:56px 20px;background:var(--bg-surface);flex:1 0 auto;display:flex;flex-direction:column;justify-content:center}",
".pb-about>.wrap{width:100%}",
".pb-about .wrap{display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap;max-width:800px}",
".pb-about-avatar{width:110px;height:110px;border-radius:50%;padding:5px;background:linear-gradient(135deg,var(--primary),var(--accent));flex:none}",
".pb-about-avatar-inner{width:100%;height:100%;border-radius:50%;background:var(--bg-surface);display:flex;align-items:center;justify-content:center}",
".pb-about-eyebrow{font-size:11px;color:var(--primary);font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px}",
".pb-about-name{font-size:24px;font-weight:800;color:var(--text-main);margin:0 0 10px;line-height:1.2;font-family:var(--font)}",
".pb-about-bio{font-size:15px;color:var(--text-muted);line-height:1.7;margin:0}",
"@media(max-width:640px){.pb-hero .wrap{flex-direction:column-reverse;text-align:center}.pb-avatar-ring{width:130px;height:130px}.pb-about .wrap{flex-direction:column;align-items:center;text-align:center}}",
".tb-hero{position:relative;min-height:500px;overflow:hidden;display:flex;align-items:flex-end}",
".tb-hero-bg{position:absolute;inset:0;background:linear-gradient(135deg,var(--primary),var(--accent))}",
".tb-hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.2) 55%,transparent 100%)}",
".tb-hero-content{position:relative;z-index:1;padding:52px 32px;color:#fff;max-width:820px}",
".tb-hero-tag{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.88;margin-bottom:14px}",
".tb-hero-title{font-size:clamp(30px,6vw,54px);font-weight:800;line-height:1.05;letter-spacing:-.02em;margin:0 0 22px;font-family:var(--font)}",
".tb-hero-sub{font-size:17px;opacity:.88;margin:0 0 26px;max-width:500px;line-height:1.6}",
".tb-hero-btn{display:inline-block;background:#fff;color:var(--primary);font-weight:700;padding:13px 28px;border-radius:var(--radius);text-decoration:none;font-size:15px}",
".tb-feat{padding:52px 0}",
".tb-feat-grid{display:grid;grid-template-columns:1.6fr 1fr;gap:16px}",
".tb-feat-item{position:relative;border-radius:var(--radius);overflow:hidden;background:linear-gradient(135deg,var(--primary),var(--accent));display:block;text-decoration:none;min-height:180px}",
".tb-feat-item:first-child{grid-row:1/3;min-height:380px}",
".tb-feat-item img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}",
".tb-feat-item:hover img{transform:scale(1.05)}",
".tb-feat-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.68) 0%,transparent 55%)}",
".tb-feat-info{position:absolute;bottom:0;left:0;right:0;padding:16px 20px;color:#fff}",
".tb-feat-loc{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;opacity:.85;margin-bottom:4px}",
".tb-feat-title{font-weight:700;line-height:1.25;color:#fff;text-decoration:none}",
".tb-grid{display:grid;gap:20px}",
".tb-card{border-radius:var(--radius);overflow:hidden;background:var(--bg-surface);box-shadow:0 2px 8px rgba(0,0,0,.07);transition:transform .2s,box-shadow .2s}",
".tb-card:hover{transform:translateY(-4px);box-shadow:0 14px 32px rgba(0,0,0,.12)}",
".tb-card-img{aspect-ratio:4/3;overflow:hidden;position:relative;background:linear-gradient(135deg,var(--primary),var(--accent))}",
".tb-card-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s;position:absolute;inset:0}",
".tb-card:hover .tb-card-img img{transform:scale(1.07)}",
".tb-card-loc{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.52);color:#fff;font-size:11px;font-weight:700;letter-spacing:.05em;padding:4px 10px;border-radius:20px;backdrop-filter:blur(4px)}",
".tb-card-body{padding:15px 17px 18px}",
".tb-card-date{font-size:11.5px;color:var(--text-muted);margin-bottom:5px}",
".tb-card-title{font-size:16px;font-weight:700;line-height:1.35;margin:0 0 10px}",
".tb-card-title a{color:var(--text-main);text-decoration:none}",
".tb-card-title a:hover{color:var(--primary)}",
".tb-card-btn{display:inline-flex;align-items:center;gap:4px;font-size:13px;color:var(--primary);font-weight:600;text-decoration:none}",
"@media(max-width:640px){.tb-feat-grid{grid-template-columns:1fr}.tb-feat-item:first-child{min-height:220px;grid-row:auto}.tb-hero-content{padding:36px 20px}}",
".tech-hero{padding:72px 20px;background:#0f172a;color:#e2e8f0}",
".tech-hero .wrap{max-width:820px}",
".tech-hero-eyebrow{font-family:monospace;font-size:13px;color:var(--primary);font-weight:700;letter-spacing:.05em;margin-bottom:18px}",
".tech-hero-title{font-size:clamp(28px,5vw,46px);font-weight:800;line-height:1.1;letter-spacing:-.02em;color:#f8fafc;margin:0 0 18px;font-family:var(--font)}",
".tech-hero-sub{font-size:17px;color:#94a3b8;line-height:1.65;margin:0 0 30px;max-width:500px}",
".tech-hero-btn{display:inline-block;background:var(--primary);color:#fff;font-weight:700;padding:12px 28px;border-radius:var(--radius);text-decoration:none;font-size:15px}",
".tech-list{padding:56px 0}",
".tech-list-row{border-bottom:1px solid var(--border);padding:20px 0;display:flex;gap:14px;align-items:flex-start}",
".tech-list-num{font-family:monospace;font-size:12px;color:var(--text-muted);padding-top:3px;flex:none;width:28px}",
".tech-list-body{flex:1;min-width:0}",
".tech-list-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}",
".tech-tag{font-size:11px;font-weight:700;letter-spacing:.04em;padding:3px 9px;border-radius:20px;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary)}",
".tech-list-title{font-size:17px;font-weight:700;line-height:1.35;color:var(--text-main);text-decoration:none;display:block;margin-bottom:5px;transition:color .15s}",
".tech-list-title:hover{color:var(--primary)}",
".tech-list-meta{font-size:12px;color:var(--text-muted)}",
".tech-grid{display:grid;gap:22px}",
".tech-card{border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);background:var(--bg-surface);transition:border-color .2s,box-shadow .2s}",
".tech-card:hover{border-color:var(--primary);box-shadow:0 8px 24px rgba(0,0,0,.08)}",
".tech-card-img{aspect-ratio:16/9;overflow:hidden;position:relative;background:linear-gradient(135deg,var(--primary)20,var(--accent)30)}",
".tech-card-img img{width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0;transition:transform .4s}",
".tech-card:hover .tech-card-img img{transform:scale(1.04)}",
".tech-card-tag{position:absolute;top:10px;left:10px;font-size:11px;font-weight:700;letter-spacing:.04em;padding:3px 9px;border-radius:20px;background:var(--primary);color:#fff}",
".tech-card-body{padding:16px 18px 20px}",
".tech-card-date{font-size:11.5px;color:var(--text-muted);margin-bottom:5px}",
".tech-card-title{font-size:16px;font-weight:700;line-height:1.35;margin:0 0 8px}",
".tech-card-title a{color:var(--text-main);text-decoration:none}",
".tech-card-title a:hover{color:var(--primary)}",
".tech-card-excerpt{font-size:13.5px;color:var(--text-muted);line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin:0 0 10px}",
".tech-card-read{font-size:13px;color:var(--primary);font-weight:600;text-decoration:none}",
"@media(max-width:640px){.tech-hero{padding:52px 20px}.tech-list-row{flex-direction:column;gap:6px}}",
".mag-feat{padding:52px 0;border-bottom:3px solid var(--primary)}",
".mag-feat-grid{display:grid;grid-template-columns:2fr 1fr;gap:14px}",
".mag-feat-main{position:relative;border-radius:var(--radius);overflow:hidden;background:linear-gradient(135deg,var(--primary),var(--accent));min-height:380px;display:flex;align-items:flex-end;text-decoration:none;display:block}",
".mag-feat-main img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}",
".mag-feat-main:hover img{transform:scale(1.04)}",
".mag-feat-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.55) 38%,rgba(0,0,0,.18) 70%,rgba(0,0,0,.04) 100%)}",
".mag-feat-info{position:absolute;bottom:0;left:0;right:0;padding:22px 24px;color:#fff}",
".mag-feat-cat{font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;background:var(--primary);color:#fff;padding:3px 10px;border-radius:3px;display:inline-block;margin-bottom:10px}",
".mag-feat-title{font-size:clamp(19px,3vw,27px);font-weight:800;line-height:1.2;color:#fff;margin:0 0 7px;font-family:var(--font);text-shadow:0 2px 14px rgba(0,0,0,.7),0 1px 3px rgba(0,0,0,.6)}",
".mag-feat-meta{text-shadow:0 1px 6px rgba(0,0,0,.7)}",
".mag-feat-meta{font-size:12px;color:rgba(255,255,255,.65)}",
".mag-side{display:flex;flex-direction:column;gap:10px}",
".mag-side-item{position:relative;border-radius:var(--radius);overflow:hidden;background:linear-gradient(135deg,var(--accent),var(--primary));flex:1;min-height:160px;text-decoration:none;display:block}",
".mag-side-item img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}",
".mag-side-item:hover img{transform:scale(1.05)}",
".mag-side-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.55) 45%,rgba(0,0,0,.18) 78%,rgba(0,0,0,.05) 100%)}",
".mag-side-info{position:absolute;bottom:0;left:0;right:0;padding:12px 14px;color:#fff}",
".mag-side-cat{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;background:var(--primary);color:#fff;padding:2px 9px;border-radius:3px;display:inline-block;margin-bottom:6px}",
".mag-side-title{font-size:15px;font-weight:700;line-height:1.25;color:#fff;font-family:var(--font);text-shadow:0 2px 10px rgba(0,0,0,.7),0 1px 3px rgba(0,0,0,.6)}",
".mag-grid{display:grid;gap:22px}",
".mag-card{border-radius:var(--radius);overflow:hidden;background:var(--bg-surface);border:1px solid var(--border);transition:box-shadow .2s}",
".mag-card:hover{box-shadow:0 6px 22px rgba(0,0,0,.09)}",
".mag-card-img{aspect-ratio:16/9;overflow:hidden;position:relative;background:linear-gradient(135deg,var(--primary)20,var(--accent)30)}",
".mag-card-img img{width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0;transition:transform .4s}",
".mag-card:hover .mag-card-img img{transform:scale(1.04)}",
".mag-card-body{padding:14px 17px 18px}",
".mag-card-cat{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--primary);margin-bottom:7px;display:block}",
".mag-card-title{font-size:17px;font-weight:700;line-height:1.3;margin:0 0 8px;font-family:var(--font)}",
".mag-card-title a{color:var(--text-main);text-decoration:none}",
".mag-card-title a:hover{color:var(--primary)}",
".mag-card-excerpt{font-size:13.5px;color:var(--text-muted);line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin:0 0 10px}",
".mag-card-meta{font-size:12px;color:var(--text-muted)}",
".mag-news{padding:52px 0}",
".mag-news-row{display:flex;gap:12px;align-items:center;border-bottom:1px solid var(--border);padding:13px 0}",
".mag-news-cat{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--primary);padding:2px 8px;border-radius:3px;white-space:nowrap;flex:none}",
".mag-news-title{font-size:15px;font-weight:600;color:var(--text-main);text-decoration:none;flex:1;min-width:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;line-height:1.35;font-family:var(--font);transition:color .15s}",
".mag-news-title:hover{color:var(--primary)}",
".mag-news-date{font-size:12px;color:var(--text-muted);white-space:nowrap;flex:none}",
"@media(max-width:640px){.mag-feat-grid{grid-template-columns:1fr}.mag-side{flex-direction:row}.mag-side-item{min-height:150px}.mag-news-date{display:none}}",
"@media(max-width:900px){.mag-grid,.tb-grid,.tech-grid,.rv-grid,.edu-grid,.sb-grid{grid-template-columns:repeat(2,1fr)!important}}",
"@media(max-width:600px){.mag-grid,.tb-grid,.tech-grid,.rv-grid,.edu-grid,.sb-grid{grid-template-columns:1fr!important}}",
".corp-hero{padding:88px 20px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;position:relative;overflow:hidden}",
".corp-hero .wrap{max-width:900px;position:relative;z-index:1}",
".corp-hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.72);margin-bottom:20px;display:flex;align-items:center;gap:8px}",
".corp-hero-eyebrow-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.55);display:inline-block}",
".corp-hero-title{font-size:clamp(30px,5vw,54px);font-weight:800;line-height:1.06;letter-spacing:-.02em;color:#fff;margin:0 0 20px;font-family:var(--font)}",
".corp-hero-sub{font-size:17px;color:rgba(255,255,255,.8);line-height:1.65;margin:0 0 34px;max-width:520px}",
".corp-hero-actions{display:flex;gap:14px;flex-wrap:wrap}",
".corp-hero-btn{display:inline-block;background:#fff;color:var(--primary);font-weight:700;padding:13px 30px;border-radius:var(--radius);text-decoration:none;font-size:15px}",
".corp-hero-btn-out{display:inline-block;background:transparent;color:#fff;font-weight:600;padding:12px 28px;border-radius:var(--radius);text-decoration:none;font-size:15px;border:2px solid rgba(255,255,255,.45)}",
".corp-about{padding:80px 20px;background:var(--bg-base)}",
".corp-about-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;max-width:1060px}",
".corp-about-eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--primary);margin-bottom:16px}",
".corp-about-title{font-size:clamp(24px,4vw,38px);font-weight:800;line-height:1.15;color:var(--text-main);margin:0 0 18px;font-family:var(--font)}",
".corp-about-body{font-size:16px;color:var(--text-muted);line-height:1.7;margin:0 0 34px}",
".corp-stats{display:flex;gap:28px;flex-wrap:wrap}",
".corp-stat-num{font-size:32px;font-weight:800;color:var(--primary);line-height:1;font-family:var(--font)}",
".corp-stat-label{font-size:12px;color:var(--text-muted);margin-top:5px}",
".corp-visual{display:grid;grid-template-columns:1fr 1fr;gap:12px}",
".corp-visual-block{border-radius:var(--radius);aspect-ratio:1;background:linear-gradient(135deg,var(--primary)18,var(--accent)30)}",
".corp-visual-block:nth-child(1){background:linear-gradient(135deg,var(--primary),var(--accent))}",
".corp-visual-block:nth-child(3){background:linear-gradient(135deg,var(--accent),var(--primary))}",
".corp-cta{padding:88px 20px;background:linear-gradient(135deg,var(--primary),var(--accent));text-align:center;color:#fff}",
".corp-cta-title{font-size:clamp(26px,4.5vw,44px);font-weight:800;line-height:1.08;color:#fff;margin:0 0 14px;font-family:var(--font)}",
".corp-cta-sub{font-size:17px;color:rgba(255,255,255,.8);margin:0 0 34px;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.6}",
".corp-cta-btn{display:inline-block;background:#fff;color:var(--primary);font-weight:700;padding:15px 36px;border-radius:var(--radius);text-decoration:none;font-size:16px}",
"@media(max-width:768px){.corp-about-grid{grid-template-columns:1fr;gap:40px}.corp-visual{display:none}}",
"@media(max-width:640px){.corp-hero{padding:64px 20px}.corp-cta{padding:64px 20px}}",
".edu-hero{padding:88px 20px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff}",
".edu-hero .wrap{max-width:900px}",
".edu-hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-bottom:20px}",
".edu-hero-title{font-size:clamp(30px,5vw,52px);font-weight:800;line-height:1.06;letter-spacing:-.02em;color:#fff;margin:0 0 16px;font-family:var(--font)}",
".edu-hero-sub{font-size:17px;color:rgba(255,255,255,.82);line-height:1.65;margin:0 0 24px;max-width:540px}",
".edu-hero-chips{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:32px}",
".edu-hero-chip{font-size:13px;color:rgba(255,255,255,.9);display:flex;align-items:center;gap:7px}",
".edu-hero-chip-check{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:10px;flex:none}",
".edu-hero-btn{display:inline-block;background:#fff;color:var(--primary);font-weight:700;padding:13px 30px;border-radius:var(--radius);text-decoration:none;font-size:15px}",
".edu-courses{padding:64px 20px}",
".edu-grid{display:grid;gap:22px}",
".edu-card{border-radius:var(--radius);overflow:hidden;background:var(--bg-surface);box-shadow:0 2px 12px rgba(0,0,0,.07);transition:transform .2s,box-shadow .2s}",
".edu-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.12)}",
".edu-card-thumb{aspect-ratio:16/9;overflow:hidden;position:relative;background:linear-gradient(135deg,var(--primary)25,var(--accent)50)}",
".edu-card-thumb img{width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0}",
".edu-card-badge{position:absolute;top:10px;left:10px;font-size:11px;font-weight:700;letter-spacing:.05em;padding:3px 9px;border-radius:20px;background:rgba(255,255,255,.95);color:var(--primary)}",
".edu-card-body{padding:16px 18px 4px}",
".edu-card-title{font-size:17px;font-weight:700;color:var(--text-main);margin:0 0 10px;line-height:1.35}",
".edu-card-rating{display:flex;align-items:center;gap:7px;margin-bottom:7px}",
".edu-card-stars{color:#f59e0b;font-size:13px;letter-spacing:1px}",
".edu-card-score{font-size:12px;font-weight:700;color:var(--text-main)}",
".edu-card-meta{font-size:12px;color:var(--text-muted);margin-bottom:14px}",
".edu-card-foot{border-top:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center}",
".edu-card-price{font-size:19px;font-weight:800;color:var(--primary);font-family:var(--font)}",
".edu-card-enroll{font-size:13px;font-weight:700;color:#fff;background:var(--primary);padding:7px 16px;border-radius:calc(var(--radius)*0.7);text-decoration:none;display:inline-block}",
".edu-cta{padding:88px 20px;background:linear-gradient(135deg,var(--primary),var(--accent));text-align:center;color:#fff}",
".edu-cta-title{font-size:clamp(26px,4.5vw,44px);font-weight:800;line-height:1.08;color:#fff;margin:0 0 14px;font-family:var(--font)}",
".edu-cta-sub{font-size:17px;color:rgba(255,255,255,.82);margin:0 auto 34px;max-width:500px;line-height:1.6}",
".edu-trust{display:flex;justify-content:center;gap:44px;flex-wrap:wrap;margin-bottom:38px}",
".edu-trust-num{font-size:30px;font-weight:800;color:#fff;line-height:1;font-family:var(--font)}",
".edu-trust-label{font-size:13px;color:rgba(255,255,255,.72);margin-top:5px}",
".edu-cta-btn{display:inline-block;background:#fff;color:var(--primary);font-weight:700;padding:14px 34px;border-radius:var(--radius);text-decoration:none;font-size:16px}",
"@media(max-width:640px){.edu-hero{padding:64px 20px}.edu-cta{padding:64px 20px}.edu-trust{gap:28px}}",
".rv-hero{padding:80px 20px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff}",
".rv-hero .wrap{max-width:900px}",
".rv-hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.78);margin-bottom:18px}",
".rv-hero-title{font-size:clamp(28px,5vw,52px);font-weight:800;line-height:1.06;letter-spacing:-.02em;color:#fff;margin:0 0 16px;font-family:var(--font)}",
".rv-hero-sub{font-size:17px;color:rgba(255,255,255,.85);line-height:1.65;margin:0 0 22px;max-width:500px}",
".rv-hero-rating{display:flex;align-items:center;gap:10px;margin-bottom:30px}",
".rv-hero-stars{color:#fff;font-size:18px;letter-spacing:2px}",
".rv-hero-score{font-size:16px;font-weight:700;color:#fff}",
".rv-hero-count{font-size:14px;color:rgba(255,255,255,.72)}",
".rv-hero-btn{display:inline-block;background:#fff;color:var(--primary);font-weight:700;padding:13px 30px;border-radius:var(--radius);text-decoration:none;font-size:15px}",
".rv-reviews{padding:64px 20px}",
".rv-grid{display:grid;gap:22px}",
".rv-card{border-radius:var(--radius);overflow:hidden;background:var(--bg-surface);box-shadow:0 2px 12px rgba(0,0,0,.07);transition:transform .2s,box-shadow .2s}",
".rv-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.12)}",
".rv-card-img{aspect-ratio:16/9;overflow:hidden;position:relative;background:linear-gradient(135deg,var(--primary)25,var(--accent)50)}",
".rv-card-img img{width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0}",
".rv-card-best{position:absolute;top:10px;left:10px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 10px;border-radius:20px;background:var(--primary);color:#fff}",
".rv-card-score{position:absolute;top:10px;right:10px;font-size:14px;font-weight:800;padding:5px 10px;border-radius:8px;background:rgba(255,255,255,.96);color:var(--primary);line-height:1}",
".rv-card-body{padding:14px 18px 4px}",
".rv-card-cat{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--primary);margin-bottom:5px}",
".rv-card-title{font-size:17px;font-weight:700;color:var(--text-main);margin:0 0 7px;line-height:1.35}",
".rv-card-title a{color:inherit;text-decoration:none}",
".rv-card-stars{color:#f59e0b;font-size:13px;letter-spacing:1px;margin-bottom:8px}",
".rv-card-excerpt{font-size:13px;color:var(--text-muted);line-height:1.55;margin-bottom:10px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}",
".rv-card-foot{border-top:1px solid var(--border);padding:11px 18px;display:flex;justify-content:space-between;align-items:center}",
".rv-card-deal{display:inline-block;font-size:13px;font-weight:700;color:#fff;background:var(--primary);padding:8px 18px;border-radius:calc(var(--radius)*0.7);text-decoration:none}",
".rv-card-disc{font-size:10px;color:var(--text-muted)}",
".rv-about{padding:64px 20px;background:var(--bg-surface)}",
".rv-about-inner{max-width:820px;margin:0 auto;display:flex;gap:36px;align-items:center;flex-wrap:wrap}",
".rv-about-avatar{width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;flex:none}",
".rv-about-body{flex:1;min-width:200px}",
".rv-about-role{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--primary);margin-bottom:6px}",
".rv-about-name{font-size:24px;font-weight:800;color:var(--text-main);margin:0 0 10px;font-family:var(--font)}",
".rv-about-bio{font-size:15px;color:var(--text-muted);line-height:1.7;margin:0 0 18px}",
".rv-about-trust{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:14px}",
".rv-about-trust-num{font-size:22px;font-weight:800;color:var(--primary);line-height:1;font-family:var(--font)}",
".rv-about-trust-label{font-size:11px;color:var(--text-muted);margin-top:3px}",
".rv-about-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:var(--primary);padding:5px 12px;border-radius:20px;border:1.5px solid var(--primary)}",
"@media(max-width:640px){.rv-hero{padding:60px 20px}.rv-about-inner{gap:24px}.rv-about-avatar{width:80px;height:80px}}",
".sb-hero{padding:60px 20px;background:#fff;border-top:4px solid var(--primary)}",
".sb-hero .wrap{max-width:860px}",
".sb-hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--primary);margin-bottom:14px}",
".sb-hero-title{font-size:clamp(26px,4.5vw,46px);font-weight:800;line-height:1.1;letter-spacing:-.02em;color:var(--text-main);margin:0 0 14px;font-family:var(--font)}",
".sb-hero-sub{font-size:16px;color:var(--text-muted);line-height:1.65;margin:0 0 22px;max-width:500px}",
".sb-hero-tags{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px}",
".sb-hero-tag{font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;color:var(--primary);border:1.5px solid var(--primary)}",
".sb-hero-btn{display:inline-block;background:var(--primary);color:#fff;font-weight:700;padding:12px 26px;border-radius:var(--radius);text-decoration:none;font-size:15px}",
".sb-posts{padding:40px 20px}",
".sb-grid{display:grid;gap:18px}",
".sb-card{border-radius:var(--radius);overflow:hidden;background:var(--bg-surface);border:1px solid var(--border);transition:box-shadow .2s}",
".sb-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.1)}",
".sb-card-img{aspect-ratio:16/9;overflow:hidden;position:relative;background:linear-gradient(135deg,var(--primary)12,var(--accent)25)}",
".sb-card-img img{width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0}",
".sb-card-body{padding:14px 16px 16px}",
".sb-card-cat{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--primary);margin-bottom:5px}",
".sb-card-title{font-size:17px;font-weight:700;color:var(--text-main);margin:0 0 8px;line-height:1.35}",
".sb-card-title a{color:inherit;text-decoration:none}",
".sb-card-title a:hover{color:var(--primary)}",
".sb-card-excerpt{font-size:13px;color:var(--text-muted);line-height:1.55;margin:0 0 10px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}",
".sb-card-meta{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-muted)}",
".sb-card-read{font-size:13px;font-weight:600;color:var(--primary);text-decoration:none}",
".sb-card-read:hover{text-decoration:underline}"
    ].join("\n");
  }

  /* TOC HTML generator · call with inline=true to omit the b:if wrapper (for postIncludable injection).
     Script uses DOMContentLoaded so it runs after <data:post.body/> is parsed, even though the
     shell HTML is injected before the post body in document order. */
  function genTocHtml(p, inline) {
    var tocTitle = esc(p.title || "สารบัญ");
    var tocDepth = parseInt(p.maxDepth || 3, 10);
    var tocSel = tocDepth >= 3 ? "h2,h3" : "h2";
    var tocListStyle = p.numbered !== false ? "decimal" : "disc";
    var listIcon = "<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><line x1='8' y1='6' x2='21' y2='6'/><line x1='8' y1='12' x2='21' y2='12'/><line x1='8' y1='18' x2='21' y2='18'/><line x1='3' y1='6' x2='3.01' y2='6'/><line x1='3' y1='12' x2='3.01' y2='12'/><line x1='3' y1='18' x2='3.01' y2='18'/></svg>";
    var inner =
      "<nav id='bxbToc' aria-label='" + tocTitle + "'>" +
      "<button type='button' id='bxbTocHead' aria-expanded='false' aria-controls='bxbTocBody'>" + listIcon + " " + tocTitle + "<span id='bxbTocChev' aria-hidden='true'>&#9660;</span></button>" +
      "<div id='bxbTocBody' style='max-height:0;overflow:hidden'><ul id='bxbTocList' style='list-style:" + tocListStyle + "'></ul></div>" +
      "</nav>" +
      "<script>/*<![CDATA[*/(function(){" +
      "function bxbTocRun(){" +
      "var wrap=document.getElementById('bxbToc');" +
      "var list=document.getElementById('bxbTocList');" +
      "var content=document.querySelector('.post-body,.entry-content');" +
      "if(!wrap||!list||!content)return;" +
      "var hs=Array.prototype.slice.call(content.querySelectorAll('" + tocSel + "'));" +
      "if(hs.length<2){wrap.style.display='none';return;}" +
      "var numRe=/^\\s*\\d+[.)\\u3002]\\s+/;" +
      "var hasNums=hs.some(function(h){return numRe.test(h.textContent.trim());});" +
      "if(hasNums)list.style.listStyle='none';" +
      "var frag=document.createDocumentFragment();" +
      "hs.forEach(function(h,i){" +
      "var slug=h.id||(h.textContent.trim().toLowerCase().replace(/[^\\w\\u0E00-\\u0E7F]+/g,'-').replace(/^-|-$/g,'')||('toc-'+i));" +
      "h.id=slug;" +
      "var li=document.createElement('li');" +
      (tocDepth >= 3 ? "if(h.tagName==='H3')li.className='toc-h3';" : "") +
      "var a=document.createElement('a');" +
      "a.href='#'+slug;" +
      "a.textContent=h.textContent.trim();" +
      "li.appendChild(a);frag.appendChild(li);" +
      "});" +
      "list.appendChild(frag);" +
      "var head=document.getElementById('bxbTocHead');" +
      "var chev=document.getElementById('bxbTocChev');" +
      "var bodyEl=document.getElementById('bxbTocBody');" +
      "var isMob=window.innerWidth<768;" +
      "var isOpen=!isMob;" +
      "function applyState(open){" +
      "head.setAttribute('aria-expanded',open?'true':'false');" +
      "bodyEl.style.maxHeight=open?bodyEl.scrollHeight+'px':'0';" +
      "chev.style.transform=open?'':'rotate(-90deg)';" +
      "}" +
      "applyState(isOpen);" +
      "head.addEventListener('click',function(){" +
      "isOpen=!isOpen;applyState(isOpen);" +
      "});" +
      "}" +
      "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',bxbTocRun);}else{bxbTocRun();}" +
      "})();/*]]>*/<\/script>";
    return inline ? inner : "<b:if cond='data:view.isSingleItem'>" + inner + "</b:if>";
  }

  // Pin label of the featured block (used to pin posts into the featured
  // spotlight). It's an internal marker, not a real category, so card
  // kickers must skip it when picking a label to display.
  function magPinLabel() {
    var fb = S && S.blocks && S.blocks.find(function (b) { return b.type === "featured"; });
    var v = (fb && fb.props && fb.props.featLabel != null) ? String(fb.props.featLabel) : tpl("แนะนำ", "Featured");
    return v.trim();
  }
  // Emit Blogger markup showing the post's first label that is NOT the pin
  // label, wrapped in the given open/close tags. Optional placeholder keeps
  // row alignment when nothing remains to show.
  function magCatFirst(open, close, placeholder) {
    var pin = magPinLabel(), ph = placeholder || "";
    if (!pin) return "<b:if cond='data:post.labels'>" + open + "<data:post.labels.first.name/>" + close + (ph ? "<b:else/>" + ph : "") + "</b:if>";
    return "<b:if cond='data:post.labels'>" +
      "<b:with value='data:post.labels filter (bkl =&gt; bkl.name != &quot;" + esc(pin) + "&quot;)' var='bkcats'>" +
      "<b:if cond='data:bkcats.first'>" + open + "<data:bkcats.first.name/>" + close +
      (ph ? "<b:else/>" + ph : "") + "</b:if>" +
      "</b:with>" +
      (ph ? "<b:else/>" + ph : "") +
      "</b:if>";
  }

  /* static (server-rendered) markup for the theme body · semantic HTML5 */
  function renderBlockStatic(b) {
    var p = b.props, d = design();
    switch (b.type) {
      case "header":
        var hItems = menuItemsOf(p);
        var side = p.mobileSide === "left" ? "left" : "right";
        var hShowIcons = p.showMenuIcons !== false;
        var hMenu = hItems.map(function (m) {
          var href = esc(menuUrlFor(m));
          var t = m.type || "custom";
          var ic = hShowIcons ? menuIconSvg(m, "static") : "";
          if (t === "dropdown" && Array.isArray(m.children) && m.children.length) {
            var subs = m.children.map(function (c) {
              return "<li role='none'><a role='menuitem' href='" + esc(pageNameToUrl(c.url) || "#") + "'>" + esc(c.label) + "</a></li>";
            }).join("");
            return "<li class='has-children'>" +
              "<a href='" + href + "' aria-haspopup='true' aria-expanded='false'>" + ic + "<span>" + esc(m.label) + "</span></a>" +
              "<ul class='dropdown' role='menu'>" + subs + "</ul></li>";
          }
          var cur = (t === "home") ? " aria-current='page'" : "";
          return "<li><a href='" + href + "'" + cur + ">" + ic + "<span>" + esc(m.label) + "</span></a></li>";
        }).join("");
        var stickyStyle = p.sticky ? " style='position:sticky;top:0;z-index:50'" : "";
        return "<header role='banner' class='site-header'" + stickyStyle + ">" +
          "<input type='checkbox' id='navtoggle' class='nav-toggle-cb' hidden='hidden'/>" +
          "<div class='site-bar'>" +
          "<a href='/' class='site-logo'>" +
            (S.seo && S.seo.logoUrl ? "<img src='" + esc(S.seo.logoUrl) + "' alt=''/>" : "") +
            "<span>" + esc(p.logoText) + "</span></a>" +
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
          "}());/*]]>*/<\/script>" +
          (p.mobileBottomNav !== false ? botNavStatic() : "");
      case "hero":
        if (S && S.templateId === "sidebar-blog") {
          var sbStaticTags = BL === "en"
            ? ["Blog", "Tutorials", "Tips &amp; Tricks"]
            : ["บล็อก", "บทสอน", "เคล็ดลับ"];
          return "<section class='sb-hero'><div class='wrap'>" +
            "<div class='sb-hero-eyebrow'>✦ Classic Blog</div>" +
            "<h1 class='sb-hero-title'>" + esc(p.title) + "</h1>" +
            "<p class='sb-hero-sub'>" + esc(p.subtitle) + "</p>" +
            "<div class='sb-hero-tags'>" +
              sbStaticTags.map(function(t) { return "<span class='sb-hero-tag'>" + t + "</span>"; }).join("") +
            "</div>" +
            "<a href='#main' class='sb-hero-btn'>" + esc(p.btnText) + "</a>" +
          "</div></section>";
        }
        if (S && S.templateId === "review") {
          return "<section class='rv-hero'><div class='wrap'>" +
            "<div class='rv-hero-eyebrow'>🏆 " + tpl("รีวิวสินค้า", "Product Reviews") + "</div>" +
            "<h1 class='rv-hero-title'>" + esc(p.title) + "</h1>" +
            "<p class='rv-hero-sub'>" + esc(p.subtitle) + "</p>" +
            "<div class='rv-hero-rating'>" +
              "<span class='rv-hero-stars'>★★★★★</span>" +
              "<span class='rv-hero-score'>4.8/5</span>" +
              "<span class='rv-hero-count'>" + tpl("จาก 1,200+ รีวิว", "from 1,200+ reviews") + "</span>" +
            "</div>" +
            "<a href='#main' class='rv-hero-btn'>" + esc(p.btnText) + "</a>" +
          "</div></section>";
        }
        if (S && S.templateId === "course") {
          return "<section class='edu-hero'><div class='wrap'>" +
            "<div class='edu-hero-eyebrow'>📚 " + tpl("คอร์สออนไลน์", "Online Course") + "</div>" +
            "<h1 class='edu-hero-title'>" + esc(p.title) + "</h1>" +
            "<p class='edu-hero-sub'>" + esc(p.subtitle) + "</p>" +
            "<div class='edu-hero-chips'>" +
              "<div class='edu-hero-chip'><span class='edu-hero-chip-check'>✓</span>" + tpl("สอนโดยผู้เชี่ยวชาญ", "Expert Instructors") + "</div>" +
              "<div class='edu-hero-chip'><span class='edu-hero-chip-check'>✓</span>" + tpl("รับใบประกาศนียบัตร", "Certificate Included") + "</div>" +
              "<div class='edu-hero-chip'><span class='edu-hero-chip-check'>✓</span>" + tpl("เข้าถึงได้ตลอดชีพ", "Lifetime Access") + "</div>" +
            "</div>" +
            "<a href='#main' class='edu-hero-btn'>" + esc(p.btnText) + "</a>" +
          "</div></section>";
        }
        if (S && S.templateId === "company") {
          return "<section class='corp-hero'><div class='wrap'>" +
            "<div class='corp-hero-eyebrow'><span class='corp-hero-eyebrow-dot'></span>" + tpl("บริษัทของเรา", "Our Company") + "</div>" +
            "<h1 class='corp-hero-title'>" + esc(p.title) + "</h1>" +
            "<p class='corp-hero-sub'>" + esc(p.subtitle) + "</p>" +
            "<div class='corp-hero-actions'>" +
              "<a href='#main' class='corp-hero-btn'>" + esc(p.btnText) + "</a>" +
              "<a href='#about' class='corp-hero-btn-out'>" + tpl("เรียนรู้เพิ่มเติม", "Learn More") + "</a>" +
            "</div>" +
          "</div></section>";
        }
        if (S && S.templateId === "tech") {
          return "<section class='tech-hero'><div class='wrap'>" +
            "<div class='tech-hero-eyebrow'>&gt;_ Tech Blog</div>" +
            "<h1 class='tech-hero-title'>" + esc(p.title) + "</h1>" +
            "<p class='tech-hero-sub'>" + esc(p.subtitle) + "</p>" +
            "<a href='#main' class='tech-hero-btn'>" + esc(p.btnText) + " →</a>" +
          "</div></section>";
        }
        if (S && S.templateId === "travel") {
          return "<section class='tb-hero'>" +
            "<div class='tb-hero-bg'></div>" +
            "<div class='tb-hero-overlay'></div>" +
            "<div class='wrap tb-hero-content'>" +
              "<div class='tb-hero-tag'>✈ Travel Blog</div>" +
              "<h1 class='tb-hero-title'>" + esc(p.title) + "</h1>" +
              "<p class='tb-hero-sub'>" + esc(p.subtitle) + "</p>" +
              "<a href='#main' class='tb-hero-btn'>" + esc(p.btnText) + " →</a>" +
            "</div>" +
          "</section>";
        }
        if (S && S.templateId === "personal") {
          var pbHeroEb = (p.eyebrow != null ? p.eyebrow : "✦ Personal Blog");
          return "<section class='pb-hero'>" +
            "<div class='wrap pb-hero-inner'>" +
              "<div class='pb-hero-text'>" +
                (pbHeroEb ? "<div class='pb-eyebrow'>" + esc(pbHeroEb) + "</div>" : "") +
                "<h1 style='font-size:clamp(30px,5vw,48px);font-weight:800;line-height:1.1;letter-spacing:-.02em;color:var(--text-main);margin:0 0 16px;font-family:var(--font)'>" + esc(p.title) + "</h1>" +
                "<p style='font-size:17px;color:var(--text-muted);line-height:1.65;margin:0 0 28px;max-width:400px'>" + esc(p.subtitle) + "</p>" +
                "<a href='#main' style='display:inline-block;background:var(--primary);color:#fff;font-weight:600;padding:13px 28px;border-radius:var(--radius);text-decoration:none'>" + esc(p.btnText) + "</a>" +
              "</div>" +
              (p.showImage !== false
                ? "<div class='pb-avatar-ring'>" +
                    "<div class='pb-avatar-inner'>" +
                      (p.imageUrl
                        ? "<img src='" + esc(p.imageUrl) + "' alt='" + esc(p.title) + "' style='width:100%;height:100%;border-radius:50%;object-fit:cover;display:block' loading='lazy' decoding='async'/>"
                        : "<svg width='60' height='60' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round' style='color:var(--primary);opacity:.35'>" +
                          "<circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 3.6-7 8-7s8 3 8 7'/></svg>") +
                    "</div>" +
                  "</div>"
                : "") +
            "</div>" +
          "</section>";
        }
        return "<section class='hero' style='padding:80px 20px;text-align:" + p.align + ";background:linear-gradient(120deg,var(--primary),var(--accent));color:#fff'><div class='wrap'><h1 style='font-size:42px'>" + esc(p.title) + "</h1><p style='font-size:18px;margin-top:16px;opacity:.92'>" + esc(p.subtitle) + "</p><p style='margin-top:26px'><a href='#main' style='background:#fff;color:var(--primary);padding:13px 26px;border-radius:var(--radius);font-weight:600;display:inline-block'>" + esc(p.btnText) + "</a></p></div></section>";
      case "postgrid":
        if (S && S.templateId === "sidebar-blog") {
          return "<section class='sb-posts' id='main'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:20px;font-weight:800;margin:0 0 18px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<div class='sb-grid' style='grid-template-columns:repeat(" + (p.columns || 2) + ",1fr)'>" +
              "<b:loop values='data:posts' var='post'>" +
                "<article class='sb-card'>" +
                  (p.showImage ?
                    "<div class='sb-card-img'>" +
                      "<b:if cond='data:post.featuredImage'>" +
                      "<img expr:src='resizeImage(data:post.featuredImage,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0'/>" +
                      "<b:elseif cond='data:post.firstImageUrl'/>" +
                      "<img expr:src='resizeImage(data:post.firstImageUrl,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0'/>" +
                      "</b:if>" +
                    "</div>" : "") +
                  "<div class='sb-card-body'>" +
                    "<b:if cond='data:post.labels'>" +
                    "<b:loop values='data:post.labels' index='sbl' var='label'>" +
                    "<b:if cond='data:sbl == 0'><div class='sb-card-cat'><data:label.name/></div></b:if>" +
                    "</b:loop></b:if>" +
                    "<h3 class='sb-card-title'><a expr:href='data:post.url'><data:post.title/></a></h3>" +
                    (p.showExcerpt ? "<p class='sb-card-excerpt'><b:if cond='data:post.metaDescription != &quot;&quot;'><data:post.metaDescription/><b:else/><b:eval expr='data:post.body snippet { length: 160, links: false, linebreaks: false, ellipsis: true }'/></b:if></p>" : "") +
                    "<div class='sb-card-meta'>" +
                      "<span><data:post.date/></span>" +
                      "<a expr:href='data:post.url' class='sb-card-read'>" + tpl("อ่านต่อ →", "Read more →") + "</a>" +
                    "</div>" +
                  "</div>" +
                "</article>" +
              "</b:loop>" +
            "</div></div></section>";
        }
        if (S && S.templateId === "review") {
          return "<section class='rv-reviews' id='main'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:22px;font-weight:800;margin:0 0 24px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<div class='rv-grid' style='grid-template-columns:repeat(" + (p.columns || 3) + ",1fr)'>" +
              "<b:loop values='data:posts' var='post'>" +
                "<article class='rv-card'>" +
                  "<div class='rv-card-img'>" +
                    "<b:if cond='data:post.featuredImage'>" +
                    "<img expr:src='resizeImage(data:post.featuredImage,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0'/>" +
                    "<b:elseif cond='data:post.firstImageUrl'/>" +
                    "<img expr:src='resizeImage(data:post.firstImageUrl,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0'/>" +
                    "</b:if>" +
                    "<b:if cond='data:post.labels'>" +
                    "<b:loop values='data:post.labels' index='rl' var='label'>" +
                    "<b:if cond='data:rl == 0'><span class='rv-card-best'><data:label.name/></span></b:if>" +
                    "</b:loop></b:if>" +
                  "</div>" +
                  "<div class='rv-card-body'>" +
                    "<b:if cond='data:post.labels'>" +
                    "<b:loop values='data:post.labels' index='rcl' var='label'>" +
                    "<b:if cond='data:rcl == 0'><div class='rv-card-cat'><data:label.name/></div></b:if>" +
                    "</b:loop></b:if>" +
                    "<h3 class='rv-card-title'><a expr:href='data:post.url'><data:post.title/></a></h3>" +
                    "<div class='rv-card-stars'>★★★★★</div>" +
                    (p.showExcerpt ? "<p class='rv-card-excerpt'><b:if cond='data:post.metaDescription != &quot;&quot;'><data:post.metaDescription/><b:else/><b:eval expr='data:post.body snippet { length: 160, links: false, linebreaks: false, ellipsis: true }'/></b:if></p>" : "") +
                  "</div>" +
                  "<div class='rv-card-foot'>" +
                    "<span class='rv-card-disc'>" + tpl("* ลิงก์พันธมิตร", "* Affiliate link") + "</span>" +
                    "<a expr:href='data:post.url' class='rv-card-deal'>" + tpl("ดูดีลเลย →", "See Deal →") + "</a>" +
                  "</div>" +
                "</article>" +
              "</b:loop>" +
            "</div></div></section>";
        }
        if (S && S.templateId === "tech") {
          return "<section style='padding:52px 0'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:24px;font-weight:800;margin:0 0 28px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<div class='tech-grid' style='grid-template-columns:repeat(" + (p.columns || 3) + ",1fr)'>" +
              "<b:loop values='data:posts' var='post'>" +
                "<article class='tech-card'>" +
                  "<div class='tech-card-img'>" +
                    "<b:if cond='data:post.featuredImage'>" +
                    "<img expr:src='resizeImage(data:post.featuredImage,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "<b:elseif cond='data:post.firstImageUrl'/>" +
                    "<img expr:src='resizeImage(data:post.firstImageUrl,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "</b:if>" +
                    "<b:if cond='data:post.labels'>" +
                    "<b:loop values='data:post.labels' index='tcl' var='label'>" +
                    "<b:if cond='data:tcl == 0'><span class='tech-card-tag'><data:label.name/></span></b:if>" +
                    "</b:loop></b:if>" +
                  "</div>" +
                  "<div class='tech-card-body'>" +
                    "<div class='tech-card-date'><data:post.date/></div>" +
                    "<h3 class='tech-card-title'><a expr:href='data:post.url'><data:post.title/></a></h3>" +
                    (p.showExcerpt ? "<p class='tech-card-excerpt'><b:if cond='data:post.metaDescription != &quot;&quot;'><data:post.metaDescription/><b:else/><b:eval expr='data:post.body snippet { length: 160, links: false, linebreaks: false, ellipsis: true }'/></b:if></p>" : "") +
                    "<a expr:href='data:post.url' class='tech-card-read'>" + tpl("อ่านต่อ →", "Read more →") + "</a>" +
                  "</div>" +
                "</article>" +
              "</b:loop>" +
            "</div></div></section>";
        }
        if (S && S.templateId === "magazine") {
          return "<section style='padding:52px 0'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;border-left:4px solid var(--primary);padding-left:12px;margin:0 0 20px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<div class='mag-grid' style='grid-template-columns:repeat(" + (p.columns || 3) + ",1fr)'>" +
              "<b:loop values='data:posts' var='post'>" +
                "<article class='mag-card'>" +
                  "<div class='mag-card-img'>" +
                    "<b:if cond='data:post.featuredImage'>" +
                    "<img expr:src='resizeImage(data:post.featuredImage,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "<b:elseif cond='data:post.firstImageUrl'/>" +
                    "<img expr:src='resizeImage(data:post.firstImageUrl,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "</b:if>" +
                  "</div>" +
                  "<div class='mag-card-body'>" +
                    magCatFirst("<span class='mag-card-cat'>", "</span>") +
                    "<h3 class='mag-card-title'><a expr:href='data:post.url'><data:post.title/></a></h3>" +
                    (p.showExcerpt ? "<p class='mag-card-excerpt'><b:if cond='data:post.metaDescription != &quot;&quot;'><data:post.metaDescription/><b:else/><b:eval expr='data:post.body snippet { length: 160, links: false, linebreaks: false, ellipsis: true }'/></b:if></p>" : "") +
                    "<div class='mag-card-meta'><data:post.date/></div>" +
                  "</div>" +
                "</article>" +
              "</b:loop>" +
            "</div></div></section>";
        }
        if (S && S.templateId === "travel") {
          return "<section style='padding:52px 0'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:24px;font-weight:800;margin:0 0 26px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<div class='tb-grid' style='grid-template-columns:repeat(" + (p.columns || 3) + ",1fr)'>" +
              "<b:loop values='data:posts' var='post'>" +
                "<article class='tb-card'>" +
                  "<div class='tb-card-img'>" +
                    "<b:if cond='data:post.featuredImage'>" +
                    "<img expr:src='resizeImage(data:post.featuredImage,600,&quot;4:3&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='450' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "<b:elseif cond='data:post.firstImageUrl'/>" +
                    "<img expr:src='resizeImage(data:post.firstImageUrl,600,&quot;4:3&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='450' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "</b:if>" +
                    "<b:if cond='data:post.labels'>" +
                    "<b:loop values='data:post.labels' index='li' var='label'>" +
                    "<b:if cond='data:li == 0'><div class='tb-card-loc'>📍 <data:label.name/></div></b:if>" +
                    "</b:loop></b:if>" +
                  "</div>" +
                  "<div class='tb-card-body'>" +
                    "<div class='tb-card-date'><data:post.date/></div>" +
                    "<h3 class='tb-card-title'><a expr:href='data:post.url'><data:post.title/></a></h3>" +
                    "<a expr:href='data:post.url' class='tb-card-btn'>Explore →</a>" +
                  "</div>" +
                "</article>" +
              "</b:loop>" +
            "</div></div></section>";
        }
        if (S && S.templateId === "personal") {
          var pbReadLbl = (p.readMore != null ? p.readMore : tpl("อ่านต่อ →", "Read more →"));
          var pbRad = (p.cardRadius != null ? p.cardRadius : 14);
          var pbCardCls = "pb-card pb-card--" + (p.cardStyle || "shadow");
          // Auto-fit tracks with a minimum card width (derived from the chosen
          // column count) so cards never get squished · e.g. inside the narrow
          // main column when a sidebar is present, or with only a few posts.
          var pbMinW = Math.max(220, Math.round(1040 / (p.columns || 3)));
          return "<section style='padding:52px 0'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:24px;font-weight:800;margin:0 0 28px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<div class='pb-grid' style='grid-template-columns:repeat(auto-fill,minmax(min(100%," + pbMinW + "px),1fr))'>" +
              "<b:loop values='data:posts' var='post'>" +
                "<article class='" + pbCardCls + "' style='border-radius:" + pbRad + "px'>" +
                  (p.showImage ?
                    "<a expr:href='data:post.url' class='pb-card-img' style='display:block'>" +
                    "<b:if cond='data:post.featuredImage'>" +
                    "<img expr:src='resizeImage(data:post.featuredImage,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "<b:elseif cond='data:post.firstImageUrl'/>" +
                    "<img expr:src='resizeImage(data:post.firstImageUrl,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "<b:else/>" +
                    "<div style='height:180px;background:linear-gradient(120deg,var(--primary)12,var(--accent)25)'></div>" +
                    "</b:if></a>" : "") +
                  "<div class='pb-card-body'>" +
                    "<div class='pb-card-date'><data:post.date/></div>" +
                    "<h3 class='pb-card-title'><a expr:href='data:post.url'><data:post.title/></a></h3>" +
                    (p.showExcerpt ? "<p class='pb-card-excerpt'><b:if cond='data:post.metaDescription != &quot;&quot;'><data:post.metaDescription/><b:else/><b:eval expr='data:post.body snippet { length: 160, links: false, linebreaks: false, ellipsis: true }'/></b:if></p>" : "") +
                    (pbReadLbl ? "<a expr:href='data:post.url' class='pb-card-read'>" + esc(pbReadLbl) + "</a>" : "") +
                  "</div>" +
                "</article>" +
              "</b:loop>" +
            "</div></div></section>";
        }
        return "<section style='padding:48px 0'><div class='wrap'><h2 style='font-size:26px;margin-bottom:24px'>" + esc(p.heading) + "</h2><div class='grid' style='display:grid;grid-template-columns:repeat(" + p.columns + ",1fr);gap:20px'>" +
          "<b:loop values='data:posts' var='post'><article style='border:1px solid #eef;border-radius:var(--radius);overflow:hidden'>" +
          (p.showImage ? "<a expr:href='data:post.url'><b:if cond='data:post.featuredImage'><img expr:src='resizeImage(data:post.featuredImage,800,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='400' height='225' style='width:100%;height:auto;display:block'/><b:elseif cond='data:post.firstImageUrl'/><img expr:src='resizeImage(data:post.firstImageUrl,800,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='400' height='225' style='width:100%;height:auto;display:block'/></b:if></a>" : "") +
          "<div style='padding:16px'><h3 style='font-size:17px'><a expr:href='data:post.url'><data:post.title/></a></h3>" +
          (p.showExcerpt ? "<p class='post-snippet' style='color:#828aa0;font-size:14px;margin-top:8px;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical'><b:if cond='data:post.metaDescription != &quot;&quot;'><data:post.metaDescription/><b:else/><b:eval expr='data:post.body snippet { length: 190, links: false, linebreaks: false, ellipsis: true }'/></b:if></p>" : "") +
          "</div></article></b:loop>" +
          "</div></div></section>";
      case "postlist":
        if (S && S.templateId === "magazine") {
          return "<section class='mag-news'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;border-left:4px solid var(--primary);padding-left:12px;margin:0 0 4px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<b:loop values='data:posts' var='post'>" +
              "<div class='mag-news-row'>" +
                magCatFirst("<span class='mag-news-cat'>", "</span>", "<span class='mag-news-cat' style='visibility:hidden'>·</span>") +
                "<a expr:href='data:post.url' class='mag-news-title'><data:post.title/></a>" +
                "<span class='mag-news-date'><data:post.date/></span>" +
              "</div>" +
            "</b:loop>" +
          "</div></section>";
        }
        if (S && S.templateId === "tech") {
          return "<section class='tech-list'><div class='wrap' style='max-width:800px'>" +
            (p.heading ? "<h2 style='font-size:24px;font-weight:800;margin:0 0 8px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<b:loop values='data:posts' index='tli' var='post'>" +
              "<div class='tech-list-row'>" +
                "<div class='tech-list-num'><b:eval expr='data:tli + 1'/></div>" +
                "<div class='tech-list-body'>" +
                  "<div class='tech-list-tags'>" +
                    "<b:if cond='data:post.labels'>" +
                    "<b:loop values='data:post.labels' index='tll' var='label'>" +
                    "<b:if cond='data:tll == 0'><span class='tech-tag'><data:label.name/></span></b:if>" +
                    "</b:loop></b:if>" +
                  "</div>" +
                  "<a expr:href='data:post.url' class='tech-list-title'><data:post.title/></a>" +
                  "<div class='tech-list-meta'><data:post.date/></div>" +
                "</div>" +
              "</div>" +
            "</b:loop>" +
          "</div></section>";
        }
        return "<section style='padding:48px 0'><div class='wrap'><h2 style='font-size:26px;margin-bottom:20px'>" + esc(p.heading) + "</h2><b:loop values='data:posts' var='post'><article style='display:flex;gap:16px;border-bottom:1px solid #eef;padding:16px 0'>" +
          (p.showImage ? "<a expr:href='data:post.url' style='flex:none'><b:if cond='data:post.featuredImage'><img expr:src='resizeImage(data:post.featuredImage,200,&quot;1:1&quot;)' expr:alt='data:post.title' loading='lazy' width='100' height='100' style='border-radius:var(--radius);object-fit:cover;display:block'/><b:elseif cond='data:post.firstImageUrl'/><img expr:src='resizeImage(data:post.firstImageUrl,200,&quot;1:1&quot;)' expr:alt='data:post.title' loading='lazy' width='100' height='100' style='border-radius:var(--radius);object-fit:cover;display:block'/></b:if></a>" : "") +
          "<div style='min-width:0'><h3 style='font-size:17px;margin:0 0 6px'><a expr:href='data:post.url'><data:post.title/></a></h3><p class='post-snippet' style='color:#828aa0;font-size:13px;margin:4px 0 0;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical'><b:if cond='data:post.metaDescription != &quot;&quot;'><data:post.metaDescription/><b:else/><b:eval expr='data:post.body snippet { length: 170, links: false, linebreaks: false, ellipsis: true }'/></b:if></p></div></article></b:loop></div></section>";
      case "featured":
        if (S && S.templateId === "course") {
          return "<section class='edu-courses' id='main'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:24px;font-weight:800;margin:0 0 26px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<div class='edu-grid' style='grid-template-columns:repeat(" + (p.columns || 3) + ",1fr)'>" +
              "<b:loop values='data:posts' index='ei' var='post'>" +
                "<b:if cond='data:ei &lt; " + (p.count || 3) + "'>" +
                  "<article class='edu-card'>" +
                    "<div class='edu-card-thumb'>" +
                      "<b:if cond='data:post.featuredImage'>" +
                      "<img expr:src='resizeImage(data:post.featuredImage,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0'/>" +
                      "<b:elseif cond='data:post.firstImageUrl'/>" +
                      "<img expr:src='resizeImage(data:post.firstImageUrl,600,&quot;16:9&quot;)' expr:alt='data:post.title' loading='lazy' width='600' height='338' style='width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0'/>" +
                      "</b:if>" +
                      "<b:if cond='data:post.labels'>" +
                      "<b:loop values='data:post.labels' index='el' var='label'>" +
                      "<b:if cond='data:el == 0'><span class='edu-card-badge'><data:label.name/></span></b:if>" +
                      "</b:loop></b:if>" +
                    "</div>" +
                    "<div class='edu-card-body'>" +
                      "<h3 class='edu-card-title'><a expr:href='data:post.url' style='color:inherit;text-decoration:none'><data:post.title/></a></h3>" +
                      "<div class='edu-card-rating'><span class='edu-card-stars'>★★★★★</span><span class='edu-card-score'>5.0</span></div>" +
                      "<div class='edu-card-meta'><data:post.date/></div>" +
                    "</div>" +
                    "<div class='edu-card-foot'>" +
                      "<span class='edu-card-price'>" + tpl("ฟรี", "Free") + "</span>" +
                      "<a expr:href='data:post.url' class='edu-card-enroll'>" + tpl("ลงทะเบียน", "Enroll") + "</a>" +
                    "</div>" +
                  "</article>" +
                "</b:if>" +
              "</b:loop>" +
            "</div>" +
          "</div></section>";
        }
        if (S && S.templateId === "magazine") {
          // Hybrid featured selection: posts carrying the pin label (user-set,
          // default "แนะนำ") take the spotlight; when none are labeled we fall
          // back to the newest posts so the block never renders empty.
          var mfLabel = (p.featLabel != null ? String(p.featLabel) : tpl("แนะนำ", "Featured")).trim();
          var magFeatGrid = function (src) {
            return "<div class='mag-feat-grid'>" +
              "<b:loop values='" + src + "' index='mfi' var='post'>" +
                "<b:if cond='data:mfi == 0'>" +
                  "<a expr:href='data:post.url' class='mag-feat-main' style='min-height:360px;display:block;position:relative;border-radius:var(--radius);overflow:hidden;background:linear-gradient(135deg,var(--primary),var(--accent));text-decoration:none'>" +
                    "<b:if cond='data:post.featuredImage'>" +
                    "<img expr:src='resizeImage(data:post.featuredImage,900,&quot;16:9&quot;)' expr:alt='data:post.title' loading='eager' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "<b:elseif cond='data:post.firstImageUrl'/>" +
                    "<img expr:src='resizeImage(data:post.firstImageUrl,900,&quot;16:9&quot;)' expr:alt='data:post.title' loading='eager' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "</b:if>" +
                    "<div class='mag-feat-overlay'></div>" +
                    "<div class='mag-feat-info'>" +
                      magCatFirst("<span class='mag-feat-cat'>", "</span>") +
                      "<div class='mag-feat-title'><data:post.title/></div>" +
                      "<div class='mag-feat-meta'><data:post.date/></div>" +
                    "</div>" +
                  "</a>" +
                "</b:if>" +
              "</b:loop>" +
              "<div class='mag-side'>" +
                "<b:loop values='" + src + "' index='msi' var='post'>" +
                  "<b:if cond='data:msi &gt; 0 and data:msi &lt; 3'>" +
                    "<a expr:href='data:post.url' class='mag-side-item'>" +
                      "<b:if cond='data:post.featuredImage'>" +
                      "<img expr:src='resizeImage(data:post.featuredImage,500,&quot;4:3&quot;)' expr:alt='data:post.title' loading='lazy' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                      "<b:elseif cond='data:post.firstImageUrl'/>" +
                      "<img expr:src='resizeImage(data:post.firstImageUrl,500,&quot;4:3&quot;)' expr:alt='data:post.title' loading='lazy' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                      "</b:if>" +
                      "<div class='mag-side-overlay'></div>" +
                      "<div class='mag-side-info'>" +
                        magCatFirst("<div class='mag-side-cat'>", "</div>") +
                        "<div class='mag-side-title'><data:post.title/></div>" +
                      "</div>" +
                    "</a>" +
                  "</b:if>" +
                "</b:loop>" +
              "</div>" +
            "</div>";
          };
          var magFeatBody = mfLabel
            ? "<b:with value='data:posts filter (bkp =&gt; bkp.labels any (bkl =&gt; bkl.name == &quot;" + esc(mfLabel) + "&quot;))' var='bkfeat'>" +
              "<b:if cond='data:bkfeat.first'>" + magFeatGrid("data:bkfeat") +
              "<b:else/>" + magFeatGrid("data:posts") + "</b:if>" +
              "</b:with>"
            : magFeatGrid("data:posts");
          return "<section class='mag-feat'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;border-left:4px solid var(--primary);padding-left:12px;margin:0 0 18px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            magFeatBody +
          "</div></section>";
        }
        if (S && S.templateId === "travel") {
          return "<section class='tb-feat'><div class='wrap'>" +
            (p.heading ? "<h2 style='font-size:24px;font-weight:800;margin:0 0 24px;color:var(--text-main);font-family:var(--font)'>" + esc(p.heading) + "</h2>" : "") +
            "<div class='tb-feat-grid'>" +
              "<b:loop values='data:posts' index='fi' var='post'>" +
                "<b:if cond='data:fi &lt; 3'>" +
                  "<a expr:href='data:post.url' class='tb-feat-item'>" +
                    "<b:if cond='data:post.featuredImage'>" +
                    "<img expr:src='resizeImage(data:post.featuredImage,800,&quot;4:3&quot;)' expr:alt='data:post.title' loading='eager' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "<b:elseif cond='data:post.firstImageUrl'/>" +
                    "<img expr:src='resizeImage(data:post.firstImageUrl,800,&quot;4:3&quot;)' expr:alt='data:post.title' loading='eager' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block'/>" +
                    "</b:if>" +
                    "<div class='tb-feat-overlay'></div>" +
                    "<div class='tb-feat-info'>" +
                      "<div class='tb-feat-loc'>📍 <data:post.date/></div>" +
                      "<div class='tb-feat-title'><data:post.title/></div>" +
                    "</div>" +
                  "</a>" +
                "</b:if>" +
              "</b:loop>" +
            "</div></div></section>";
        }
        return "<section style='padding:48px 0'><div class='wrap'><h2 style='font-size:26px;margin-bottom:20px'>" + esc(p.heading) + "</h2><b:loop values='data:posts' index='i' var='post'><b:if cond='data:i == 0'><article style='border-radius:var(--radius);overflow:hidden;background:linear-gradient(120deg,var(--primary),var(--accent));padding:32px;color:#fff'><h3 style='font-size:26px'><a expr:href='data:post.url' style='color:#fff'><data:post.title/></a></h3></article></b:if></b:loop></div></section>";
      case "about":
        if (S && S.templateId === "review") {
          return "<section class='rv-about'><div class='rv-about-inner'>" +
            "<div class='rv-about-avatar'>" +
              (p.avatarUrl
                ? "<img src='" + esc(p.avatarUrl) + "' alt='" + esc(p.name) + "' style='width:100%;height:100%;object-fit:cover;border-radius:50%' loading='lazy' decoding='async'>"
                : "<svg width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round' style='color:#fff;opacity:.75'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 3.6-7 8-7s8 3 8 7'/></svg>") +
            "</div>" +
            "<div class='rv-about-body'>" +
              "<div class='rv-about-role'>" + tpl("นักรีวิวสินค้า", "Product Reviewer") + "</div>" +
              "<h2 class='rv-about-name'>" + esc(p.name) + "</h2>" +
              "<p class='rv-about-bio'>" + richHTML(p.bio) + "</p>" +
              "<div class='rv-about-trust'>" +
                "<div><div class='rv-about-trust-num'>500+</div><div class='rv-about-trust-label'>" + tpl("รีวิวสินค้า", "Reviews") + "</div></div>" +
                "<div><div class='rv-about-trust-num'>8</div><div class='rv-about-trust-label'>" + tpl("ปีประสบการณ์", "Years Exp.") + "</div></div>" +
                "<div><div class='rv-about-trust-num'>100%</div><div class='rv-about-trust-label'>" + tpl("อิสระ", "Independent") + "</div></div>" +
              "</div>" +
              "<span class='rv-about-badge'>✓ " + tpl("ผู้รีวิวอิสระที่ได้รับการรับรอง", "Independent Verified Reviewer") + "</span>" +
            "</div>" +
          "</div></section>";
        }
        if (S && S.templateId === "company") {
          return "<section class='corp-about' id='about'><div class='wrap'>" +
            "<div class='corp-about-grid'>" +
              "<div>" +
                "<div class='corp-about-eyebrow'>" + tpl("เกี่ยวกับเรา", "About Us") + "</div>" +
                "<h2 class='corp-about-title'>" + esc(p.name) + "</h2>" +
                "<p class='corp-about-body'>" + richHTML(p.bio) + "</p>" +
                "<div class='corp-stats'>" +
                  "<div><div class='corp-stat-num'>10+</div><div class='corp-stat-label'>" + tpl("ปีประสบการณ์", "Years") + "</div></div>" +
                  "<div><div class='corp-stat-num'>500+</div><div class='corp-stat-label'>" + tpl("ลูกค้า", "Clients") + "</div></div>" +
                  "<div><div class='corp-stat-num'>99%</div><div class='corp-stat-label'>" + tpl("ความพึงพอใจ", "Satisfaction") + "</div></div>" +
                "</div>" +
              "</div>" +
              "<div class='corp-visual'>" +
                "<div class='corp-visual-block'></div>" +
                "<div class='corp-visual-block'></div>" +
                "<div class='corp-visual-block'></div>" +
                "<div class='corp-visual-block'></div>" +
              "</div>" +
            "</div>" +
          "</div></section>";
        }
        if (S && S.templateId === "personal") {
          var pbAboutEb = (p.eyebrow != null ? p.eyebrow : tpl("เกี่ยวกับผู้เขียน", "About the Author"));
          return "<section class='pb-about'><div class='wrap pb-about-inner'>" +
            (p.showAvatar ?
              "<div class='pb-about-avatar'><div class='pb-about-avatar-inner'>" +
              (p.avatarUrl
                ? "<img src='" + esc(p.avatarUrl) + "' alt='" + esc(p.name) + "' style='width:100%;height:100%;object-fit:cover;border-radius:50%' loading='lazy' decoding='async'>"
                : "<svg width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round' style='color:var(--primary);opacity:.35'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 3.6-7 8-7s8 3 8 7'/></svg>") +
              "</div></div>" : "") +
            "<div style='flex:1;min-width:200px'>" +
              (pbAboutEb ? "<div class='pb-about-eyebrow'>" + esc(pbAboutEb) + "</div>" : "") +
              "<h2 class='pb-about-name'>" + esc(p.name) + "</h2>" +
              "<p class='pb-about-bio'>" + richHTML(p.bio) + "</p>" +
            "</div>" +
          "</div></section>";
        }
        return "<section style='padding:56px 20px;background:#f7f8fc'><div class='wrap' style='display:flex;gap:24px;align-items:center;max-width:820px'>" + (p.showAvatar ? (p.avatarUrl ? "<img src='" + esc(p.avatarUrl) + "' alt='" + esc(p.name) + "' style='width:84px;height:84px;border-radius:50%;object-fit:cover;flex:none' loading='lazy' decoding='async'>" : "<div style='width:84px;height:84px;border-radius:50%;background:linear-gradient(120deg,var(--primary),var(--accent));flex:none'></div>") : "") + "<div><h2 style='font-size:24px'>" + esc(p.name) + "</h2><p style='color:#4a5063;margin-top:8px'>" + richHTML(p.bio) + "</p></div></div></section>";
      case "text":
        return "<section style='padding:40px 20px'><div class='wrap' style='max-width:760px;text-align:" + p.align + "'><h2 style='font-size:28px;margin-bottom:12px'>" + esc(p.heading) + "</h2><p style='color:#4a5063;font-size:16px'>" + richHTML(p.body) + "</p></div></section>";
      case "columns":
        var ccn = p.cols || 3, cits = (p.items || []).slice(0, ccn);
        var ccells = cits.map(function (it) { return "<div style='text-align:center;padding:8px'><div style='width:54px;height:54px;border-radius:14px;background:linear-gradient(120deg,var(--primary),var(--accent));color:#fff;display:grid;place-items:center;font-size:24px;margin:0 auto 14px'>" + esc(it.icon || "\u2605") + "</div><h3 style='font-size:18px;margin:0 0 7px'>" + esc(it.title) + "</h3><p style='color:#828aa0;font-size:14px'>" + esc(it.text) + "</p></div>"; }).join("");
        return "<section style='padding:48px 0'><div class='wrap'>" + (p.heading ? "<h2 style='font-size:26px;margin-bottom:24px;text-align:center'>" + esc(p.heading) + "</h2>" : "") + "<div class='grid' style='display:grid;grid-template-columns:repeat(" + ccn + ",1fr);gap:24px'>" + ccells + "</div></div></section>";
      case "cta":
        if (S && S.templateId === "course") {
          return "<section class='edu-cta'>" +
            "<div class='wrap'>" +
              "<h2 class='edu-cta-title'>" + esc(p.title) + "</h2>" +
              "<p class='edu-cta-sub'>" + tpl("เริ่มต้นเรียนรู้วันนี้ ไม่มีค่าใช้จ่ายซ่อนเร้น", "Start learning today. No hidden fees.") + "</p>" +
              "<div class='edu-trust'>" +
                "<div><div class='edu-trust-num'>20,000+</div><div class='edu-trust-label'>" + tpl("นักเรียน", "Students") + "</div></div>" +
                "<div><div class='edu-trust-num'>50+</div><div class='edu-trust-label'>" + tpl("คอร์ส", "Courses") + "</div></div>" +
                "<div><div class='edu-trust-num'>100+</div><div class='edu-trust-label'>" + tpl("ผู้สอน", "Instructors") + "</div></div>" +
              "</div>" +
              "<a href='" + esc(absUrl(p.btnUrl || "/")) + "' class='edu-cta-btn'>" + esc(p.btnText) + "</a>" +
            "</div>" +
          "</section>";
        }
        if (S && S.templateId === "company") {
          return "<section class='corp-cta'>" +
            "<div class='wrap' style='text-align:center'>" +
              "<h2 class='corp-cta-title'>" + esc(p.title) + "</h2>" +
              "<p class='corp-cta-sub'>" + tpl("พร้อมที่จะเริ่มต้นกับเราแล้วหรือยัง?", "Ready to get started with us?") + "</p>" +
              "<a href='" + esc(absUrl(p.btnUrl || "/")) + "' class='corp-cta-btn'>" + esc(p.btnText) + "</a>" +
            "</div>" +
          "</section>";
        }
        return "<section style='padding:20px'><div class='wrap'><div style='padding:48px 20px;text-align:center;border-radius:var(--radius);background:linear-gradient(120deg,var(--primary),var(--accent));color:#fff'><h2 style='font-size:30px'>" + esc(p.title) + "</h2><p style='margin-top:18px'><a href='" + esc(absUrl(p.btnUrl || "/")) + "' style='background:#fff;color:var(--primary);padding:13px 28px;border-radius:var(--radius);font-weight:600;display:inline-block'>" + esc(p.btnText) + "</a></p></div></div></section>";
      case "image":
        return "<figure style='padding:24px 20px;margin:0'><div class='wrap'>" +
          (p.src
            ? "<img src='" + esc(p.src) + "' alt='" + esc(p.alt) + "' style='width:100%;border-radius:var(--radius)' loading='lazy' decoding='async'>"
            : "<div style='aspect-ratio:" + p.ratio + ";background:#e8eaf2;border-radius:var(--radius)'></div>") +
          (p.caption ? "<figcaption style='text-align:center;color:#9aa;font-size:13px;margin-top:8px'>" + esc(p.caption) + "</figcaption>" : "") +
          "</div></figure>";
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
        var copyDone = tpl("คัดลอกแล้ว ✓","Copied ✓");
        var copyLabel = tpl("คัดลอกลิงก์","Copy link");
        var shareHtml =
          "<b:if cond='data:view.isPost'>" +
          "<section class='bxb-share' style='padding:28px 20px;text-align:center'><div class='wrap'>" +
          (p.label ? "<div style='font-size:13px;color:var(--text-subtle);margin-bottom:14px'>" + esc(p.label) + "</div>" : "") +
          "<div style='display:flex;gap:10px;justify-content:center;flex-wrap:wrap'>" +
          (p.facebook ? "<a href='#' data-share='facebook' rel='noopener noreferrer' class='bxb-share-btn' style='background:#1877f2'>Facebook</a>" : "") +
          (p.twitter ? "<a href='#' data-share='twitter' rel='noopener noreferrer' class='bxb-share-btn' style='background:#000'>X (Twitter)</a>" : "") +
          (p.line ? "<a href='#' data-share='line' rel='noopener noreferrer' class='bxb-share-btn' style='background:#06c755'>LINE</a>" : "") +
          (p.copy ? "<button type='button' class='bxb-share-btn bxb-copy-btn' data-done='" + copyDone + "' style='background:var(--primary);border:0;cursor:pointer'>" + copyLabel + "</button>" : "") +
          "</div></div></section>" +
          "<script>/*<![CDATA[*/(function(){" +
          "function getCleanUrl(){" +
          "var link=document.querySelector('link[rel=\"canonical\"]');" +
          "var url=link?link.href:window.location.href;" +
          "url=url.replace(/([?&])m=[01](&|$)/g,function(_,p1,p2){return p2==='&'?p1:'';});" +
          "url=url.replace(/[?&]$/,'');" +
          "url=url.split('#')[0];" +
          "return url;" +
          "}" +
          "function bxbShareInit(){" +
          "var btns=document.querySelectorAll('[data-share]');" +
          "for(var i=0;i<btns.length;i++){(function(a){" +
          "a.addEventListener('click',function(e){" +
          "e.preventDefault();" +
          "var u=encodeURIComponent(getCleanUrl());" +
          "var t=encodeURIComponent(document.title);" +
          "var src=a.getAttribute('data-share');" +
          "var url='';" +
          "if(src==='facebook')url='https://www.facebook.com/sharer/sharer.php?u='+u;" +
          "else if(src==='twitter')url='https://twitter.com/intent/tweet?text='+t+'%20'+u;" +
          "else if(src==='line')url='https://social-plugins.line.me/lineit/share?url='+u;" +
          "if(url){var win=window.open(url,'_blank','noopener,noreferrer');if(!win)window.location.href=url;}" +
          "});})(btns[i]);}" +
          (p.copy ?
            "var cbs=document.querySelectorAll('.bxb-copy-btn');" +
            "for(var j=0;j<cbs.length;j++){(function(b){" +
            "var orig=b.textContent;" +
            "b.addEventListener('click',function(){" +
            "var url=getCleanUrl();" +
            "var done=function(){b.textContent=b.dataset.done;setTimeout(function(){b.textContent=orig;},2000);};" +
            "if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(done,function(){window.prompt('',url);});}" +
            "else{var tx=document.createElement('textarea');tx.value=url;document.body.appendChild(tx);tx.select();try{document.execCommand('copy');done();}catch(ex){window.prompt('',url);}document.body.removeChild(tx);}" +
            "});})(cbs[j]);}" : "") +
          "}" +
          "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',bxbShareInit);}else{bxbShareInit();}" +
          "})();/*]]>*/<\/script>" +
          "</b:if>";
        return shareHtml;
      case "sidebar":
        var sWidgets = "";
        if (p.showSearch) sWidgets += "<b:widget id='BlogSearch1' locked='false' mobile='yes' title='" + tpl("ค้นหา","Search") + "' type='BlogSearch' version='2' visible='true'/>\n";
        if (p.showCategories) sWidgets += "<b:widget id='Label1' locked='false' mobile='yes' title='" + tpl("ป้ายกำกับ","Labels") + "' type='Label' version='2' visible='true'>\n<b:widget-settings><b:widget-setting name='sorting'>ALPHA</b:widget-setting><b:widget-setting name='display'>LIST</b:widget-setting><b:widget-setting name='showFreqNumbers'>true</b:widget-setting></b:widget-settings>\n</b:widget>\n";
        if (p.showArchive) sWidgets += "<b:widget id='BlogArchive1' locked='false' mobile='yes' title='" + tpl("คลังบทความ","Archive") + "' type='BlogArchive' version='2' visible='true'/>\n";
        if (p.showAbout) sWidgets += "<b:widget id='Profile1' locked='false' mobile='yes' title='" + tpl("เกี่ยวกับฉัน","About me") + "' type='Profile' version='2' visible='true'/>\n";
        return "<b:section id='sidebar' class='bxb-sidebar-col' showaddelement='yes' name='Sidebar' growth='vertical'>\n" + sWidgets + "</b:section>";
      case "search":
        return "<section style='padding:16px 20px'><div class='wrap'>" + (p.heading ? "<h3 style='font-size:16px;margin-bottom:10px'>" + esc(p.heading) + "</h3>" : "") + "<form action='/search' method='get' role='search'><div style='display:flex;max-width:420px'><input name='q' type='search' placeholder='" + esc(p.placeholder || tpl("ค้นหาในบล็อก…","Search blog…")) + "' style='flex:1;padding:12px 16px;border:1px solid #dde;border-radius:var(--radius) 0 0 var(--radius);font-size:14px'/><button type='submit' style='padding:12px 16px;background:var(--primary);color:#fff;border:0;border-radius:0 var(--radius) var(--radius) 0;cursor:pointer'>🔍</button></div></form></div></section>";
      case "footer":
        var sfLinks = footerLinksOf(p);
        var sfSocials = socialLinksOf(p);
        var sfShowIcons = p.showFooterIcons !== false;
        var sfLinksHtml = sfLinks.map(function (m) {
          var fic = sfShowIcons ? menuIconSvg(m, "static") : "";
          return "<a href='" + esc(absUrl(m.url)) + "' class='footer-link'>" + fic + "<span>" + esc(m.label) + "</span></a>";
        }).join("\n");
        var sfSocialHtml = sfSocials.map(function (s) {
          var ic = SOCIAL_ICONS[s.platform];
          if (!ic || !s.url) return "";
          return "<a href='" + esc(absUrl(s.url)) + "' target='_blank' rel='noopener noreferrer' class='footer-social-icon' aria-label='" + ic.label + "' style='--ic-color:" + ic.color + "'>" +
            "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" + ic.svg + "</svg></a>";
        }).join("\n");
        return "<footer role='contentinfo' class='site-footer'><div class='wrap'>" +
          "<div class='footer-grid'>" +
            "<div class='footer-brand'>" +
              "<div class='footer-logo'>" +
                (S.seo && S.seo.logoUrl ? "<img src='" + esc(S.seo.logoUrl) + "' alt='' loading='lazy'/>" : "") +
                "<span>" + esc(S.seo.blogTitle || "MyBlog") + "</span></div>" +
              "<p class='footer-about'>" + esc(p.about) + "</p>" +
              (sfSocials.length ? "<div class='footer-social'>" + sfSocialHtml + "</div>" : "") +
            "</div>" +
            (sfLinks.length ? "<nav class='footer-links' aria-label='Footer'>" + sfLinksHtml + "</nav>" : "") +
          "</div>" +
          "<div class='footer-bottom'>" + esc(p.copyright) + "</div>" +
          "</div></footer>";
      case "darkmode":
        return "<style>"
          + DARK_THEME_VARS
          + ".bxb-dm-btn{width:38px;height:38px;border-radius:8px;background:transparent;border:1px solid var(--border-med);cursor:pointer;display:grid;place-items:center;font-size:18px;flex:none;padding:0;color:var(--text-main);transition:background .15s}"
          + ".bxb-dm-btn:hover{background:var(--hover-bg)}"
          + ".bxb-dm-btn--float{position:fixed !important;bottom:24px !important;right:24px !important;z-index:9999;border-radius:50% !important;width:44px !important;height:44px !important;background:var(--bg-surface) !important;border:1px solid var(--border-med) !important;box-shadow:0 2px 12px rgba(0,0,0,.2)}"
          + "</style>"
          + "<script>/*<![CDATA[*/(function(){"
          + "if(document.getElementById('bxbDmBtn'))return;"
          + "var b=document.createElement('button');"
          + "b.id='bxbDmBtn';"
          + "b.className='bxb-dm-btn';"
          + "b.setAttribute('aria-label','" + tpl("สลับธีมสว่าง/มืด","Toggle light/dark theme") + "');"
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
          + "function place(){"
          + "var bar=document.querySelector('.site-bar');"
          + "var burger=bar&&bar.querySelector('.nav-burger');"
          + "if(burger){bar.insertBefore(b,burger);}"
          + "else{b.classList.add('bxb-dm-btn--float');document.body.appendChild(b);}"
          + "}"
          + "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',place);}else{place();}"
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
        return genTocHtml(p, false);
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
          + "<div id='bxbProg' role='progressbar' aria-valuemin='0' aria-valuemax='100' aria-valuenow='0' aria-label='" + tpl("ความคืบหน้าการอ่าน","Reading progress") + "'></div>"
          + "<script>/*<![CDATA[*/(function(){"
          + "var b=document.getElementById('bxbProg');if(!b)return;"
          + "function u(){var h=document.documentElement.scrollHeight-window.innerHeight;var p=h>0?Math.min(100,window.scrollY/h*100):0;b.style.width=p+'%';b.setAttribute('aria-valuenow',Math.round(p));}"
          + "window.addEventListener('scroll',u,{passive:true});u();"
          + "})();/*]]>*/<\/script>";
      case "notfound":
        var nfsTpl = p.template || "minimal";
        var nfsBg, nfsFg, nfsCodeClr, nfsDescClr, nfsBtnBg, nfsBtnFg, nfsInputBg, nfsInputBd, nfsInputClr, nfsLabelClr;
        if (nfsTpl === "dark") {
          nfsBg = "#0f172a"; nfsFg = "#fff"; nfsCodeClr = "rgba(255,255,255,.15)"; nfsDescClr = "rgba(255,255,255,.65)";
          nfsBtnBg = "var(--primary)"; nfsBtnFg = "#fff"; nfsInputBg = "rgba(255,255,255,.1)"; nfsInputBd = "rgba(255,255,255,.2)"; nfsInputClr = "#fff"; nfsLabelClr = "var(--primary)";
        } else if (nfsTpl === "space") {
          nfsBg = "linear-gradient(160deg,var(--primary),var(--accent))"; nfsFg = "#fff"; nfsCodeClr = "rgba(255,255,255,.2)"; nfsDescClr = "rgba(255,255,255,.8)";
          nfsBtnBg = "#fff"; nfsBtnFg = "var(--primary)"; nfsInputBg = "rgba(255,255,255,.2)"; nfsInputBd = "rgba(255,255,255,.35)"; nfsInputClr = "#fff"; nfsLabelClr = "rgba(255,255,255,.7)";
        } else {
          nfsBg = "#f7f8fc"; nfsFg = "#1e2333"; nfsCodeClr = "var(--primary)"; nfsDescClr = "#828aa0";
          nfsBtnBg = "var(--primary)"; nfsBtnFg = "#fff"; nfsInputBg = "#fff"; nfsInputBd = "#dde"; nfsInputClr = "#1e2333"; nfsLabelClr = "var(--primary)";
        }
        var nfsSearch = p.showSearch !== false
          ? "<form class='bxb404-search' action='/' method='get'>"
            + "<input type='text' name='q' placeholder='" + tpl("ค้นหาในบล็อก…","Search blog…") + "' aria-label='" + tpl("ค้นหา","Search") + "'/>"
            + "<button type='submit'>&#128269;</button></form>"
          : "";
        var nfsHTML = "<style>"
          + ".bxb404{flex:1 0 auto;min-height:440px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 24px;background:" + nfsBg + "}"
          + ".bxb404-code{font-size:clamp(80px,12vw,128px);font-weight:900;line-height:1;letter-spacing:-.03em;color:" + nfsCodeClr + ";margin:0;font-family:inherit}"
          + ".bxb404-h{font-size:clamp(18px,3vw,26px);font-weight:700;color:" + nfsFg + ";margin:14px 0 0;font-family:inherit}"
          + ".bxb404-p{font-size:15px;color:" + nfsDescClr + ";margin:10px auto 0;max-width:440px;line-height:1.65}"
          + ".bxb404-btn{display:inline-block;margin-top:26px;padding:13px 30px;background:" + nfsBtnBg + ";color:" + nfsBtnFg + ";font-weight:600;border-radius:var(--radius);text-decoration:none;font-size:15px;transition:opacity .2s}"
          + ".bxb404-btn:hover{opacity:.88}"
          + ".bxb404-search{margin-top:22px;display:flex;width:100%;max-width:380px}"
          + ".bxb404-search input{flex:1;padding:11px 14px;border:1px solid " + nfsInputBd + ";border-radius:var(--radius) 0 0 var(--radius);font-size:14px;background:" + nfsInputBg + ";color:" + nfsInputClr + ";outline:none}"
          + ".bxb404-search button{padding:11px 16px;background:" + nfsBtnBg + ";color:" + nfsBtnFg + ";border:0;border-radius:0 var(--radius) var(--radius) 0;cursor:pointer;font-size:15px}"
          + "</style>"
          + "<section class='bxb404' aria-label='" + tpl("หน้าไม่พบ","Page not found") + "'>"
          + "<h1 class='bxb404-code'>" + esc(p.heading || "404") + "</h1>"
          + "<h2 class='bxb404-h'>" + esc(p.sub || "ขออภัย · ไม่พบหน้านี้") + "</h2>"
          + "<p class='bxb404-p'>" + esc(p.desc || "หน้าที่คุณต้องการอาจถูกย้าย ลบ หรือ URL ไม่ถูกต้อง") + "</p>"
          + "<a class='bxb404-btn' href='" + esc(absUrl(p.btnUrl || "/")) + "'>" + esc(p.btnText || "กลับหน้าแรก") + "</a>"
          + nfsSearch
          + "</section>";
        return "<b:if cond='data:view.isError'>\n" + nfsHTML + "\n</b:if>";
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
    // SearchAction/potentialAction intentionally omitted · Google retired Sitelinks Search Box schema Nov 21 2024
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
    // BlogPosting for single posts · uses data:view.* available in <head>.
    // (data:post.* is only valid inside Blog widget includables, so we use view equivalents here.)
    if (seo.schema) {
      out += "<b:if cond='data:view.isPost'>\n";
      out += "<script type='application/ld+json'>" +
        "{&quot;@context&quot;:&quot;https://schema.org&quot;," +
        "&quot;@type&quot;:&quot;BlogPosting&quot;," +
        "&quot;@id&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>#article&quot;," +
        "&quot;headline&quot;:&quot;<b:eval expr='data:view.title.jsonEscaped'/>&quot;," +
        "&quot;url&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>&quot;," +
        "&quot;description&quot;:&quot;<b:eval expr='data:view.description.jsonEscaped'/>&quot;," +
        "&quot;inLanguage&quot;:&quot;" + lang + "&quot;," +
        "&quot;isPartOf&quot;:{&quot;@id&quot;:&quot;" + siteId + "&quot;}," +
        "&quot;publisher&quot;:{&quot;@id&quot;:&quot;" + orgId + "&quot;}" +
        "<b:if cond='data:view.featuredImage'>,&quot;image&quot;:{&quot;@type&quot;:&quot;ImageObject&quot;,&quot;url&quot;:&quot;<b:eval expr='resizeImage(data:view.featuredImage,1200,&quot;1200:630&quot;)'/>&quot;}</b:if>" +
        "}</script>\n";
      out += "</b:if>\n";
    }
    // Single post/page: WebPage + Speakable + BreadcrumbList
    out += "<b:if cond='data:view.isSingleItem'>\n";
    out += "<script type='application/ld+json'>" +
      "{&quot;@context&quot;:&quot;https://schema.org&quot;,&quot;@graph&quot;:[" +
      "{&quot;@type&quot;:&quot;WebPage&quot;,&quot;@id&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>#webpage&quot;,&quot;url&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>&quot;,&quot;name&quot;:&quot;<b:eval expr='data:view.title.jsonEscaped'/>&quot;,&quot;isPartOf&quot;:{&quot;@id&quot;:&quot;" + siteId + "&quot;},&quot;inLanguage&quot;:&quot;" + lang + "&quot;,&quot;speakable&quot;:{&quot;@type&quot;:&quot;SpeakableSpecification&quot;,&quot;cssSelector&quot;:[&quot;h1.post-title&quot;,&quot;.post-body p:first-of-type&quot;]}<b:if cond='data:view.featuredImage'>,&quot;primaryImageOfPage&quot;:{&quot;@type&quot;:&quot;ImageObject&quot;,&quot;url&quot;:&quot;<b:eval expr='resizeImage(data:view.featuredImage,1200,&quot;1200:630&quot;)'/>&quot;}</b:if>}," +
      "{&quot;@type&quot;:&quot;BreadcrumbList&quot;,&quot;@id&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>#breadcrumb&quot;,&quot;itemListElement&quot;:[{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:1,&quot;name&quot;:&quot;หน้าแรก&quot;,&quot;item&quot;:&quot;<b:eval expr='data:blog.homepageUrl.jsonEscaped'/>&quot;},{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:2,&quot;name&quot;:&quot;<b:eval expr='data:view.title.jsonEscaped'/>&quot;,&quot;item&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>&quot;}]}" +
      "]}</script>\n";
    out += "</b:if>\n";
    // Label/archive page: CollectionPage + BreadcrumbList
    out += "<b:if cond='data:view.isMultipleItems and !data:view.isHomepage'>\n";
    out += "<script type='application/ld+json'>" +
      "{&quot;@context&quot;:&quot;https://schema.org&quot;,&quot;@graph&quot;:[" +
      "{&quot;@type&quot;:&quot;CollectionPage&quot;,&quot;@id&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>#collection&quot;,&quot;url&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>&quot;,&quot;name&quot;:&quot;<b:if cond='data:blog.searchLabel'><b:eval expr='data:blog.searchLabel.jsonEscaped'/><b:else/><b:eval expr='data:blog.pageName.jsonEscaped'/></b:if>&quot;,&quot;isPartOf&quot;:{&quot;@id&quot;:&quot;" + siteId + "&quot;},&quot;inLanguage&quot;:&quot;" + lang + "&quot;}," +
      "{&quot;@type&quot;:&quot;BreadcrumbList&quot;,&quot;itemListElement&quot;:[{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:1,&quot;name&quot;:&quot;หน้าแรก&quot;,&quot;item&quot;:&quot;<b:eval expr='data:blog.homepageUrl.jsonEscaped'/>&quot;}" +
      "<b:if cond='data:blog.searchLabel'>,{&quot;@type&quot;:&quot;ListItem&quot;,&quot;position&quot;:2,&quot;name&quot;:&quot;<b:eval expr='data:blog.searchLabel.jsonEscaped'/>&quot;,&quot;item&quot;:&quot;<b:eval expr='data:view.url.canonical.jsonEscaped'/>&quot;}</b:if>" +
      "]}" +
      "]}</script>\n";
    out += "</b:if>";
    return out;
  }
  function ogTags(seo) {
    var sn = esc(seo.blogTitle || "MyBlog");
    var lines = [
      "<meta expr:content='data:view.title.escaped' property='og:title'/>",
      "<meta expr:content='data:view.url.canonical' property='og:url'/>",
      "<meta content='" + sn + "' property='og:site_name'/>",
      "<meta expr:content='data:view.isPost ? &quot;article&quot; : &quot;website&quot;' property='og:type'/>",
      "<meta expr:content='data:blog.locale' property='og:locale'/>",
      "<b:if cond='data:view.featuredImage'>",
      "<meta expr:content='&quot;https:&quot; + resizeImage(data:view.featuredImage, 1200, &quot;1200:630&quot;).replace(&quot;https:&quot;,&quot;&quot;).replace(&quot;http:&quot;,&quot;&quot;)' property='og:image'/>",
      "<meta content='1200' property='og:image:width'/>",
      "<meta content='630' property='og:image:height'/>",
      "<meta expr:content='&quot;https:&quot; + resizeImage(data:view.featuredImage, 1200, &quot;1200:630&quot;).replace(&quot;https:&quot;,&quot;&quot;).replace(&quot;http:&quot;,&quot;&quot;)' name='twitter:image'/>",
      "<b:elseif cond='data:view.firstImageUrl'/>",
      "<meta expr:content='&quot;https:&quot; + resizeImage(data:view.firstImageUrl, 1200, &quot;1200:630&quot;).replace(&quot;https:&quot;,&quot;&quot;).replace(&quot;http:&quot;,&quot;&quot;)' property='og:image'/>",
      "<meta content='1200' property='og:image:width'/>",
      "<meta content='630' property='og:image:height'/>",
      "<meta expr:content='&quot;https:&quot; + resizeImage(data:view.firstImageUrl, 1200, &quot;1200:630&quot;).replace(&quot;https:&quot;,&quot;&quot;).replace(&quot;http:&quot;,&quot;&quot;)' name='twitter:image'/>",
      (seo.logoUrl ? "<b:else/><meta content='" + esc(seo.logoUrl) + "' property='og:image'/><meta name='twitter:image' content='" + esc(seo.logoUrl) + "'/>" : ""),
      "</b:if>",
      "<meta content='summary_large_image' name='twitter:card'/>",
      "<meta expr:content='data:view.title.escaped' name='twitter:title'/>",
      "<meta expr:content='data:view.description.escaped' name='twitter:description'/>",
      // Article-specific OG + Twitter meta (like both reference files)
      "<b:if cond='data:view.isPost'>",
      "<meta expr:content='data:view.publishDate' property='article:published_time'/>",
      "<meta expr:content='data:view.lastUpdated' property='article:modified_time'/>",
      "<meta content='" + sn + "' property='article:author'/>",
      "<b:if cond='data:view.labels'><b:loop values='data:view.labels' var='lbl'><meta expr:content='data:lbl.name' property='article:tag'/></b:loop><meta expr:content='data:view.labels.first.name' property='article:section'/></b:if>",
      "<meta content='หมวดหมู่' name='twitter:label1'/>",
      "<b:if cond='data:view.labels'><meta expr:content='data:view.labels.first.name' name='twitter:data1'/></b:if>",
      "</b:if>",
      // Pagination hints for crawlers
      "<b:if cond='data:blog.pageType == &quot;index&quot;'>",
      "<b:if cond='data:newerPageUrl'><link expr:href='data:newerPageUrl' rel='prev'/></b:if>",
      "<b:if cond='data:olderPageUrl'><link expr:href='data:olderPageUrl' rel='next'/></b:if>",
      "</b:if>"
    ];
    return lines.join("\n");
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
    if (a.overall < 60) warnings.push("คะแนน SEO ต่ำกว่า 60 · ควรเติมข้อมูลก่อนเผยแพร่");
    if (!S.seo.siteUrl) warnings.push("ยังไม่ตั้งค่า URL เว็บไซต์ · Schema ไม่สมบูรณ์");
    if (!S.seo.logoUrl) warnings.push("ยังไม่ตั้งค่า Logo URL · ขาด Organization.logo");
    if (S.seo.schema && S.seo.siteUrl && !S.seo.siteUrl.startsWith("https")) warnings.push("URL เว็บไซต์ควรขึ้นต้นด้วย https://");
    if (S.seo.og && !S.seo.logoUrl && !S.blocks.some(function (b) { return b.type === "image"; })) warnings.push("OG เปิดอยู่แต่ไม่มี Logo URL หรือบล็อกรูปภาพ · og:image จะว่างเมื่อโพสต์ไม่มี Featured Image");
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
      .replace(/<data:post\.title\/>/g, tpl("หัวข้อบทความตัวอย่างที่น่าสนใจ", "An Interesting Sample Article Title"))
      .replace(/<data:post\.snippet\/>/g, tpl("สรุปเนื้อหาบทความสั้นๆ ให้ผู้อ่านเห็นภาพรวมก่อนคลิกอ่านต่อ…", "A short excerpt giving readers an overview before they click to read more…"))
      .replace(/<data:post\.metaDescription\/>/g, tpl("สรุปเนื้อหาบทความสั้นๆ ให้ผู้อ่านเห็นภาพรวมก่อนคลิกอ่านต่อ…", "A short excerpt giving readers an overview before they click to read more…"))
      .replace(/<b:eval expr='data:post\.body snippet[^']*'\/>/g, tpl("สรุปเนื้อหาบทความสั้นๆ ให้ผู้อ่านเห็นภาพรวมก่อนคลิกอ่านต่อ…", "A short excerpt giving readers an overview before they click to read more…"))
      .replace(/<data:post\.timestamp\/>/g, tpl("28 มิ.ย. 2569", "Jun 28, 2026"))
      .replace(/expr:src='data:post\.featuredImage'/g, "src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"225\"><rect width=\"400\" height=\"225\" fill=\"%23e8eaf2\"/></svg>'")
      .replace(/expr:alt='data:post\.title'/g, "alt='ตัวอย่างรูปภาพ'")
      .replace(/expr:href='data:post\.url'/g, "href='#'");
    return "<!DOCTYPE html><html lang='" + (S.lang || "th") + "'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>พรีวิว · " + esc(S.name) + "</title><link href='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap' rel='stylesheet'><style>" + css + "</style></head><body>" + body + "</body></html>";
  }
  var popWin = null;
  $("#popoutBtn").addEventListener("click", function () {
    if (!S || !S.blocks.length) { toast("ยังไม่มีบล็อก · เพิ่มองค์ประกอบก่อน"); return; }
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
      + '<li>กด <b>อัปโหลด (Upload)</b> · ธีมจะถูกใช้งานทันที ✓</li>'
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
  var tplChipEl = $("#tplChip");
  if (tplChipEl) tplChipEl.addEventListener("click", function () {
    var msg = BL === "th" ? "เปลี่ยน Template? โปรเจกต์ปัจจุบันจะถูกล้าง" : "Change template? Current project will be cleared.";
    if (confirm(msg)) { localStorage.removeItem(KEY); location.reload(); }
  });

  /* ---------- start screen ---------- */
  var curCat = "ทั้งหมด"; // uses CATS[*].val as internal key

  function tplThumb(t) {
    var c1 = t.c[0], c2 = t.c[1];
    var bl = t.blocks;
    var hasHero = bl.indexOf("hero") >= 0;
    var hasFeat = bl.indexOf("featured") >= 0;
    var hasGrid = bl.indexOf("postgrid") >= 0;
    var hasList = bl.indexOf("postlist") >= 0;
    var hasSide = bl.indexOf("sidebar") >= 0;

    var heroHtml = "";
    if (t.id === "travel") {
      heroHtml = '<div class="t-hero-sec" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ');position:relative;display:flex;align-items:flex-end">'
        + '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 60%)"></div>'
        + '<div style="position:relative;padding:4px 6px">'
        + '<div style="height:2px;background:rgba(255,255,255,.6);width:36%;border-radius:1px;margin-bottom:2px"></div>'
        + '<div style="height:4px;background:#fff;width:72%;border-radius:1px;margin-bottom:3px"></div>'
        + '<div style="height:8px;background:#fff;width:30%;border-radius:3px"></div>'
        + '</div></div>';
    } else if (t.id === "personal") {
      heroHtml = '<div class="t-hero-sec" style="background:#fff;border-bottom:1px solid #f0f0f8;display:flex;align-items:center;padding:5px 8px;gap:5px">'
        + '<div style="flex:1"><div style="height:3px;background:' + c1 + ';width:55%;border-radius:1px;margin-bottom:3px"></div>'
        + '<div style="height:2px;background:#e2e8f0;width:78%;border-radius:1px;margin-bottom:4px"></div>'
        + '<div style="height:7px;background:' + c1 + ';width:30%;border-radius:2px"></div></div>'
        + '<div style="width:22px;height:22px;border-radius:50%;padding:2px;background:linear-gradient(135deg,' + c1 + ',' + c2 + ');flex:none">'
        + '<div style="width:100%;height:100%;border-radius:50%;background:#f8fafc"></div></div>'
        + '</div>';
    } else if (t.id === "tech") {
      heroHtml = '<div class="t-hero-sec" style="background:#0f172a;padding:5px 8px">'
        + '<div style="font-size:5px;font-family:monospace;color:' + c1 + ';margin-bottom:3px">&gt;_</div>'
        + '<div style="height:4px;background:#f8fafc;width:65%;border-radius:1px;margin-bottom:2px"></div>'
        + '<div style="height:2px;background:rgba(255,255,255,.35);width:80%;border-radius:1px;margin-bottom:4px"></div>'
        + '<div style="height:7px;background:' + c1 + ';width:28%;border-radius:2px"></div>'
        + '</div>';
    } else if (t.id === "course") {
      heroHtml = '<div class="t-hero-sec" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ');padding:6px 8px;display:flex;flex-direction:column;justify-content:flex-end">'
        + '<div style="height:2px;background:rgba(255,255,255,.5);width:22%;border-radius:1px;margin-bottom:4px"></div>'
        + '<div style="height:5px;background:#fff;width:72%;border-radius:1px;margin-bottom:3px"></div>'
        + '<div style="display:flex;gap:3px;margin-bottom:5px">'
        + '<div style="height:5px;background:rgba(255,255,255,.85);width:20%;border-radius:1px;display:flex;align-items:center;padding-left:2px"><div style="width:4px;height:4px;border-radius:50%;background:#fff"></div></div>'
        + '<div style="height:5px;background:rgba(255,255,255,.85);width:22%;border-radius:1px"></div>'
        + '</div>'
        + '<div style="height:8px;background:#fff;width:30%;border-radius:2px"></div>'
        + '</div>';
    } else if (t.id === "company") {
      heroHtml = '<div class="t-hero-sec" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ');padding:6px 8px;display:flex;flex-direction:column;justify-content:flex-end">'
        + '<div style="height:2px;background:rgba(255,255,255,.5);width:30%;border-radius:1px;margin-bottom:4px"></div>'
        + '<div style="height:5px;background:#fff;width:70%;border-radius:1px;margin-bottom:3px"></div>'
        + '<div style="height:2px;background:rgba(255,255,255,.6);width:55%;border-radius:1px;margin-bottom:6px"></div>'
        + '<div style="display:flex;gap:4px">'
        + '<div style="height:8px;background:#fff;width:26%;border-radius:2px"></div>'
        + '<div style="height:8px;background:rgba(255,255,255,.35);width:22%;border-radius:2px;border:1px solid rgba(255,255,255,.5)"></div>'
        + '</div></div>';
    } else if (t.id === "sidebar-blog") {
      heroHtml = '<div class="t-hero-sec" style="background:#fff;border-top:3px solid ' + c1 + ';padding:4px 8px">'
        + '<div style="height:2px;background:' + c1 + ';width:35%;border-radius:1px;margin-bottom:3px"></div>'
        + '<div style="height:4px;background:#1e2333;width:62%;border-radius:1px;margin-bottom:2px"></div>'
        + '<div style="height:2px;background:#e2e8f0;width:50%;border-radius:1px;margin-bottom:4px"></div>'
        + '<div style="height:7px;background:' + c1 + ';width:26%;border-radius:2px"></div>'
        + '</div>';
    } else if (t.id === "review") {
      heroHtml = '<div class="t-hero-sec" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ');padding:5px 8px;display:flex;flex-direction:column;justify-content:flex-end">'
        + '<div style="height:2px;background:rgba(255,255,255,.6);width:22%;border-radius:1px;margin-bottom:4px"></div>'
        + '<div style="height:4px;background:#fff;width:68%;border-radius:1px;margin-bottom:3px"></div>'
        + '<div style="display:flex;align-items:center;gap:2px;margin-bottom:5px">'
        + '<span style="font-size:6px;color:#fff;letter-spacing:.5px">★★★★★</span>'
        + '<span style="font-size:4px;color:rgba(255,255,255,.7);margin-left:2px">4.8</span>'
        + '</div>'
        + '<div style="height:7px;background:#fff;width:30%;border-radius:2px"></div>'
        + '</div>';
    } else if (t.id === "magazine") {
      heroHtml = '<div class="t-feat-sec" style="display:grid;grid-template-columns:2fr 1fr;gap:3px;padding:5px 6px;background:#f8f9fb;border-bottom:2px solid ' + c1 + '">'
        + '<div style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ');border-radius:2px;position:relative;display:flex;align-items:flex-end;padding:4px 5px">'
        + '<div style="background:' + c1 + ';height:2px;width:30%;border-radius:1px;margin-bottom:1px"></div></div>'
        + '<div style="display:flex;flex-direction:column;gap:2px">'
        + '<div style="background:linear-gradient(135deg,' + c2 + ',' + c1 + ');border-radius:2px;flex:1"></div>'
        + '<div style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ');border-radius:2px;flex:1"></div>'
        + '</div></div>';
    } else if (hasHero) {
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

    if (t.id === "sidebar-blog") {
      bodyHtml = '<div style="display:grid;grid-template-columns:2fr 1fr;gap:4px">'
        + '<div style="display:flex;flex-direction:column;gap:3px">'
        + '<div class="tgc"><div class="tgc-img" style="background:' + c1 + '28"></div><div class="tgc-body"></div></div>'
        + '<div class="tgc"><div class="tgc-img" style="background:' + c1 + '28"></div><div class="tgc-body"></div></div>'
        + '</div>'
        + '<div style="display:flex;flex-direction:column;gap:3px;padding-top:2px">'
        + '<div style="height:9px;background:' + c1 + '28;border-radius:2px;margin-bottom:2px"></div>'
        + '<div style="height:4px;background:#e2e8f0;border-radius:1px;width:85%"></div>'
        + '<div style="height:4px;background:#e2e8f0;border-radius:1px;width:65%"></div>'
        + '<div style="height:4px;background:#e2e8f0;border-radius:1px;width:75%"></div>'
        + '</div>'
        + '</div>';
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
    var isEn = BL === "en";
    // only templates without hidden:true appear in the picker
    var visibleTemplates = TEMPLATES.filter(function (t) { return !t.hidden; });
    // only show category tabs that actually contain a visible template (+ "ทั้งหมด")
    var activeCats = CATS.filter(function (c) { return c.val === "ทั้งหมด" || visibleTemplates.some(function (t) { return t.cat === c.val; }); });
    if (!activeCats.some(function (c) { return c.val === curCat; })) curCat = "ทั้งหมด";
    // hide the category tab bar entirely when there's nothing to filter (≤1 real category)
    var catBar = $("#catTabs");
    if (catBar) catBar.style.display = activeCats.length > 2 ? "" : "none";
    catBar.innerHTML = activeCats.map(function (c) {
      return '<button class="cat-tab' + (c.val === curCat ? " on" : "") + '" data-c="' + c.val + '">' + (isEn ? c.en : c.th) + "</button>";
    }).join("");
    var list = visibleTemplates.filter(function (t) { return curCat === "ทั้งหมด" || t.cat === curCat; });
    $("#startGrid").innerHTML = list.map(function (t) {
      var tDesc = isEn ? (t.descEn || t.desc) : t.desc;
      var tCat  = isEn ? (t.catEn  || t.cat)  : t.cat;
      return '<div class="tpl-card" data-tpl="' + t.id + '">'
        + '<div class="thumb">' + tplThumb(t) + '</div>'
        + '<div class="meta"><h4>' + t.name + '</h4><p>' + tDesc + '</p>'
        + '<span class="tpl-cat-badge">' + tCat + '</span></div>'
        + '</div>';
    }).join("");
    $$("#catTabs .cat-tab").forEach(function (b) { b.addEventListener("click", function () { curCat = b.dataset.c; renderStart(); }); });
    $$("#startGrid .tpl-card").forEach(function (card) { card.addEventListener("click", function () { startFromTemplate(card.dataset.tpl); }); });
  }
  function startFromTemplate(id) {
    var t = TEMPLATES.find(function (x) { return x.id === id; });
    S = freshProject(t.name, JSON.parse(JSON.stringify(t.design)));
    S.templateId = id;
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
    ["ตั้งชื่อบล็อก", "ใส่ชื่อบล็อกที่ต้องการ · เป็นชื่อที่แสดงบนหัวเว็บ เปลี่ยนภายหลังได้"],
    ["ตั้งที่อยู่ (URL)", "เลือก URL เช่น <code>yourblog.blogspot.com</code> ระบบจะบอกว่าว่างหรือไม่ · เลือกให้สั้น จำง่าย"],
    ["ยืนยันสร้างบล็อก", "กด <b>บันทึก</b> · ตอนนี้คุณมีบล็อก Blogger พร้อมแล้ว"]
  ];
  var TIPS = [
    "ไปที่ <b>การตั้งค่า → ความเป็นส่วนตัว</b> แล้ว <b>ปิด</b> \"อนุญาตให้เครื่องมือค้นหาพบบล็อกของคุณ\" ไว้ก่อน",
    "ที่ <b>การตั้งค่า → สิทธิ์ → ผู้อ่านบล็อก</b> เลือก <b>\"เฉพาะผู้เขียนบล็อก\"</b> เพื่อซ่อนระหว่างเตรียมเนื้อหา",
    "อัปโหลดธีมที่สร้างจากเครื่องมือนี้ แล้วเขียนบทความคุณภาพสัก <b>2–3 บทความ</b> ให้เว็บดูสมบูรณ์",
    "เมื่อพร้อม ค่อย <b>เปิดสาธารณะ + เปิดให้ค้นหาเจอ</b> · Googlebot จะเข้ามาเก็บข้อมูลครั้งแรกแล้วเห็นเว็บที่จริงจัง มีเนื้อหาครบ สร้างความประทับใจที่ดีต่ออันดับ"
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
    var tplLbl = $("#tplChipLabel");
    if (tplLbl) {
      var tpl = TEMPLATES.find(function (t) { return t.id === S.templateId; });
      tplLbl.textContent = tpl ? tpl.name : (BL === "th" ? "กำหนดเอง" : "Custom");
    }
    HISTORY = []; pushHistory();
    setView(VIEW); renderProps(); renderSeo(); renderDesign(); setupLibDrag(); save();
    showCoach();
  }

  /* first-run coach: 3 steps + advanced tip, shown once (dismiss stored) */
  function showCoach() {
    try { if (localStorage.getItem("bxb_coach_v2")) return; } catch (e) {}
    if ($(".coach")) return;
    var isMob = window.matchMedia("(max-width:1000px)").matches;
    var steps = isMob
      ? [tpl("แตะ “องค์ประกอบ” ด้านล่าง แล้วแตะบล็อกเพื่อเพิ่มลงหน้าเว็บ", "Tap “Elements” below, then tap a block to add it"),
         tpl("แตะบล็อกบนหน้าเว็บ แล้วแตะ “ปรับแต่ง” เพื่อแก้ข้อความ/สี", "Tap a block, then “Customize” to edit text & colors"),
         tpl("เสร็จแล้วแตะ “Export XML” มุมขวาบน เพื่อดาวน์โหลดธีม", "When done, tap “Export XML” (top right) to download")]
      : [tpl("ลากองค์ประกอบจากแผงซ้าย มาวางบนหน้าเว็บ", "Drag elements from the left panel onto the page"),
         tpl("คลิกบล็อกเพื่อแก้ไขข้อความ สี และการตั้งค่าในแผงขวา", "Click a block to edit text, colors & settings on the right"),
         tpl("เสร็จแล้วกด “Export XML” เพื่อดาวน์โหลดธีมไปอัปโหลดใน Blogger", "When done, press “Export XML” to download your theme")];
    var advTip = isMob
      ? tpl("ขั้นสูง: แต่ละบล็อกเลือกได้ว่าจะแสดงหน้าไหน · แตะบล็อก → “ปรับแต่ง” → “เงื่อนไขการแสดงผล” แล้วเลือก ทุกหน้า / หน้าแรก / บทความ / เพจ / ป้ายกำกับ เช่น ให้แบนเนอร์โชว์เฉพาะหน้าแรก",
            "Advanced: each block can choose where it appears · tap the block → “Customize” → “Display conditions”, then pick All pages / Homepage / Posts / Pages / Label (e.g. a homepage-only banner)")
      : tpl("ขั้นสูง: แต่ละบล็อกเลือกได้ว่าจะแสดงหน้าไหน · คลิกบล็อกแล้วดู “เงื่อนไขการแสดงผล (ขั้นสูง)” ในแผงขวา เลือก ทุกหน้า / หน้าแรก / บทความ / เพจ / ป้ายกำกับ เช่น ให้แบนเนอร์โชว์เฉพาะหน้าแรก",
            "Advanced: each block can choose where it appears · click a block and open “Display conditions (advanced)” on the right, then pick All pages / Homepage / Posts / Pages / Label (e.g. a homepage-only banner)");
    var el2 = document.createElement("div");
    el2.className = "coach";
    el2.innerHTML = '<div class="coach-head"><b>' + tpl("เริ่มต้นใน 3 ขั้น", "Get started in 3 steps") + '</b><button class="x" aria-label="close">✕</button></div>' +
      '<div class="coach-steps">' + steps.map(function (s2, i) { return '<div class="coach-step"><span class="n">' + (i + 1) + '</span><span>' + s2 + '</span></div>'; }).join("") +
      '<div class="coach-step"><span class="n" style="background:linear-gradient(135deg,#f59e0b,#f43f5e)">★</span><span>' + advTip + '</span></div>' +
      '</div>';
    document.body.appendChild(el2);
    el2.querySelector(".x").addEventListener("click", function () {
      try { localStorage.setItem("bxb_coach_v2", "1"); } catch (e) {}
      el2.remove();
    });
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
    v.innerHTML = '<div class="layers-hd">โครงสร้างหน้า · ลากเพื่อจัดลำดับ</div>' + S.blocks.map(function (b) {
      var t = blkLabel(b.type);
      var isLocked = b.type === "header" || b.type === "footer";
      var moveBtns = isLocked
        ? '<button data-ldup title="ทำซ้ำ">⧉</button><button data-ldel title="ลบ">✕</button>'
        : '<button data-lup title="ขึ้น">↑</button><button data-ldn title="ลง">↓</button><button data-ldup title="ทำซ้ำ">⧉</button><button data-ldel title="ลบ">✕</button>';
      return '<div class="layer-row' + (b.id === SEL ? " sel" : "") + '" draggable="' + (!isLocked) + '" data-id="' + b.id + '" data-type="' + b.type + '">'
        + '<span class="lh">' + svg(IC[b.type] || IC.text) + '</span>'
        + '<span class="ln">' + esc(t) + '</span>'
        + '<span class="lg">' + moveBtns + '</span>'
        + '</div>';
    }).join("");
    // bind
    var dragId = null;
    $$(".layer-row", v).forEach(function (row) {
      var rowBlock = S.blocks.find(function (x) { return x.id === row.dataset.id; });
      var rowLocked = rowBlock && (rowBlock.type === "header" || rowBlock.type === "footer");
      row.addEventListener("click", function (e) { if (e.target.closest("button")) return; select(row.dataset.id); });
      if (row.querySelector("[data-lup]")) row.querySelector("[data-lup]").addEventListener("click", function (e) { e.stopPropagation(); move(row.dataset.id, -1); renderLayers(); });
      if (row.querySelector("[data-ldn]")) row.querySelector("[data-ldn]").addEventListener("click", function (e) { e.stopPropagation(); move(row.dataset.id, 1); renderLayers(); });
      row.querySelector("[data-ldup]").addEventListener("click", function (e) { e.stopPropagation(); duplicate(row.dataset.id); renderLayers(); });
      row.querySelector("[data-ldel]").addEventListener("click", function (e) { e.stopPropagation(); removeBlock(row.dataset.id); renderLayers(); });
      row.addEventListener("dragstart", function () { if (rowLocked) return; dragId = row.dataset.id; row.classList.add("dragging"); });
      row.addEventListener("dragend", function () { row.classList.remove("dragging"); $$(".layer-row", v).forEach(function (r) { r.classList.remove("over"); }); });
      row.addEventListener("dragover", function (e) { if (rowLocked) return; e.preventDefault(); row.classList.add("over"); });
      row.addEventListener("dragleave", function () { row.classList.remove("over"); });
      row.addEventListener("drop", function (e) {
        e.preventDefault(); row.classList.remove("over");
        if (!dragId || dragId === row.dataset.id) return;
        var from = S.blocks.findIndex(function (x) { return x.id === dragId; });
        var to = S.blocks.findIndex(function (x) { return x.id === row.dataset.id; });
        if (from < 0 || to < 0) return;
        if (S.blocks[from].type === "header" || S.blocks[from].type === "footer") return;
        if (S.blocks[to].type === "header" || S.blocks[to].type === "footer") return;
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
    "องค์ประกอบ · ลากไปวางบนหน้า": "Elements · drag onto the page",
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
    "มุมโค้งการ์ด (px)": "Card corner radius (px)", "สไตล์การ์ด": "Card style", "เงา": "Shadow", "เส้นขอบ": "Border", "แบน": "Flat",
    "ป้ายกำกับปักหมุดบทความแนะนำ": "Featured pin label",
    "สีพื้นหลัง Footer": "Footer background color",
    "ข้อความโลโก้": "Logo text", "เมนูนำทาง · ใส่ลิงก์ได้แต่ละอัน": "Navigation · set a link per item",
    "+ เพิ่มเมนู": "+ Add menu item", "เมนูมือถือเด้งจาก": "Mobile menu slides from",
    "◧ ซ้าย": "◧ Left", "ขวา ◨": "Right ◨", "ติดด้านบน (Sticky)": "Sticky top", "แสดงปุ่มค้นหา": "Show search", "แสดงไอคอนหน้าเมนู": "Show menu icons", "แสดงไอคอนหน้าลิงก์": "Show link icons", "แถบเมนูล่าง (มือถือ)": "Bottom nav bar (mobile)",
    "หัวข้อ": "Heading", "คำโปรย": "Subtitle", "ข้อความปุ่ม": "Button text",
    "ป้ายกำกับเล็ก (Eyebrow)": "Small label (Eyebrow)", "ข้อความปุ่มอ่านต่อ": "Read more button text",
    "แสดงรูปภาพ (วงกลม)": "Show image (circle)", "URL รูปภาพ Hero": "Hero image URL",
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
    "ให้ Google เก็บหน้า Label เป็นหน้าหมวดหมู่": "Let Google index labels as categories",
    "ใส่ Schema (JSON-LD) อัตโนมัติ": "Auto Schema (JSON-LD)", "Open Graph + Twitter Card": "Open Graph + Twitter Card",
    "การ์ดแชร์สวยบน Facebook / LINE / X": "Share cards on Facebook / LINE / X",
    "ตัวอย่างผลการค้นหา (SERP Preview)": "Search Result Preview (SERP)",
    "Title (เว้นว่าง = ใช้ชื่อบล็อก)": "Title (blank = use blog name)",
    // googleBox
    "ข้อมูลสำหรับ Google (Knowledge Graph)": "Data for Google (Knowledge Graph)",
    "ประเภทเว็บไซต์": "Website type",
    "องค์กร": "Organization", "บุคคล": "Person", "ร้านค้า": "Business",
    "URL เว็บไซต์": "Website URL",
    "URL โลโก้ (แนะนำ 512×512)": "Logo URL (512×512 recommended)",
    "ลิงก์โซเชียล (บรรทัดละ 1 ลิงก์)": "Social links (one per line)",
    "Facebook, X, YouTube, LINE · ช่วยให้ Google ยืนยันตัวตนเว็บ": "Facebook, X, YouTube, LINE · helps Google verify site identity",
    "เพิ่ม schema สำหรับบล็อก/เครื่องมือซอฟต์แวร์ · ช่วยให้ AI knowledge graphs จดจำได้": "Schema for blog / software · helps AI knowledge graphs recognize you",
    // seoAudit labels
    "โครงสร้างหน้า": "Page structure",
    "Title ความยาวเหมาะสม (10–60)": "Title length OK (10–60)",
    "Canonical URL อัตโนมัติ": "Canonical URL (auto)",
    "URL เว็บไซต์ตั้งค่าแล้ว": "Website URL set",
    "จำเป็นสำหรับ Schema & Canonical": "Required for Schema & Canonical",
    "Header (ส่วนหัว)": "Header block", "Footer (ส่วนท้าย)": "Footer block",
    "About / ผู้เขียน (E-E-A-T)": "About / Author (E-E-A-T)",
    "ส่วนแสดงบทความ": "Post section present",
    "รูปภาพมี ALT text ครบ": "All images have ALT", "ไม่มีบล็อกรูป": "No image blocks",
    "Schema JSON-LD เปิดอยู่": "Schema JSON-LD enabled",
    "Open Graph เปิดอยู่": "Open Graph enabled",
    "Twitter Card เปิดอยู่": "Twitter Card enabled",
    "ชื่อบล็อกตั้งค่าแล้ว": "Blog name set",
    "Description ยาวพอ (og:description)": "Description long enough (og:description)",
    "Entity @id (siteUrl ตั้งค่าแล้ว)": "Entity @id (siteUrl set)",
    "จำเป็นสำหรับ @graph @id fragments ให้ AI จดจำเว็บ": "Required for @graph @id fragments",
    "ช่วย AI knowledge graphs สร้าง entity ที่สมบูรณ์": "Helps AI knowledge graphs build a complete entity",
    "sameAs links (ยืนยันตัวตน)": "sameAs links (identity verification)",
    "Facebook, YouTube, X ฯลฯ เพิ่มความน่าเชื่อถือ": "Facebook, YouTube, X etc. · builds authority",
    "Meta description ≥ 50 ตัวอักษร (AI snippet)": "Meta description ≥ 50 chars (AI snippet)",
    // seoAudit score labels
    "ดีมาก พร้อมเผยแพร่": "Excellent · ready to publish",
    "ดี ปรับเพิ่มได้": "Good · room to improve",
    "ควรปรับปรุง": "Needs improvement",
    // design
    "ชุดสี": "Color palette", "ตัวอักษร": "Typography", "ความมนขอบ": "Corner radius", "มุมโค้ง": "Radius", "สีหลัก": "Primary", "สีเน้น": "Accent",
    // onboarding
    "เริ่มต้นใช้งาน BlogKub": "Get started with BlogKub",
    "สมัครแล้ว": "I have one", "ยังไม่สมัคร": "Not yet",
    "เลือกแม่แบบเริ่มต้น": "Choose a starting template",
    "วิธีสมัคร Blogger ทีละขั้น": "How to sign up for Blogger, step by step",
    "← กลับ": "← Back", "ทั้งหมด": "All", "บล็อก": "Blog", "ธุรกิจ": "Business",
    "ข่าว/นิตยสาร": "News/Magazine", "การศึกษา": "Education", "Affiliate": "Affiliate",
    // library group
    "เลย์เอาต์": "Layout", "หน้าพิเศษ": "Special Pages",
    // library items
    "หน้า 404": "404 Page", "ออกแบบ Page Not Found": "Design 404 Page",
    // field labels
    "แม่แบบ": "Template", "มืด": "Dark", "ลิงก์ปุ่ม": "Button link",
    "แสดงช่องค้นหา": "Show search box", "ตัวเลข/ข้อความหลัก": "Main text / number",
    "หัวข้อรอง": "Subtitle", "คำอธิบาย": "Description",
    "คลังบทความ": "Archive",
    // visibility / condition editor
    "เงื่อนไขการแสดงผล (ขั้นสูง)": "Visibility (advanced)",
    "แสดงองค์ประกอบนี้ในหน้า": "Show on page",
    "ทุกหน้า": "All pages", "หน้าแรก": "Home", "บทความ": "Post",
    "เพจ": "Page", "ป้ายกำกับ": "Label",
    "ซ่อนบนมือถือ": "Hide on mobile",
    "ซ่อนองค์ประกอบนี้บนหน้าจอเล็ก (≤768px)": "Hide on small screens (≤768px)",
    // canvas empty
    "ลากองค์ประกอบมาวางที่นี่": "Drag elements here",
    "เลือกจากแผงด้านซ้าย ลากมาวางเพื่อเริ่มออกแบบหน้าเว็บของคุณ": "Pick from the left panel and drag to start designing",
    // start screen subtext + buttons
    "ก่อนสร้างธีม · คุณมีบล็อกบน Blogger (blogspot.com) แล้วหรือยัง?": "Before building a theme · do you already have a blog on Blogger (blogspot.com)?",
    "ฉันมีบล็อก blogspot.com พร้อมแล้ว ไปเลือกแม่แบบเพื่อเริ่มออกแบบ": "I have a blogspot.com blog ready · go choose a template to start designing",
    "ฉันยังไม่มีบล็อก ดูวิธีสมัคร Blogger แบบละเอียดทีละขั้น": "I don't have a blog yet · show me how to sign up for Blogger step by step",
    "ใช้เวลาประมาณ 10 นาที ทำตามนี้แล้วกลับมาเริ่มออกแบบได้เลย": "Takes about 10 minutes · follow these steps then come back to start designing",
    "เลือกประเภทเว็บไซต์เพื่อเริ่มจากแม่แบบที่ออกแบบมาให้ หรือเริ่มจากหน้าเปล่า · ปรับต่อได้ทุกอย่าง": "Choose a website type to start from a ready-made template, or start blank · customize everything",
    "สมัครเสร็จแล้ว · ไปเลือกแม่แบบ →": "Done signing up · go pick a template →",
    "หรือเริ่มจากหน้าเปล่า →": "Or start from blank →",
    // export modal
    "รายงาน": "Report", "📖 คู่มือ": "📖 Guide", "คัดลอก": "Copy", "ดาวน์โหลด .xml": "Download .xml",
    // menu editor
    "หน้าเพจ": "Page", "ลิงก์ภายนอก": "External link", "URL กำหนดเอง": "Custom URL",
    "เมนูนำทาง": "Navigation", "ยกเลิก": "Cancel", "ลบ": "Delete",
    "ชื่อเมนู": "Menu label", "ชื่อลิงก์": "Link label", "ลิงก์ใหม่": "New link",
    "ชื่อเมนูย่อย": "Sub-menu name", "✅ หน้าเพจที่ควรสร้างก่อน": "✅ Pages to create first",
    "+ เพิ่มเมนูย่อย": "+ Add sub-item"
  };
  function tr(s) { s = (s == null ? "" : String(s)).trim(); return (BL === "en" && DICT[s]) ? DICT[s] : s; }
  function tpl(th, en) { return BL === "en" ? en : th; }
  // translate a single leaf element's textContent if it fully matches the dict
  function trLeaf(elm) { var t = elm.textContent.trim(); if (DICT[t]) elm.textContent = DICT[t]; }
  // translate the leading text node of an element (keeps child <small>/<svg>)
  function trLeadText(elm) {
    var tn = [].filter.call(elm.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0];
    if (tn && DICT[tn.textContent.trim()]) tn.textContent = (elm.classList.contains("mob-btn") ? " " : "") + DICT[tn.textContent.trim()];
  }
  function translateChrome() {
    if (BL === "en") {
      // TH → EN: translate static elements that render functions don't rebuild
      $$(".lib-group h4, .sec-title, .p-head, label, .seg button, .tg .lbl, .p-tabs button, .gc-t, .cat-tab, .start h1, .lib-item .nm > small").forEach(trLeaf);
      $$(".start .sub, .gc-d, .start-foot button, .ob-back").forEach(trLeaf);
      $$(".lib-item .nm, .mob-switch button, #restartBtn, #exportBtn, #toggleReport, #toggleGuide, #copyXml, #dlXml").forEach(trLeadText);
      var sd = document.querySelector("#saveDot span"); if (sd && DICT[sd.textContent.trim()]) sd.textContent = DICT[sd.textContent.trim()];
    } else {
      // EN → TH: restore elements not rebuilt by renderProps/renderSeo/renderDesign/buildLib
      // mob-switch (bottom mobile nav)
      var mobMap = { left: "องค์ประกอบ", canvas: "หน้าเว็บ", right: "ปรับแต่ง" };
      $$(".mob-switch button[data-mob]").forEach(function(btn) {
        var th = mobMap[btn.dataset.mob]; if (!th) return;
        var tn = [].filter.call(btn.childNodes, function(n) { return n.nodeType === 3 && n.textContent.trim(); })[0];
        if (tn) tn.textContent = th;
      });
      // right panel tabs
      var rtMap = { props: "คุณสมบัติ", design: "ดีไซน์" };
      $$(".p-tabs button[data-rt]").forEach(function(btn) { var th = rtMap[btn.dataset.rt]; if (th) btn.textContent = th; });
      // left panel tab
      var libTab = document.querySelector('.p-tabs button[data-lt="lib"]'); if (libTab) libTab.textContent = "องค์ประกอบ";
      // topbar restart btn
      var rb = document.getElementById("restartBtn"); if (rb) { var rtn = [].filter.call(rb.childNodes, function(n) { return n.nodeType === 3 && n.textContent.trim(); })[0]; if (rtn) rtn.textContent = "เริ่มใหม่"; }
      // save dot
      var sd = document.querySelector("#saveDot span"); if (sd) { var sdt = sd.textContent.trim(); if (sdt === "Saved") sd.textContent = "บันทึกแล้ว"; else if (sdt === "Saving…") sd.textContent = "กำลังบันทึก…"; }
      // export modal buttons
      var tr1 = document.getElementById("toggleReport"); if (tr1) { var tn1 = [].filter.call(tr1.childNodes, function(n) { return n.nodeType === 3 && n.textContent.trim(); })[0]; if (tn1) tn1.textContent = "รายงาน"; }
      var tg1 = document.getElementById("toggleGuide"); if (tg1) { var tn2 = [].filter.call(tg1.childNodes, function(n) { return n.nodeType === 3 && n.textContent.trim(); })[0]; if (tn2) tn2.textContent = "📖 คู่มือ"; }
      var cx1 = document.getElementById("copyXml"); if (cx1) { var tn3 = [].filter.call(cx1.childNodes, function(n) { return n.nodeType === 3 && n.textContent.trim(); })[0]; if (tn3) tn3.textContent = "คัดลอก"; }
      var dx1 = document.getElementById("dlXml"); if (dx1) { var tn4 = [].filter.call(dx1.childNodes, function(n) { return n.nodeType === 3 && n.textContent.trim(); })[0]; if (tn4) tn4.textContent = "ดาวน์โหลด .xml"; }
    }
  }
  function updateTips() {
    document.querySelectorAll("[data-tip-th],[data-tip-en]").forEach(function (el) {
      var tip = BL === "en" ? (el.dataset.tipEn || el.dataset.tipTh || "") : (el.dataset.tipTh || el.dataset.tipEn || "");
      if (tip) el.setAttribute("data-tip", tip); else el.removeAttribute("data-tip");
    });
  }
  // Mobile touch tooltips · tap shows tooltip, auto-dismisses after 1.6s
  (function () {
    var activeEl = null, timer = null;
    function clearTip() { if (activeEl) { activeEl.classList.remove("tip-show"); activeEl = null; } clearTimeout(timer); }
    document.addEventListener("touchstart", function (e) {
      clearTip();
      var el = e.target.closest("[data-tip]");
      if (el) { activeEl = el; el.classList.add("tip-show"); timer = setTimeout(clearTip, 1600); }
    }, { passive: true });
  })();

  function applyBuilderLang(lang) {
    BL = lang; localStorage.setItem("bxb_lang", lang);
    if (S) { S.lang = lang; save(); }
    // sync all lang toggle buttons (topbar + start screen)
    document.querySelectorAll("[data-bl]").forEach(function (b) { b.classList.toggle("on", b.dataset.bl === lang); });
    var mlb = document.getElementById("mobLangBtn"); if (mlb) mlb.textContent = lang.toUpperCase();
    buildLib(); setupLibDrag(); if (typeof renderProps === "function") renderProps(); renderSeo(); renderDesign();
    if (S) renderCanvas(); else renderStart();
    translateChrome();
    updateTips();
  }
  var blEl = $("#blLang");
  if (blEl) blEl.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) applyBuilderLang(b.dataset.bl); });
  var startLangEl = $(".start-lang");
  if (startLangEl) startLangEl.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b && b.dataset.bl) applyBuilderLang(b.dataset.bl); });

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
          if (!data || !Array.isArray(data.blocks)) { toast("ไฟล์ไม่ถูกต้อง · ต้องเป็น .json ที่ export จาก BlogKub"); return; }
          S = data;
          if (!S.seo) S.seo = freshProject().seo;
          if (!S.design) S.design = freshProject().design;
          SEL = null; HISTORY = []; pushHistory();
          $("#startScreen").style.display = "none";
          $("#projName").value = S.name || "โปรเจกต์";
          renderCanvas(); renderProps(); renderSeo(); renderDesign(); buildLib(); setupLibDrag(); save();
          toast("โหลดโปรเจกต์แล้ว: " + (S.name || "ไม่มีชื่อ"));
        } catch (err) { toast("อ่านไฟล์ไม่ได้ · " + String(err).slice(0, 60)); }
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
          + (blocks.length ? ' · ' + blocks.slice(0, 3).map(function (b) { return blkLabel(b.type); }).join(", ") + (blocks.length > 3 ? "…" : "") : "")
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
  updateTips();
  if (BL === "en") applyBuilderLang("en");
  // resume saved project?
  try {
    var saved = localStorage.getItem(KEY);
    if (saved) { S = JSON.parse(saved); if (S && S.blocks) { enterBuilder(); } }
  } catch (e) {}

  // expose minimal for debugging
  window.BXBApp = { genXML: function () { return genXML(); }, state: function () { return S; } };
})();
