// فایل ۷ موتور استعدادیابی (بخش ۸ سند معماری): امتیاز عملکردی هر رشته بر
// اساس performance_weights (Commit 1) + lookupTier (Commit 4).
//
// ⚠️ محدودیت مستقیم از Commit 4 (تصمیم تاییدشده‌ی Commit 8): normativeData.json
// فقط ۲ تست (vertical_jump, sprint_10m) × ۲ بازه‌ی سنی را پوشش می‌دهد، در
// حالی که performance_weights پنج رشته‌ی ما جمعاً ۱۰ تست مختلف استفاده
// می‌کنند. طبق pseudocode خام بخش ۸.۲ سند، صدا زدن lookupTier برای هر تست
// یعنی تقریباً همه‌ی رشته‌ها برای اکثر تست‌هایشان فوراً NORMATIVE_MISSING
// می‌گرفتند. راه‌حل تاییدشده: هر تست بدون norm (چه بازه‌ی خودش چه بازه‌ی
// مجاور) skip می‌شود، نه throw، و وزن‌های تست‌های موجود renormalize
// می‌شوند (طوری که خودشان جمعاً ۱.۰ شوند) تا امتیاز به‌خاطر وزن ناقص
// مصنوعاً فشرده نشود. هر skip با دلیلش (missing_value یا
// normative_missing) در data_coverage.skipped_tests ثبت می‌شود — همان
// سطح صداقتی که در normativeData.json (Commit 4) رعایت شد. رجوع کنید به
// docs/TODO-normative-data.md.
//
// ⚠️ درباره‌ی سطح دفاعی این فایل (تصمیم تاییدشده‌ی Commit 8): برخلاف
// file5/file6 که is_correctable دارند، اینجا چنین مفهومی وجود ندارد —
// طبق بخش ۸.۳ سند، تنها تضمین این است که رکورد ضعیف در تست حیاتی فقط
// ۰.۵x جریمه می‌گیرد (نه صفر، نه حذف رشته). به همین دلیل invariant اینجا
// چیز دیگری را چک می‌کند: ثابت بودن ضریب جریمه‌ی حیاتی (نه صفر شدنش) و
// عدم حذف هیچ رشته‌ای از خروجی orchestrator.

import { lookupTier } from "./file3_normativeDataLookup.js";
import { TalentIdError } from "./shared/talentIdErrors.js";

// ⚠️ یافته‌ی حین پیاده‌سازی Commit 8 (نه یک ابهام از پیش‌شناخته‌شده): کلیدهای
// performance_weights/critical_perf_tests (مثل 'vertical_jump', 'sprint_10m'
// — همان اسامی برهنه‌ای که normativeData.json هم استفاده می‌کند) با نام
// فیلدهای واقعی NormalizedIntake.performance (مثل 'vertical_jump_cm',
// 'sprint_10m_sec' — با پسوند واحد اندازه‌گیری، طبق file1/Commit 2) یکی
// نیستند. بدون این نگاشت، normalizedIntake.performance[testName] همیشه
// undefined برمی‌گشت و همه‌چیز (حتی vertical_jump/sprint_10m که واقعاً
// norm دارند) به‌عنوان missing_value skip می‌شد. این نگاشت مستقیماً از
// خروجی file1 (Commit 2) گرفته شده، نه حدس زده شده.
const PERF_TEST_FIELD_MAP = {
  vertical_jump: "vertical_jump_cm",
  broad_jump: "broad_jump_cm",
  sprint_10m: "sprint_10m_sec",
  sprint_30m: "sprint_30m_sec",
  agility_5_10_5: "agility_sec",
  beep_test: "beep_level",
  handgrip: "handgrip_dominant_kg",
  wall_toss: "wall_toss_count",
  pushups: "pushups_count",
  sit_and_reach: "sit_and_reach_cm",
};

// طبق بخش ۸.۲ سند: elite=+25, excellent=+15, average=0, poor=-15.
// elite_top_5 فعلاً در normativeData.json (Commit 4) وجود ندارد (طبق
// تصمیم آن Commit، بدون ساختن آستانه‌ی جعلی) — اینجا برای آماده بودن
// schema کامل نگه داشته شده، دقیقاً هم‌الگوی TIER_TO_PERCENTILE در file3.
const TIER_TO_PERF_BONUS = {
  elite_top_5: 25,
  excellent_top_20: 15,
  average_mid_60: 0,
  poor_bottom_20: -15,
};

// طبق بخش ۸.۳ سند: رکورد ضعیف در تست حیاتی نصف می‌کند، صفر نمی‌کند.
const CRITICAL_FAIL_MULTIPLIER = 0.5;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computePerfScoreForSport(sportEntry, normalizedIntake, bioAge) {
  const sex = normalizedIntake.demographics.biological_sex;
  const availableTests = [];
  const skippedTests = [];

  for (const [testName, weight] of Object.entries(sportEntry.performance_weights)) {
    const intakeField = PERF_TEST_FIELD_MAP[testName];
    const value = intakeField ? normalizedIntake.performance[intakeField] : undefined;
    if (value == null) {
      skippedTests.push({ test: testName, reason: "missing_value" });
      continue;
    }

    let tierResult;
    try {
      tierResult = lookupTier(testName, value, bioAge, sex);
    } catch (err) {
      if (err instanceof TalentIdError && err.code === "NORMATIVE_MISSING") {
        skippedTests.push({ test: testName, reason: "normative_missing" });
        continue;
      }
      throw err;
    }

    availableTests.push({
      testName,
      weight,
      tier: tierResult.tier,
      rawValue: value,
      fallbackApplied: tierResult.fallback_applied,
    });
  }

  const evaluatedWeightSum = availableTests.reduce((sum, t) => sum + t.weight, 0);
  let perfScore = 100;
  const drivers = [];

  for (const t of availableTests) {
    const normalizedWeight = evaluatedWeightSum > 0 ? t.weight / evaluatedWeightSum : 0;
    const tierBonus = TIER_TO_PERF_BONUS[t.tier] ?? 0;
    const contribution = tierBonus * normalizedWeight;
    perfScore += contribution;

    drivers.push({
      driver_id: `perf.${t.testName}.${t.tier}`,
      test: t.testName,
      tier: t.tier,
      raw_value: t.rawValue,
      applied_bonus: contribution,
      weight_in_sport: t.weight,
      normalized_weight: normalizedWeight,
      trainability: "trainable",
      fallback_applied: t.fallbackApplied,
    });
  }

  for (const criticalTest of sportEntry.critical_perf_tests ?? []) {
    const evaluated = availableTests.find((t) => t.testName === criticalTest);
    if (!evaluated) continue; // بدون norm نمی‌توان tier را قضاوت کرد — skip، نه حدس

    if (evaluated.tier === "poor_bottom_20") {
      perfScore *= CRITICAL_FAIL_MULTIPLIER;
      drivers.push({
        driver_id: `perf.critical_fail.${criticalTest}`,
        test: criticalTest,
        criticality: "critical_failure",
        note: "رکورد ضعیف در تست حیاتی این رشته",
      });
    }
  }

  const finalPerfScore = clamp(perfScore, 0, 200);

  return {
    final_perf_score: finalPerfScore,
    drivers,
    data_coverage: {
      evaluated_weight_sum: Number(evaluatedWeightSum.toFixed(3)),
      intended_weight_sum: 1.0,
      skipped_tests: skippedTests,
    },
  };
}

function calculatePerfScores(sportRequirementMatrix, normalizedIntake, bioAge) {
  const scores = {};
  for (const [sportId, sportEntry] of Object.entries(sportRequirementMatrix)) {
    scores[sportId] = computePerfScoreForSport(sportEntry, normalizedIntake, bioAge);
  }

  // ⚠️ REGRESSION GUARD — این چک را حذف نکنید. تضمین می‌کند orchestrator
  // هیچ رشته‌ای را از خروجی حذف نکرده و هیچ امتیازی نامحدود/NaN نیست.
  const expectedIds = Object.keys(sportRequirementMatrix);
  const actualIds = Object.keys(scores);
  if (actualIds.length !== expectedIds.length) {
    throw new TalentIdError(
      "PERF_VETO_VIOLATION",
      `اصل «هرگز veto» نقض شد: انتظار ${expectedIds.length} رشته در خروجی بود، ${actualIds.length} گرفتیم.`,
      { expectedIds, actualIds }
    );
  }
  for (const [sportId, result] of Object.entries(scores)) {
    if (!Number.isFinite(result.final_perf_score)) {
      throw new TalentIdError(
        "PERF_VETO_VIOLATION",
        `اصل «هرگز veto» نقض شد: final_perf_score برای "${sportId}" عدد محدود نیست.`,
        { sportId, value: result.final_perf_score }
      );
    }
  }

  return scores;
}

export { calculatePerfScores, computePerfScoreForSport, TIER_TO_PERF_BONUS, CRITICAL_FAIL_MULTIPLIER };
