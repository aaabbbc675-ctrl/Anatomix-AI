// فایل ۴ کسکید (بخش ۳.۱ سند) — ماژول ۱۵: ضرایب سیستم‌های تمرینی پیشرفته.
// هرکدام یا یک ضریب حجم/شدت است، یا (فقط fst_7) یک مکانیزم متفاوت: افزودن
// تعداد ست ثابت، نه ضرب.
const TECHNIQUES = {
  straight_sets: {
    volumeMultiplier: 1.0,
    intensityMultiplier: 1.0,
    allowedExperience: ["beginner", "intermediate", "advanced"],
    equipmentBan: [],
    requiresManualCoachSelection: false,
  },
  drop_set: {
    volumeMultiplier: 1.5,
    intensityMultiplier: 0.85,
    allowedExperience: ["intermediate", "advanced"],
    equipmentBan: ["barbell"], // فقط دستگاه/دمبل مجاز
    requiresManualCoachSelection: false,
  },
  superset: {
    volumeMultiplier: 1.2,
    intensityMultiplier: 0.9,
    allowedExperience: ["intermediate", "advanced"],
    equipmentBan: [],
    requiresManualCoachSelection: false,
  },
  giant_set: {
    volumeMultiplier: 2.0,
    intensityMultiplier: 0.7,
    allowedExperience: ["advanced"],
    equipmentBan: [],
    requiresManualCoachSelection: true, // سند: «انتخاب دستی مربی»
  },
  pre_post_exhaust: {
    volumeMultiplier: 1.15,
    intensityMultiplier: 0.8,
    allowedExperience: ["beginner", "intermediate", "advanced"],
    equipmentBan: [],
    requiresManualCoachSelection: false,
    requiresMixedMovementTypes: true, // باید ترکیب ایزوله+ترکیبی باشد
  },
  fst_7: {
    // مکانیزم متفاوت: نه ضریب، بلکه افزودن ثابت ۷ ست با استراحت کوتاه، فقط
    // روی آخرین حرکت ایزوله‌ی همان عضله (finisher) — طبق تایید صریح کاربر.
    type: "fixed_addition",
    additionalSets: 7,
    restSecOverride: [30, 45],
    placement: "last_isolation_exercise",
    allowedExperience: ["advanced"],
    requiresManualCoachSelection: false,
  },
  heavy_low_rep: {
    volumeMultiplier: 1.0,
    intensityMultiplier: 1.0,
    allowedExperience: ["beginner", "intermediate", "advanced"],
    equipmentBan: [],
    requiresManualCoachSelection: false,
    onlyForGoal: "strength",
  },
  rest_pause: {
    volumeMultiplier: 1.3,
    intensityMultiplier: 0.95,
    allowedExperience: ["advanced"],
    equipmentBan: [],
    requiresManualCoachSelection: false,
  },
};

module.exports = { TECHNIQUES };
