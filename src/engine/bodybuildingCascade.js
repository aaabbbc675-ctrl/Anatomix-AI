// پل بین renderer (ESM/React) و فایل‌های موتور بدنسازی (اکنون ESM واقعی، طبق
// engine/package.json — نه دیگر CommonJS، چون Vite در dev هیچ تبدیل CJS→ESM
// روی فایل‌های محلی خارج از root انجام نمی‌دهد؛ این با اجرای واقعی کشف شد).
// طبق تصمیم تاییدشده در زیرمرحله‌ی ۵.۵، این فایل‌ها مستقیم داخل renderer اجرا
// می‌شوند، نه از طریق IPC؛ فقط کارهای دیتابیسی از فسید store/db رد می‌شوند.
import { processCoachGoal } from "../../engine/bodybuilding/file1_coachGoal.js";
import { computeBiometrics } from "../../engine/bodybuilding/file2_biometrics.js";
import { evaluateHardVeto } from "../../engine/bodybuilding/file3_hardVeto/index.js";
import { finalizePrescription } from "../../engine/bodybuilding/file5_finalizePrescription/index.js";

// ورودی assessment دقیقاً شکل چیزی است که در architecture_json ذخیره می‌شود
// (بخش ۲.۲ سند: بدون ستون جدید در Students) — رجوع کنید به BodybuildingAssessmentForm.jsx.
export function computeBodybuildingPrescription(assessment) {
  const goal = processCoachGoal(assessment);

  const cascadeOutput = computeBiometrics({
    main_goal: goal.main_goal,
    experience: goal.experience,
    gender: assessment.gender,
    genderOverrides: assessment.genderOverrides,
  });

  const hardVetoRestriction = evaluateHardVeto({
    age: assessment.age,
    experience: goal.experience,
    main_goal: goal.main_goal,
    coachConfirmedAgeException: assessment.coachConfirmedAgeException,
    medicalFlags: assessment.medicalFlags || {},
    isDialysisDayToday: assessment.isDialysisDayToday || false,
  });

  const result = finalizePrescription({ cascadeOutput, hardVetoRestriction });

  return { goal, cascadeOutput, hardVetoRestriction, result };
}
