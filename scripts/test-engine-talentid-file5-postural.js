// اسکریپت تست مستقل برای engine/talentId/file5_posturalAdvisoryLayer.js.
// اجرا: node scripts/test-engine-talentid-file5-postural.js
//
// ⚠️ REGRESSION GUARD اصلی این فایل بخش «هرگز veto» پایین‌تر است — آن
// بخش را در هیچ Commit بعدی حذف نکنید؛ اصل معماری غیرقابل‌مذاکره‌ی بخش
// ۰.۳/۶.۱ سند را محافظت می‌کند.
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
  const { computePosturalAdjustments, severityMultiplier, _makePosturalAdjustment } = await import(
    "../engine/talentId/file5_posturalAdvisoryLayer.js"
  );
  const { posturalSportImpactMap } = await import("../engine/talentId/shared/posturalSportImpactMap.js");
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  console.log("\n[severityMultiplier]");
  check("severity=1 → 0.3", () => assert(severityMultiplier(1) === 0.3));
  check("severity=2 → 0.7", () => assert(severityMultiplier(2) === 0.7));
  check("severity=3 → 1.0", () => assert(severityMultiplier(3) === 1.0));
  check("severity=0 → throw INVALID_SEVERITY", () => {
    assertThrowsWithCode(() => severityMultiplier(0), "INVALID_SEVERITY");
  });
  check("severity=4 → throw INVALID_SEVERITY", () => {
    assertThrowsWithCode(() => severityMultiplier(4), "INVALID_SEVERITY");
  });

  console.log("\n[mild-only beneficial]");
  check("genu_varum خفیف (severity=1) برای soccer_striker → applied_penalty=0، beneficial=mild_only", () => {
    const result = computePosturalAdjustments({ genu_varum: { severity: 1 } }, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.soccer_striker.find((a) => a.posture_type === "genu_varum");
    assert(adj.applied_penalty === 0, `applied_penalty باید ۰ باشد، گرفتیم ${adj.applied_penalty}`);
    assert(adj.beneficial === "mild_only", "beneficial باید mild_only باشد");
  });

  console.log("\n[محاسبه‌ی penalty با severity multiplier]");
  check("کایفوز شدید (severity=3) برای weightlifting_olympic → -25 × 1.0 = -25", () => {
    const result = computePosturalAdjustments({ kyphosis: { severity: 3 } }, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.weightlifting_olympic.find((a) => a.posture_type === "kyphosis");
    assertClose(adj.applied_penalty, -25, 0.001, "applied_penalty نادرست");
  });

  check("کایفوز متوسط (severity=2) برای weightlifting_olympic → -25 × 0.7 = -17.5", () => {
    const result = computePosturalAdjustments({ kyphosis: { severity: 2 } }, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.weightlifting_olympic.find((a) => a.posture_type === "kyphosis");
    assertClose(adj.applied_penalty, -17.5, 0.001, "applied_penalty نادرست");
  });

  console.log("\n[typical_correction_time_weeks]");
  check("کایفوز severity=2 → ۸ هفته (طبق جدول بخش ۶.۵ سند)", () => {
    const result = computePosturalAdjustments({ kyphosis: { severity: 2 } }, sportRequirementMatrix);
    const adj = result.adjustments_by_sport.weightlifting_olympic.find((a) => a.posture_type === "kyphosis");
    assert(adj.typical_correction_time_weeks === 8, `انتظار ۸، گرفتیم ${adj.typical_correction_time_weeks}`);
  });

  console.log("\n[postureهایی که هیچ‌کدام از ۵ رشته‌ی فعلی را پوشش نمی‌دهند]");
  check("forward_head با severity=3 → active_posture ثبت می‌شود؛ فقط boxing (Commit 17) پوشش دارد، نه ۵ رشته‌ی اصلی Commit 1", () => {
    // ⚠️ به‌روزرسانی Commit 17: posturalSportImpactMap.forward_head از قبل
    // (Commit 6) کلید "boxing" را داشت (dormant، چون boxing ساخته نشده بود).
    // با ساخته‌شدن boxing در Commit 17، این ارتباط فعال شد — یافته‌ی مثبت،
    // نه رگرسیون. ۵ رشته‌ی اصلی Commit 1 همچنان پوشش ندارند.
    const result = computePosturalAdjustments({ forward_head: { severity: 3 } }, sportRequirementMatrix);
    const activePosture = result.active_postures.find((p) => p.posture === "forward_head");
    assert(activePosture.affected_sports_count === 1, `affected_sports_count باید ۱ باشد (boxing)، گرفتیم ${activePosture.affected_sports_count}`);
    assert(Object.keys(result.adjustments_by_sport).length === 1, "فقط یک رشته باید adjustment داشته باشد");
    assert(result.adjustments_by_sport.boxing !== undefined, "boxing باید تنها رشته‌ی متأثر باشد");
    for (const sportId of ["soccer_striker", "wrestling_freestyle", "volleyball_middle_blocker", "swimming_general", "weightlifting_olympic"]) {
      assert(result.adjustments_by_sport[sportId] === undefined, `${sportId} نباید تحت تأثیر forward_head باشد`);
    }
  });

  check("severity=0 → posture کلاً نادیده گرفته می‌شود", () => {
    const result = computePosturalAdjustments({ kyphosis: { severity: 0 } }, sportRequirementMatrix);
    assert(result.active_postures.length === 0, "نباید هیچ active_posture ای ثبت شود");
  });

  console.log("\n[trainability و module linking]");
  check("همه‌ی adjustmentها trainability=trainable و corrective_module_status=not_yet_linked دارند", () => {
    const result = computePosturalAdjustments(
      { kyphosis: { severity: 2 }, scoliosis: { severity: 1 } },
      sportRequirementMatrix
    );
    let count = 0;
    for (const adjustments of Object.values(result.adjustments_by_sport)) {
      for (const adj of adjustments) {
        count++;
        assert(adj.trainability === "trainable", `trainability باید trainable باشد، گرفتیم ${adj.trainability}`);
        assert(adj.suggested_corrective_module_id === null, "suggested_corrective_module_id باید null باشد");
        assert(
          adj.corrective_module_status === "not_yet_linked",
          `corrective_module_status نادرست: ${adj.corrective_module_status}`
        );
      }
    }
    assert(count > 0, "باید حداقل چند adjustment تولید شده باشد");
  });

  console.log("\n[═══ REGRESSION GUARD: هرگز veto — این بخش را حذف نکنید ═══]");
  check("روی *کل* posturalSportImpactMap × هر ۳ severity: is_correctable همیشه strictly true و applied_penalty همیشه محدود است", () => {
    let checkedCount = 0;
    for (const [postureType, impactMap] of Object.entries(posturalSportImpactMap)) {
      for (const [sportId, impact] of Object.entries(impactMap)) {
        for (const severity of [1, 2, 3]) {
          const scaledPenalty = impact.penalty * severityMultiplier(severity);
          const adjustment = _makePosturalAdjustment({
            postureType,
            severity,
            appliedPenalty: scaledPenalty,
            reason: impact.reason,
            beneficial: impact.beneficial,
          });
          checkedCount++;

          assert(
            adjustment.is_correctable === true,
            `${postureType}/${sportId}/severity=${severity}: is_correctable باید strictly true باشد`
          );
          assert(
            Number.isFinite(adjustment.applied_penalty),
            `${postureType}/${sportId}/severity=${severity}: applied_penalty باید عدد محدود باشد`
          );
          assert(
            adjustment.applied_penalty > -100,
            `${postureType}/${sportId}/severity=${severity}: applied_penalty نباید بی‌نهایت منفی باشد (${adjustment.applied_penalty})`
          );
          assert(
            !("veto" in adjustment) && !("excluded" in adjustment) && !("is_excluded" in adjustment),
            `${postureType}/${sportId}/severity=${severity}: نباید هیچ فیلد veto/excluded ای وجود داشته باشد`
          );
        }
      }
    }
    assert(checkedCount > 0, "باید حداقل چند ترکیب چک شده باشد");
    console.log(`     (${checkedCount} ترکیب posture×sport×severity چک شد)`);
  });

  check("_makePosturalAdjustment با applied_penalty خراب (NaN) → throw POSTURAL_VETO_VIOLATION", () => {
    assertThrowsWithCode(
      () =>
        _makePosturalAdjustment({
          postureType: "kyphosis",
          severity: 2,
          appliedPenalty: NaN,
          reason: "test",
          beneficial: null,
        }),
      "POSTURAL_VETO_VIOLATION"
    );
  });

  console.log(`\n[test-engine-talentid-file5-postural] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
