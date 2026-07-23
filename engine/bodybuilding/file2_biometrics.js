// فایل ۲ کسکید (بخش ۳.۱ سند): Volume_Base × Experience × Gender × Age.
//
// نکته‌ی مهم درباره‌ی Age: طبق تصمیم تاییدشده، ماژول کامل سنی (کودکان/سالمندان)
// Hard Veto است و به فایل ۳ (زیرمرحله‌ی ۵.۲) تعلق دارد. اینجا برای بازه‌ی استاندارد
// ۱۳-۵۹ سال، ضریب سن خنثی/۱.۰ است — یعنی این فایل فعلاً به سن ورودی نیازی ندارد.
const { getSlotStandard, ISOLATION_RATIO, EXPERIENCE_VOLUME_RANGE } = require("./slotStandards");

const FEMALE_REST_FACTOR = 0.85; // ماژول ۳ سند: کاهش ۱۵٪ استراحت
const FEMALE_VOLUME_FACTOR = 1.15; // ماژول ۳ سند: افزایش ۱۰-۱۵٪ حجم (ceil)
const FEMALE_HIP_SELECTION_BOOST = 0.3; // ماژول ۳ سند: +۳۰٪ شانس انتخاب Gluteus/Hip_Abductors
// مصرف واقعی این ضریب در منطق انتخاب حرکت (فایل ۴ / زیرمرحله ۵.۳) است، نه اینجا.

function scaleRange([min, max], factor, roundFn = Math.round) {
  return [min === null ? null : roundFn(min * factor), max === null ? null : roundFn(max * factor)];
}

function computeBiometrics({ main_goal, experience, gender, genderOverrides }) {
  if (!EXPERIENCE_VOLUME_RANGE[experience]) {
    throw new Error(`experience نامعتبر برای محاسبه‌ی بیومتریک: "${experience}"`);
  }
  if (gender !== "male" && gender !== "female") {
    throw new Error(`gender نامعتبر: "${gender}". مقادیر مجاز: male, female`);
  }

  // ماژول ۱۳ سند: Maintenance مقدار مستقل در SLOT_STANDARDS ندارد و از hypertrophy
  // مشتق می‌شود (۱۰۰٪ پایه‌ی فانکشنال، حذف مطلق ایزوله، حجم × ۰.۵، ناتوانی ممنوع).
  const isMaintenance = main_goal === "maintenance";
  const slotGoal = isMaintenance ? "hypertrophy" : main_goal;
  const slot = getSlotStandard(slotGoal);

  const volumeRange = EXPERIENCE_VOLUME_RANGE[experience];
  // نقطه‌ی شروع = کف بازه (نقطه‌ی امن هفته‌ی اول)؛ سقف بازه برای پیشروی تدریجی در
  // زیرمرحله‌ی ۵.۶ (دی‌لود اتوریگولیتد، هنوز ساخته نشده) نگه داشته می‌شود.
  let startingWeeklySets = volumeRange.min;
  let progressionCeiling = volumeRange.max;
  let isolationRatio = ISOLATION_RATIO[main_goal];
  let rir = slot.rir;

  if (isMaintenance) {
    startingWeeklySets = startingWeeklySets * 0.5;
    progressionCeiling = progressionCeiling * 0.5;
    // "ناتوانی مطلقاً ممنوع" → RIR هرگز صفر نباشد.
    rir = [Math.max(rir[0], 1), Math.max(rir[1], 1)];
  }

  let restSec = slot.restSec;
  let genderAdvisory = null;
  if (gender === "female") {
    // طبق بخش ۳.۶ سند: این ضرایب فقط «پیشنهادی» هستند و مربی باید بتواند
    // دستی override کند. اگر override داده شده، همان استفاده می‌شود؛ در هر دو
    // حالت مقدار پیشنهادی سیستم هم نگه داشته می‌شود تا دکمه‌ی «بازگردانی به
    // پیشنهاد سیستم» (زیرمرحله‌ی ۵.۵) داده‌ی لازم را داشته باشد.
    const appliedVolumeFactor = genderOverrides?.volumeFactor ?? FEMALE_VOLUME_FACTOR;
    const appliedRestFactor = genderOverrides?.restFactor ?? FEMALE_REST_FACTOR;
    const isOverridden = genderOverrides?.volumeFactor !== undefined || genderOverrides?.restFactor !== undefined;

    startingWeeklySets = Math.ceil(startingWeeklySets * appliedVolumeFactor);
    progressionCeiling = Math.ceil(progressionCeiling * appliedVolumeFactor);
    restSec = scaleRange(restSec, appliedRestFactor);
    genderAdvisory = {
      hipAbductorSelectionBoost: FEMALE_HIP_SELECTION_BOOST, // مصرف در فایل ۴
      appliedRestFactor,
      appliedVolumeFactor,
      isOverridden,
      systemSuggested: { restFactor: FEMALE_REST_FACTOR, volumeFactor: FEMALE_VOLUME_FACTOR },
    };
  }

  return {
    weekly_sets_per_muscle: startingWeeklySets,
    weekly_sets_progression_ceiling: progressionCeiling,
    rep_range: slot.repRange,
    intensity_percent_1rm: slot.intensity1RM,
    rest_sec: restSec,
    tempo: slot.tempo,
    rir,
    isolation_ratio: isolationRatio,
    gender_advisory: genderAdvisory, // مربی می‌تواند override کند؛ ردیابی override در architecture_json (زیرمرحله ۵.۵)
    age_factor_applied: "neutral_13_59", // یادآوری صریح: منطق سنی واقعی در فایل ۳ است (۵.۲)
  };
}

module.exports = { computeBiometrics };
