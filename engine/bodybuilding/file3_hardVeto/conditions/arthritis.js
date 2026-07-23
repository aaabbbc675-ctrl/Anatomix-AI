// ماژول ۶ سند (آرتروز/آرتریت) — طبق دستور صریح، نسخه‌ی کامل‌تر (تکرار ۱۵-۲۰ با
// تمپو 3-0-3-0) استفاده می‌شود، نه نسخه‌ی اول (۱۰-۱۵).
function arthritis() {
  return {
    sets_range: null,
    rep_range: [15, 20],
    intensity_percent_1rm_range: [50, 70],
    rpe_range: null,
    rir_range: null,
    rest_sec_min: null,
    tempo_overrides: ["3-0-3-0"],
    warmup_extra_min: null,
    warmup_cooldown_extra_percent: null,
    max_training_days_per_week: null,
    monthly_progression_cap_percent: null,
    banned_tags: ["High_Impact", "Jumping", "Plyometric"],
    equipment_priority: ["closed_kinetic_chain"],
    specific_exercise_overrides: [],
    warnings: [],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

module.exports = { arthritis };
