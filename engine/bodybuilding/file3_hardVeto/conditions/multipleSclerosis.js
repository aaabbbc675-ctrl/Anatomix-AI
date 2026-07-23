// ماژول ۶ سند (مولتیپل اسکلروزیس/MS).
function multipleSclerosis() {
  return {
    sets_range: null,
    rep_range: null,
    intensity_percent_1rm_range: null,
    rpe_range: [null, 5],
    rir_range: null,
    rest_sec_min: null,
    tempo_overrides: [],
    warmup_extra_min: null,
    warmup_cooldown_extra_percent: null,
    max_training_days_per_week: null,
    monthly_progression_cap_percent: null,
    banned_tags: [],
    equipment_priority: ["seated_balance_core_stability"],
    specific_exercise_overrides: [],
    warnings: ["الزام محیط خنک (گرمای بیش‌ازحد علائم را بدتر می‌کند)"],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

module.exports = { multipleSclerosis };
