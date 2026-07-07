# BlogKub — Private Preview Deploy

โหมดปัจจุบัน: **พรีวิวส่วนตัว** (กัน Google เก็บดัชนีอยู่)

## โครงสร้างไฟล์
```
index.html        หน้าเลือกภาษา (/)
th/index.html     เว็บภาษาไทย (/th/)
en/index.html     เว็บภาษาอังกฤษ (/en/)
robots.txt        บล็อกบอตทั้งหมด (พรีวิว)
robots.launch.txt robots สำหรับตอนเปิดตัวจริง (ยังไม่ใช้)
sitemap.xml       แผนผังเว็บ 2 ภาษา + hreflang
```

## อัปขึ้น Cloudflare Pages (พรีวิวส่วนตัว)
1. ไปที่ https://pages.cloudflare.com → **Create a project → Direct Upload**
2. ลากไฟล์ทั้งหมดในโฟลเดอร์นี้วาง (ทั้ง index.html, โฟลเดอร์ th/ en/ และไฟล์ .txt .xml)
3. Deploy → ได้ลิงก์ `ชื่อโปรเจกต์.pages.dev`
4. **Settings → Access policy → Enable Access policy** → ใส่อีเมลคุณ
   → เข้าได้เฉพาะอีเมลคุณคนเดียว (ยืนยันด้วย One-time PIN)

## เมื่อพร้อมเปิดตัวจริง
1. ลบบรรทัดนี้จาก index.html, th/index.html, en/index.html:
   `<meta name="robots" content="noindex, nofollow">`
2. ลบ robots.txt แล้วเปลี่ยนชื่อ robots.launch.txt → robots.txt
3. ปิด Cloudflare Access
4. ต่อ Custom domain: www.blogkub.com (+ redirect apex → www)
5. ส่ง sitemap.xml เข้า Google Search Console + Bing Webmaster Tools

## หมายเหตุ
- เว็บนี้เป็น static ล้วน (HTML/CSS/JS) ไม่มี backend ไม่ต้อง build
- ลิงก์ภายในเป็น relative path — ทำงานได้ทั้งบน .pages.dev และโดเมนจริง
- hreflang/canonical ตั้งเป็น www.blogkub.com ไว้แล้ว (มีผลเต็มที่ตอนต่อโดเมนจริง)
