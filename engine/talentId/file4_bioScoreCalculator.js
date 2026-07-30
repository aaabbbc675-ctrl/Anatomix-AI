// فایل ۴ موتور استعدادیابی (بخش ۵ سند معماری): امتیاز پیکرسنجی برای هر
// رشته، شروع از ۱۰۰ + مجموع bonus/penalty بر اساس anthropometric/
// composition/biometric.
//
// ⚠️ حل تناقض معماری بین دو بخش سند (تصمیم تاییدشده‌ی Commit 5): بخش ۱۸.۱
// سند می‌گوید هر رشته bonus config مخصوص خودش را در sportRequirementMatrix
// دارد (که در Commit 1 دقیقاً همین را ساختیم)، اما بخش ۵.۳ سند
// پیاده‌سازی‌اش را با توابع global و لیست sport-id هاردکد نشان می‌دهد که
// اصلاً به config هر رشته نگاه نمی‌کند. راه‌حل تاییدشده: مدل ترکیبی —
// آستانه‌های عددی بخش ۵.۳ (مثل ape_index > 1.05) این‌جا به‌صورت توابع
// global چک می‌شوند، اما اینکه کدام رشته با چه مقداری بونوس بگیرد از
// همان config ذخیره‌شده در sportRequirementMatrix (نه از لیست‌های هاردکد
// سند) خوانده می‌شود.
//
// برای اینکه این مدل واقعاً قوانین بخش ۵.۳ را برای ۵ رشته‌ی Commit 1
// اجرا کند، sportRequirementMatrix.js و traitTrainabilityRegistry.js در
// همین Commit 5 اصلاح شدند (۳ کلید جدید + ۲ rename در ماتریس، ۵ کلید جدید
// در رجیستری trainability) — رجوع کنید به کامنت‌های داخل آن دو فایل.
//
// strong_upper_body_frame (در soccer_striker.anthropometric_bonuses) عمداً
// در SKIPPED_BONUS_KEYS نگه داشته شده: هیچ trigger مشخصی در NormalizedIntake
// یا بخش ۵.۳ سند برایش تعریف نشده — طبق اصل «آستانه را حدس نزن»، اجرا
// نمی‌شود، نه اینکه با یک proxy حدسی جایگزین شود.

import { getTrainability } from "./shared/traitTrainabilityRegistry.js";
import { TalentIdError } from "./shared/talentIdErrors.js";

const SKIPPED_BONUS_KEYS = new Set(["strong_upper_body_frame"]);

// طبق بخش ۵.۳.۳ سند: آستانه‌ی مردانه (bf<10%) صریحاً در سند معماری آمده.
// آستانه‌ی زنانه (بالای ۱۵٪/زیر ۱۵٪ و بالای ۲۸٪) در سند معماری نیست —
// طبق همان اصل صداقتی که در Commit 4 برای normativeData رعایت شد، از سند
// قدیمی پروژه (پرامپ استعداد یابی ورزشی.docx) reuse شده: «زیر ۱۰٪ (مردان) /
// زیر ۱۵٪ (زنان)» و «بالای ۲۰٪ (مردان) / بالای ۲۸٪ (زنان)». این عدد
// zنانه یک منبع علمی مستقل تأییدشده (نه DMT، نه ISAK) نیست — فقط reuse
// از سند قدیمی است، دقیقاً هم‌سطح اطمینانی که به آن سند در Commit 4 دادیم.
const BODY_FAT_THRESHOLDS = {
  male: { very_low: 10, high: 20 },
  female: { very_low: 15, high: 28 },
};

// طبق بخش ۵.۳ سند: همه‌ی شرط‌ها یک‌بار روی کل پروفایل ورزشکار محاسبه
// می‌شوند (مستقل از رشته)؛ فقط tall_stature جدا مانده چون threshold آن
// per-sport و per-sex است (در computeBioScoreForSport مدیریت می‌شود).
function computeActiveConditions(normalizedIntake) {
  const { anthropometrics, body_composition: composition, biometric, demographics } = normalizedIntake;
  const sex = demographics.biological_sex;
  const bfThresholds = BODY_FAT_THRESHOLDS[sex];

  return {
    ape_index_high: anthropometrics.ape_index > 1.05,
    ape_index_low: anthropometrics.ape_index < 0.98,
    cormic_high: anthropometrics.cormic_index > 0.53,
    cormic_low: anthropometrics.cormic_index < 0.51,
    bf_very_low: composition.body_fat_percent < bfThresholds.very_low,
    bf_high: composition.body_fat_percent > bfThresholds.high,
    smm_high: composition.smm_percent > 47,
    tbw_high: composition.tbw_percent > 60,
    resting_hr_low: biometric.resting_hr < 65,
    balance_score_high: biometric.balance >= 8,
    bilateral_asymmetry_high: biometric.bilateral_asymmetry_percent > 10,
    handgrip_asymmetry_high: normalizedIntake.performance.handgrip_asymmetry_percent > 20,
    ffmi_athletic: composition.ffm_index > 24 && composition.ffm_index < 27,
  };
}

const NARRATIVE_BY_KEY = {
  ape_index_high: "دست‌های بلند نسبی به قد (Ape Index بالای ۱.۰۵) — مزیت ریچ",
  ape_index_low: "دست‌های کوتاه نسبت به قد — اهرم بهتر برای پرس‌ها",
  cormic_high: "بالاتنه بلند نسبی — مرکز ثقل پایین",
  cormic_low: "پایین‌تنه بلند نسبی — اهرم قدرتی بهتر",
  tall_stature: "قد بلندتر از آستانه‌ی این پست/رشته",
  bf_very_low: "درصد چربی بسیار پایین — عالی برای رشته‌های سبک‌وزن",
  bf_high: "درصد چربی بالا — مزیت برای رشته‌های سنگین‌وزن",
  smm_high: "درصد عضله‌ی اسکلتی بالا نسبت به وزن کل",
  tbw_high: "درصد آب بدن بالا — نشانه‌ی توده‌ی بدون‌چربی و هیدراتاسیون خوب",
  resting_hr_low: "ضربان قلب استراحت پایین — موتور هوازی قوی",
  balance_score_high: "امتیاز تعادل بالا",
  bilateral_asymmetry_high: "ناهم‌ترازی وزنی دو پا بالای ۱۰٪ — ریسک آسیب رباط",
  handgrip_asymmetry_high: "ناهم‌ترازی قدرت پنجه دو دست بالای ۲۰٪",
  ffmi_athletic: "شاخص توده‌ی بدون‌چربی (FFMI) در محدوده‌ی ورزشکاری (۲۴-۲۷)",
};

function _makeDriver(category, key, magnitude) {
  return {
    driver_id: `${category}.${key}`,
    category,
    direction: magnitude >= 0 ? "positive" : "negative",
    magnitude,
    trainability: getTrainability(key),
    narrative_short: NARRATIVE_BY_KEY[key] ?? "",
  };
}

function _processBonusBucket(category, bucket, activeConditions, standingHeightCm, sex, drivers) {
  for (const [key, value] of Object.entries(bucket ?? {})) {
    if (SKIPPED_BONUS_KEYS.has(key)) continue;

    if (key === "tall_stature") {
      const threshold = sex === "male" ? value.threshold_cm_male : value.threshold_cm_female;
      if (standingHeightCm >= threshold) {
        drivers.push(_makeDriver(category, key, value.bonus));
      }
      continue;
    }

    if (!(key in activeConditions)) {
      throw new TalentIdError(
        "BIO_SCORE_UNKNOWN_DRIVER_KEY",
        `کلید "${key}" در sportRequirementMatrix تعریف شده اما هیچ شرط فعال‌سازی متناظری در computeActiveConditions ندارد.`,
        { key, category }
      );
    }

    if (activeConditions[key]) {
      drivers.push(_makeDriver(category, key, value));
    }
  }
}

function computeBioScoreForSport(sportEntry, activeConditions, normalizedIntake) {
  const drivers = [];
  const standingHeightCm = normalizedIntake.anthropometrics.standing_height_cm;
  const sex = normalizedIntake.demographics.biological_sex;

  _processBonusBucket(
    "anthropometric",
    sportEntry.anthropometric_bonuses,
    activeConditions,
    standingHeightCm,
    sex,
    drivers
  );
  _processBonusBucket(
    "composition",
    sportEntry.composition_bonuses,
    activeConditions,
    standingHeightCm,
    sex,
    drivers
  );
  _processBonusBucket("biometric", sportEntry.biometric_bonuses, activeConditions, standingHeightCm, sex, drivers);

  const totalBonus = drivers.filter((d) => d.magnitude > 0).reduce((sum, d) => sum + d.magnitude, 0);
  const totalPenalty = drivers.filter((d) => d.magnitude < 0).reduce((sum, d) => sum + d.magnitude, 0);
  const finalBioScore = Math.min(200, Math.max(0, 100 + totalBonus + totalPenalty));

  return {
    base_score: 100,
    total_bonus: totalBonus,
    total_penalty: totalPenalty,
    final_bio_score: finalBioScore,
    drivers,
  };
}

function calculateBioScores(sportRequirementMatrix, normalizedIntake) {
  const activeConditions = computeActiveConditions(normalizedIntake);
  const scoresBySport = {};
  for (const [sportId, sportEntry] of Object.entries(sportRequirementMatrix)) {
    scoresBySport[sportId] = computeBioScoreForSport(sportEntry, activeConditions, normalizedIntake);
  }
  return scoresBySport;
}

export { calculateBioScores, computeBioScoreForSport, computeActiveConditions, BODY_FAT_THRESHOLDS };
