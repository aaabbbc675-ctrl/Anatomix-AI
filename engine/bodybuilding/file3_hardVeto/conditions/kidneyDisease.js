// ماژول ۶ سند (بیماری کلیوی). دو ورودی جانبی دارد که هر دو در وضعیت سلامتی
// شاگرد ثابت نیستند:
//  - hasFistula: ویژگی نسبتاً پایدار (وجود فیستول برای دیالیز)
//  - isDialysisDayToday: مختص همان جلسه است (باید هر بار از مربی/تقویم دیالیز
//    شاگرد پرسیده شود) — این ورودی در زیرمرحله‌ی ۵.۵ (ویزارد) وصل می‌شود.
function kidneyDisease({ onDialysis = false, hasFistula = false, isDialysisDayToday = false } = {}) {
  const isHardStop = onDialysis && isDialysisDayToday;
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
    banned_tags: hasFistula ? ["direct_wrist_load"] : [],
    equipment_priority: hasFistula ? ["machine"] : [],
    specific_exercise_overrides: hasFistula ? [{ matches: "pull_up", action: "ban" }] : [],
    warnings: [],
    hard_stop: isHardStop,
    hard_stop_reasons: isHardStop ? ["روز دیالیز — تمرین سنگین کاملاً ممنوع"] : [],
    requires_coach_confirmation: [],
  };
}

export { kidneyDisease };
