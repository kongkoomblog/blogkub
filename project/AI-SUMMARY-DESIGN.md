# AI Summary — Design Doc (เก็บไว้ต่อยอดทีหลัง)

> ร่าง 2026-07-12 · สถานะ: **แผน ยังไม่ implement** · ต่อยอดจากฟีเจอร์ AEO Summary Box ที่มีอยู่
> เป้าหมาย: ให้กล่องสรุปแสดง "สรุปด้วย AI จริงๆ" (ย่อความใหม่) แทนการตัดข้อความต้นบทความ

---

## 1. โจทย์และข้อจำกัดหลัก

BlogKub ส่งออกเป็น **ธีม Blogger (HTML/JS สาธารณะ)** ที่รันบนเซิร์ฟเวอร์ Blogger → **ห้ามฝัง API key ในธีมเด็ดขาด** (ใครเปิด view-source ก็เห็น เอาไปเผาโทเคนได้)

ดังนั้น AI call **ต้องผ่าน backend ที่เจ้าของบล็อกคุมเอง** — โชคดีที่ BlogKub มี Cloudflare Worker อยู่แล้ว (`cloud/src/worker.js`, มี KV + D1 + R2) → ใช้เป็น proxy เก็บ key ได้ทันที

**Fallback chain ปัจจุบัน (ทำไปแล้ว):**
`data:post.metaDescription` (Search Description) → `data:post.body snippet` (ตัดอัตโนมัติ)
งานนี้แค่ "เสียบ AI" เข้ามาเป็นชั้นบนสุดของ chain นี้ โดยไม่พังของเดิม

---

## 2. สถาปัตยกรรม — 3 ทางเลือก

### Option A — Worker proxy สรุปตอนอ่าน (read-time) + cache  ⭐ MVP
```
ผู้อ่านเปิดโพสต์
  └─ theme JS (progressive enhancement)
       └─POST /summarize {url, siteToken}──► Cloudflare Worker (blogkub-cloud)
                                              ├─ ตรวจ Origin allowlist + siteToken + rate limit
                                              ├─ KV get  "sum:<hash(url)>"  ── มี? คืนเลย (instant)
                                              ├─ ไม่มี → ดึง body จาก feed แล้วเรียก AI (Claude Haiku)
                                              └─ KV put  "sum:<hash(url)>"  (cache ถาวร) → คืนสรุป
       └─ inject ลง .qt-aeo-summary (ทับ fallback ที่ server-render ไว้)
```
- **ต้นทุนคุมได้:** generate ครั้งเดียวต่อโพสต์ (ผู้อ่านคนแรก) ที่เหลืออ่านจาก cache
- **ข้อดี:** อัตโนมัติเต็มตัว, ไม่ต้องแก้โพสต์
- **ข้อเสีย (สำคัญ):** สรุปถูกเสียบด้วย JS → **AI crawler / bot ที่ไม่รัน JS จะไม่เห็น** (Google เรนเดอร์ JS ได้ แต่ ChatGPT/Perplexity bot ส่วนใหญ่ไม่รัน) → ได้แค่ fallback excerpt สำหรับ AEO/GEO จริง

### Option B — Pre-generate → เขียนลง Search Description  ⭐ ดีสุดสำหรับ AEO/GEO
- สร้างสรุปล่วงหน้าแบบ batch แล้วเอาไปใส่ช่อง **"คำอธิบายสำหรับการค้นหา"** ของโพสต์
- กล่อง AEO **อ่าน metaDescription เป็นอันดับแรกอยู่แล้ว** (เพิ่งทำ) → สรุป AI จะถูก **server-render เป็นข้อความจริงใน HTML** → บอต/AI ทุกตัวเห็น 100%, zero read-time cost, zero key exposure
- **การนำเข้า** ทำได้ 2 ระดับ:
  - **B1 (แมนนวลกึ่งอัตโนมัติ):** หน้า "AI Summary Generator" ใน BlogKub ดึงรายชื่อโพสต์จาก public feed → ปั่นสรุปทีละอัน → ผู้ใช้กด copy ไปวางในช่อง Search Description เอง
  - **B2 (อัตโนมัติเต็ม):** ผู้ใช้ OAuth เชื่อม Blogger ครั้งเดียว → Worker เขียนสรุปกลับเข้าโพสต์ผ่าน **Blogger API `posts.patch`** (field `customMetaData` / search description) ให้เลย

### Option C — Hybrid (แนะนำเป็นปลายทาง)
Phase 1 = Option A (เห็นผลเร็ว, อัตโนมัติ) → Phase 2 = Option B2 (server-render, AEO-perfect)
เมื่อ B2 เขียน metaDescription แล้ว กล่องจะหยิบ metaDescription ก่อน → read-time Worker call เลิกทำงานเองโดยปริยาย (ประหยัดสุด)

---

## 3. แผนสร้างเป็นเฟส

| Phase | ทำอะไร | ผลลัพธ์ |
|---|---|---|
| **P1** | Worker endpoint `POST /summarize` (key=secret, KV cache, origin allowlist, siteToken, rate limit) + theme snippet inject `.qt-aeo-summary` | สรุป AI ตอนอ่าน (JS) — เห็นในเบราว์เซอร์จริง |
| **P2** | หน้า "AI Summary Generator" ใน builder (ดึง feed → ปั่น batch → copy) = Option B1 | สรุป AI แบบ server-render (วางเอง) |
| **P3** | Blogger OAuth + `posts.patch` เขียน Search Description อัตโนมัติ = Option B2 | ครบวงจร อัตโนมัติ + AEO-perfect |
| **P4** | Dashboard: จำนวนโพสต์ที่มีสรุป, ต้นทุนโทเคน, ปุ่ม regenerate | ควบคุม/มองเห็นภาพรวม |

**เริ่มที่ P1** (คุ้มค่าเร็วสุด ต่อยอดจาก Worker ที่มี)

---

## 4. รายละเอียด Worker endpoint (P1)

```
POST https://<worker-domain>/summarize
body: { url: "<post permalink>", site: "<blog domain>", token: "<site token>" }
```
ขั้นตอนใน Worker:
1. **Auth/abuse guard** — ตรวจ `Origin`/`Referer` ตรง allowlist ของ site, ตรวจ `token` (ผูกกับ domain, ออกจาก builder), rate-limit ต่อ IP/site ผ่าน KV counter
2. **Cache** — `key = "sum:" + sha256(url)`; `env.KV.get` เจอ → คืนทันที
3. **ดึงเนื้อหา** — fetch `https://<site>/feeds/posts/default?alt=json&q=...` หรือรับ text ที่ theme ส่งมา (จำกัดความยาว เช่น ≤ 8k chars, strip HTML → plain text)
4. **เรียก AI** — Anthropic Messages API, model **`claude-haiku-4-5-20251001`** (ถูก/เร็ว/พอสำหรับ summarize)
5. `env.KV.put(key, summary)` (ไม่ตั้ง TTL = ถาวร; มีปุ่ม purge ตอน regenerate) → คืน `{summary, cached:false}`

**Prompt (ร่าง):**
```
สรุปบทความบล็อกนี้เป็นภาษาเดียวกับต้นฉบับ 2–3 ประโยค (≤ 60 คำ)
โทนกลาง เป็นข้อเท็จจริง ไม่ใส่คำโฆษณา ไม่ขึ้นต้นว่า "บทความนี้"
ตอบเป็นข้อความล้วนเท่านั้น ห้ามมี markdown/หัวข้อ
---
{post_text}
```
**Secrets:** `wrangler secret put ANTHROPIC_API_KEY` (อยู่ฝั่ง Worker เท่านั้น)

---

## 5. Theme snippet (P1, ฝั่งบล็อกที่ export)

เสียบต่อจากกล่อง AEO เดิม เป็น **progressive enhancement** (ไม่พัง no-JS):
```js
// .qt-aeo-summary มี fallback (metaDescription/excerpt) แสดงอยู่แล้ว
// ถ้า AI เปิดใช้ → เรียก Worker แล้วทับข้อความ ถ้าพลาด → คงของเดิมไว้
(function(){
  var box=document.querySelector('.qt-aeo-summary p'); if(!box)return;
  fetch(WORKER+'/summarize',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({url:location.href,site:location.hostname,token:SITE_TOKEN})})
   .then(r=>r.ok?r.json():null).then(d=>{ if(d&&d.summary) box.textContent=d.summary; })
   .catch(function(){});
})();
```
เปิด/ปิดจาก props ของ block AEO: `aiSummary:true` + ช่องกรอก Worker URL + Site token

---

## 6. ต้นทุน (ประเมินคร่าว)

- Haiku summarize ≈ 1.5k input + 120 output tokens/โพสต์ → เศษสตางค์/โพสต์
- generate **ครั้งเดียวต่อโพสต์** (cache) → บล็อก 1,000 โพสต์ = หลักบาท ครั้งเดียว
- read-time เกือบทั้งหมด hit cache → ~0
- Cloudflare Worker/KV: อยู่ใน free/หลักสิบบาทต่อเดือน

---

## 7. ความปลอดภัย / ข้อควรระวัง

- ❗ **API key อยู่ใน Worker secret เท่านั้น** — ห้ามหลุดเข้า theme/repo
- **Origin allowlist + site token** — กันคนอื่นยิง endpoint เผาโทเคนเจ้าของบล็อก
- **Rate limit + max body length** — กัน abuse / prompt ยาวเกิน
- **Content ToS** — ส่ง body โพสต์ (สาธารณะอยู่แล้ว) ไปยัง AI provider = ยอมรับได้; ระบุใน privacy ของ builder
- **PII/AdSense** — สรุปเป็น text เฉยๆ ไม่กระทบ policy
- **Regenerate/purge** — ปุ่มลบ cache ราย URL เมื่อแก้บทความ

---

## 8. ทำไม Phase 2 (server-render) สำคัญกว่าสำหรับ AEO/GEO

| | P1 (JS inject) | P2/P3 (metaDescription) |
|---|---|---|
| ผู้อ่านมนุษย์เห็นสรุป AI | ✅ | ✅ |
| Googlebot (เรนเดอร์ JS) | ⚠️ ส่วนใหญ่ได้ | ✅ |
| ChatGPT/Perplexity/Claude bot (ไม่รัน JS) | ❌ เห็นแค่ excerpt | ✅ เห็นสรุป AI |
| ต้นทุน read-time | ต่ำ (cache) | 0 |
| Effort | ต่ำ | สูง (OAuth+API write) |

→ ทำ P1 ก่อนให้เห็นผล แล้วดัน P2/P3 เพื่อ AEO/GEO จริง
SpeakableSpecification ใน schema ให้ชี้ที่ `.qt-aeo-summary` เหมือนเดิม

---

## 9. Open questions (ตัดสินตอนเริ่มทำ)

- Provider เริ่มต้น: Anthropic (Haiku) — เปิดให้ผู้ใช้เลือก/ใส่ key ตัวเองไหม?
- Worker domain/route: ใช้ `blogkub-cloud` ตัวเดิม หรือแยก `api.blogkub.com`?
- Site token ออก/ผูกกับบัญชี cloud (D1 `users/projects`) หรือ standalone?
- ปั่นสรุปย้อนหลังทั้งบล็อก: กดทีเดียว batch ผ่าน feed pagination
- ภาษามิกซ์ (TH/EN) — ตรวจภาษาจาก body แล้วสั่ง "ภาษาเดียวกับต้นฉบับ" (ทำใน prompt แล้ว)

---

## 10. Definition of done (P1)

- [ ] Worker `/summarize` : secret key, KV cache, origin allowlist, site token, rate limit
- [ ] Prompt + Haiku call คืน plain text ≤ 60 คำ ภาษาเดียวกับต้นฉบับ
- [ ] Block AEO เพิ่ม props: `aiSummary`, `workerUrl`, `siteToken`
- [ ] Theme snippet: progressive enhancement, พลาดแล้วคง fallback
- [ ] ทดสอบ: cache hit/miss, origin ผิดโดนบล็อก, no-JS ยังเห็น excerpt, XML export ยัง valid
- [ ] เอกสาร setup สำหรับผู้ใช้ (ใส่ key, deploy worker, กรอก url/token ใน builder)
