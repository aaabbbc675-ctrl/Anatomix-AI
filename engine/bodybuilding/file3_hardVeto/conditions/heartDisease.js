// ماژول ۶ سند (بیماری قلبی/فشارخون) — طبق تصمیم تاییدشده: هر سه سقف نسخه‌ی
// اول/دوم سند هم‌زمان به‌عنوان قید نگه داشته می‌شوند (نه انتخاب یکی)؛ هرکدام که
// موقع محاسبه‌ی نهایی (فایل ۵) عملاً محدودکننده‌تر بود، طبیعتاً همان اعمال می‌شود.
//
// نکته درباره‌ی rest_sec_min: سند «استراحت پایه +۲۰٪ (حداقل ۹۰-۱۲۰ثانیه)» گفته.
// چون پایه‌ی دقیق اینجا مشخص نیست، ۹۰ به‌عنوان کف مطلق تضمین‌شده در نظر گرفته شده؛
// اعمال +۲۰٪ روی ریست واقعی هدف، کار فایل ۵ (finalizePrescription) است.
function heartDisease() {
  return {
    sets_range: null,
    rep_range: null,
    intensity_percent_1rm_range: [null, 70],
    rpe_range: [null, 5],
    rir_range: [3, null],
    rest_sec_min: 90,
    tempo_overrides: ["2-0-2-0"],
    warmup_extra_min: null,
    warmup_cooldown_extra_percent: null,
    max_training_days_per_week: null,
    monthly_progression_cap_percent: null,
    banned_tags: ["Valsalva", "Isometric_Hold", "Decline_Position", "Heavy_Isometric"],
    equipment_priority: [],
    specific_exercise_overrides: [{ matches: "leg_press", action: "cap_intensity_percent_1rm", value: [30, 40] }],
    warnings: [],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

export { heartDisease };
