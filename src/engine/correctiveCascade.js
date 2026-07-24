// پل بین renderer (ESM/React) و فایل‌های موتور اصلاحی — هم‌الگوی دقیق
// src/engine/bodybuildingCascade.js (اجرای مستقیم توابع خالص موتور داخل
// renderer، بدون IPC).
//
// محدوده‌ی عمدی این پل، مطابق همان تفکیک Stage1/Stage2 که در بدنسازی هم
// هست: Stage1 فقط «معماری کلان» را محاسبه می‌کند (اعداد/ساختار جلسه)، نه
// چیدن حرکات واقعی. توابعی که به یک استخر واقعی از حرکات نیاز دارند
// (buildCexProgram فایل۱۰، بلوک‌های فایل۱۱، scoreMultiPurposeExercises و
// resolveEffectiveSide/applyUnknownSideGuardrail فایل۷، زنجیره‌ی فایل۱۲)
// اینجا صدا زده نمی‌شوند — کار Stage2 (زیرکامیت بعدی) است، دقیقاً همان‌طور
// که StageTwoGate بدنسازی حرکات واقعی را جدا از StageOneGate انتخاب می‌کند.
import { processIntakeInputs } from "../../engine/corrective/file1_systemInputs.js";
import { evaluateDiseaseManagement, resolveMedicalModeSessionArchitecture } from "../../engine/corrective/file4_diseaseManagement.js";
import { resolveAgeAdjustment } from "../../engine/corrective/file5_ageAdjustments.js";
import { evaluateAerobicFitnessDrop, evaluateObesityHighHeartRateRule } from "../../engine/corrective/file6_aerobicEngine.js";
import { detectCompoundSyndromes, applyDeformityFunnel } from "../../engine/corrective/file9_syndromeDetection.js";
import { computeSessionCapacity, resolveRepRangeWithoutFailure, applyTempoVeto } from "../../engine/corrective/file8_capacityEngine.js";

// ورودی assessment دقیقاً شکل خروجی CorrectiveAssessmentForm.jsx است.
export function computeCorrectivePrescription(assessment) {
  const intake = processIntakeInputs(assessment);

  const diseaseManagement = evaluateDiseaseManagement({
    diseases: assessment.diseases,
    onDialysis: assessment.onDialysis,
    hasFistula: assessment.hasFistula,
    isDialysisDayToday: assessment.isDialysisDayToday,
  });

  // برنامه‌ی تازه = همیشه ماه ۱ (فرم هیچ‌جا monthNumber نمی‌پرسد، هم‌الگوی
  // بدنسازی که هم اصلاً این مفهوم را در فرم اولیه نمی‌پرسد).
  const sessionArchitecture = resolveMedicalModeSessionArchitecture({
    diseases: assessment.diseases,
    monthNumber: 1,
    hasCardiacCondition: assessment.hasCardiacCondition,
  });

  const ageAdjustment = resolveAgeAdjustment({
    age: assessment.age,
    elderlyExperienceLevel: assessment.elderlyExperienceLevel,
    elderlyTrainingFocus: assessment.elderlyTrainingFocus,
    elderlyMovementType: assessment.elderlyMovementType,
  });

  // ضربان/BMI در فرم اختیاری‌اند؛ evaluateAerobicFitnessDrop/
  // evaluateObesityHighHeartRateRule هر دو روی مقدار غیرعددی throw می‌کنند،
  // پس فقط وقتی واقعاً وارد شده باشند صدا زده می‌شوند — null یعنی «ارزیابی
  // نشد»، نه «رد شد».
  const aerobicFitnessDrop =
    assessment.restingHr !== null ? evaluateAerobicFitnessDrop({ restingHr: assessment.restingHr }) : null;
  const obesityHighHeartRate =
    assessment.bmi !== null && assessment.restingHr !== null
      ? evaluateObesityHighHeartRateRule({ bmi: assessment.bmi, restingHr: assessment.restingHr })
      : null;

  const detectedSyndromes = detectCompoundSyndromes(intake.coachPrioritizedDeformities);

  const deformityFunnel = applyDeformityFunnel(assessment.deformitiesForFunnel ?? []);

  // طبق تصمیم مستند: بدون حالت پزشکی (بدون بیماری)، سند هیچ عدد پیش‌فرضی
  // برای گرم‌کردن/سردکردن غیرپزشکی نمی‌دهد — به‌جای حدس‌زدن یک عدد، صفر
  // (یعنی «چیزی برای این دو بخش کنار گذاشته نشده») استفاده می‌شود؛ فقط وقتی
  // resolveMedicalModeSessionArchitecture واقعاً عددی می‌دهد (بیماری وجود
  // دارد) از همان عدد واقعی استفاده می‌شود.
  const sessionCapacity = computeSessionCapacity({
    totalAllowedMinutes: assessment.totalAllowedMinutes,
    warmupMinutes: sessionArchitecture.medicalModeActive ? sessionArchitecture.warmupMinutes : 0,
    aerobicMinutes: aerobicFitnessDrop?.restricted ? aerobicFitnessDrop.startingDurationMinutes : 0,
    cooldownMinutes: sessionArchitecture.medicalModeActive ? sessionArchitecture.cooldownMinutes : 0,
    setsPerExercise: assessment.setsPerExercise,
    executionSecPerSet: assessment.executionSecPerSet,
    restSecPerSet: assessment.restSecPerSet,
  });

  const repRangeWithoutFailure = resolveRepRangeWithoutFailure();

  const tempoVeto = applyTempoVeto({ diseasePatch: diseaseManagement, ageAdjustment });

  // تصمیم معماری (فایل۱۰ در برابر فایل۱۱) فقط اینجا «برچسب‌گذاری» می‌شود؛
  // چیدن واقعی حرکات داخل آن معماری کار Stage2 است.
  const architectureType = assessment.activeInjuriesCount > 0 ? "injured_4_block" : "cex_4_phase";

  return {
    intake,
    diseaseManagement,
    sessionArchitecture,
    ageAdjustment,
    aerobicFitnessDrop,
    obesityHighHeartRate,
    detectedSyndromes,
    deformityFunnel,
    sessionCapacity,
    repRangeWithoutFailure,
    tempoVeto,
    architectureType,
  };
}
