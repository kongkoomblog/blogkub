# คำแนะนำสำหรับ Claude Design — ตกแต่งกราฟฟิก CSS (อ่านก่อนแก้โค้ด!)

> เอกสารนี้สำหรับ Claude อีกตัวที่จะเข้ามา **ออกแบบ/ตกแต่งกราฟฟิก CSS** ให้ธีม Blogger
> ในโปรเจกต์ `kongkoomblog/blogkub` เป้าหมายคือ **แต่งให้สวยขึ้นโดยไม่ทำให้ธีมพัง**
> (เอกสารเชิงลึกเพิ่มเติม: `PROJECT-HANDOFF.md`, `REFERENCE-blogger-theme-engineering.md`)

---

## 0. คำถามสำคัญ: Blogger รับ CSS ภายนอกได้ไหม? → **ห้ามใช้ CSS ภายนอกเด็ดขาด**

**ตอบสั้น:** อย่าใช้ external CSS / `<link rel="stylesheet">` / `@import` / `url(https://…)` ใด ๆ ทั้งสิ้น — มันจะทำให้ช้า เสี่ยงพัง และเสียคุณสมบัติของ Blogger

เหตุผล:
1. **CSS ทั้งหมดต้องอยู่ใน `<b:skin><![CDATA[ … ]]></b:skin>` เท่านั้น** เพราะเป็นที่เดียวที่ใช้ตัวแปรสกิน Blogger ได้ (`$(keycolor)`, `$(accentcolor)`, `$(radius)`, `$(bodyfont)`) และทำให้ Theme Designer ของ Blogger ทำงาน
2. External stylesheet = **render-blocking** โหลดช้า พัง Core Web Vitals (LCP/INP)
3. ถ้าโฮสต์ภายนอกล่ม/เปลี่ยน URL → **สไตล์เว็บพังทั้งหน้าทันที**
4. โปรเจกต์นี้ **generate CSS ทั้งก้อนจาก `assets/builder-app.js`** แล้วฝังใน `<b:skin>` อยู่แล้ว — ไม่มี stylesheet ภายนอกเลยแม้แต่ไฟล์เดียว ให้คงสถาปัตยกรรมนี้ไว้

**กฎรูป/ฟอนต์:**
- รูปประกอบกราฟฟิก → ใช้ **CSS gradient / SVG data-URI (`url("data:image/svg+xml,…")`)** เท่านั้น อย่าลิงก์รูปจากโฮสต์ภายนอก
- ฟอนต์ → ใช้ Google Font ตัวที่ `<head>` preload ไว้แล้ว (IBM Plex Sans Thai) อย่าเพิ่ม `@font-face` หรือ `<link>` ฟอนต์ใหม่
- ห้ามพิมพ์สตริง `]]>` ในโค้ด CSS ใด ๆ (มันจะปิด CDATA ก่อนเวลา → ธีมพัง)

---

## 1. ✅ แก้ตรงไหนได้ (SAFE ZONE — ที่อยู่ของ "กราฟฟิก")

ทุกอย่างอยู่ในไฟล์เดียว: **`assets/builder-app.js`**

### 1.1 CSS ธีมหลัก + กราฟฟิกต่อ template — `function themeCSS(d)` (~บรรทัด 3773)
เป็น **array ของสตริง CSS** join กัน แก้/เพิ่ม rule ที่นี่ได้เต็มที่ ตราบใดที่เป็น CSS ล้วน
คลาสของแต่ละ template มี prefix เฉพาะ — **แก้เฉพาะ prefix ของ template ที่ต้องการ:**

| Template | Prefix | ตัวอย่างลายเซ็นกราฟฟิก |
|---|---|---|
| travel | `.tb-*` | dot-grid map, wave divider, ringed 📍 |
| tech | `.tech-*` | blueprint grid + neon glow, terminal cursor |
| review | `.rv-*` | star watermark, diagonal BEST-PICK ribbon |
| course | `.edu-*` | bokeh circles, video play-button thumbs |
| company | `.corp-*` | grid + ring hero, glow CTA |
| sidebar-blog | `.sb-*` | parchment, newspaper rule |
| personal | `.pb-*` | avatar ring, warm cream |

พื้นที่ปลอดภัยสำหรับกราฟฟิก: `::before/::after`, `background: radial/linear/conic-gradient`,
`-webkit-mask-image`/`mask-image`, `box-shadow`, `filter`, `clip-path`, `@keyframes` (มีใช้อยู่แล้ว),
`transform`, `transition`, SVG data-URI ใน `background`

### 1.2 CSS ของฟีเจอร์เสริม — `<style>` ในฟังก์ชัน singleton
เช่น `faqCSS()`, `sliderCSS()`, และบล็อก `var css = "<style>" … "</style>"` (หลายจุด ~บรรทัด 139–1131)
แก้ CSS ภายใน `<style>…</style>` ได้ ห้ามแตะ `<script>` ที่ตามมา (`sc`)

---

## 2. ⛔ ห้ามแตะ (DANGER ZONE — แตะแล้ว Blogger พัง อัปโหลดไม่ผ่าน)

ห้ามแก้/ลบ/ย้าย สิ่งเหล่านี้ **เด็ดขาด**:

- **ทุก tag ที่ขึ้นต้นด้วย `<b:…>`** — `<b:skin>`, `<b:section>`, `<b:widget>`, `<b:includable>`,
  `<b:loop>`, `<b:if>`, `<b:else/>`, `<b:elseif/>`, `<b:eval>`, `<b:include>`, `<b:widget-settings>`,
  `<b:widget-setting>`, `<b:template-script>`, `<b:message>`
- **ทุก attribute `data:…` และ `expr:…`** — เช่น `data:post.body`, `data:view.description`,
  `expr:href`, `expr:src`, `data:blog.locale` (นี่คือ Blogger template language ไม่ใช่ค่าคงที่)
- **ตัวแปรสกิน `$(…)`** — `$(keycolor)`, `$(accentcolor)`, `$(radius)`, `$(bodyfont)` — ห้ามสร้างตัวใหม่
  ถ้าไม่ได้เพิ่มใน `skinVariables()` และห้ามลบ block `/* <Variable …> */`
- **`function genXML()`** โครงสร้าง XML skeleton (`<html b:…>`, `<head>`, includables, การประกอบ body)
- **`function skinVariables()`**, **`function minifyCSS()`**, **`function tplStyleVars()`**,
  **`function footerVars()`**
- **`resizeImage(…)`** และ logic ที่วนลูปโพสต์ / `condWrap` / การใส่บล็อกเข้า post includable
- **โครงสร้าง JSON-LD / `<script type="application/ld+json">`** และ meta robots/OG ใน `<head>`

หลักจำง่าย: **ถ้าเห็น `b:`, `data:`, `expr:`, `$(`, หรือ `<script>` → อย่าแตะ** แค่แต่ง CSS รอบ ๆ

---

## 3. ⚠️ กับดักที่ทำพลาดบ่อย

1. **Preview ≠ Export — ต้องแก้ 2 ที่ให้ตรงกัน**
   - `renderBlockInner(b)` = พรีวิวในแคนวาส ใช้ **inline style** (`style="…"`)
   - `renderBlockStatic(b)` = ไฟล์ export จริง ใช้ **คลาส `.prefix-*`** จาก `themeCSS`
   - ถ้าแต่งกราฟฟิกใหม่ ต้องอัปเดต **ทั้งคลาสใน `themeCSS` และ inline ใน `renderBlockInner`**
     ไม่งั้นพรีวิวกับเว็บจริงจะไม่เหมือนกัน
2. **ใช้ design token เสมอ อย่า hardcode สีแบรนด์** — ใช้ `var(--primary)`, `var(--accent)`,
   `var(--radius)`, `var(--font)`, `var(--text-main)`, `var(--text-muted)`, `var(--text-subtle)`,
   `var(--bg-body)`, `var(--bg-surface)`, `var(--border)`, `var(--hover-bg)` (นิยามใน `:root{…}` ~บรรทัด 3786
   และโหมดมืดใน `DARK_THEME_VARS`) เพื่อให้เปลี่ยนสีธีม + dark mode ทำงานอัตโนมัติ
3. **รองรับ dark mode** — สีที่เพิ่มควรอิงจาก token ข้างบน ถ้าจำเป็นต้อง fix สี ให้เช็ค `[data-theme=dark]`
4. **contrast ต้องผ่าน** — ตัวอักษรบนพื้น gradient/รูป ต้องอ่านออกทั้ง light/dark

---

## 4. ✅ ขั้นตอนการทำงาน (ทำทุกครั้งก่อน commit)

1. แก้เฉพาะ CSS ใน SAFE ZONE (ข้อ 1)
2. `node --check assets/builder-app.js` — ต้องผ่าน (ไม่มี syntax error)
3. รันฮาร์เนสตรวจ (มีอยู่แล้วใน scratchpad ของ session ก่อน หรือสร้างใหม่จากแพตเทิร์นนี้):
   - เปิด `builder.html` ผ่าน local server → `#gateYes` → คลิก `.tpl-card[data-tpl="<id>"]`
   - `window.BXBApp.genXML()` แล้ว parse ด้วย `DOMParser` เช็ค **ไม่มี `<parsererror>`** (well-formed)
   - แคปหน้าจอ CSS ที่ export จริง (ดึงจาก `<b:skin><![CDATA[` … `]]></b:skin>` แล้ว substitute `$()`)
     ไม่ใช่ดูแค่พรีวิว — พรีวิวใช้ inline style คนละชุดกับ export
4. **bump cache version** ใน `builder.html`: `assets/builder-app.js?v=YYYYMMDD-N` (เพิ่มเลข N)
5. ตรวจว่าทั้ง 8 template ยัง export XML well-formed (ห้าม regress)
6. commit + push (ทำทีละอย่าง อย่าแก้พร้อมกันหลาย session ในไฟล์เดียว)

---

## 5. เช็กลิสต์ก่อน push (ทุกข้อต้อง ✅)

- [ ] แตะเฉพาะสตริง CSS — ไม่แตะ `b:` / `data:` / `expr:` / `$(` / `<script>`
- [ ] ไม่มี external `<link>` / `@import` / `url(https…)` / `@font-face` ใหม่
- [ ] ไม่มีสตริง `]]>` โผล่ในโค้ด CSS
- [ ] ใช้ `var(--token)` แทนสี hardcode
- [ ] อัปเดตทั้ง `themeCSS` (export) และ `renderBlockInner` (preview) ให้ตรงกัน
- [ ] `node --check` ผ่าน + genXML ทั้ง 8 template well-formed (ไม่มี parsererror)
- [ ] bump `?v=` ใน builder.html
- [ ] อ่านออกทั้ง light + dark, contrast ผ่าน
