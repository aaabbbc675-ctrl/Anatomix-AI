// فایل ۱۱ موتور اصلاحی (بخش ۳.۱۳ سند): معماری ۴بلوکی برای شاگرد با آسیب فعال.
//
// دو تصمیم صریح که مسیر این فایل را تعیین کردند:
//   ۱. همه‌ی پارامترهای MIN/MAX (systemicMaxSets/injuryMaxSets/ageMaxSets/
//      systemicMinRest/injuryMinRest/ageMinRest/defaultSets/defaultRest) این
//      فایل مستقیماً از فراخوان می‌آیند (پاس‌ترو محض) — چون هیچ خروجی موجودی
//      از file3/file4/file5 به‌طور تمیز به این پارامترها نقشه نمی‌شود (file4
//      اصلاً sets_range نمی‌دهد؛ file3 فقط یک سقف درصدی پیشروی دارد، نه عدد
//      ست/استراحت). این فایل خودش هیچ‌کدام از آن فایل‌ها را صدا نمی‌زند.
//   ۲. «Safe Zone» یک فهرست پیش‌وتت‌شده‌ی شناسه‌ی حرکت از فراخوان است (همان
//      الگوی coreStabilizationExerciseIds در file7)، نه یک محدودیت عددی.
//
// عبور اجباری از موتور MIN/MAX یعنی مستقیماً resolveFinalSetsAndRest از
// file8_capacityEngine.js صدا زده می‌شود — بازسازی نشده.
import { resolveFinalSetsAndRest } from "./file8_capacityEngine.js";
// فیلتر Contraindications برای بلوک ۳ هم دوباره‌استفاده می‌شود، اما با یک
// bank خالی عمداً — یعنی alternative_corrective_exercise فایل۳ هرگز موفق
// نمی‌شود و هر حرکت مضر واقعاً Drop می‌شود؛ جایگزینی از Safe Zone کار خودِ
// این فایل است، نه فایل۳.
import { applyContraindicationFilterWithFallback } from "./file3_triageFallback.js";

const INJURY_ARCHITECTURE_BLOCK_ORDER = ["warmup", "rehabilitation", "strengthAndCorrection", "cooldown"];
const REHAB_TAGS = ["Isometric", "Stabilization"];
const JOINT_PAIN_STOP_THRESHOLD = 3; // از ۱۰؛ سند: توقف با درد مفصلی >۳
const JOINT_PAIN_STICKY_WARNING = "توقف با درد مفصلی بیش از ۳ از ۱۰ — این هشدار همیشه حاضر است.";

// --- بلوک ۱: گرم‌کردن (قلبی + موبیلیتی مفاصل سالم) ---
function buildWarmupBlock({ cardioExercises, mobilityExercises }) {
  if (!Array.isArray(cardioExercises) || !Array.isArray(mobilityExercises)) {
    throw new Error("cardioExercises و mobilityExercises هر دو باید آرایه باشند.");
  }
  return { exercises: [...cardioExercises, ...mobilityExercises] };
}

// --- بلوک ۲: توانبخشی/اولویت اول (تگ Isometric/Stabilization) ---
function buildRehabilitationBlock({ candidateExercises, minMaxParams }) {
  if (!Array.isArray(candidateExercises)) {
    throw new Error("candidateExercises باید آرایه باشد.");
  }

  const exercises = candidateExercises.filter((ex) => (ex.tags ?? []).some((t) => REHAB_TAGS.includes(t)));

  // عبور اجباری از موتور MIN/MAX — minMaxParams عیناً به file8 پاس داده
  // می‌شود؛ اعتبارسنجی مقادیر کار خودِ file8 است، دوباره اینجا چک نمی‌شود.
  const { finalSets, finalRest } = resolveFinalSetsAndRest(minMaxParams);

  return { exercises, finalSets, finalRest };
}

// --- بلوک ۳: قدرت و اصلاح/اولویت دوم (حرکات مضر Drop، جایگزین از Safe Zone) ---
function buildStrengthAndCorrectionBlock({
  candidateExercises,
  userContraindications = [],
  safeZoneExerciseIds = [],
  safeZoneExerciseBankById = {},
}) {
  if (!Array.isArray(candidateExercises)) {
    throw new Error("candidateExercises باید آرایه باشد.");
  }

  // bank خالی عمداً: هیچ alternative_corrective_exercise‌ای در این بلوک
  // موفق نمی‌شود، پس هر حرکت contraindicated واقعاً حذف می‌شود.
  const filterResult = applyContraindicationFilterWithFallback(candidateExercises, userContraindications, {});
  const survivingExercises = filterResult.exercises;
  const droppedCount = candidateExercises.length - survivingExercises.length;

  const safeZoneReplacements = safeZoneExerciseIds
    .map((id) => safeZoneExerciseBankById[id])
    .filter(Boolean)
    .slice(0, droppedCount);

  return {
    exercises: [...survivingExercises, ...safeZoneReplacements],
    droppedCount,
    replacedFromSafeZoneCount: safeZoneReplacements.length,
    warnings: filterResult.warnings,
  };
}

// --- بلوک ۴: سردکردن (کشش ایستا + هشدار چسبان درد مفصلی) ---
function buildCooldownBlock({ staticStretchExercises, currentJointPainLevel }) {
  if (!Array.isArray(staticStretchExercises)) {
    throw new Error("staticStretchExercises باید آرایه باشد.");
  }
  if (!Number.isFinite(currentJointPainLevel) || currentJointPainLevel < 0 || currentJointPainLevel > 10) {
    throw new Error(`currentJointPainLevel نامعتبر: "${currentJointPainLevel}". باید عدد بین ۰ تا ۱۰ باشد.`);
  }

  return {
    exercises: staticStretchExercises,
    shouldStop: currentJointPainLevel > JOINT_PAIN_STOP_THRESHOLD,
    warning: JOINT_PAIN_STICKY_WARNING,
  };
}

export {
  INJURY_ARCHITECTURE_BLOCK_ORDER,
  REHAB_TAGS,
  JOINT_PAIN_STOP_THRESHOLD,
  JOINT_PAIN_STICKY_WARNING,
  buildWarmupBlock,
  buildRehabilitationBlock,
  buildStrengthAndCorrectionBlock,
  buildCooldownBlock,
};
