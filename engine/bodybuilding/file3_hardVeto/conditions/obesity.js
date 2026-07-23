// ماژول ۶ سند: چاقی (BMI>=25) + ضربان بالا هم‌زمان — طبق سند این دو شرط با هم
// باید صادق باشند (نه هرکدام به‌تنهایی)، پس فراخوان (index.js) این ترکیب را
// قبل از فراخوانی این تابع چک می‌کند.
function obesity() {
  return {
    sets_range: null,
    rep_range: null,
    intensity_percent_1rm_range: null,
    rpe_range: null,
    rir_range: null,
    rest_sec_min: null,
    tempo_overrides: [],
    warmup_extra_min: null,
    warmup_cooldown_extra_percent: null,
    max_training_days_per_week: null,
    monthly_progression_cap_percent: null,
    banned_tags: ["High_Impact", "Jumping"],
    equipment_priority: [],
    specific_exercise_overrides: [],
    warnings: ["هوازی از جلسه‌ی اصلی حذف شود؛ ۳۰ دقیقه هوازی بدون برخورد (Low-Impact) در یک جلسه‌ی مجزا و روز دیگر انجام شود"],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

module.exports = { obesity };
