// رجیستری مرکزی trainability برای driverهای talentId، طبق اصل ۵ سند معماری
// (بخش ۰.۳) و جدول بخش ۵.۵: هر driver باید innate/partial/trainable باشه تا
// Match Report بتونه بگه «این ضعف قابل جبران با تمرین است یا نه». فعلاً فقط
// driverهایی که در بخش ۵ سند (file4_bioScoreCalculator) صریحاً نام‌گذاری
// شدن رو seed کردیم؛ در Commit 5 که آن فایل نوشته می‌شه این رجیستری کامل‌تر
// می‌شه (postural/ROM/perf/psych هرکدوم قانون خودشون رو دارن که در فایل‌های
// خودشون تگ می‌زنن، نه از اینجا — این رجیستری فقط برای driverهای
// anthropometric/composition/biometric بخش ۵ است).
import { TalentIdError } from "./talentIdErrors.js";

const TRAINABILITY = Object.freeze({
  INNATE: "innate",
  PARTIAL: "partial",
  TRAINABLE: "trainable",
});

const traitTrainabilityRegistry = {
  ape_index_high: TRAINABILITY.INNATE,
  ape_index_low: TRAINABILITY.INNATE,
  cormic_high: TRAINABILITY.INNATE,
  cormic_low: TRAINABILITY.INNATE,
  bf_very_low: TRAINABILITY.PARTIAL,
  bf_high: TRAINABILITY.PARTIAL,
  smm_high: TRAINABILITY.TRAINABLE,
  resting_hr_low: TRAINABILITY.TRAINABLE,
  balance_score_high: TRAINABILITY.TRAINABLE,
};

function getTrainability(driverId) {
  const value = traitTrainabilityRegistry[driverId];
  if (!value) {
    throw new TalentIdError(
      "TRAINABILITY_UNKNOWN",
      `driver_id ناشناخته در traitTrainabilityRegistry: "${driverId}"`,
      { driverId }
    );
  }
  return value;
}

export { TRAINABILITY, traitTrainabilityRegistry, getTrainability };
