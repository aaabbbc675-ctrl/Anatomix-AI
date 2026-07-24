// فایل ۱۰ موتور اصلاحی (بخش ۳.۱۲ سند): معماری ۴مرحله‌ای CEx برای شاگرد بدون
// آسیب فعال (فقط ناهنجاری اصلاحی).
//
// حل تعارض («اگر آسیب بود، اول Rehab سپس CEx با فیلتر Contraindications»)
// مستقیماً sortByTriagePriority و applyContraindicationFilterWithFallback را
// از file3_triageFallback.js صدا می‌زند — دوباره ساخته نشده.
//
// تگ‌های فاز (Inhibition/Lengthening/Activation/Integration) از فیلد
// exercise.phase خوانده می‌شوند — دقیقاً enum بخش ۳.۱۵ سند
// (CEx_Inhibit/CEx_Lengthen/CEx_Activate/CEx_Integrate)؛ این فیلد روی هیچ
// رکورد واقعی exercises.seed.js نیست (فقط ۴ فیلد دیگر در دسته‌ی ۱ اضافه شد)،
// پس مثل alternative_corrective_exercise/target_posture_correction قبلی، یک
// فیلد اختیاری روی آبجکت حرکتِ ورودی است، نه چیزی که این فایل اختراع کند.
// «SMR/Foam_Roller روی Overactive» و «Dynamic_Multi_Joint» توضیح نوع حرکتِ
// هر فاز در سندند، نه معیار فیلتر اضافه — چون هیچ دیکشنری Overactive/
// Underactive در کل سند نیامده (فقط دیکشنری ناهنجاری→عضلات ضعیف بخش ۳.۹).
import { sortByTriagePriority, applyContraindicationFilterWithFallback } from "./file3_triageFallback.js";

const CEX_PHASE_ORDER = ["inhibition", "lengthening", "activation", "integration"];

const CEX_PHASES = {
  inhibition: { phaseTag: "CEx_Inhibit", minCount: 1, maxCount: 2, placement: "warm_up" },
  lengthening: { phaseTag: "CEx_Lengthen", minCount: 1, maxCount: 2, placement: "warm_up" },
  activation: { phaseTag: "CEx_Activate", minCount: 2, maxCount: 3, placement: "main_workout" },
  integration: { phaseTag: "CEx_Integrate", minCount: 1, maxCount: 2, placement: "main_workout_end" },
};

const LENGTHENING_DURATION_SEC_RANGE = [30, 60];
const TOTAL_EXERCISE_COUNT_RANGE = [5, 8];

function buildCexProgram({
  candidateExercises,
  userContraindications = [],
  exerciseBankById = {},
  hasActiveInjury = false,
  hasNeurologicalSymptoms = false,
}) {
  if (!Array.isArray(candidateExercises)) {
    throw new Error("candidateExercises باید آرایه باشد.");
  }
  if (typeof hasActiveInjury !== "boolean") {
    throw new Error(`hasActiveInjury نامعتبر: "${hasActiveInjury}". باید true یا false باشد.`);
  }
  if (typeof hasNeurologicalSymptoms !== "boolean") {
    throw new Error(`hasNeurologicalSymptoms نامعتبر: "${hasNeurologicalSymptoms}". باید true یا false باشد.`);
  }

  // حل تعارض: اگر آسیب فعال بود، ابتدا تریاژ Rehab > Correction >
  // Hypertrophy/Strength اعمال می‌شود؛ این ترتیب داخل هر فاز هم حفظ می‌ماند
  // (وقتی از یک فاز کاندید بیشتر از سقف وجود دارد، حرکات مرتبط با Rehab
  // اول انتخاب می‌شوند).
  const triaged = hasActiveInjury ? sortByTriagePriority(candidateExercises) : [...candidateExercises];

  // فیلتر Contraindications با Fallback — دقیقاً همان تابع واقعی فایل۳.
  const filterResult = applyContraindicationFilterWithFallback(triaged, userContraindications, exerciseBankById);
  const pool = filterResult.exercises;
  const warnings = [...filterResult.warnings];

  function byPhase(phaseTag) {
    return pool.filter((ex) => ex.phase === phaseTag);
  }

  const inhibitionExercises = byPhase(CEX_PHASES.inhibition.phaseTag).slice(0, CEX_PHASES.inhibition.maxCount);

  let lengtheningCandidates = byPhase(CEX_PHASES.lengthening.phaseTag);
  // چک عصبی Tensioning (بخش ۱.۳/۳.۱۵): پارامتری با hasNeurologicalSymptoms،
  // نه یک شکل داده‌ی فرم ارزیابی که هنوز جایی تعریف نشده.
  lengtheningCandidates = lengtheningCandidates.filter((ex) => {
    if (ex.neural_tension_type === "Tensioning" && hasNeurologicalSymptoms) {
      // شکل هشدار عمداً هم‌شکل با warnings فایل۳ نگه داشته شده
      // (exerciseId/severity/reason)، تا آرایه‌ی warnings ناهمگون نشود.
      warnings.push({
        exerciseId: ex.id,
        severity: "critical",
        reason: `حرکت "${ex.id}" (Tensioning) به‌خاطر علائم عصبی گزارش‌شده حذف شد — چک بخش ۳.۱۵ رد نشد.`,
      });
      return false;
    }
    return true;
  });
  const lengtheningExercises = lengtheningCandidates.slice(0, CEX_PHASES.lengthening.maxCount);

  const activationExercises = byPhase(CEX_PHASES.activation.phaseTag).slice(0, CEX_PHASES.activation.maxCount);
  const integrationExercises = byPhase(CEX_PHASES.integration.phaseTag).slice(0, CEX_PHASES.integration.maxCount);

  const totalExerciseCount =
    inhibitionExercises.length + lengtheningExercises.length + activationExercises.length + integrationExercises.length;

  return {
    phases: {
      inhibition: { exercises: inhibitionExercises, placement: CEX_PHASES.inhibition.placement },
      lengthening: {
        exercises: lengtheningExercises,
        placement: CEX_PHASES.lengthening.placement,
        durationSecRange: LENGTHENING_DURATION_SEC_RANGE,
      },
      activation: { exercises: activationExercises, placement: CEX_PHASES.activation.placement },
      integration: { exercises: integrationExercises, placement: CEX_PHASES.integration.placement },
    },
    totalExerciseCount,
    // اطلاع‌رسانی، نه throw: سند نگفته وقتی کاندید کافی نیست چه اتفاقی
    // بیفتد؛ تصمیم درباره‌ی رفتار در این حالت کار یک لایه‌ی بالاتر است.
    withinDocumentedRange: totalExerciseCount >= TOTAL_EXERCISE_COUNT_RANGE[0] && totalExerciseCount <= TOTAL_EXERCISE_COUNT_RANGE[1],
    warnings,
  };
}

export { CEX_PHASE_ORDER, CEX_PHASES, LENGTHENING_DURATION_SEC_RANGE, TOTAL_EXERCISE_COUNT_RANGE, buildCexProgram };
