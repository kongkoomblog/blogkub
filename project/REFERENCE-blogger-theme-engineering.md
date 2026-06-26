# Blogger Theme Engineering — Reference (จากเอกสารวิจัย 2 ฉบับ, 2026)

อ้างอิง: `uploads/วิจัยพัฒนา Blogger Template 2026.pdf` (Doc A) + `uploads/งานวิจัย Blogger Enterprise SEO.pdf` (Doc B)
ใช้เป็นมาตรฐานในการสร้าง/ตรวจ Blogger XML theme ทุกตัวในโปรเจกต์นี้

## 1. XML Foundation
- `<html b:version='2' b:layoutsVersion='3' b:defaultwidgetversion='2'>` → ปลดล็อก `data:view` (แม่นกว่า `data:blog`)
- `b:css='false'` `b:js='false'` บน widget → ตัด `widget_css_bundle.css` + JS ขยะ Blogger (เพิ่ม PageSpeed) — **ต้องเขียน CSS/JS ทดแทนเอง**
- ห่อ skin เดิมด้วย `<b:if cond='data:view.isLayoutMode'>` เพื่อให้ลากวาง widget ในหลังบ้านได้
- ใช้ `<b:defaultmarkups>` + `<b:include>` ลดโค้ดซ้ำ (DRY) เลี่ยงเกินขนาดไฟล์

## 2. Semantic HTML5 + A11y (Lighthouse A11y 100)
- `<header role=banner>` (1 ครั้ง), `<nav role=navigation>`, `<main role=main id=main>` (ห้ามเกิน 1, ห้ามซ้อน landmark), `<aside role=complementary>`, `<footer role=contentinfo>`
- **Skip Navigation Link** หลัง `<body>` → `#main`; ซ่อนด้วย `position:absolute;left:-9999px`, โผล่ตอน `:focus` (ห้าม `display:none`)
- `aria-expanded` true/false บน mega menu / mobile slide menu (อัปเดตด้วย JS)
- tabindex แค่ `0` หรือ `-1` เท่านั้น (>0 = fail)
- **Heading ไดนามิกตาม page type** — H1 เดียวเสมอ:
  - Homepage (`data:view.isHomepage`) → H1 = `data:blog.title`
  - Article (`data:view.isSingleItem`) → H1 = `data:post.title`
  - Label (`data:view.isLabelSearch`) → H1 = `data:blog.searchLabel`
  - Static (`data:view.isPage`) → H1 = `data:post.title`

## 3. Performance / Core Web Vitals (เป้า: LCP <2.5s, CLS <0.1, INP <200ms)
- **LCP**: `dns-prefetch`/`preconnect` ไป `//1.bp.blogspot.com` + font server; `resizeImage()` ฝั่งเซิร์ฟเวอร์; ภาพ LCP ใส่ `fetchpriority="high"` + **ห้าม** `loading=lazy`; Critical CSS แบบ inline
- **CLS**: ใส่ `width`/`height` หรือ `aspect-ratio` ทุกภาพ; ห่อ AdSense ใน `<div>` ที่ตั้ง `min-height` ล่วงหน้า; `font-display:swap`
- **INP**: Vanilla JS เท่านั้น (เลี่ยง jQuery); lazy-load คอมเมนต์/widget ด้วย `IntersectionObserver`; Event Delegation; debounce scroll; yield to main thread

## 4. SEO Architecture
- Dynamic Title สลับ homepage / single item; Meta desc ← `data:view.description.escaped`
- Canonical: `<link expr:href='data:view.url.canonical' rel='canonical'/>` หรือ `<b:include data='blog' name='all-head-content'/>`
- **?m=1 (mobile param): อย่าลบด้วย JS** (เกิด redirect loop) — ปล่อยให้ canonical จัดการ ถูกต้องแล้ว
- Robots meta: index เฉพาะ article + static page; **noindex,follow** สำหรับ `/search?q=`, label ไม่สำคัญ, archive (กัน duplicate/UGC spam)
  - หมายเหตุโปรเจกต์: ลูกค้าเคยขอให้ label "ทำดัชนีได้" — ใช้ดุลยพินิจ; archive/search ควร noindex เสมอ
- Sitemap: Blogger ไม่มี XML sitemap มาตรฐาน → ใช้ `/atom.xml?redirect=false&start-index=1&max-results=500` (limit 500/feed) ส่ง GSC + Bing; ทำ HTML Sitemap Hub + Label Sitemap เป็น static page

## 5. Structured Data (JSON-LD @graph — 1 script/หน้า)
- ห่อ `<![CDATA[ ... ]]>` — **`]]>` ห้ามมีช่องว่าง/ตัดบรรทัดคั่น** ไม่งั้น XML พัง
- `@graph` array + เชื่อมด้วย `@id` (เช่น `https://site/#organization`)
- Homepage: WebSite + Organization (+ `sameAs`, `SearchAction`)
- Label: CollectionPage + BreadcrumbList
- Article: BlogPosting/Article (author Person, publisher Organization, ImageObject, datePublished, dateModified) → E-E-A-T
- AEO: Speakable schema ชี้ `cssSelector` ไปยังบทสรุป 50–75 คำ (`.summary`)
- ⚠️ **FAQ: Doc B (พ.ค. 2026) — Google ถอด FAQ Rich Results แล้ว** อย่ายัด FAQPage ทุกหน้า; Content-Schema Mismatch = เสี่ยง Spam Action (อันนี้ override คำแนะนำ FAQ ใน Doc A)

## 6. Crawlability — robots.txt (AI bots ปี 2026)
- Allow: Googlebot, Bingbot, YandexBot (+ `Clean-param` ตัด utm_*, ?m=1)
- Allow AI: OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, PerplexityBot, Google-Extended → รองรับ AEO/GEO citations
- Disallow: `/search`

## 7. Internal Linking — "Spider Web"
- ชั้น 1 Core: Homepage ↔ Pillar Pages (`/p/`) ← เมนู header/footer
- ชั้น 2 Hubs: Homepage ↔ Category Hubs (`/search/label/`) ← Labels widget + HTML Sitemap
- ชั้น 3 Clusters: Hub ↔ Article ← grid/list บน archive/label
- ชั้น 4 Web: Article ↔ Article ← Related Posts (ดึง Blogger JSON Feed `/feeds/posts/default/-/Label?alt=json-in-script` ด้วย JS) + Breadcrumb
- Mega menu: ตรวจ prefix `_` (เช่น `_Submenu`) จัดเป็นเมนูย่อยอัตโนมัติ

## 8. Image SEO
- `resizeImage()` ฝั่งเซิร์ฟเวอร์, WebP, width/height ทุกภาพ, fetchpriority/lazy ตามตำแหน่ง
- `data:post.featuredImage` / `data:post.thumbnailUrl`; เชื่อม ImageObject + og:image + twitter:image

## 9. AdSense Safe
- จองพื้นที่กัน CLS; ห้าม intrusive interstitial/ปุ่มหลอก/เมนูทับโฆษณา
- เนื้อหา > โฆษณาเสมอ; ห้าม thin/scraped/AI-mass content
- ต้องมี: หน้า About (author bio), Contact, Privacy Policy → E-E-A-T

## 10. Automation / Realtime
- WebSub: `<link rel="hub" href="https://pubsubhubbub.appspot.com/"/>` → แจ้ง Google เรียลไทม์เมื่อเผยแพร่ (ไม่ใช่ spam ping)
- CSP: `<meta http-equiv="Content-Security-Policy">` allow 'self' + Blogger/Google; เลี่ยง `eval()`, `unsafe-inline` (ใช้ nonce/CSS แทน); ทุกอย่าง HTTPS
- Cloudflare Workers (เฉพาะ custom domain): สกัด ?m=1, redirect/cache rules, llms.txt — งานระดับ advanced

## Priority (จาก Enterprise Blueprint)
วิกฤต: Semantic HTML5 + dynamic heading · Canonical/Robots/Sitemap · Core Web Vitals
สำคัญ: JSON-LD modular (ไม่สแปม FAQ) · AdSense placeholder/E-E-A-T · Internal links · Image SEO
แนะนำ: WCAG 2.2 landmarks · Answer blocks + Speakable
