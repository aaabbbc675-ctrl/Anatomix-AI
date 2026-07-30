// اسکریپت تست مستقل برای engine/talentId/file6_flexibilityROMAdjustments.js.
// اجرا: node scripts/test-engine-talentid-file6-rom.js
//
// ⚠️ REGRESSION GUARD اصلی این فایل بخش «هرگز veto» پایین‌تر است — حذف نکنید.
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
  const { computeRomAdjustments, severityMultiplier: _unused, _makeRomAdjustment, _makeHypermobilityAdjustment } =
    await import("../engine/talentId/file6_flexibilityROMAdjustments.js");
  const { severityMultiplier } = await import("../engine/talentId/file5_posturalAdvisoryLayer.js");
  const { romSportImpactMap, hypermobilityImpact } = await import("../engine/talentId/shared/romSportImpactMap.js");
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  console.log("\n[مقیاس‌بندی severity با severityMultiplier موجود]");
  check("severe_short کوتاهی آشیل برای weightlifting_olympic → -25 × 1.0 = -25", () => {
    const result = computeRomAdjustments({ achilles_short: "severe_short" }, false, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.weightlifting_olympic.find((a) => a.deficit_type === "achilles_short");
    assertClose(adj.applied_penalty, -25, 0.001, "applied_penalty نادرست");
  });

  check("moderate_short کوتاهی آشیل برای weightlifting_olympic → -25 × 0.7 = -17.5", () => {
    const result = computeRomAdjustments({ achilles_short: "moderate_short" }, false, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.weightlifting_olympic.find((a) => a.deficit_type === "achilles_short");
    assertClose(adj.applied_penalty, -17.5, 0.001, "applied_penalty نادرست");
  });

  check("mild_short کوتاهی فلکسور لگن برای soccer_striker → -10 × 0.3 = -3", () => {
    const result = computeRomAdjustments({ hip_flexor_short: "mild_short" }, false, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.soccer_striker.find((a) => a.deficit_type === "hip_flexor_short");
    assertClose(adj.applied_penalty, -3, 0.001, "applied_penalty نادرست");
  });

  console.log("\n[پوشش صادقانه — wrestling_freestyle و hamstring_short]");
  check("hamstring_short با هر severity → هیچ adjustment ای برای هیچ‌کدام از ۵ رشته", () => {
    const result = computeRomAdjustments({ hamstring_short: "severe_short" }, false, sportRequirementMatrix);
    assert(Object.keys(result.adjustments_by_sport).length === 0, "نباید هیچ adjustment ای وجود داشته باشد");
  });

  check("wrestling_freestyle در هیچ deficit ای پوشش ندارد (حتی با همه‌ی deficitها هم‌زمان)", () => {
    const result = computeRomAdjustments(
      {
        achilles_short: "severe_short",
        hamstring_short: "severe_short",
        shoulder_flexor_short: "severe_short",
        hip_flexor_short: "severe_short",
        pectoralis_short: "severe_short",
      },
      false,
      sportRequirementMatrix
    );
    assert(!result.adjustments_by_sport.wrestling_freestyle, "wrestling_freestyle نباید هیچ adjustment ای داشته باشد");
  });

  console.log("\n[normal و severity ناشناخته]");
  check("severity='normal' → نادیده گرفته می‌شود", () => {
    const result = computeRomAdjustments({ achilles_short: "normal" }, false, sportRequirementMatrix);
    assert(Object.keys(result.adjustments_by_sport).length === 0, "نباید هیچ adjustment ای وجود داشته باشد");
  });

  check("severity ناشناخته (مثلاً 'unknown_value') → رد می‌شود بدون throw", () => {
    const result = computeRomAdjustments({ achilles_short: "unknown_value" }, false, sportRequirementMatrix);
    assert(Object.keys(result.adjustments_by_sport).length === 0, "نباید هیچ adjustment ای وجود داشته باشد");
  });

  console.log("\n[Hypermobility]");
  check("hypermobility=true → بونوس +۱۵ برای weightlifting_olympic/swimming_general/wrestling_freestyle", () => {
    const result = computeRomAdjustments({}, true, sportRequirementMatrix);
    for (const sportId of ["weightlifting_olympic", "swimming_general", "wrestling_freestyle"]) {
      const adj = result.adjustments_by_sport[sportId]?.find((a) => a.deficit_type === "hypermobility");
      assert(adj && adj.applied_penalty === 15, `${sportId}: انتظار +۱۵، گرفتیم ${adj?.applied_penalty}`);
      assert(adj.trainability === "partial", `${sportId}: trainability باید partial باشد`);
    }
  });

  check("hypermobility=true → جریمه -۱۵ برای volleyball_middle_blocker", () => {
    const result = computeRomAdjustments({}, true, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.volleyball_middle_blocker.find((a) => a.deficit_type === "hypermobility");
    assert(adj.applied_penalty === -15, `انتظار -۱۵، گرفتیم ${adj.applied_penalty}`);
  });

  check("hypermobility=true → soccer_striker نه در positive نه در negative است، بدون adjustment", () => {
    const result = computeRomAdjustments({}, true, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.soccer_striker?.find((a) => a.deficit_type === "hypermobility");
    assert(!adj, "soccer_striker نباید hypermobility adjustment داشته باشد");
  });

  check("hypermobility=false → هیچ hypermobility driver ای تولید نمی‌شود", () => {
    const result = computeRomAdjustments({}, false, sportRequirementMatrix);
    assert(Object.keys(result.adjustments_by_sport).length === 0, "نباید هیچ adjustment ای وجود داشته باشد");
  });

  console.log("\n[trainability]");
  check("کوتاهی عضلانی → trainability=trainable", () => {
    const result = computeRomAdjustments({ shoulder_flexor_short: "severe_short" }, false, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.swimming_general.find((a) => a.deficit_type === "shoulder_flexor_short");
    assert(adj.trainability === "trainable", `انتظار trainable، گرفتیم ${adj.trainability}`);
  });

  console.log("\n[═══ REGRESSION GUARD: هرگز veto — این بخش را حذف نکنید ═══]");
  check("روی *کل* romSportImpactMap × هر ۳ severity + hypermobilityImpact: is_correctable همیشه strictly true و applied_penalty همیشه محدود است", () => {
    let checkedCount = 0;
    for (const [deficitType, impactMap] of Object.entries(romSportImpactMap)) {
      for (const [sportId, impact] of Object.entries(impactMap)) {
        for (const severityLevel of [1, 2, 3]) {
          const scaledPenalty = impact.penalty * severityMultiplier(severityLevel);
          const adjustment = _makeRomAdjustment({
            deficitType,
            severityLevel,
            appliedPenalty: scaledPenalty,
            reason: impact.reason,
          });
          checkedCount++;
          assert(adjustment.is_correctable === true, `${deficitType}/${sportId}/سطح=${severityLevel}: is_correctable باید true باشد`);
          assert(Number.isFinite(adjustment.applied_penalty), `${deficitType}/${sportId}/سطح=${severityLevel}: applied_penalty باید محدود باشد`);
          assert(
            !("veto" in adjustment) && !("excluded" in adjustment) && !("is_excluded" in adjustment),
            `${deficitType}/${sportId}/سطح=${severityLevel}: نباید هیچ فیلد veto/excluded ای وجود داشته باشد`
          );
        }
      }
    }
    for (const sportId of hypermobilityImpact.positive) {
      const adj = _makeHypermobilityAdjustment({
        appliedMagnitude: hypermobilityImpact.positive_bonus,
        reason: hypermobilityImpact.reason_positive,
      });
      checkedCount++;
      assert(adj.is_correctable === true, `hypermobility positive/${sportId}: is_correctable باید true باشد`);
      assert(Number.isFinite(adj.applied_penalty), `hypermobility positive/${sportId}: applied_penalty باید محدود باشد`);
    }
    for (const sportId of hypermobilityImpact.negative) {
      const adj = _makeHypermobilityAdjustment({
        appliedMagnitude: hypermobilityImpact.negative_penalty,
        reason: hypermobilityImpact.reason_negative,
      });
      checkedCount++;
      assert(adj.is_correctable === true, `hypermobility negative/${sportId}: is_correctable باید true باشد`);
      assert(Number.isFinite(adj.applied_penalty), `hypermobility negative/${sportId}: applied_penalty باید محدود باشد`);
    }
    assert(checkedCount > 0, "باید حداقل چند ترکیب چک شده باشد");
    console.log(`     (${checkedCount} ترکیب deficit×sport×severity + hypermobility چک شد)`);
  });

  check("_makeRomAdjustment با applied_penalty خراب (NaN) → throw ROM_VETO_VIOLATION", () => {
    assertThrowsWithCode(
      () =>
        _makeRomAdjustment({ deficitType: "achilles_short", severityLevel: 2, appliedPenalty: NaN, reason: "test" }),
      "ROM_VETO_VIOLATION"
    );
  });

  console.log(`\n[test-engine-talentid-file6-rom] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
