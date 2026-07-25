// مصرف‌کننده‌ی gender_advisory.hipAbductorSelectionBoost (خروجی فایل ۲) —
// طبق ماژول ۳ سند: افزایش ۳۰٪ شانس انتخاب برای Gluteus_Medius/Minimus/Hip_Abductors.
//
// از تکمیل بانک حرکات (bodybuilding-exercises.csv، ۳۱ رکورد) به بعد، HAB-MC
// (دورکننده‌ی لگن با دستگاه) دقیقاً muscle_group="Gluteus_Medius" دارد — پس
// این تابع دیگر یک محدودیت داده‌ی صرف نیست، واقعاً روی حداقل یک حرکت واقعی
// اثر می‌گذارد (تست شده در test-engine-file4-trainingsystem.js).
const HIP_ABDUCTOR_MUSCLE_GROUPS = ["Gluteus_Medius", "Gluteus_Minimus", "Hip_Abductors"];

function applyGenderExerciseWeighting(exercises, genderAdvisory) {
  const boost = genderAdvisory?.hipAbductorSelectionBoost ?? 0;
  return exercises.map((exercise) => {
    const isHipAbductor = HIP_ABDUCTOR_MUSCLE_GROUPS.includes(exercise.muscle_group);
    const selectionWeight = 1 + (isHipAbductor ? boost : 0);
    return { ...exercise, selectionWeight };
  });
}

export { applyGenderExerciseWeighting, HIP_ABDUCTOR_MUSCLE_GROUPS };
