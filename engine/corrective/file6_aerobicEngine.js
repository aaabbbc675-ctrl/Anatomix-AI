// فایل ۶ موتور اصلاحی (بخش ۳.۴ سند): موتور تنظیم هوازی — SpO2 کاملاً حذف
// شده (طبق بخش ۰ سند)؛ این فایل هیچ گیت/ارزیابی مبتنی بر SpO2 ندارد و
// نباید داشته باشد.
import { emptyPatch } from "../bodybuilding/file3_hardVeto/mergeRestrictions.js";

const RESTING_HR_FITNESS_DROP_THRESHOLD = 80;
const OBESITY_BMI_THRESHOLD = 25;
const SEPARATE_AEROBIC_MESSAGE = "۳۰ دقیقه هوازی بدون برخورد، روزانه، مجزا";

function validatePositiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} نامعتبر: "${value}". باید عدد مثبت باشد.`);
  }
}

// --- شاخص افت آمادگی: Resting_HR > 80 (بدون SpO2) ---
function evaluateAerobicFitnessDrop({ restingHr }) {
  validatePositiveFinite(restingHr, "restingHr");

  if (restingHr <= RESTING_HR_FITNESS_DROP_THRESHOLD) {
    return { restricted: false };
  }

  return {
    restricted: true,
    maxHrPercentRange: [60, 70],
    placement: "end_of_session",
    startingDurationMinutes: 10,
    monthlyIncreasePercent: 20,
    durationCapMinutes: 20,
    resistanceRestSecRange: [60, 120], // «قفل» — بازه‌ی ثابت برای استراحت بخش مقاومتی
    sessionCapMinutes: 60,
  };
}

// --- قانون چاقی+ضربان بالا (هر دو شرط هم‌زمان لازم است) ---
function evaluateObesityHighHeartRateRule({ bmi, restingHr }) {
  validatePositiveFinite(bmi, "bmi");
  validatePositiveFinite(restingHr, "restingHr");

  const triggered = bmi >= OBESITY_BMI_THRESHOLD && restingHr > RESTING_HR_FITNESS_DROP_THRESHOLD;

  return {
    ...emptyPatch(),
    triggered,
    banned_tags: triggered ? ["High_Impact", "Jumping"] : [],
    warnings: triggered ? [SEPARATE_AEROBIC_MESSAGE] : [],
    aerobicRemovedFromSession: triggered,
  };
}

export {
  RESTING_HR_FITNESS_DROP_THRESHOLD,
  OBESITY_BMI_THRESHOLD,
  SEPARATE_AEROBIC_MESSAGE,
  evaluateAerobicFitnessDrop,
  evaluateObesityHighHeartRateRule,
};
