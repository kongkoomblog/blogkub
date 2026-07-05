# BlogKub — Project Handoff

> Updated: 2026-06-28. ไฟล์นี้คือ context สมบูรณ์ของโปรเจกต์ สำหรับส่งต่อให้ AI หรือ developer รายใหม่ อ่านทั้งหมดก่อนแตะโค้ด

---

## 1. สิ่งที่โปรเจกต์นี้คือ

**BlogKub** — เครื่องมือ visual builder ฝั่ง client-side 100% สำหรับสร้าง Blogger XML theme ไม่มี backend, ไม่มี database, ไม่ต้อง login  
Deploy เป็น static files บน **Cloudflare Pages** ที่ `github.com/kongkoomblog/bloggerxmlbuilder`  
Auto-deploy pipeline: push to `main` → Cloudflare Pages deploy อัตโนมัติ

ผู้ใช้ออกแบบด้วย drag/tap → live preview → กด Export → ได้ไฟล์ `.xml` → นำไปอัปโหลดใน Blogger (Theme → Edit HTML → Backup/Restore → Upload)

---

## 2. File Map

```
project/
├── index.html                        Language picker root (noindex pre-launch)
├── app.html                          THE BUILDER APP — shell UI (3-panel)
├── th/index.html                     Marketing homepage ภาษาไทย
├── en/index.html                     Marketing homepage ภาษาอังกฤษ
├── assets/builder-app.js             THE ENGINE — logic ทั้งหมด (~2200 บรรทัด)
├── sitemap.xml                       Bilingual sitemap + hreflang
├── robots.txt                        Pre-launch: blocks all crawlers
├── robots.launch.txt                 Production robots (go-live ให้เปลี่ยนเป็นนี้)
├── PROJECT-HANDOFF.md                ไฟล์นี้
├── DEPLOY-README.md                  วิธี deploy บน Cloudflare Pages
└── REFERENCE-blogger-theme-engineering.md   Engineering rules จาก research PDFs
```

**Pre-launch flags ที่ต้องเอาออกตอน go-live:**
- `<meta name="robots" content="noindex,nofollow">` ใน index/th/en/app.html
- `robots.txt` = block-all → เปลี่ยนเป็น `robots.launch.txt`

---

## 3. Engine Architecture (`assets/builder-app.js`)

Single IIFE, vanilla ES5, ไม่มี build step, ไม่มี npm

### State Object (`S`)
```js
S = {
  name: "ชื่อโปรเจกต์",
  lang: "th",        // 'th' | 'en'
  design: {
    primary: "#6366f1",
    accent: "#8b5cf6",
    font: "sans",    // 'sans' | 'serif' | 'mono'
    radius: 12       // px
  },
  seo: {
    blogTitle, title, desc,
    labelIndex: Bool,
    schema: Bool,
    og: Bool,
    orgType: "Organization",
    sameAs: "URL1\nURL2",
    siteUrl, logoUrl,
    schemaSoftwareApp: Bool
  },
  blocks: [
    { id, type, props: {...}, vis: { scope: 'home|item|page|label', hideMobile: Bool } }
  ]
}
```
บันทึกใน `localStorage` key `bxb_project_v1`

### Block Types
| กลุ่ม | Types |
|---|---|
| POST-DRIVEN (ต้องอยู่ใน Blog widget) | `postgrid`, `postlist`, `featured` |
| Static (render ใน body ปกติ) | `header`, `hero`, `footer`, `about`, `text`, `columns`, `cta`, `image`, `ad` |
| Special | `sidebar` |

### Key Functions
| Function | หน้าที่ |
|---|---|
| `renderBlockInner(b)` | Preview markup บน canvas (dummy content, inline styles) |
| `renderBlockStatic(b)` | Blogger XML markup (ใช้ `data:` tags, `<b:loop>`, CSS vars) |
| `fieldsFor(b)` | Properties panel HTML per block type |
| `genXML()` | Assemble XML ทั้งหมด — entry point หลัก |
| `themeCSS(d)` | สร้าง CSS สำหรับ `<b:skin>` |
| `schemaGraph(seo)` | สร้าง JSON-LD schemas |
| `ogTags(seo)` | สร้าง OG + Twitter Card tags |
| `condWrap(html, b)` | ห่อ `<b:if cond='...'>` ตาม `b.vis.scope` |

---

## 4. กฎสำคัญ Blogger XML (อย่าเพิ่งแตะถ้าไม่เข้าใจ)

### 4.1 Blog Widget Architecture
`data:posts` ใช้ได้เฉพาะใน `<b:includable id='main'>` ของ Blog widget เท่านั้น  
`genXML()` จึงทำแบบนี้:
1. แยก post-driven blocks ออกจาก static blocks
2. สร้าง Blog widget เดียวที่รวม `main`, `post`, `nextprev` + standard includables ทั้งหมด
3. Static blocks render โดยตรงใน `<body>` ตามลำดับ
4. ถ้าไม่มี post block เลย ก็ยังสร้าง Blog widget fallback (Blogger ต้องการ Blog widget เสมอ)

### 4.2 Standard Blogger Blog Widget Includables (CRITICAL)
Blog widget version='2' ต้องมี includables มาตรฐานครบ ไม่งั้น Blogger parse fail → `<b:widget-settings>` และ script content รั่วออกมาเป็น text บนหน้าเว็บ

ปัจจุบัน `genXML()` ใส่ `standardBlogIncludables` ครบ 25+ ตัว:
`aboutPostAuthor`, `addComments`, `commentAuthorAvatar`, `commentDeleteIcon`, `commentForm`, `commentFormIframeSrc`, `commentItem`, `commentList`, `commentPicker`, `comments`, `commentsTitle`, `feedLinks`, `feedLinksBody`, `homePageLink`, `iframeComments`, `inlineAd`, `nextPageLink`, `postBody`, `postBodySnippet`, `postCommentsAndAd`, `postCommentsLink`, `postFooter`, `postFooterAuthorProfile`, `postHeader`, `postMeta`, `postPagination`, `postTitle`, `previousPageLink`, `threadedCommentForm`, `threadedCommentJs`, `threadedComments`, `tooltipCss`

### 4.3 `<b:widget-settings>` ห้ามใส่ใน Blog widget
เมื่อก่อนใส่ `<b:widget-settings>` และพบว่า Blogger render เนื้อหาของ tag นี้เป็น visible text บนหน้าเว็บ ปัจจุบัน `widgetSettings = ""` (ไม่ใส่เลย)

### 4.4 Snippet/Excerpt — ใช้ body filter แทน data:post.snippet
`data:post.snippet` ต้องรอ Blogger backend populate ไม่ reliable  
ปัจจุบันใช้:
```xml
<b:if cond='data:post.metaDescription != ""'>
  <data:post.metaDescription/>
<b:else/>
  <b:eval expr='data:post.body snippet { length: 170, links: false, linebreaks: false, ellipsis: true }'/>
</b:if>
```
`data:post.body snippet { ... }` คือ Blogger built-in filter — ดึง plain text จาก HTML body โดยตรง ใช้งานได้เสมอ

### 4.5 JSON-LD / Schema placement
- **Organization, WebSite, WebPage, BreadcrumbList, CollectionPage** → อยู่ใน `<head>` ผ่าน `schemaGraph()` → ใช้ `data:view.*`
- **BlogPosting** → อยู่ใน `<head>` ด้วย `<b:if cond='data:view.isPost'>` → ใช้ `data:view.*`
- **ห้ามใส่ JSON-LD ที่ใช้ `data:post.*` ไว้นอก Blog widget includable** — `data:post.*` ไม่ available นอก scope นั้น

### 4.6 resizeImage ratio format
```
resizeImage(url, width, "16:9")   ✅
resizeImage(url, width, "1:1")    ✅
resizeImage(url, width, "auto")   ❌ ทำให้ template พัง
```

### 4.7 อย่าใส่ข้อมูลซ้ำบนหน้าโพสต์
`<data:post.body/>` รวม featured image อยู่แล้ว — ห้ามใส่ `<img src='featuredImage'>` แยกต่างหากอีกครั้ง (จะแสดงรูปซ้ำ)

---

## 5. Bugs ที่แก้แล้ว (อย่า reintroduce)

| # | อาการ | สาเหตุ | Fix |
|---|---|---|---|
| 1 | Blog widget ไม่ render เลย | ขาด `<b:includable id='nextprev'>` | เพิ่ม nextprev includable |
| 2 | หน้าโพสต์ blank | BlogPosting JSON-LD ใช้ `resizeImage(...,"auto")` — ratio ผิด | ลบ auto, ย้าย schema ออกจาก post includable |
| 3 | รูปภาพซ้ำบนหน้าโพสต์ | ใส่ `<img>` ของ featuredImage แยก + body มีรูปอยู่แล้ว | ลบ `<img>` ซ้ำออก |
| 4 | Snippet/excerpt ไม่แสดง | `<b:widget-settings>` รั่วเป็น text + ขาด standard includables + ใช้ `data:post.snippet` | ลบ widget-settings, เพิ่ม standard includables, เปลี่ยนเป็น body snippet filter |

---

## 6. Features ที่ implement แล้ว

**Visual Builder**
- 3-panel workspace (Layers / Canvas / Properties)
- Responsive preview switcher (desktop/tablet/mobile)
- Pop-out preview window
- Drag-to-reorder blocks (Layers panel)
- Tap-to-add blocks (mobile bottom sheet)
- Per-block conditional display (`<b:if>` by page type: home/item/page/label)
- Hide on mobile toggle
- Undo history
- Autosave to localStorage

**SEO & Schema**
- Organization/Person/LocalBusiness schema
- WebSite schema
- BlogPosting schema (ใน head ใช้ data:view.*)
- WebPage + Speakable
- BreadcrumbList
- CollectionPage (label/archive)
- Open Graph + Twitter Card
- Canonical + robots per page type
- Label index toggle
- AEO summary block

**Block Types**
header, hero, postgrid, postlist, featured, about, text, columns, cta, image, ad, footer, sidebar

**Navigation**
- 7 menu types (ไม่ได้ใช้ทั้งหมด)
- Dropdown support
- Mobile slide-in drawer (left/right)
- Search form
- Footer social icons

**Onboarding**
- Template picker
- Step-by-step signup guide พร้อม SEO tips
- Bilingual (TH/EN)

---

## 7. วิธี Debug

เปิด `app.html` โดยตรง (ไม่ต้อง server) แล้วใช้ browser console:
```js
BXBApp.state()    // ดู state ปัจจุบัน
BXBApp.genXML()   // ดู XML ที่จะ export
```

ทดสอบ Blogger upload: copy genXML() → Blogger → Theme → Edit HTML → วาง → บันทึก

⚠️ **browser DOMParser ไม่เพียงพอ** — ยอมรับ XML ที่ Blogger Java parser ปฏิเสธ ต้องทดสอบกับ Blogger จริงเท่านั้น

---

## 8. Constraints (ห้ามเปลี่ยน)

- **ไม่มี backend / DB / login** — 100% client-side vanilla JS
- **ไม่มี React/Vue/Angular/Node/npm/build step**
- Output ต้องเป็น **valid Blogger XML ที่ upload ได้จริง**
- รองรับ **TH/EN bilingual**
- AdSense-friendly, SEO/AEO/GEO oriented

---

## 9. Next Steps / Known Gaps

- ทดสอบ XML export กับ Blogger จริงทุก block type combination
- ตรวจ `<Variable>` ทุกตัวว่า valid ใน Blogger Theme Designer
- AEO block (sidebar) ต้องทดสอบว่า `data:post.snippet` หรือ body snippet filter ใช้งานได้
- WebSub hub link, IndexNow (mention ใน marketing แต่ยังไม่ implement)
- i18n audit — บาง string อาจยังเป็นแค่ภาษาไทย
- Consider unit tests สำหรับ `genXML()`

---

## 10. Git History (ล่าสุด)

```
a133d62  fix: remove widget-settings leak, add standard includables, use body snippet filter
a0a49b0  fix: add showSnippet:true setting and use metaDescription ?: snippet eval
700c050  fix: add style.unittype TextAndImage and snippet fallback to date
8a143cb  fix: use b:if cond check for snippet instead of b:eval with ?: operator
bf6b896  fix: remove duplicate featured image
a46ce78  fix: isolate BlogPosting JSON-LD from post includable
13e4849  fix: add missing nextprev includable (Blog widget parse error root cause)
```
