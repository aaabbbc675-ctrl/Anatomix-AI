// فایل ۱۲ موتور استعدادیابی (بخش ۱۳ سند معماری): تلفیق نهایی امتیازها با CI.
// نقطه‌ی تلاقی Commit 5 (bio) + Commit 8 (perf) + Commit 9 (psych) + Commit 11
// (bio-banding) + Commit 10 (medical gate) + Commit 3 (maturity).
//
// طبق درس Commit 8/11 (mismatch نام فیلد بین ماژول‌ها)، قبل از این پیاده‌سازی
// pseudocode بخش ۱۳ سند مستقیماً Read شد (نه فرض)، نه فقط چیزی که کاربر
// خلاصه کرده بود. سه یافته‌ی کلیدی که مستقیماً از خودِ pseudocode (نه حدس)
// به‌دست آمدند:
//
// ۱) ترتیب عملیات: pseudocode سند (`bioBanded.adjusted[sport].adjusted_bio_score`)
//    صریحاً نشان می‌دهد bio-banding (Commit 11) قبل از وزن‌دهی اعمال می‌شود —
//    این فایل مستقیماً از خروجی calculateBioBanding می‌خواند، نه از خروجی خام
//    Commit 5/8/9.
//
// ۲) medical_hold روی محاسبه‌ی امتیاز اثر نمی‌گذارد — سند بدون هیچ شرطی امتیاز
//    را حساب می‌کند و فقط medical_status را جداگانه attach می‌کند (بخش ۱۳.۳،
//    خط ~۲۱۴۶ سند). این «امتیاز پتانسیل در صورت clearance» را بدون نیاز به
//    تصمیم مستقل، مستقیماً از خودِ سند می‌گیریم.
//
// ۳) شرط سند `psychScores === null` در معماری ما هرگز true نمی‌شود (Commit 9:
//    calculatePsychScores همیشه یک آبجکت معتبر برمی‌گرداند، حتی روی پروفایل
//    خنثی defaultNeutralProfile). سیگنال واقعی «psych قابل‌اتکا نیست»،
//    `psychProfile.extracted_confidence` است (Commit 8) — که فقط روی خودِ
//    psychProfile خام هست، نه روی خروجی calculatePsychScores. به همین دلیل
//    این تابع psychProfile خام را هم می‌گیرد، نه فقط psychScores.
//
// ⚠️ دو تصمیم تاییدشده‌ی دیگر Commit 12 (رجوع کنید به docs/TODO-ci-computation.md
// برای جزئیات کامل):
//
// (الف) bio_ci/perf_ci/psych_ci: سند فرض کرده این‌ها از یک `dataQuality`
// از پیش‌ساخته می‌آیند، اما هیچ Commit قبلی (5/8/9) چیزی در واحد «امتیاز»
// برای عدم‌قطعیت خروجی‌اش تولید نمی‌کند (fieldهای نزدیک — evaluated_weight_sum
// در Commit 8، extracted_confidence در Commit 8، ci_bio_age_years در Commit 3 —
// یا واحدشان با bio_ci/perf_ci/psych_ci یکی نیست، یا فرمول تبدیلشان را سند
// نداده). طبق اصل «فرمول اختراع نکن»، هر سه فعلاً ۰ هستند — CI همیشه دقیقاً
// baseline (۳) می‌ماند تا داده‌ی واقعی جایگزین شود.
//
// (ب) ⚠️ تصحیح معماری، هم‌سطح اهمیت خطای Mirwald در Commit 3: bio_score/
// perf_score (Commit 5/8) روی مقیاس ۰-۲۰۰ هستند، اما final_score (طبق بخش
// ۱۳.۲/۱۴ سند: آستانه‌های tier مثل >=85، clamp نهایی ۰-۱۰۰) روی مقیاس ۰-۱۰۰
// فرض شده. بدون تصحیح، یک ورزشکار «خوب ولی نه افراطی» (نه نزدیک به ۲۰۰)
// بلافاصله سقف ۱۰۰ می‌زد و تمایز از بین می‌رفت (نمونه‌ی عددی واقعی در
// TODO-ci-computation.md). راه‌حل تاییدشده: bio/perf پیش از وزن‌دهی بر ۲
// تقسیم می‌شوند (چون سقف مستندشان دقیقاً ۲۰۰ است) تا با مقیاس native psych
// (۰-۱۰۰) هم‌تراز شوند. این یک فرض مشتق‌شده است، نه عدد مستقیم سند.

import { TalentIdError } from "./shared/talentIdErrors.js";

const DEFAULT_WEIGHTS = { bio: 0.4, perf: 0.4, psych: 0.2 };
// طبق بخش ۱۳.۱/۱۳.۳ سند.
const PSYCH_LOW_CONFIDENCE_WEIGHTS = { bio: 0.45, perf: 0.45, psych: 0.1 };
const PSYCH_CONFIDENCE_THRESHOLD = 0.5;
const MATURITY_FALLBACK_BIO_DELTA = -0.1;
const MATURITY_FALLBACK_PERF_DELTA = 0.1;

// طبق تصمیم تاییدشده‌ی Commit 12 (گزینه‌ی ب، بالای فایل): سقف مستند bio_score/
// perf_score دقیقاً ۲۰۰ است (Commit 5/8) — برای هم‌ترازی با psych (۰-۱۰۰).
const BIO_PERF_RESCALE_DIVISOR = 2;

// طبق بخش ۱۳.۲ سند — دقیقاً همان ۰.۴/۰.۴/۰.۲ ثابت، مستقل از وزن‌های پویای
// امتیازدهی (سند این دو را به‌صراحت جدا نگه داشته: computeCI وزن‌های خودش
// را هاردکد می‌کند، نه وزن‌های dynamic بالا).
const CI_VARIANCE_WEIGHTS = { bio: 0.4, perf: 0.4, psych: 0.2 };
const CI_BASELINE = 3;
const CI_TIER_HIGH_MAX = 8;
const CI_TIER_MEDIUM_MAX = 15;

// طبق تصمیم تاییدشده‌ی Commit 12 (گزینه‌ی الف، بالای فایل): تا داده‌ی واقعی
// جایگزین شود، هر سه صفر هستند — رجوع کنید به docs/TODO-ci-computation.md.
const BASELINE_CI_INPUTS = { bio_ci: 0, perf_ci: 0, psych_ci: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// طبق بخش ۱۳.۲ سند — مرجع: Impellizzeri & Marcora 2009.
function computeCI({ bio_ci, perf_ci, psych_ci }) {
  const variance =
    bio_ci ** 2 * CI_VARIANCE_WEIGHTS.bio ** 2 +
    perf_ci ** 2 * CI_VARIANCE_WEIGHTS.perf ** 2 +
    psych_ci ** 2 * CI_VARIANCE_WEIGHTS.psych ** 2 +
    CI_BASELINE ** 2;
  return Math.sqrt(variance);
}

function classifyConfidenceTier(ci) {
  if (ci < CI_TIER_HIGH_MAX) return "high";
  if (ci < CI_TIER_MEDIUM_MAX) return "medium";
  return "low";
}

// طبق بخش ۱۳.۱/۱۳.۳ سند — یافته‌ی Commit 12 (بالای فایل): شرط سند
// psychScores===null در معماری ما هرگز رخ نمی‌دهد؛ سیگنال واقعی
// psychProfile.extracted_confidence است.
function computeDynamicWeights(psychProfile, maturityProfile) {
  let weights =
    psychProfile == null || psychProfile.extracted_confidence < PSYCH_CONFIDENCE_THRESHOLD
      ? { ...PSYCH_LOW_CONFIDENCE_WEIGHTS }
      : { ...DEFAULT_WEIGHTS };

  if (maturityProfile.formula_used === "chronological_fallback") {
    weights = {
      ...weights,
      bio: weights.bio + MATURITY_FALLBACK_BIO_DELTA,
      perf: weights.perf + MATURITY_FALLBACK_PERF_DELTA,
    };
  }

  return weights;
}

function synthesizeScoreForSport(bioBandedEntry, medicalStatus, weights, ciInputs) {
  const bio = bioBandedEntry.adjusted_bio_score / BIO_PERF_RESCALE_DIVISOR;
  const perf = bioBandedEntry.adjusted_perf_score / BIO_PERF_RESCALE_DIVISOR;
  const psych = bioBandedEntry.adjusted_psych_score;

  const finalScoreRaw = bio * weights.bio + perf * weights.perf + psych * weights.psych;
  const finalScore = clamp(finalScoreRaw, 0, 100);
  const ci = computeCI(ciInputs);

  return {
    final_score: finalScore,
    ci,
    confidence_tier: classifyConfidenceTier(ci),
    component_scores: { bio, perf, psych },
    applied_weights: weights,
    medical_status: medicalStatus,
  };
}

// طبق بخش ۱۳.۳ سند: امضای تابع psychProfile خام را هم می‌گیرد (نه فقط
// psychScores/calculatePsychScores) چون extracted_confidence فقط آنجا هست
// (یافته‌ی Commit 12، بالای فایل). medicalHolds طبق Commit 10 (calculateMedicalHolds).
function synthesizeScores(sportRequirementMatrix, bioBanded, medicalHolds, maturityProfile, psychProfile) {
  const weights = computeDynamicWeights(psychProfile, maturityProfile);
  const results = {};

  for (const sportId of Object.keys(sportRequirementMatrix)) {
    const medicalStatus = medicalHolds[sportId]?.status ?? "clear";
    results[sportId] = synthesizeScoreForSport(bioBanded[sportId], medicalStatus, weights, BASELINE_CI_INPUTS);
  }

  // ⚠️ REGRESSION GUARD — این چک را حذف نکنید. هم‌الگوی file7/file10/file11:
  // هیچ رشته‌ای از خروجی حذف نمی‌شود و final_score همیشه در بازه‌ی ۰-۱۰۰ است.
  const expectedIds = Object.keys(sportRequirementMatrix);
  const actualIds = Object.keys(results);
  if (actualIds.length !== expectedIds.length) {
    throw new TalentIdError(
      "SCORE_SYNTHESIS_VETO_VIOLATION",
      `اصل «هرگز حذف نشو» نقض شد: انتظار ${expectedIds.length} رشته در خروجی بود، ${actualIds.length} گرفتیم.`,
      { expectedIds, actualIds }
    );
  }
  for (const [sportId, result] of Object.entries(results)) {
    if (!Number.isFinite(result.final_score) || result.final_score < 0 || result.final_score > 100) {
      throw new TalentIdError(
        "SCORE_SYNTHESIS_VETO_VIOLATION",
        `اصل «هرگز حذف نشو» نقض شد: final_score نامعتبر "${result.final_score}" برای "${sportId}".`,
        { sportId, value: result.final_score }
      );
    }
  }

  return results;
}

export {
  synthesizeScores,
  synthesizeScoreForSport,
  computeDynamicWeights,
  computeCI,
  classifyConfidenceTier,
  DEFAULT_WEIGHTS,
  PSYCH_LOW_CONFIDENCE_WEIGHTS,
  PSYCH_CONFIDENCE_THRESHOLD,
  MATURITY_FALLBACK_BIO_DELTA,
  MATURITY_FALLBACK_PERF_DELTA,
  BIO_PERF_RESCALE_DIVISOR,
  BASELINE_CI_INPUTS,
  CI_TIER_HIGH_MAX,
  CI_TIER_MEDIUM_MAX,
};
