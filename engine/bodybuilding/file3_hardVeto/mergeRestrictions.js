// تابع عمومی «سخت‌گیرترین برنده است» برای ترکیب چند وصله‌ی محدودیت هم‌زمان
// (مثلاً یک شاگرد هم دیابت دارد هم آرتروز). یک تابع واحد، نه if/else جداگانه
// برای هر ترکیب ممکن از بیماری‌ها.

// بازه‌ها را با هم قطع می‌دهد (intersection) — null یعنی «بدون محدودیت در آن سمت».
// نتیجه: تنگ‌ترین بازه‌ای که همزمان همه‌ی قیدها را راضی می‌کند.
function mergeRange(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const min = a[0] === null && b[0] === null ? null : Math.max(a[0] ?? -Infinity, b[0] ?? -Infinity);
  const max = a[1] === null && b[1] === null ? null : Math.min(a[1] ?? Infinity, b[1] ?? Infinity);
  return [min === -Infinity ? null : min, max === Infinity ? null : max];
}

function mergeMin(a, b) {
  if (a === null || a === undefined) return b ?? null;
  if (b === null || b === undefined) return a;
  return Math.min(a, b);
}

function mergeMax(a, b) {
  if (a === null || a === undefined) return b ?? null;
  if (b === null || b === undefined) return a;
  return Math.max(a, b);
}

function unionArray(a = [], b = []) {
  return Array.from(new Set([...a, ...b]));
}

function emptyPatch() {
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
    banned_tags: [],
    equipment_priority: [],
    specific_exercise_overrides: [],
    warnings: [],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

function mergeTwo(a, b) {
  return {
    sets_range: mergeRange(a.sets_range, b.sets_range),
    rep_range: mergeRange(a.rep_range, b.rep_range),
    intensity_percent_1rm_range: mergeRange(a.intensity_percent_1rm_range, b.intensity_percent_1rm_range),
    rpe_range: mergeRange(a.rpe_range, b.rpe_range),
    rir_range: mergeRange(a.rir_range, b.rir_range),
    // rest_sec_min: هرچه بیشتر لازم باشد، سخت‌گیرتر است → max
    rest_sec_min: mergeMax(a.rest_sec_min, b.rest_sec_min),
    tempo_overrides: unionArray(a.tempo_overrides, b.tempo_overrides),
    warmup_extra_min: mergeMax(a.warmup_extra_min, b.warmup_extra_min),
    warmup_cooldown_extra_percent: mergeMax(a.warmup_cooldown_extra_percent, b.warmup_cooldown_extra_percent),
    // حداکثر روز تمرین در هفته: هرچه کمتر، سخت‌گیرتر → min
    max_training_days_per_week: mergeMin(a.max_training_days_per_week, b.max_training_days_per_week),
    monthly_progression_cap_percent: mergeMin(a.monthly_progression_cap_percent, b.monthly_progression_cap_percent),
    banned_tags: unionArray(a.banned_tags, b.banned_tags),
    equipment_priority: unionArray(a.equipment_priority, b.equipment_priority),
    specific_exercise_overrides: [...a.specific_exercise_overrides, ...b.specific_exercise_overrides],
    warnings: unionArray(a.warnings, b.warnings),
    hard_stop: a.hard_stop || b.hard_stop,
    hard_stop_reasons: unionArray(a.hard_stop_reasons, b.hard_stop_reasons),
    requires_coach_confirmation: [...a.requires_coach_confirmation, ...b.requires_coach_confirmation],
  };
}

function mergeRestrictions(patches) {
  return patches.filter(Boolean).reduce(mergeTwo, emptyPatch());
}

export { mergeRestrictions, mergeRange, emptyPatch };
