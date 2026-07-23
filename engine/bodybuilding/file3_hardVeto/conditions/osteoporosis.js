// ماژول ۶ سند (پوکی استخوان). برخلاف بیشتر شرایط، اینجا شدت یک «کف» هم دارد
// (نیاز واقعی به بار محوری برای تراکم استخوان)، نه فقط سقف.
function osteoporosis() {
  return {
    sets_range: null,
    rep_range: null,
    intensity_percent_1rm_range: [70, 80],
    rpe_range: null,
    rir_range: null,
    rest_sec_min: null,
    tempo_overrides: [],
    warmup_extra_min: null,
    warmup_cooldown_extra_percent: null,
    max_training_days_per_week: null,
    monthly_progression_cap_percent: null,
    banned_tags: ["Spinal_Flexion", "Spinal_Rotation", "High_Impact"],
    equipment_priority: [],
    specific_exercise_overrides: [],
    warnings: ["نیاز واقعی به بار محوری (axial load) برای حفظ تراکم استخوان — حذف کامل بار محوری اشتباه است"],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

export { osteoporosis };
