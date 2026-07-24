// اسکریپت تست مستقل برای فایل ۷ موتور اصلاحی (پردازش عدم‌تقارن).
// اجرا: node scripts/test-engine-corrective-file7-asymmetry.js

// engine/ اکنون ESM است (engine/package.json)؛ این اسکریپت CommonJS می‌ماند،
// پس باید ماژول موتور را با dynamic import() بارگذاری کند (پایین، داخل IIFE).
//
// طبق تصمیم صریح: چون هیچ حرکتی در exercises.seed.js با تگ «Core
// Stabilization» مشخص نشده، این تست از شناسه‌های ادبی/فرضی به‌سبک
// SQ-BB/DL-CV استفاده می‌کند.
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

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message || "deep-equal mismatch"} — actual: ${a}, expected: ${e}`);
  }
}

function assertThrows(fn, messageIncludes, description) {
  try {
    fn();
    throw new Error(`${description || "انتظار throw داشتیم"} — اما throw نشد`);
  } catch (err) {
    if (messageIncludes && !err.message.includes(messageIncludes)) {
      throw new Error(`${description || "پیام خطا نامنتظره"} — گرفتیم: "${err.message}"`);
    }
  }
}

(async () => {
  const { calibrateApplicationRule, resolveEffectiveSide, resolveExerciseSide, applyUnknownSideGuardrail } = await import(
    "../engine/corrective/file7_asymmetry.js"
  );

  console.log("\n[کالیبراسیون — ناهنجاری محوری در برابر مفصلی/درد]");
  check("محوری + کشش → Same_Side", () => {
    assert(calibrateApplicationRule({ deformityCategory: "axial", exerciseFunction: "stretch" }) === "Same_Side");
  });
  check("محوری + تقویت → Opposite_Side", () => {
    assert(calibrateApplicationRule({ deformityCategory: "axial", exerciseFunction: "strengthen" }) === "Opposite_Side");
  });
  check("مفصلی/درد + کشش → Same_Side", () => {
    assert(calibrateApplicationRule({ deformityCategory: "joint_or_pain", exerciseFunction: "stretch" }) === "Same_Side");
  });
  check("مفصلی/درد + تقویت → Same_Side (برخلاف محوری، هر دو تابع یکسان‌اند)", () => {
    assert(calibrateApplicationRule({ deformityCategory: "joint_or_pain", exerciseFunction: "strengthen" }) === "Same_Side");
  });
  check("deformityCategory نامعتبر رد می‌شود", () => {
    assertThrows(
      () => calibrateApplicationRule({ deformityCategory: "unknown_type", exerciseFunction: "stretch" }),
      "deformityCategory نامعتبر"
    );
  });

  console.log("\n[مصرف واقعی application_rule — هر دو Affected_Side شناخته‌شده]");
  check("Right + Same_Side → Right", () => {
    assert(resolveEffectiveSide({ affectedSide: "Right", applicationRule: "Same_Side" }) === "Right");
  });
  check("Right + Opposite_Side → Left", () => {
    assert(resolveEffectiveSide({ affectedSide: "Right", applicationRule: "Opposite_Side" }) === "Left");
  });
  check("Left + Same_Side → Left", () => {
    assert(resolveEffectiveSide({ affectedSide: "Left", applicationRule: "Same_Side" }) === "Left");
  });
  check("Left + Opposite_Side → Right", () => {
    assert(resolveEffectiveSide({ affectedSide: "Left", applicationRule: "Opposite_Side" }) === "Right");
  });
  check("Bilateral + هر دو applicationRule → همیشه Bilateral", () => {
    assert(resolveEffectiveSide({ affectedSide: "Bilateral", applicationRule: "Same_Side" }) === "Bilateral");
    assert(resolveEffectiveSide({ affectedSide: "Bilateral", applicationRule: "Opposite_Side" }) === "Bilateral");
  });
  check("Unknown اینجا رد می‌شود و به گاردریل ارجاع می‌دهد", () => {
    assertThrows(
      () => resolveEffectiveSide({ affectedSide: "Unknown", applicationRule: "Same_Side" }),
      "applyUnknownSideGuardrail"
    );
  });

  check("resolveExerciseSide مستقیماً از exercise.application_rule واقعی می‌خواند", () => {
    const exercise = { id: "SQ-BB", application_rule: "Opposite_Side" };
    assert(resolveExerciseSide({ exercise, affectedSide: "Left" }) === "Right");
  });

  console.log("\n[گاردریل — حالت غیرفعال]");
  check("بدون S-شکل و با Affected_Side شناخته‌شده: عبور دست‌نخورده", () => {
    const exercises = [{ id: "SQ-BB", laterality: "bilateral" }, { id: "LNG-DB", laterality: "unilateral" }];
    const result = applyUnknownSideGuardrail({ hasSShapeDeformity: false, affectedSide: "Right", exercises });
    assertDeepEqual(result, { guardrailActive: false, exercises, warnings: [] });
  });

  console.log("\n[گاردریل — تریگر با Affected_Side='Unknown']");
  check("همه‌ی حرکات یک‌طرفه باطل می‌شوند؛ بدون لیست Core Stabilization چیزی باقی نمی‌ماند", () => {
    const exercises = [
      { id: "SQ-BB", laterality: "bilateral" },
      { id: "LNG-DB", laterality: "unilateral" },
    ];
    const result = applyUnknownSideGuardrail({ hasSShapeDeformity: false, affectedSide: "Unknown", exercises });
    assert(result.guardrailActive === true);
    assertDeepEqual(result.exercises, []);
    assert(result.warnings.length === 1);
  });

  check("با لیست Core Stabilization معتبر: فقط آن حرکات bilateral مجازند", () => {
    const exercises = [
      { id: "CORE-1", laterality: "bilateral" }, // در لیست core stabilization
      { id: "SQ-BB", laterality: "bilateral" }, // bilateral هست ولی core stabilization نیست
      { id: "LNG-DB", laterality: "unilateral" }, // یک‌طرفه، حتی اگر در لیست بود باید باطل شود
    ];
    const result = applyUnknownSideGuardrail({
      hasSShapeDeformity: false,
      affectedSide: "Unknown",
      exercises,
      coreStabilizationExerciseIds: ["CORE-1", "LNG-DB"], // عمداً LNG-DB هم اینجا هست تا چک شود یک‌طرفه‌ها هرحال باطل می‌شوند
    });
    assertDeepEqual(
      result.exercises.map((e) => e.id),
      ["CORE-1"]
    );
    assertDeepEqual(result.warnings, []);
  });

  console.log("\n[گاردریل — تریگر با hasSShapeDeformity=true (حتی با Affected_Side شناخته‌شده)]");
  check("عارضه‌ی S-شکل به‌تنهایی گاردریل را فعال می‌کند", () => {
    const exercises = [{ id: "SQ-BB", laterality: "bilateral" }];
    const result = applyUnknownSideGuardrail({
      hasSShapeDeformity: true,
      affectedSide: "Right", // شناخته‌شده است، اما S-شکل خودش کافی است
      exercises,
      coreStabilizationExerciseIds: ["SQ-BB"],
    });
    assert(result.guardrailActive === true);
    assertDeepEqual(
      result.exercises.map((e) => e.id),
      ["SQ-BB"]
    );
  });

  console.log("\n[اعتبارسنجی ورودی نامعتبر]");
  check("hasSShapeDeformity غیر Boolean رد می‌شود", () => {
    assertThrows(
      () => applyUnknownSideGuardrail({ hasSShapeDeformity: "بله", affectedSide: "Right", exercises: [] }),
      "hasSShapeDeformity نامعتبر"
    );
  });
  check("affectedSide نامعتبر رد می‌شود", () => {
    assertThrows(
      () => applyUnknownSideGuardrail({ hasSShapeDeformity: false, affectedSide: "Up", exercises: [] }),
      "affectedSide نامعتبر"
    );
  });

  console.log(`\n[test-engine-corrective-file7-asymmetry] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
