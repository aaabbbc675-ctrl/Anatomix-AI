// اسکریپت تست مستقل برای engine/talentId/file11_bioBandingAdjuster.js.
// اجرا: node scripts/test-engine-talentid-file11-biobanding.js
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

(async () => {
  const {
    calculateBioBanding,
    computeMaturityAdjustmentFactor,
    computeRaeAlert,
    EARLY_MATURER_POWER_SPORT_FACTOR,
    LATE_MATURER_FACTOR,
    NEUTRAL_FACTOR,
  } = await import("../engine/talentId/file11_bioBandingAdjuster.js");
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");
  const { POWER_SPORTS } = await import("../engine/talentId/shared/sportCategories.js");

  // fixture: امتیازهای پایه برای هر ۵ رشته‌ی واقعی matrix — اعداد دلخواه
  // اما در بازه‌ی معتبر (0-200 برای bio/perf، 0-100 برای psych).
  function baseScores() {
    const bio = {};
    const perf = {};
    const psych = {};
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      bio[sportId] = { final_bio_score: 120 };
      perf[sportId] = { final_perf_score: 110 };
      psych[sportId] = { final_psych_score: 80 };
    }
    return { bio, perf, psych };
  }

  console.log("\n[computeMaturityAdjustmentFactor — سه نوع بلوغ × power/non-power]");
  check("early_maturer + power sport → 0.90 (-۱۰٪)", () => {
    assert(computeMaturityAdjustmentFactor("early_maturer", true) === EARLY_MATURER_POWER_SPORT_FACTOR, "factor نادرست");
  });
  check("early_maturer + non-power sport → 1.0 (بدون تعدیل)", () => {
    assert(computeMaturityAdjustmentFactor("early_maturer", false) === NEUTRAL_FACTOR, "factor نادرست");
  });
  check("late_maturer + power sport → 1.15 (+۱۵٪، صرف‌نظر از power بودن)", () => {
    assert(computeMaturityAdjustmentFactor("late_maturer", true) === LATE_MATURER_FACTOR, "factor نادرست");
  });
  check("late_maturer + non-power sport → 1.15 (+۱۵٪ در همه)", () => {
    assert(computeMaturityAdjustmentFactor("late_maturer", false) === LATE_MATURER_FACTOR, "factor نادرست");
  });
  check("on_time_maturer → 1.0 (بدون تعدیل)", () => {
    assert(computeMaturityAdjustmentFactor("on_time_maturer", true) === NEUTRAL_FACTOR, "factor نادرست");
    assert(computeMaturityAdjustmentFactor("on_time_maturer", false) === NEUTRAL_FACTOR, "factor نادرست");
  });
  check("unknown (تصمیم تاییدشده‌ی Commit 11) → 1.0 (بدون تعدیل)", () => {
    assert(computeMaturityAdjustmentFactor("unknown", true) === NEUTRAL_FACTOR, "factor نادرست");
    assert(computeMaturityAdjustmentFactor("unknown", false) === NEUTRAL_FACTOR, "factor نادرست");
  });
  check("maturity_type نامعتبر → throw BIO_BANDING_UNKNOWN_MATURITY_TYPE", () => {
    assertThrowsWithCode(
      () => computeMaturityAdjustmentFactor("totally_invalid", false),
      "BIO_BANDING_UNKNOWN_MATURITY_TYPE"
    );
  });

  console.log("\n[POWER_SPORTS — به‌روزرسانی Commit 17: ۱۰ رشته‌ی جدید اضافه شدند]");
  check("۶ رشته با شواهد مستقیم (critical_perf_tests انفجاری) → isPowerSport=true", () => {
    for (const sportId of ["judo", "wrestling_greco", "sprint_100m", "sprint_200m", "handball_back", "handball_pivot"]) {
      assert(POWER_SPORTS.has(sportId), `${sportId} باید در POWER_SPORTS باشد`);
    }
  });
  check("۴ رشته با شواهد ادبیاتی (critical_perf_tests مستقیماً انفجاری نیستند) → isPowerSport=true", () => {
    for (const sportId of ["boxing", "MMA", "karate", "wushu_sanda"]) {
      assert(POWER_SPORTS.has(sportId), `${sportId} باید در POWER_SPORTS باشد`);
    }
  });
  check("رشته‌های صریحاً بازبینی‌نشده (طبق docs/TODO-power-sports-wave2.md) هنوز پیش‌فرض non-power دارند", () => {
    for (const sportId of ["shooting_target", "cycling_road", "marathon", "taekwondo"]) {
      assert(!POWER_SPORTS.has(sportId), `${sportId} نباید (هنوز) در POWER_SPORTS باشد`);
    }
  });

  console.log("\n[calculateBioBanding — orchestrator با کل sportRequirementMatrix]");
  check("early_maturer: فقط رشته‌های power (شامل ۱۰ رشته‌ی جدید Commit 17) -۱۰٪ می‌گیرند، swimming_general بدون تغییر", () => {
    const { bio, perf, psych } = baseScores();
    const results = calculateBioBanding(sportRequirementMatrix, bio, perf, psych, { maturity_type: "early_maturer" });

    for (const sportId of POWER_SPORTS) {
      assertClose(results[sportId].adjusted_bio_score, 120 * 0.9, 0.001, `${sportId}: bio نادرست`);
      assertClose(results[sportId].adjusted_perf_score, 110 * 0.9, 0.001, `${sportId}: perf نادرست`);
      assertClose(results[sportId].adjusted_psych_score, 80 * 0.9, 0.001, `${sportId}: psych نادرست`);
      assert(results[sportId].maturity_adjustment_factor === 0.9, `${sportId}: factor نادرست`);
      assert(results[sportId].drivers.length === 1, `${sportId}: باید ۱ driver داشته باشد`);
    }
    assert(results.swimming_general.adjusted_bio_score === 120, "swimming_general نباید تغییر کند");
    assert(results.swimming_general.maturity_adjustment_factor === 1.0, "swimming_general factor باید ۱ باشد");
    assert(results.swimming_general.drivers.length === 0, "swimming_general نباید driver داشته باشد");
  });

  check("late_maturer: همه‌ی ۵ رشته +۱۵٪ می‌گیرند (حتی swimming_general که power نیست)", () => {
    const { bio, perf, psych } = baseScores();
    const results = calculateBioBanding(sportRequirementMatrix, bio, perf, psych, { maturity_type: "late_maturer" });
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assertClose(results[sportId].adjusted_bio_score, 120 * 1.15, 0.001, `${sportId}: bio نادرست`);
      assertClose(results[sportId].adjusted_perf_score, 110 * 1.15, 0.001, `${sportId}: perf نادرست`);
      assertClose(results[sportId].adjusted_psych_score, 80 * 1.15, 0.001, `${sportId}: psych نادرست`);
      assert(results[sportId].drivers.length === 1, `${sportId}: باید ۱ driver داشته باشد`);
    }
  });

  check("on_time_maturer: هیچ رشته‌ای تغییر نمی‌کند", () => {
    const { bio, perf, psych } = baseScores();
    const results = calculateBioBanding(sportRequirementMatrix, bio, perf, psych, { maturity_type: "on_time_maturer" });
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(results[sportId].adjusted_bio_score === 120, `${sportId}: bio نباید تغییر کند`);
      assert(results[sportId].adjusted_perf_score === 110, `${sportId}: perf نباید تغییر کند`);
      assert(results[sportId].adjusted_psych_score === 80, `${sportId}: psych نباید تغییر کند`);
      assert(results[sportId].drivers.length === 0, `${sportId}: نباید driver داشته باشد`);
    }
  });

  check("clamp: late_maturer روی امتیاز نزدیک سقف → 200 برای bio/perf، 100 برای psych", () => {
    const bio = {}, perf = {}, psych = {};
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      bio[sportId] = { final_bio_score: 195 };
      perf[sportId] = { final_perf_score: 190 };
      psych[sportId] = { final_psych_score: 95 };
    }
    const results = calculateBioBanding(sportRequirementMatrix, bio, perf, psych, { maturity_type: "late_maturer" });
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(results[sportId].adjusted_bio_score === 200, `${sportId}: باید در ۲۰۰ clamp شود`);
      assert(results[sportId].adjusted_perf_score === 200, `${sportId}: باید در ۲۰۰ clamp شود`);
      assert(results[sportId].adjusted_psych_score === 100, `${sportId}: باید در ۱۰۰ clamp شود`);
    }
  });

  console.log("\n[═══ REGRESSION GUARD: هرگز حذف نشو — این بخش را حذف نکنید ═══]");
  check("برای هر ۴ maturity_type، calculateBioBanding همیشه به‌تعداد کل matrix رشته با factor معتبر برمی‌گرداند", () => {
    const validFactors = new Set([0.9, 1.0, 1.15]);
    const maturityTypes = ["early_maturer", "late_maturer", "on_time_maturer", "unknown"];
    let checkedCount = 0;
    for (const maturityType of maturityTypes) {
      const { bio, perf, psych } = baseScores();
      const results = calculateBioBanding(sportRequirementMatrix, bio, perf, psych, { maturity_type: maturityType });
      const sportIds = Object.keys(sportRequirementMatrix);
      assert(
        Object.keys(results).length === sportIds.length,
        `${maturityType}: انتظار ${sportIds.length} رشته، گرفتیم ${Object.keys(results).length}`
      );
      for (const sportId of sportIds) {
        checkedCount++;
        assert(results[sportId] !== undefined, `${maturityType}/${sportId}: نباید غایب باشد`);
        assert(
          validFactors.has(results[sportId].maturity_adjustment_factor),
          `${maturityType}/${sportId}: factor نامعتبر "${results[sportId].maturity_adjustment_factor}"`
        );
      }
    }
    assert(checkedCount === maturityTypes.length * Object.keys(sportRequirementMatrix).length, "تعداد چک‌ها نادرست است");
    console.log(`     (${checkedCount} ترکیب maturity_type×sport چک شد)`);
  });

  console.log("\n[computeRaeAlert — بخش ۱۲.۳ سند]");
  check("ماه ۱ (فروردین) → alert=true", () => {
    const result = computeRaeAlert(1);
    assert(result.alert === true, "alert باید true باشد");
    assert(result.month_name_fa === "فروردین", "نام ماه نادرست");
    assert(result.narrative != null, "narrative باید موجود باشد");
  });
  check("ماه ۲ (اردیبهشت) → alert=true", () => {
    assert(computeRaeAlert(2).alert === true, "alert باید true باشد");
  });
  check("ماه ۳ (خرداد) → alert=true", () => {
    assert(computeRaeAlert(3).alert === true, "alert باید true باشد");
  });
  check("ماه ۴ (تیر) → alert=false، narrative=null", () => {
    const result = computeRaeAlert(4);
    assert(result.alert === false, "alert باید false باشد");
    assert(result.narrative === null, "narrative باید null باشد");
  });
  check("ماه ۱۲ (اسفند) → alert=false", () => {
    assert(computeRaeAlert(12).alert === false, "alert باید false باشد");
  });
  check("همه‌ی ۹ ماه غیر از ۱-۳ → alert=false (چک جامع)", () => {
    for (let m = 4; m <= 12; m++) {
      assert(computeRaeAlert(m).alert === false, `ماه ${m}: باید alert=false باشد`);
    }
  });
  check("ماه خارج از بازه (۰ یا ۱۳) → throw BIO_BANDING_INVALID_MONTH", () => {
    assertThrowsWithCode(() => computeRaeAlert(0), "BIO_BANDING_INVALID_MONTH");
    assertThrowsWithCode(() => computeRaeAlert(13), "BIO_BANDING_INVALID_MONTH");
  });

  console.log(`\n[test-engine-talentid-file11-biobanding] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
