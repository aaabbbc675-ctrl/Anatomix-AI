// ماژول ۶ سند (آسم).
function asthma() {
  return {
    sets_range: null,
    rep_range: null,
    intensity_percent_1rm_range: null,
    rpe_range: null,
    rir_range: null,
    rest_sec_min: 120,
    tempo_overrides: [],
    warmup_extra_min: 10,
    warmup_cooldown_extra_percent: null,
    max_training_days_per_week: null,
    monthly_progression_cap_percent: null,
    banned_tags: [],
    equipment_priority: [],
    specific_exercise_overrides: [],
    warnings: [],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

module.exports = { asthma };
