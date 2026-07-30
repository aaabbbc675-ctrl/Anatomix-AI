// فایل ۳ موتور استعدادیابی (بخش ۴ سند معماری): lookup تیر نُرم مرجع برای
// یک نتیجه‌ی تست، بر اساس سن بیولوژیک (نه سن تقویمی — طبق اصل ۶ سند) و
// جنسیت.
//
// ⚠️ داده‌ی engine/talentId/shared/normativeData.json در حال حاضر
// placeholder_unverified است (Commit 4 فقط زیرساخت lookup را می‌سازد، نه
// داده‌ی نهایی). رجوع کنید به docs/TODO-normative-data.md. فقط ۲ تست
// (vertical_jump, sprint_10m) × ۲ بازه‌ی سنی (bio_age_10_11, bio_age_14_15)
// × ۲ جنس seed شده‌اند — نه کل ماتریس ۹ تستی × ۵ بازه‌ای سند.
//
// normativeData.json اولین فایل JSON در درخت engine/ است (nutrition و
// bodybuilding داده‌ی مشابه را به‌صورت آبجکت JS export می‌کنند، نه JSON
// خام) — از import assertion استاندارد Node 22 استفاده شده
// (`with { type: "json" }`)، نه readFileSync دستی، چون ساده‌تر و
// هم‌راستا با pseudocode خودِ بخش ۴.۴ سند است.

import normativeData from "./shared/normativeData.json" with { type: "json" };
import { TalentIdError } from "./shared/talentIdErrors.js";

// طبق بخش ۴.۴ سند — مرزهای ۵ بازه‌ی کامل (حتی اگر فعلاً فقط ۲ تای‌شان در
// normativeData.json داده دارند؛ بقیه از طریق fallback به بازه‌ی مجاور
// پوشش داده می‌شوند، نه اینکه اصلاً وجود نداشته باشند).
const BAND_ORDER = ["bio_age_8_9", "bio_age_10_11", "bio_age_12_13", "bio_age_14_15", "bio_age_16_17"];

function _selectBand(bioAge) {
  if (bioAge < 10) return "bio_age_8_9";
  if (bioAge < 12) return "bio_age_10_11";
  if (bioAge < 14) return "bio_age_12_13";
  if (bioAge < 16) return "bio_age_14_15";
  return "bio_age_16_17";
}

// طبق بخش ۴.۶ سند: اگر بازه‌ی دقیق داده ندارد، نزدیک‌ترین بازه‌ی موجود
// (به هر دو طرف، از نزدیک به دور) را برمی‌گرداند؛ اگر هیچ بازه‌ای برای این
// جنس/تست داده نداشت، null.
function _findNearestAvailableBand(band, sex, testName) {
  const idx = BAND_ORDER.indexOf(band);
  for (let dist = 1; dist < BAND_ORDER.length; dist++) {
    const lowerBand = BAND_ORDER[idx - dist];
    const upperBand = BAND_ORDER[idx + dist];
    if (lowerBand && normativeData.normative_data[sex]?.[lowerBand]?.tests?.[testName]) {
      return lowerBand;
    }
    if (upperBand && normativeData.normative_data[sex]?.[upperBand]?.tests?.[testName]) {
      return upperBand;
    }
  }
  return null;
}

const TIER_TO_PERCENTILE = {
  // elite_top_5 در Commit 4 در هیچ کدام از تست‌های seed شده وجود ندارد
  // (طبق تصمیم تاییدشده: بدون ساختن آستانه‌ی جعلی) — اینجا برای آماده
  // بودن schema کامل بخش ۴.۳ سند نگه داشته شده، ولی فعلاً هیچ testDef ای
  // این tier را ندارد.
  elite_top_5: 97,
  excellent_top_20: 85,
  average_mid_60: 50,
  poor_bottom_20: 10,
};

/**
 * تیرِ نُرم را برای یک نتیجه‌ی تست برمی‌گرداند.
 * @param {string} testName - مثلاً 'vertical_jump'
 * @param {number} value - مقدار خام تست
 * @param {number} bioAge - سن بیولوژیک (نه تقویمی)
 * @param {'male'|'female'} sex
 */
function lookupTier(testName, value, bioAge, sex) {
  const band = _selectBand(bioAge);
  let testDef = normativeData.normative_data[sex]?.[band]?.tests?.[testName];
  let bandUsed = band;
  let fallbackApplied = false;

  if (!testDef) {
    const fallbackBand = _findNearestAvailableBand(band, sex, testName);
    if (fallbackBand) {
      testDef = normativeData.normative_data[sex][fallbackBand].tests[testName];
      bandUsed = fallbackBand;
      fallbackApplied = true;
    }
  }

  if (!testDef) {
    throw new TalentIdError(
      "NORMATIVE_MISSING",
      `نُرم مرجعی برای تست "${testName}" در بازه "${band}" (یا بازه‌های مجاور) برای جنس "${sex}" پیدا نشد.`,
      { testName, band, sex }
    );
  }

  for (const [tierName, range] of Object.entries(testDef.tiers)) {
    if (value >= range.min && value <= range.max) {
      return {
        tier: tierName,
        higher_is_better: testDef.higher_is_better,
        band_used: bandUsed,
        fallback_applied: fallbackApplied,
      };
    }
  }

  // طبق بخش ۴.۴ سند: خارج از رنج تعریف‌شده (عملاً نادر، چون بازه‌های ۰-۹۹۹
  // انتهاها را می‌پوشانند) — fallback به بهترین tier موجود.
  const tierNames = Object.keys(testDef.tiers);
  return {
    tier: tierNames[0],
    higher_is_better: testDef.higher_is_better,
    band_used: bandUsed,
    fallback_applied: fallbackApplied,
    out_of_range: true,
  };
}

function lookupPercentile(testName, value, bioAge, sex) {
  const { tier } = lookupTier(testName, value, bioAge, sex);
  return TIER_TO_PERCENTILE[tier];
}

export { lookupTier, lookupPercentile, _selectBand, BAND_ORDER };
