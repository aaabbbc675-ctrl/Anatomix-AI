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

-- طبق بخش ۲.۸ سند معماری موتور تغذیه (docs/معماری-نهایی-موتور-تغذیه-v1.md):
-- برخلاف بانک حرکات (exercises.seed.js در حافظه)، بانک غذا یک جدول SQLite
-- واقعی است — تصمیم صریح تاییدشده، چون ماژول ۹ سند CRUD واقعی مربی می‌خواهد
-- و مقیاس بانک غذا برای آرایه‌ی JS مناسب نیست. foods.seed.js فقط این جدول
-- را یک‌بار پر می‌کند، منبع مصرف runtime همین جدول است.
CREATE TABLE IF NOT EXISTS Foods (
  id TEXT PRIMARY KEY,
  name_fa TEXT NOT NULL,
  name_en TEXT,
  category TEXT,
  primary_macro TEXT CHECK(primary_macro IN ('protein','carb','fat')),

  -- انرژی و ماکرو، به ازای ۱۰۰ گرم
  calories REAL NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  net_carbs_g REAL,
  fat_g REAL NOT NULL,
  fiber_g REAL,
  sugar_g REAL,
  saturated_fat_g REAL,
  sodium_mg REAL,

  -- واحد رایج اختیاری (قاشق/لیوان/عدد) با معادل گرمی
  common_unit_name TEXT,
  common_unit_grams REAL,

  digestion_rate TEXT CHECK(digestion_rate IN ('fast','medium','slow')),
  pre_workout_approved INTEGER DEFAULT 0,   -- 0/1
  post_workout_approved INTEGER DEFAULT 0,  -- 0/1
  pre_sleep_approved INTEGER DEFAULT 0,     -- 0/1
  satiety_index TEXT CHECK(satiety_index IN ('high','medium','low')),

  is_vegan INTEGER DEFAULT 0,          -- 0/1
  is_vegetarian INTEGER DEFAULT 0,     -- 0/1
  gluten_free INTEGER DEFAULT 0,       -- 0/1
  lactose_free INTEGER DEFAULT 0,      -- 0/1
  diabetic_friendly INTEGER DEFAULT 0, -- 0/1
  cost_tier TEXT CHECK(cost_tier IN ('economic','medium','premium')),

  -- سیستم Exchange List (بخش ۲.۷ سند) — مکانیزم اصلی Smart Swap
  exchange_group TEXT CHECK(exchange_group IN ('starch','fruit','milk','non_starchy_vegetable','lean_meat','medium_high_fat_meat','fat','free')),
  exchange_serving_grams REAL,

  protein_quality TEXT CHECK(protein_quality IN ('complete','incomplete')),
  allergens_json TEXT,          -- JSON array، هم‌الگوی device_json_ref در Students
  is_active INTEGER DEFAULT 1,  -- 0/1

  created_at TEXT,
  updated_at TEXT
);
