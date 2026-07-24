// فایل ۵ موتور اصلاحی (بخش ۳.۷ سند): تنظیمات سنی — کودکان/بزرگسالان/سالمندان.
//
// سند فقط از سن ۷ به بالا پوشش می‌دهد (کودکان ۷-۱۲). سن زیر ۷ در سند
// مستند نیست، پس به‌جای حدس‌زدن یک رفتار، صریحاً رد می‌شود.
const CHILD_MIN_AGE = 7;
const CHILD_MAX_AGE = 12;
const ADULT_MAX_AGE = 59;
const ELDERLY_MIN_AGE = 60;

function resolveAgeGroup(age) {
  if (!Number.isInteger(age) || age < CHILD_MIN_AGE) {
    throw new Error(`age نامعتبر: "${age}". سند فقط از سن ${CHILD_MIN_AGE} به بالا را پوشش می‌دهد.`);
  }
  if (age <= CHILD_MAX_AGE) return "child";
  if (age <= ADULT_MAX_AGE) return "adult";
  return "elderly";
}

const ELDERLY_EXPERIENCE_LEVELS = ["beginner", "professional"];
const ELDERLY_TRAINING_FOCUSES = ["endurance", "massMaintenance"];
const ELDERLY_MOVEMENT_TYPES = ["isolated", "compound"];

function resolveAgeAdjustment({ age, elderlyExperienceLevel, elderlyTrainingFocus, elderlyMovementType } = {}) {
  const ageGroup = resolveAgeGroup(age);

  if (ageGroup === "child") {
    return {
      ageGroup: "child",
      setsCap: 2,
      repsCap: 15,
      tempoOptions: ["2-0-2-0", "3-0-3-0"], // «بدون مکث» — هر دو تمپو خودشان مکث صفر دارند
      restSecRange: [60, 120],
      trainingToFailureBanned: true,
      explosiveMovementsBanned: true,
      monthlyProgressionCapPercent: 10,
    };
  }

  if (ageGroup === "adult") {
    return { ageGroup: "adult", specialRestrictions: false };
  }

  // ageGroup === "elderly"
  if (!ELDERLY_EXPERIENCE_LEVELS.includes(elderlyExperienceLevel)) {
    throw new Error(
      `elderlyExperienceLevel نامعتبر: "${elderlyExperienceLevel}". مقادیر مجاز: ${ELDERLY_EXPERIENCE_LEVELS.join(", ")}`
    );
  }
  if (!ELDERLY_TRAINING_FOCUSES.includes(elderlyTrainingFocus)) {
    throw new Error(
      `elderlyTrainingFocus نامعتبر: "${elderlyTrainingFocus}". مقادیر مجاز: ${ELDERLY_TRAINING_FOCUSES.join(", ")}`
    );
  }
  if (!ELDERLY_MOVEMENT_TYPES.includes(elderlyMovementType)) {
    throw new Error(
      `elderlyMovementType نامعتبر: "${elderlyMovementType}". مقادیر مجاز: ${ELDERLY_MOVEMENT_TYPES.join(", ")}`
    );
  }

  return {
    ageGroup: "elderly",
    // ست مبتدی ۱، حرفه‌ای ۲-۳ — هر دو به شکل بازه نرمال شده‌اند تا شکل خروجی یکسان بماند
    setsRange: elderlyExperienceLevel === "beginner" ? [1, 1] : [2, 3],
    repRange: elderlyTrainingFocus === "endurance" ? [10, 15] : [8, 12],
    rpeRange: elderlyTrainingFocus === "endurance" ? [4, 5] : [6, 7],
    restSecRange: elderlyMovementType === "isolated" ? [60, 120] : [120, 180],
    tempoOptions: ["2-0-2-0", "1-0-3-0"],
    valsalvaAndBreathHoldBanned: true,
    isometricPauseMustBeZero: true,
  };
}

export {
  CHILD_MIN_AGE,
  CHILD_MAX_AGE,
  ADULT_MAX_AGE,
  ELDERLY_MIN_AGE,
  ELDERLY_EXPERIENCE_LEVELS,
  ELDERLY_TRAINING_FOCUSES,
  ELDERLY_MOVEMENT_TYPES,
  resolveAgeGroup,
  resolveAgeAdjustment,
};
