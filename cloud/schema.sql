-- BlogKub Cloud — D1 schema (prototype)
-- สมุดทะเบียนสมาชิก + ทะเบียนโปรเจกต์ (ตัวไฟล์ JSON จริงอยู่ใน R2)

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,             -- uuid
  email       TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at  INTEGER NOT NULL,             -- epoch ms
  last_login  INTEGER
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,             -- uuid
  user_id     TEXT NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL DEFAULT 'เว็บไซต์ของฉัน',
  template_id TEXT,
  is_public   INTEGER NOT NULL DEFAULT 0,   -- 0=private, 1=community showcase
  category    TEXT,                         -- personal | news | corporate | education | affiliate
  is_official INTEGER NOT NULL DEFAULT 0,   -- 1 = ธีมทางการจากทีมงาน (trust badge)
  likes       INTEGER NOT NULL DEFAULT 0,
  downloads   INTEGER NOT NULL DEFAULT 0,
  clones      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user    ON projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_public  ON projects(is_public, updated_at DESC);

-- กันกดไลก์ซ้ำ (community)
CREATE TABLE IF NOT EXISTS likes (
  user_id    TEXT NOT NULL,
  project_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, project_id)
);

-- โมดูล 5: บันทึกเหตุการณ์โคลนรายครั้ง (ใช้คำนวณ Trending รายสัปดาห์)
CREATE TABLE IF NOT EXISTS clone_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clone_events ON clone_events(project_id, created_at DESC);

-- โมดูล 5: คอมเมนต์/รีวิวใต้ผลงาน community
CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,              -- uuid
  project_id TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments ON comments(project_id, created_at DESC);
