# BlogKub Cloud — โมดูล 4: Cloudflare Infrastructure (PROTOTYPE)

ระบบต้นแบบ "ฐานทัพหลังบ้าน" ตามสถาปัตยกรรม Serverless 100% บน Cloudflare
สถานะ: **ต้นแบบใช้งานได้จริง** — ครอบคลุมทุกหัวข้อในสเปก แล้วค่อยพัฒนา/เชื่อมเข้าแอปเป็นเฟส

## ผังระบบ

```
ผู้ใช้ (เบราว์เซอร์)
 ├─ Cloudflare Pages ........ หน้าเว็บ Builder (ของเดิม ไม่แตะ)
 ├─ IndexedDB ............... Offline-First: เซฟทุกจังหวะลากวาง แม้เน็ตหลุดงานไม่หาย
 └─ cloud-sync.js ─────────► Cloudflare Worker (blogkub-cloud) — "พนักงานเสิร์ฟ" ตื่นเฉพาะตอนถูกเรียก
                               ├─ KV ...... session ล็อกอิน + magic link token (ความจำระยะสั้น)
                               ├─ D1 ...... users / projects / likes (สมุดทะเบียน)
                               └─ R2 ...... ไฟล์ JSON state + snapshots (โกดังโปรเจกต์)
```

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | คืออะไร |
|---|---|
| `src/worker.js` | Worker API ทั้งหมด (auth / projects / snapshots / community) |
| `schema.sql` | โครงตาราง D1 |
| `wrangler.toml` | การตั้งค่า + bindings (ต้องใส่ id จริงก่อน deploy) |
| `client/cloud-sync.js` | ไลบรารีฝั่งเบราว์เซอร์ `BKCloud` — IndexedDB + Auto-Sync |

## วิธี Deploy (ครั้งแรก ~10 นาที)

```bash
cd cloud
npm i -g wrangler          # ถ้ายังไม่มี
wrangler login

# 1) สร้างทรัพยากร แล้วเอา id ที่ได้ไปใส่ใน wrangler.toml
wrangler d1 create blogkub
wrangler kv namespace create KV
wrangler r2 bucket create blogkub-projects

# 2) สร้างตาราง
wrangler d1 execute blogkub --file=schema.sql --remote

# 3) ปล่อยขึ้นฟ้า
wrangler deploy
```

ทดสอบเร็วๆ (DEV_MODE=1 — magic link ตอบกลับมาตรงๆ ไม่ส่งอีเมล):

```bash
curl -X POST https://blogkub-cloud.<acc>.workers.dev/api/auth/request-link \
     -H 'Content-Type: application/json' -d '{"email":"me@example.com"}'
# → { ok:true, devLink:"...verify?token=..." }  เปิดลิงก์ = ล็อกอินสำเร็จ (ได้ cookie)
```

## API สรุป

| กลุ่ม | Endpoint |
|---|---|
| Auth | `POST /api/auth/request-link` · `GET /api/auth/verify?token=` · `GET /api/me` · `POST /api/logout` |
| Projects | `GET/PUT/DELETE /api/projects/:id` · `GET /api/projects` |
| Time Machine | `GET/POST /api/projects/:id/snapshots` · `POST /api/projects/:id/restore` |
| Community | `POST /api/projects/:id/publish` · `GET /api/community` · `POST /api/community/:id/clone` · `POST /api/community/:id/like` |

พฤติกรรมตามสเปก:
- **Guest Mode** — ไม่ล็อกอินก็ใช้ builder + เซฟ IndexedDB + export ได้ครบ (client ไม่ยิง API เลย)
- **Hybrid Auto-Save** — ทุก edit เซฟลงเครื่องทันที; ล็อกอินแล้วซิงก์ขึ้น R2 ทุก 3 นาที หรือเมื่อ idle 10 วิ → สถานะ "✅ บันทึกขึ้นคลาวด์แล้ว" ผ่าน `onStatus`
- **Cross-Device** — `loadProject()` ดึงจาก cloud ก่อน ถ้าไม่มีค่อย fallback local
- **Time Machine** — snapshot อัตโนมัติก่อน restore เสมอ (กันกดผิด), เก็บสูงสุด 20 จุด/โปรเจกต์
- **Community** — publish → public ใน D1; clone → copy JSON ใน R2 ข้าม workspace; like กันกดซ้ำด้วยตาราง likes

## การเชื่อมเข้าแอป (เฟสถัดไป — ยังไม่แตะ builder ปัจจุบัน)

1. ใส่ `<script src="cloud/client/cloud-sync.js">` ใน `app.html`
2. เรียก `BKCloud.init({...})` ตอนบูต + เติม `BKCloud.markDirty()` ต่อท้ายฟังก์ชัน `save()` เดิม
3. UI: ปุ่มล็อกอิน (กรอกอีเมล → `requestLink`), badge สถานะซิงก์ข้าง save-dot, เมนู History ต่อกับ `listSnapshots()/restore()`
4. ผูก `snapshot("export")` เข้ากับปุ่ม Export XML

## ข้อจำกัดของต้นแบบ (ทำต่อภายหลัง)

- อีเมลจริงใช้ MailChannels — ต้องตั้ง SPF/DKIM ของโดเมนก่อนปิด DEV_MODE
- Google Social Login ยังไม่ทำ (โครงรองรับ: เพิ่ม route OAuth แล้ว upsert user เหมือน magic link)
- ยังไม่มี rate-limit / ขนาด quota ต่อผู้ใช้ (มีเพดานไฟล์ 1.5MB แล้ว)
- Preview link ชั่วคราว (KV) ยังไม่ทำ
- Conflict resolution ข้ามอุปกรณ์แบบละเอียด (ตอนนี้ last-write-wins)
