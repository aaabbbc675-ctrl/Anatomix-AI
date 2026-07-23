-- طبق بخش ۲.۲ سند معماری — منبع واحد schema، بدون migration framework.
-- هر فیلد جدید/جدول جدید باید مستقیماً همینجا اضافه شود (additive)، نه در جای دیگر.

CREATE TABLE IF NOT EXISTS Students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  national_code TEXT UNIQUE,
  phone TEXT,
  device_json_ref TEXT,     -- JSON: {path, attachedAt, processed, processedAt}
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS Programs (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES Students(id) ON DELETE CASCADE,
  program_type TEXT CHECK(program_type IN ('bodybuilding','corrective','hybrid_sc','diet','home_workout')),
  status TEXT CHECK(status IN ('draft','pending_coach_review','approved','active','archived')),
  architecture_json TEXT,   -- خروجی معماری + coachOverrides + trace (بدون نیاز به migration جدید)
  final_program_json TEXT,
  total_weeks INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS Weekly_Logs (
  id TEXT PRIMARY KEY,
  program_id TEXT REFERENCES Programs(id) ON DELETE CASCADE,
  week_number INTEGER,
  avg_rpe REAL,
  volume_completed_percent REAL,
  fatigue_flag INTEGER,        -- 0/1
  deload_triggered INTEGER,    -- 0/1
  logged_at TEXT
);

CREATE TABLE IF NOT EXISTS Injury_Blacklist (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES Students(id) ON DELETE CASCADE,
  exercise_id TEXT,             -- FK منطقی (نه SQL، چون بانک حرکات جدا مدیریت می‌شود)
  source_module TEXT CHECK(source_module IN ('bodybuilding','corrective')),
  reason_note TEXT,
  created_at TEXT
);
