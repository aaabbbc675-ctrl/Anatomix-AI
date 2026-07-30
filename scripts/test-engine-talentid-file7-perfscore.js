// اسکریپت تست مستقل برای engine/talentId/file7_perfScoreCalculator.js.
// اجرا: node scripts/test-engine-talentid-file7-perfscore.js
//
// ⚠️ این تست‌ها با محدودیت normativeData.json (Commit 4، فقط vertical_jump
// و sprint_10m، فقط bio_age_10_11/bio_age_14_15) کار می‌کنند — رجوع کنید
// به docs/TODO-normative-data.md.
let passCount = 0;
let failCount = 0;

function check(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${description}`);
    console.log(`     ${err.message}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || "مقدار نزدیک نیست"} — انتظار ≈${expected}, گرفتیم ${actual}`);
  }
}

function assertThrowsWithCode(fn, expectedCode, description) {
  try {
    fn();
    throw new Error(`${description || "انتظار throw داشتیم"} — اما throw نشد`);
  } catch (err) {
    if (err.code !== expectedCode) {
      throw new Error(`${description || "code نامنتظره"} — انتظار "${expectedCode}", گرفتیم "${err.code}"`);
    }
  }
}

// bio_age_10_11 مرد: vertical_jump excellent>=40, average 25-39.9, poor<25
//                     sprint_10m excellent<=2.10, average 2.11-2.50, poor>=2.51
function baseIntake(overrides = {}) {
  return {
    demographics: { biological_sex: "male", ...overrides.demographics },
    performance: { ...overrides.performance },
  };
}

(async () => {
  const { calculatePerfScores, computePerfScoreForSport } = await import(
    "../engine/talentId/file7_perfScoreCalculator.js"
  );
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  console.log("\n[renormalize — فقط تست‌های دارای norm واقعاً وزن می‌گیرند]");
  check("soccer_striker: sprint_10m و vertical_jump هر دو excellent → final=115 (renormalize به ۱.۰)", () => {
    const intake = baseIntake({ performance: { sprint_10m_sec: 1.9, vertical_jump_cm: 45 } });
    const result = computePerfScoreForSport(sportRequirementMatrix.soccer_striker, intake, 10.5);
    assertClose(result.final_perf_score, 115, 0.01, "final_perf_score نادرست");
    assertClose(result.data_coverage.evaluated_weight_sum, 0.45, 0.001, "evaluated_weight_sum نادرست");
  });

  check("soccer_striker: تست‌های بدون norm (broad_jump, agility, ...) در skipped_tests با دلیل درست ثبت می‌شوند", () => {
    const intake = baseIntake({ performance: { sprint_10m_sec: 1.9, vertical_jump_cm: 45, broad_jump_cm: 180 } });
    const result = computePerfScoreForSport(sportRequirementMatrix.soccer_striker, intake, 10.5);
    const broadJumpSkip = result.data_coverage.skipped_tests.find((s) => s.test === "broad_jump");
    assert(broadJumpSkip?.reason === "normative_missing", "broad_jump باید normative_missing باشد (مقدار موجود، norm نیست)");
    const wallTossSkip = result.data_coverage.skipped_tests.find((s) => s.test === "wall_toss");
    assert(wallTossSkip?.reason === "missing_value", "wall_toss باید missing_value باشد (مقدار اصلاً داده نشده)");
  });

  console.log("\n[critical_perf_tests — ۰.۵x نه صفر]");
  check("soccer_striker: sprint_10m (critical) poor + vertical_jump excellent → final ≈ 49.17", () => {
    const intake = baseIntake({ performance: { sprint_10m_sec: 3.0, vertical_jump_cm: 45 } });
    const result = computePerfScoreForSport(sportRequirementMatrix.soccer_striker, intake, 10.5);
    assertClose(result.final_perf_score, 49.1667, 0.01, "final_perf_score نادرست");
    const criticalDriver = result.drivers.find((d) => d.driver_id === "perf.critical_fail.sprint_10m");
    assert(criticalDriver, "باید driver مربوط به critical_fail وجود داشته باشد");
    assert(result.final_perf_score > 0, "هرگز نباید صفر شود");
  });

  check("wrestling_freestyle: critical tests (handgrip, beep_test) بدون norm → skip بدون crash، بدون critical driver", () => {
    const intake = baseIntake({
      performance: { handgrip_dominant_kg: 30, beep_level: 9, vertical_jump_cm: 45 },
    });
    const result = computePerfScoreForSport(sportRequirementMatrix.wrestling_freestyle, intake, 10.5);
    const criticalDrivers = result.drivers.filter((d) => d.criticality === "critical_failure");
    assert(criticalDrivers.length === 0, "نباید هیچ critical driver ای تولید شود (norm موجود نیست)");
    assert(
      result.data_coverage.skipped_tests.find((s) => s.test === "handgrip")?.reason === "normative_missing",
      "handgrip باید normative_missing باشد"
    );
  });

  console.log("\n[کف نظری با چند critical fail هم‌زمان — هرگز صفر نمی‌شود]");
  check("سناریوی مصنوعی با ۲ critical fail هم‌زمان → ۰.۵×۰.۵=۰.۲۵ ضریب، نه صفر", () => {
    const fakeSportEntry = {
      performance_weights: { vertical_jump: 0.5, sprint_10m: 0.5 },
      critical_perf_tests: ["vertical_jump", "sprint_10m"],
    };
    const intake = baseIntake({ performance: { vertical_jump_cm: 10, sprint_10m_sec: 3.0 } });
    const result = computePerfScoreForSport(fakeSportEntry, intake, 10.5);
    assertClose(result.final_perf_score, 21.25, 0.01, "final_perf_score نادرست");
    assert(result.final_perf_score > 0, "هرگز نباید صفر شود، حتی با چند critical fail هم‌زمان");
  });

  console.log("\n[calculatePerfScores — orchestrator]");
  check("همیشه دقیقاً ۵ رشته در خروجی — هیچ‌کدام حذف نمی‌شود", () => {
    const intake = baseIntake({ performance: { sprint_10m_sec: 1.9, vertical_jump_cm: 45 } });
    const scores = calculatePerfScores(sportRequirementMatrix, intake, 10.5);
    assert(Object.keys(scores).length === 5, `انتظار ۵ رشته، گرفتیم ${Object.keys(scores).length}`);
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(scores[sportId] !== undefined, `${sportId} نباید از خروجی حذف شود`);
      assert(Number.isFinite(scores[sportId].final_perf_score), `${sportId}: final_perf_score باید محدود باشد`);
    }
  });

  check("حتی با هیچ داده‌ی عملکردی (تمام تست‌ها missing) → همه‌ی رشته‌ها final_perf_score=100 دارند و throw نمی‌شود", () => {
    const intake = baseIntake({ performance: {} });
    const scores = calculatePerfScores(sportRequirementMatrix, intake, 10.5);
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(scores[sportId].final_perf_score === 100, `${sportId}: انتظار ۱۰۰ (بدون تعدیل)، گرفتیم ${scores[sportId].final_perf_score}`);
      assert(scores[sportId].data_coverage.evaluated_weight_sum === 0, `${sportId}: evaluated_weight_sum باید ۰ باشد`);
    }
  });

  console.log(`\n[test-engine-talentid-file7-perfscore] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
