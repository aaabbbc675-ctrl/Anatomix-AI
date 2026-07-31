// اسکریپت تست مستقل برای engine/talentId/file15_tierClassifier.js.
// اجرا: node scripts/test-engine-talentid-file15-tierclassifier.js
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

(async () => {
  const { classifyTiers, TIER_A_MAX, TIER_B_MAX, TIER_C_CORRECTABLE_MAX } = await import(
    "../engine/talentId/file15_tierClassifier.js"
  );

  function makeReport(sportId, tier, score, whatIfTier) {
    return {
      sport_id: sportId,
      final_tier: tier,
      final_score: score,
      what_if_analysis: whatIfTier ? { estimated_tier_if_corrected: whatIfTier } : undefined,
    };
  }

  console.log("\n[مسیریابی پایه — هر تیر به سطل درست خودش]");
  check("A → tier_A_golden، B → tier_B_development", () => {
    const reports = {
      s1: makeReport("s1", "A", 90),
      s2: makeReport("s2", "B", 75),
    };
    const result = classifyTiers(reports);
    assert(result.tier_A_golden.length === 1 && result.tier_A_golden[0].sport_id === "s1", "A نادرست");
    assert(result.tier_B_development.length === 1 && result.tier_B_development[0].sport_id === "s2", "B نادرست");
  });

  check("C بدون whatIf→A → tier_C_low_potential، نه tier_C_correctable", () => {
    const reports = { s1: makeReport("s1", "C", 50) };
    const result = classifyTiers(reports);
    assert(result.tier_C_correctable.length === 0, "نباید در correctable باشد");
    assert(result.tier_C_low_potential.length === 1 && result.tier_C_low_potential[0].sport_id === "s1", "باید در low_potential باشد");
  });

  check("C با whatIf.estimated_tier_if_corrected='B' (نه A) → همچنان tier_C_low_potential", () => {
    const reports = { s1: makeReport("s1", "C", 50, "B") };
    const result = classifyTiers(reports);
    assert(result.tier_C_correctable.length === 0, "نباید در correctable باشد (whatIf فقط تا B می‌رسد، نه A)");
    assert(result.tier_C_low_potential.length === 1, "باید در low_potential باشد");
  });

  check("C با whatIf.estimated_tier_if_corrected='A' → tier_C_correctable", () => {
    const reports = { s1: makeReport("s1", "C", 50, "A") };
    const result = classifyTiers(reports);
    assert(result.tier_C_correctable.length === 1 && result.tier_C_correctable[0].sport_id === "s1", "باید در correctable باشد");
    assert(result.tier_C_low_potential.length === 0, "نباید در low_potential هم باشد (بدون تکرار)");
  });

  check("M → tier_M_medical_hold، صرف‌نظر از final_score", () => {
    const reports = { s1: makeReport("s1", "M", 95) };
    const result = classifyTiers(reports);
    assert(result.tier_M_medical_hold.length === 1 && result.tier_M_medical_hold[0].sport_id === "s1", "M نادرست");
  });

  console.log("\n[سقف A=۳ — fixture مصنوعی، چون با ۵ رشته‌ی واقعی هرگز trigger نمی‌شود]");
  check("۴ رشته‌ی A → فقط ۳ تای برتر (بر اساس final_score نزولی)، چهارمی کاملاً کنار گذاشته می‌شود (نه data loss — فقط بیرون از این خروجی)", () => {
    const reports = {
      a1: makeReport("a1", "A", 88),
      a2: makeReport("a2", "A", 99),
      a3: makeReport("a3", "A", 85),
      a4: makeReport("a4", "A", 92),
    };
    const result = classifyTiers(reports);
    assert(result.tier_A_golden.length === TIER_A_MAX, `باید دقیقاً ${TIER_A_MAX} باشد`);
    const ids = result.tier_A_golden.map((r) => r.sport_id);
    assert(ids.join(",") === "a2,a4,a1", `ترتیب نادرست: ${ids.join(",")}`);
    assert(!ids.includes("a3"), "a3 (کمترین امتیاز) باید کنار گذاشته شود");
    // a3 نباید در هیچ سطل دیگری هم سر در بیاورد (طبق تصمیم گزینه‌ی الف)
    assert(!result.tier_C_low_potential.some((r) => r.sport_id === "a3"), "a3 نباید در هیچ سطل دیگری باشد");
    assert(!result.hidden_from_default.includes("a3"), "a3 نباید حتی در hidden_from_default باشد");
  });

  console.log("\n[سقف B=۵ — fixture مصنوعی]");
  check("۶ رشته‌ی B → فقط ۵ تای برتر، ششمی کنار گذاشته می‌شود", () => {
    const reports = {};
    const scores = [70, 84, 75, 80, 72, 78];
    scores.forEach((score, i) => {
      reports[`b${i}`] = makeReport(`b${i}`, "B", score);
    });
    const result = classifyTiers(reports);
    assert(result.tier_B_development.length === TIER_B_MAX, `باید دقیقاً ${TIER_B_MAX} باشد`);
    // پایین‌ترین امتیاز (۷۰، b0) باید کنار گذاشته شود
    assert(!result.tier_B_development.some((r) => r.sport_id === "b0"), "b0 (کمترین امتیاز) باید کنار گذاشته شود");
  });

  console.log("\n[سقف tier_C_correctable=۵ — تفاوت کلیدی با A/B: مازاد به tier_C_low_potential می‌رود، نه کنار گذاشته می‌شود]");
  check("۶ رشته‌ی C+whatIf→A → ۵ تای برتر در correctable، ششمی در low_potential (نه حذف کامل)", () => {
    const reports = {};
    const scores = [60, 69, 65, 68, 62, 67];
    scores.forEach((score, i) => {
      reports[`c${i}`] = makeReport(`c${i}`, "C", score, "A");
    });
    const result = classifyTiers(reports);
    assert(result.tier_C_correctable.length === TIER_C_CORRECTABLE_MAX, `باید دقیقاً ${TIER_C_CORRECTABLE_MAX} باشد`);
    assert(result.tier_C_low_potential.length === 1, "باید دقیقاً ۱ مورد در low_potential باشد (مازاد correctable)");
    // پایین‌ترین امتیاز (۶۰، c0) باید همان موردی باشد که به low_potential رفته
    assert(result.tier_C_low_potential[0].sport_id === "c0", "c0 (کمترین امتیاز) باید در low_potential باشد");
    assert(result.hidden_from_default.includes("c0"), "c0 باید در hidden_from_default باشد (طبق تصمیم Commit 15، برخلاف overflow A/B)");
  });

  console.log("\n[hidden_from_default — دقیقاً C_low_potential، هرگز M]");
  check("hidden_from_default شامل C_low_potential است ولی هرگز شامل M نیست، حتی با چند M", () => {
    const reports = {
      m1: makeReport("m1", "M", 95),
      m2: makeReport("m2", "M", 20),
      c1: makeReport("c1", "C", 40),
    };
    const result = classifyTiers(reports);
    assert(result.tier_M_medical_hold.length === 2, "باید هر دو M نمایش داده شوند");
    assert(!result.hidden_from_default.includes("m1") && !result.hidden_from_default.includes("m2"), "M نباید در hidden_from_default باشد");
    assert(result.hidden_from_default.includes("c1"), "c1 باید در hidden_from_default باشد");
  });

  console.log("\n[═══ REGRESSION GUARD: بدون تکرار/گم‌شدن غیرمنتظره ═══]");
  check("برای چند سناریوی متفاوت، هر رشته دقیقاً صفر یا یک بار در سطل‌های خروجی ظاهر می‌شود (بدون تکرار)", () => {
    const scenarios = [
      {
        s1: makeReport("s1", "A", 90),
        s2: makeReport("s2", "B", 75),
        s3: makeReport("s3", "C", 50),
        s4: makeReport("s4", "C", 60, "A"),
        s5: makeReport("s5", "M", 30),
      },
      {
        s1: makeReport("s1", "A", 86),
        s2: makeReport("s2", "A", 99),
        s3: makeReport("s3", "A", 85),
        s4: makeReport("s4", "A", 92),
        s5: makeReport("s5", "M", 10),
      },
    ];
    let checkedCount = 0;
    for (const reports of scenarios) {
      checkedCount++;
      const result = classifyTiers(reports);
      const allIds = [
        ...result.tier_A_golden.map((r) => r.sport_id),
        ...result.tier_B_development.map((r) => r.sport_id),
        ...result.tier_C_correctable.map((r) => r.sport_id),
        ...result.tier_C_low_potential.map((r) => r.sport_id),
        ...result.tier_M_medical_hold.map((r) => r.sport_id),
      ];
      const uniqueIds = new Set(allIds);
      assert(uniqueIds.size === allIds.length, "هیچ رشته‌ای نباید در دو سطل هم‌زمان ظاهر شود");
      assert(Array.isArray(result.hidden_from_default), "hidden_from_default باید آرایه باشد");
    }
    assert(checkedCount === scenarios.length, "تعداد سناریوها نادرست است");
    console.log(`     (${checkedCount} سناریو چک شد)`);
  });

  console.log(`\n[test-engine-talentid-file15-tierclassifier] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
