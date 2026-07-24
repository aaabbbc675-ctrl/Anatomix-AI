// فایل ۸ موتور اصلاحی (بخش ۳.۱۰ سند): فیلتر تجهیزات + ظرفیت داینامیک +
// موتور MIN/MAX + قانون تکرار بدون Failure + وتوی تمپو.

// --- فیلتر جهانی تجهیزات ---
function filterExercisesByAvailableEquipment(exercises, availableEquipment) {
  if (!Array.isArray(exercises)) throw new Error("exercises باید آرایه باشد.");
  if (!Array.isArray(availableEquipment) || availableEquipment.some((e) => typeof e !== "string")) {
    throw new Error("availableEquipment باید آرایه‌ای از رشته باشد.");
  }
  return exercises.filter((exercise) => availableEquipment.includes(exercise.equipment));
}

// --- ظرفیت داینامیک جلسه ---
function validatePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} نامعتبر: "${value}". باید عدد مثبت باشد.`);
  }
}
function validateNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} نامعتبر: "${value}". باید عدد غیرمنفی باشد.`);
  }
}

function computeSessionCapacity({
  totalAllowedMinutes,
  warmupMinutes,
  aerobicMinutes,
  cooldownMinutes,
  setsPerExercise,
  executionSecPerSet,
  restSecPerSet,
}) {
  validatePositive(totalAllowedMinutes, "totalAllowedMinutes");
  validateNonNegative(warmupMinutes, "warmupMinutes");
  validateNonNegative(aerobicMinutes, "aerobicMinutes");
  validateNonNegative(cooldownMinutes, "cooldownMinutes");
  validatePositive(setsPerExercise, "setsPerExercise");
  validatePositive(executionSecPerSet, "executionSecPerSet");
  validatePositive(restSecPerSet, "restSecPerSet");

  const mainWorkoutMinutes = totalAllowedMinutes - (warmupMinutes + aerobicMinutes + cooldownMinutes);
  if (mainWorkoutMinutes <= 0) {
    throw new Error(
      `زمان بدنه‌ی اصلی جلسه منفی/صفر شد (${mainWorkoutMinutes} دقیقه) — گرم‌کردن+هوازی+سردکردن (${warmupMinutes + aerobicMinutes + cooldownMinutes} دقیقه) از کل زمان مجاز (${totalAllowedMinutes} دقیقه) بیشتر یا مساوی است.`
    );
  }

  const mainWorkoutSeconds = mainWorkoutMinutes * 60;
  const secondsPerExercise = setsPerExercise * executionSecPerSet + setsPerExercise * restSecPerSet;
  const maxExerciseCount = Math.floor(mainWorkoutSeconds / secondsPerExercise);

  return { mainWorkoutMinutes, maxExerciseCount };
}

// --- موتور MIN/MAX ---
// mergeMin/mergeMax بدنسازی (engine/bodybuilding/file3_hardVeto/mergeRestrictions.js)
// export نشده‌اند (توابع داخلی همان فایل‌اند)، پس همان قرارداد null=«بدون
// محدودیت» اینجا با دو تابع کوچک محلی بازتولید شده، نه import ناموجود.
function minIgnoringNull(values) {
  const known = values.filter((v) => v !== null && v !== undefined);
  if (known.length === 0) return null;
  return Math.min(...known);
}
function maxIgnoringNull(values) {
  const known = values.filter((v) => v !== null && v !== undefined);
  if (known.length === 0) return null;
  return Math.max(...known);
}

function resolveFinalSetsAndRest({
  defaultSets,
  systemicMaxSets = null,
  injuryMaxSets = null,
  ageMaxSets = null,
  defaultRest,
  systemicMinRest = null,
  injuryMinRest = null,
  ageMinRest = null,
}) {
  validatePositive(defaultSets, "defaultSets");
  validatePositive(defaultRest, "defaultRest");

  const finalSets = minIgnoringNull([defaultSets, systemicMaxSets, injuryMaxSets, ageMaxSets]);
  const finalRest = maxIgnoringNull([defaultRest, systemicMinRest, injuryMinRest, ageMinRest]);

  return { finalSets, finalRest };
}

// --- تکرار بدون Failure ---
// سند این بازه را بدون «مثلاً» و بدون قید آورده (بر خلاف سقف‌های file2)، پس
// اینجا مقدار ثابت مستند است، نه پارامتر.
const NON_FAILURE_REP_RANGE = [10, 15];
function resolveRepRangeWithoutFailure() {
  return { repRange: [...NON_FAILURE_REP_RANGE], trainingToFailure: false };
}

// --- وتوی تمپو ---
// طبق تصمیم صریح: این تابع منطق را دوباره نمی‌سازد — فقط دو خروجی موجود
// (evaluateDiseaseManagement از file4، resolveAgeAdjustment از file5) را با
// OR ترکیب می‌کند. هیچ شرط مستقل hasHypertension/age اینجا نیست.
function applyTempoVeto({ diseasePatch, ageAdjustment }) {
  const fromDisease = diseasePatch?.isometricPauseMustBeZero === true;
  const fromAge = ageAdjustment?.isometricPauseMustBeZero === true;
  return { allIsometricPausesZero: fromDisease || fromAge };
}

export {
  filterExercisesByAvailableEquipment,
  computeSessionCapacity,
  resolveFinalSetsAndRest,
  NON_FAILURE_REP_RANGE,
  resolveRepRangeWithoutFailure,
  applyTempoVeto,
};
