// ماژول ۶ سند (فلج مغزی/CP).
function cerebralPalsy() {
  return {
    sets_range: null,
    rep_range: null,
    intensity_percent_1rm_range: null,
    rpe_range: null,
    rir_range: null,
    rest_sec_min: 90, // قفل ۹۰-۱۲۰ثانیه؛ ۹۰ کف تضمین‌شده
    tempo_overrides: ["4-0-2-0"],
    warmup_extra_min: null,
    warmup_cooldown_extra_percent: null,
    max_training_days_per_week: null,
    monthly_progression_cap_percent: null,
    banned_tags: ["explosive_movement"],
    equipment_priority: [],
    specific_exercise_overrides: [],
    warnings: [],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

export { cerebralPalsy };
