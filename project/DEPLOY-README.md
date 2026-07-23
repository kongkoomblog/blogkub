# BlogKub — Deploy

โหมดปัจจุบัน: **พรีวิวส่วนตัว** (กัน Google เก็บดัชนีอยู่ — `noindex` + `robots.txt` บล็อกบอต)

การ deploy ใช้ **Cloudflare Workers Static Assets** ผ่าน `wrangler.jsonc` ที่ราก repo
(`assets.directory: project` → เสิร์ฟทุกไฟล์ในโฟลเดอร์ `project/`)

---

## 🚀 Deploy อัตโนมัติ (แนะนำ — เหมาะกับการทำงานบนมือถือ)

ไฟล์ workflow เตรียมไว้แล้วที่ `ops/cloudflare-deploy.yml`
เมื่อ **push ขึ้น `main`** เว็บจะ **deploy ขึ้น Cloudflare เองอัตโนมัติ** ไม่ต้องลากไฟล์อัปเอง

> ⚙️ **ต้องเปิดใช้งานก่อน 1 ขั้น:** ย้ายไฟล์ไปที่ `.github/workflows/deploy.yml`
> (GitHub ไม่ให้ push ไฟล์ใน `.github/workflows/` ด้วย token ที่ไม่มีสิทธิ์ `workflow`)
> วิธีทำอย่างใดอย่างหนึ่ง:
> - ตอน **rotate GitHub PAT** ให้ติ๊กสิทธิ์ **`workflow`** ด้วย แล้วบอกผม เดี๋ยวผมย้ายไฟล์ให้เอง
> - หรือสร้างเองบน GitHub web: New file → `.github/workflows/deploy.yml` → คัดลอกเนื้อหาจาก `ops/cloudflare-deploy.yml` มาวาง → commit

### ตั้งค่าครั้งเดียว (ทำจากเบราว์เซอร์บนมือถือได้)
1. สร้าง **Cloudflare API token**
   - Cloudflare Dashboard → My Profile → **API Tokens** → **Create Token**
   - ใช้เทมเพลต **"Edit Cloudflare Workers"** → Continue → Create
   - คัดลอกค่า token ไว้ (เห็นครั้งเดียว)
2. หา **Account ID**
   - Cloudflare Dashboard → **Workers & Pages** → ดูแถบขวา "Account ID"
3. ใส่เป็น **GitHub Secrets**
   - GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - เพิ่ม 2 ตัว:
     - `CLOUDFLARE_API_TOKEN` = token จากข้อ 1
     - `CLOUDFLARE_ACCOUNT_ID` = account id จากข้อ 2

> ⚠️ ใส่ token ใน **GitHub Secrets เท่านั้น** อย่าพิมพ์ลงแชทหรือ commit ลงไฟล์เด็ดขาด

หลังจากนี้ทุกครั้งที่มีการ push (เช่นเวลาผมแก้เว็บให้แล้ว push) เว็บจะอัปเดตเองภายในไม่กี่นาที
สั่ง deploy เองด้วยมือก็ได้ที่แท็บ **Actions → Deploy to Cloudflare → Run workflow**

---

## โครงสร้างไฟล์ (ปัจจุบัน)
```
project/
  index.html         เว็บภาษาไทย (/)  ← หน้าแรกจริง
  en/index.html      เว็บภาษาอังกฤษ (/en/)
  th/index.html      redirect → /
  about,contact,privacy,terms,builder,404 …
  learn/             ศูนย์เรียนรู้ + 40 บทความ + /learn/images /learn/og
  blog/              บล็อก 3 บทความ + /blog/images
  assets/            builder-app.js, โลโก้
  rss.xml feed.json  ฟีด (สร้างด้วย scripts/build-feeds.cjs)
  sitemap*.xml llms.txt robots.txt
  robots.launch.txt  robots สำหรับตอนเปิดตัว (ยังไม่ใช้)
  _headers           caching ปัจจุบัน (no-cache — ดีช่วง dev)
  _headers.launch    caching สำหรับ production (สลับตอนเปิดตัว)
```

## ✅ เมื่อพร้อมเปิดตัวจริง (Launch checklist)
1. ลบ `<meta name="robots" content="noindex, nofollow">` จาก `index.html`, `en/index.html`, `learn/index.html`
2. ลบ `robots.txt` แล้วเปลี่ยนชื่อ `robots.launch.txt` → `robots.txt`
3. เปลี่ยนชื่อ `_headers.launch` → `_headers` (เปิด caching เพื่อความเร็ว)
4. ปิด Cloudflare Access (ถ้าเปิดพรีวิวส่วนตัวไว้)
5. ต่อ Custom domain `www.blogkub.com` (+ redirect apex → www)
6. ส่ง `sitemap.xml` เข้า Google Search Console + Bing Webmaster Tools
7. **Rotate GitHub PAT ที่เคยหลุด** (สำคัญด้านความปลอดภัย)

## หมายเหตุ
- เว็บเป็น static ล้วน ไม่มี backend ไม่ต้อง build
- อัปเดตฟีดหลังเพิ่มบทความ: `node scripts/build-feeds.cjs`
- โฟลเดอร์ `cloud/` เป็น Worker แยก (ฟีเจอร์ cloud sync) — deploy ต่างหาก ไม่รวมใน workflow นี้
