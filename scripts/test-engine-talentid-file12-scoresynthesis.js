// اسکریپت تست مستقل برای engine/talentId/file12_scoreSynthesis.js.
// اجرا: node scripts/test-engine-talentid-file12-scoresynthesis.js
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

(async () => {
  const {
    synthesizeScores,
    synthesizeScoreForSport,
    computeDynamicWeights,
    computeCI,
    classifyConfidenceTier,
    BASELINE_CI_INPUTS,
  } = await import("../engine/talentId/file12_scoreSynthesis.js");
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  function bioBandedFixture(bio, perf, psych) {
    const result = {};
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      result[sportId] = { adjusted_bio_score: bio, adjusted_perf_score: perf, adjusted_psych_score: psych };
    }
    return result;
  }

  function clearMedicalHolds() {
    const result = {};
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      result[sportId] = { status: "clear" };
    }
    return result;
  }

  console.log("\n[computeCI — baseline-only (تصمیم تاییدشده‌ی Commit 12، گزینه‌ی الف)]");
  check("bio_ci=perf_ci=psych_ci=0 → ci همیشه دقیقاً sqrt(3²)=3", () => {
    const ci = computeCI(BASELINE_CI_INPUTS);
    assertClose(ci, 3, 0.0001, "ci نادرست");
  });
  check("حتی با ci_input های غیرصفر فرضی، فرمول variance درست محاسبه می‌شود (تست خودِ فرمول، مستقل از تصمیم baseline)", () => {
    // مرجع بخش ۱۳.۲ سند: variance = bio_ci²×0.4² + perf_ci²×0.4² + psych_ci²×0.2² + 3²
    const ci = computeCI({ bio_ci: 5, perf_ci: 5, psych_ci: 5 });
    const expectedVariance = 5 ** 2 * 0.16 + 5 ** 2 * 0.16 + 5 ** 2 * 0.04 + 9;
    assertClose(ci, Math.sqrt(expectedVariance), 0.0001, "ci نادرست");
  });

  console.log("\n[classifyConfidenceTier — آستانه‌های بخش ۱۳.۲ سند]");
  check("ci=7.9 → high", () => assert(classifyConfidenceTier(7.9) === "high", "باید high باشد"));
  check("ci=8 → medium (مرز)", () => assert(classifyConfidenceTier(8) === "medium", "باید medium باشد"));
  check("ci=14.9 → medium", () => assert(classifyConfidenceTier(14.9) === "medium", "باید medium باشد"));
  check("ci=15 → low (مرز)", () => assert(classifyConfidenceTier(15) === "low", "باید low باشد"));

  console.log("\n[computeDynamicWeights — بخش ۱۳.۱/۱۳.۳ سند]");
  check("psych معتبر (confidence>=0.5) + maturity=mirwald → وزن پیش‌فرض 40/40/20", () => {
    const weights = computeDynamicWeights({ extracted_confidence: 0.8 }, { formula_used: "mirwald" });
    assertClose(weights.bio, 0.4, 0.0001, "bio نادرست");
    assertClose(weights.perf, 0.4, 0.0001, "perf نادرست");
    assertClose(weights.psych, 0.2, 0.0001, "psych نادرست");
  });
  check("psych confidence<0.5 → 45/45/10", () => {
    const weights = computeDynamicWeights({ extracted_confidence: 0.3 }, { formula_used: "mirwald" });
    assertClose(weights.bio, 0.45, 0.0001, "bio نادرست");
    assertClose(weights.perf, 0.45, 0.0001, "perf نادرست");
    assertClose(weights.psych, 0.1, 0.0001, "psych نادرست");
  });
  check("psychProfile=null → 45/45/10 (یافته‌ی Commit 12: معادل واقعی شرط psychScores===null سند)", () => {
    const weights = computeDynamicWeights(null, { formula_used: "mirwald" });
    assertClose(weights.bio, 0.45, 0.0001, "bio نادرست");
    assertClose(weights.psych, 0.1, 0.0001, "psych نادرست");
  });
  check("maturity_fallback (chronological_fallback) + psych معتبر → 30/50/20", () => {
    const weights = computeDynamicWeights({ extracted_confidence: 0.8 }, { formula_used: "chronological_fallback" });
    assertClose(weights.bio, 0.3, 0.0001, "bio نادرست");
    assertClose(weights.perf, 0.5, 0.0001, "perf نادرست");
    assertClose(weights.psych, 0.2, 0.0001, "psych نادرست");
  });
  check("maturity_fallback + psych ضعیف هم‌زمان → 35/55/10 (ترکیب دو شرط)", () => {
    const weights = computeDynamicWeights({ extracted_confidence: 0.2 }, { formula_used: "chronological_fallback" });
    assertClose(weights.bio, 0.35, 0.0001, "bio نادرست");
    assertClose(weights.perf, 0.55, 0.0001, "perf نادرست");
    assertClose(weights.psych, 0.1, 0.0001, "psych نادرست");
  });

  console.log("\n[synthesizeScoreForSport — فرمول وزن‌دار با rescale]");
  check("bio=100,perf=100,psych=100 (وضعیت خنثی) با وزن پیش‌فرض → final=60 (rescale: 50×0.4+50×0.4+100×0.2)", () => {
    const result = synthesizeScoreForSport(
      { adjusted_bio_score: 100, adjusted_perf_score: 100, adjusted_psych_score: 100 },
      "clear",
      { bio: 0.4, perf: 0.4, psych: 0.2 },
      BASELINE_CI_INPUTS
    );
    assertClose(result.final_score, 60, 0.0001, "final_score نادرست");
    assertClose(result.component_scores.bio, 50, 0.0001, "component bio نادرست (باید rescale شده باشد)");
    assertClose(result.component_scores.perf, 50, 0.0001, "component perf نادرست");
    assertClose(result.component_scores.psych, 100, 0.0001, "component psych نباید rescale شود");
  });

  console.log("\n[⚠️ سناریوی ceiling-clustering — همان مثال مستندشده در docs/TODO-ci-computation.md]");
  check("wrestling_freestyle: bio=155,perf=115,psych=90 → با rescale final=72 (نه 100 که بدون rescale می‌شد)", () => {
    const result = synthesizeScoreForSport(
      { adjusted_bio_score: 155, adjusted_perf_score: 115, adjusted_psych_score: 90 },
      "clear",
      { bio: 0.4, perf: 0.4, psych: 0.2 },
      BASELINE_CI_INPUTS
    );
    // محاسبه‌ی دستی: bio=155/2=77.5، perf=115/2=57.5، psych=90
    // final = 77.5×0.4 + 57.5×0.4 + 90×0.2 = 31 + 23 + 18 = 72
    assertClose(result.final_score, 72, 0.0001, "final_score نادرست");

    // شاهد صریح tradeoff: اگر rescale نمی‌کردیم (بدون تقسیم بر ۲)، همین سه
    // مقدار خام مستقیماً در وزن‌ها ضرب می‌شدند و پس از clamp(0,100) به ۱۰۰
    // می‌رسیدند — یعنی تمایز واقعی این ورزشکار (۷۲ واقعی) با یک ورزشکار
    // نزدیک به سقف مطلق (۲۰۰/۲۰۰/۱۰۰) که او هم به ۱۰۰ clamp می‌شود، از بین
    // می‌رفت. این خط دقیقاً همان محاسبه‌ی بدون rescale را برای مستندسازی تکرار می‌کند.
    const withoutRescale = Math.min(100, 155 * 0.4 + 115 * 0.4 + 90 * 0.2);
    assert(withoutRescale === 100, "بدون rescale انتظار می‌رفت به سقف ۱۰۰ clamp شود (شاهد مستندسازی)");
    assert(result.final_score !== withoutRescale, "با rescale نتیجه باید از حالت بدون rescale متفاوت باشد");
  });

  console.log("\n[medical_hold — طبق سند بدون قید و شرط محاسبه می‌شود]");
  check("رشته با status=medical_hold همچنان final_score عددی معتبر دارد (امتیاز پتانسیل)", () => {
    const result = synthesizeScoreForSport(
      { adjusted_bio_score: 155, adjusted_perf_score: 115, adjusted_psych_score: 90 },
      "medical_hold",
      { bio: 0.4, perf: 0.4, psych: 0.2 },
      BASELINE_CI_INPUTS
    );
    assertClose(result.final_score, 72, 0.0001, "final_score باید مستقل از medical_status محاسبه شود");
    assert(result.medical_status === "medical_hold", "medical_status باید attach شود");
  });

  console.log("\n[synthesizeScores — orchestrator با ۵ رشته‌ی واقعی matrix]");
  check("همیشه دقیقاً ۵ رشته در خروجی، همه با ci=3 (baseline) و confidence_tier=high", () => {
    const bioBanded = bioBandedFixture(140, 120, 85);
    const results = synthesizeScores(
      sportRequirementMatrix,
      bioBanded,
      clearMedicalHolds(),
      { formula_used: "mirwald" },
      { extracted_confidence: 0.9 }
    );
    assert(Object.keys(results).length === 5, `انتظار ۵ رشته، گرفتیم ${Object.keys(results).length}`);
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assertClose(results[sportId].ci, 3, 0.0001, `${sportId}: ci نادرست`);
      assert(results[sportId].confidence_tier === "high", `${sportId}: confidence_tier باید high باشد`);
      assert(results[sportId].medical_status === "clear", `${sportId}: medical_status باید clear باشد`);
    }
  });

  check("medicalHolds با یک رشته‌ی medical_hold → آن رشته هم final_score عددی دارد، فقط status فرق دارد", () => {
    const bioBanded = bioBandedFixture(140, 120, 85);
    const medicalHolds = clearMedicalHolds();
    medicalHolds.wrestling_freestyle = { status: "medical_hold" };
    const results = synthesizeScores(
      sportRequirementMatrix,
      bioBanded,
      medicalHolds,
      { formula_used: "mirwald" },
      { extracted_confidence: 0.9 }
    );
    assert(Number.isFinite(results.wrestling_freestyle.final_score), "final_score باید عدد معتبر باشد");
    assert(results.wrestling_freestyle.medical_status === "medical_hold", "medical_status نادرست");
    assert(
      results.wrestling_freestyle.final_score === results.soccer_striker.final_score,
      "امتیاز رشته‌ی medical_hold باید با بقیه (با ورودی یکسان) برابر باشد — فقط status فرق دارد"
    );
  });

  console.log("\n[Clamp نهایی — سقف مطلق bio/perf/psych]");
  check("bio=200,perf=200,psych=100 (سقف مطلق پس از Commit 11) → final دقیقاً 100، بدون NaN", () => {
    const bioBanded = bioBandedFixture(200, 200, 100);
    const results = synthesizeScores(
      sportRequirementMatrix,
      bioBanded,
      clearMedicalHolds(),
      { formula_used: "mirwald" },
      { extracted_confidence: 0.9 }
    );
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(results[sportId].final_score === 100, `${sportId}: انتظار ۱۰۰، گرفتیم ${results[sportId].final_score}`);
    }
  });

  console.log("\n[═══ REGRESSION GUARD: هرگز حذف نشو — این بخش را حذف نکنید ═══]");
  check("برای چند سناریوی متفاوت (weights مختلف)، synthesizeScores همیشه دقیقاً ۵ رشته با final_score در بازه‌ی ۰-۱۰۰ برمی‌گرداند", () => {
    const scenarios = [
      { maturity: { formula_used: "mirwald" }, psych: { extracted_confidence: 0.9 } },
      { maturity: { formula_used: "chronological_fallback" }, psych: { extracted_confidence: 0.9 } },
      { maturity: { formula_used: "mirwald" }, psych: { extracted_confidence: 0.1 } },
      { maturity: { formula_used: "chronological_fallback" }, psych: null },
    ];
    const bioBandedVariants = [bioBandedFixture(60, 60, 20), bioBandedFixture(140, 130, 95), bioBandedFixture(0, 0, 0)];
    let checkedCount = 0;
    for (const scenario of scenarios) {
      for (const bioBanded of bioBandedVariants) {
        const results = synthesizeScores(
          sportRequirementMatrix,
          bioBanded,
          clearMedicalHolds(),
          scenario.maturity,
          scenario.psych
        );
        const sportIds = Object.keys(sportRequirementMatrix);
        assert(Object.keys(results).length === sportIds.length, "تعداد رشته نادرست");
        for (const sportId of sportIds) {
          checkedCount++;
          assert(results[sportId] !== undefined, `${sportId}: نباید غایب باشد`);
          assert(
            Number.isFinite(results[sportId].final_score) &&
              results[sportId].final_score >= 0 &&
              results[sportId].final_score <= 100,
            `${sportId}: final_score نامعتبر "${results[sportId].final_score}"`
          );
        }
      }
    }
    assert(checkedCount === scenarios.length * bioBandedVariants.length * 5, "تعداد چک‌ها نادرست است");
    console.log(`     (${checkedCount} ترکیب scenario×bioBanded×sport چک شد)`);
  });

  console.log(`\n[test-engine-talentid-file12-scoresynthesis] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
