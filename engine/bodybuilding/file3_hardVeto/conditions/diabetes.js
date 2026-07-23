// ماژول ۶ سند (دیابت). نوروپاتی یک زیرِپرچم اختیاری است که محدودیت‌های اضافه‌ای
// (اولویت دستگاه، ممنوعیت حرکات تعادلی) اضافه می‌کند.
function diabetes({ neuropathy = false } = {}) {
  return {
    sets_range: null,
    rep_range: null,
    intensity_percent_1rm_range: [60, 80],
    rpe_range: null,
    rir_range: [2, 3],
    rest_sec_min: null,
    tempo_overrides: [],
    warmup_extra_min: null,
    warmup_cooldown_extra_percent: null,
    max_training_days_per_week: null,
    monthly_progression_cap_percent: null,
    banned_tags: neuropathy ? ["balance_unilateral_high", "Jumping", "Plyometric"] : [],
    equipment_priority: neuropathy ? ["machine"] : [],
    specific_exercise_overrides: [],
    warnings: [
      "هشدار مصرف کربوهیدرات پیش/حین تمرین اجباری است",
      ...(neuropathy ? ["حرکات یک‌طرفه با تعادل بالا ممنوع — با حرکات نشسته/تکیه‌گاه‌دار جایگزین شود"] : []),
    ],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

module.exports = { diabetes };
