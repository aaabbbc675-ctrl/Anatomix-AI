// مصرف‌کننده‌ی gender_advisory.hipAbductorSelectionBoost (خروجی فایل ۲) —
// طبق ماژول ۳ سند: افزایش ۳۰٪ شانس انتخاب برای Gluteus_Medius/Minimus/Hip_Abductors.
//
// محدودیت صادقانه: دیتاست دستی فعلی (exercises.seed.js، ۱۸ حرکت) هنوز حرکتی با
// muscle_group دقیقاً برابر این سه تگ ندارد — این تابع کار می‌کند و تست می‌شود،
// اما تا جایگزینی با بانک واقعی حرکات، عملاً چیزی برای وزن‌دهی در دیتاست فعلی
// پیدا نمی‌کند. این یک محدودیت داده است، نه باگ منطقی.
const HIP_ABDUCTOR_MUSCLE_GROUPS = ["Gluteus_Medius", "Gluteus_Minimus", "Hip_Abductors"];

function applyGenderExerciseWeighting(exercises, genderAdvisory) {
  const boost = genderAdvisory?.hipAbductorSelectionBoost ?? 0;
  return exercises.map((exercise) => {
    const isHipAbductor = HIP_ABDUCTOR_MUSCLE_GROUPS.includes(exercise.muscle_group);
    const selectionWeight = 1 + (isHipAbductor ? boost : 0);
    return { ...exercise, selectionWeight };
  });
}

module.exports = { applyGenderExerciseWeighting, HIP_ABDUCTOR_MUSCLE_GROUPS };
