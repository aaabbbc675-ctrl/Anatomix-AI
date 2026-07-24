// اسکریپت تست مستقل برای فایل ۱۰ موتور اصلاحی (معماری ۴مرحله‌ای CEx).
// اجرا: node scripts/test-engine-corrective-file10-cexarchitecture.js

// engine/ اکنون ESM است (engine/package.json)؛ این اسکریپت CommonJS می‌ماند،
// پس باید ماژول موتور را با dynamic import() بارگذاری کند (پایین، داخل IIFE).
//
// شناسه‌های حرکات ادبی/فرضی‌اند (به‌سبک SQ-BB/DL-CV) چون فیلد phase روی
// exercises.seed.js واقعی هنوز وجود ندارد — همان الگوی فایل۳/۷/۹.
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

// یک استخر کامل و متعادل: هر فاز دقیقاً تعداد کافی برای رسیدن به سقف ۸ دارد.
function fullPool() {
  return [
    { id: "INH-1", phase: "CEx_Inhibit" },
    { id: "INH-2", phase: "CEx_Inhibit" },
    { id: "LEN-1", phase: "CEx_Lengthen" },
    { id: "LEN-2", phase: "CEx_Lengthen" },
    { id: "ACT-1", phase: "CEx_Activate" },
    { id: "ACT-2", phase: "CEx_Activate" },
    { id: "ACT-3", phase: "CEx_Activate" },
    { id: "INT-1", phase: "CEx_Integrate" },
  ];
}

(async () => {
  const { buildCexProgram, TOTAL_EXERCISE_COUNT_RANGE, LENGTHENING_DURATION_SEC_RANGE } = await import(
    "../engine/corrective/file10_cexArchitecture.js"
  );

  console.log("\n[۴ فاز جدا — استخر کامل، سقف هر فاز رعایت می‌شود]");
  check("Inhibition سقف ۲، Lengthening سقف ۲، Activation سقف ۳، Integration سقف ۲", () => {
    // برای این چک، هر فاز بیشتر از سقفش کاندید دارد.
    const pool = [
      { id: "INH-1", phase: "CEx_Inhibit" },
      { id: "INH-2", phase: "CEx_Inhibit" },
      { id: "INH-3", phase: "CEx_Inhibit" }, // اضافه بر سقف ۲
      { id: "LEN-1", phase: "CEx_Lengthen" },
      { id: "LEN-2", phase: "CEx_Lengthen" },
      { id: "LEN-3", phase: "CEx_Lengthen" }, // اضافه بر سقف ۲
      { id: "ACT-1", phase: "CEx_Activate" },
      { id: "ACT-2", phase: "CEx_Activate" },
      { id: "ACT-3", phase: "CEx_Activate" },
      { id: "ACT-4", phase: "CEx_Activate" }, // اضافه بر سقف ۳
      { id: "INT-1", phase: "CEx_Integrate" },
      { id: "INT-2", phase: "CEx_Integrate" },
      { id: "INT-3", phase: "CEx_Integrate" }, // اضافه بر سقف ۲
    ];
    const result = buildCexProgram({ candidateExercises: pool });
    assert(result.phases.inhibition.exercises.length === 2);
    assert(result.phases.lengthening.exercises.length === 2);
    assert(result.phases.activation.exercises.length === 3);
    assert(result.phases.integration.exercises.length === 2);
  });

  check("جای‌گذاری فازها: Inhibition/Lengthening=warm_up، Activation=main_workout، Integration=main_workout_end", () => {
    const result = buildCexProgram({ candidateExercises: fullPool() });
    assert(result.phases.inhibition.placement === "warm_up");
    assert(result.phases.lengthening.placement === "warm_up");
    assert(result.phases.activation.placement === "main_workout");
    assert(result.phases.integration.placement === "main_workout_end");
  });

  check("بازه‌ی زمانی Lengthening دقیقاً ۳۰ تا ۶۰ ثانیه است (طبق سند)", () => {
    assertDeepEqual(LENGTHENING_DURATION_SEC_RANGE, [30, 60]);
  });

  console.log("\n[سقف کل ۵-۸ حرکت]");
  check("استخر کامل → مجموع دقیقاً ۸، withinDocumentedRange=true", () => {
    const result = buildCexProgram({ candidateExercises: fullPool() });
    assert(result.totalExerciseCount === 8);
    assert(result.withinDocumentedRange === true);
  });

  check("استخر کم (فقط ۱ حرکت هر فاز = مجموع ۴) → withinDocumentedRange=false، بدون throw", () => {
    const pool = [
      { id: "INH-1", phase: "CEx_Inhibit" },
      { id: "LEN-1", phase: "CEx_Lengthen" },
      { id: "ACT-1", phase: "CEx_Activate" },
      { id: "INT-1", phase: "CEx_Integrate" },
    ];
    const result = buildCexProgram({ candidateExercises: pool });
    assertDeepEqual(TOTAL_EXERCISE_COUNT_RANGE, [5, 8]);
    assert(result.totalExerciseCount === 4);
    assert(result.withinDocumentedRange === false);
  });

  console.log("\n[فیلتر Contraindications — دقیقاً همان تابع واقعی فایل۳، نه بازسازی]");
  check("حرکت contraindicated بدون جایگزین → از فاز مربوطه حذف می‌شود و همان هشدار جدی فایل۳ برمی‌گردد", () => {
    const pool = [
      { id: "ACT-1", phase: "CEx_Activate", contraindications: ["knee_pain"] },
      { id: "ACT-2", phase: "CEx_Activate" },
    ];
    const result = buildCexProgram({ candidateExercises: pool, userContraindications: ["knee_pain"] });
    assertDeepEqual(
      result.phases.activation.exercises.map((e) => e.id),
      ["ACT-2"]
    );
    assert(result.warnings.length === 1);
    assert(result.warnings[0].exerciseId === "ACT-1");
    assert(result.warnings[0].reason.includes("Contraindication"));
  });

  check("حرکت contraindicated با جایگزین امن → جایگزین در همان فاز ظاهر می‌شود", () => {
    const pool = [{ id: "ACT-1", phase: "CEx_Activate", contraindications: ["knee_pain"], alternative_corrective_exercise: "ACT-ALT" }];
    const exerciseBankById = { "ACT-ALT": { id: "ACT-ALT", phase: "CEx_Activate", contraindications: [] } };
    const result = buildCexProgram({
      candidateExercises: pool,
      userContraindications: ["knee_pain"],
      exerciseBankById,
    });
    assertDeepEqual(
      result.phases.activation.exercises.map((e) => e.id),
      ["ACT-ALT"]
    );
    assertDeepEqual(result.warnings, []);
  });

  console.log("\n[حل تعارض — hasActiveInjury=true، اول Rehab]");
  check("وقتی کاندیدهای یک فاز از سقف بیشترند و آسیب فعال است، حرکات Rehab اول انتخاب می‌شوند", () => {
    const pool = [
      { id: "ACT-hyp1", phase: "CEx_Activate", triageCategory: "hypertrophy_strength" },
      { id: "ACT-rehab1", phase: "CEx_Activate", triageCategory: "rehab" },
      { id: "ACT-corr1", phase: "CEx_Activate", triageCategory: "correction" },
      { id: "ACT-hyp2", phase: "CEx_Activate", triageCategory: "hypertrophy_strength" },
    ];
    const resultWithInjury = buildCexProgram({ candidateExercises: pool, hasActiveInjury: true });
    assertDeepEqual(
      resultWithInjury.phases.activation.exercises.map((e) => e.id),
      ["ACT-rehab1", "ACT-corr1", "ACT-hyp1"] // سقف ۳؛ rehab و correction قبل از hypertrophy_strength
    );

    const resultWithoutInjury = buildCexProgram({ candidateExercises: pool, hasActiveInjury: false });
    assertDeepEqual(
      resultWithoutInjury.phases.activation.exercises.map((e) => e.id),
      ["ACT-hyp1", "ACT-rehab1", "ACT-corr1"] // بدون تریاژ، همان ترتیب ورودی
    );
  });

  console.log("\n[چک عصبی Tensioning — hasNeurologicalSymptoms]");
  check("hasNeurologicalSymptoms=true → حرکت Tensioning از Lengthening حذف می‌شود + هشدار", () => {
    const pool = [
      { id: "LEN-tension", phase: "CEx_Lengthen", neural_tension_type: "Tensioning" },
      { id: "LEN-normal", phase: "CEx_Lengthen", neural_tension_type: "None" },
    ];
    const result = buildCexProgram({ candidateExercises: pool, hasNeurologicalSymptoms: true });
    assertDeepEqual(
      result.phases.lengthening.exercises.map((e) => e.id),
      ["LEN-normal"]
    );
    assert(result.warnings.some((w) => w.exerciseId === "LEN-tension" && w.reason.includes("Tensioning")));
  });

  check("hasNeurologicalSymptoms=false → حرکت Tensioning مجاز می‌ماند", () => {
    const pool = [{ id: "LEN-tension", phase: "CEx_Lengthen", neural_tension_type: "Tensioning" }];
    const result = buildCexProgram({ candidateExercises: pool, hasNeurologicalSymptoms: false });
    assertDeepEqual(
      result.phases.lengthening.exercises.map((e) => e.id),
      ["LEN-tension"]
    );
    assertDeepEqual(result.warnings, []);
  });

  check("Tensioning در فازهای دیگر (نه Lengthening) اصلاً چک نمی‌شود", () => {
    const pool = [{ id: "ACT-tension", phase: "CEx_Activate", neural_tension_type: "Tensioning" }];
    const result = buildCexProgram({ candidateExercises: pool, hasNeurologicalSymptoms: true });
    assertDeepEqual(
      result.phases.activation.exercises.map((e) => e.id),
      ["ACT-tension"]
    );
  });

  console.log("\n[اعتبارسنجی ورودی نامعتبر]");
  check("candidateExercises غیرآرایه رد می‌شود", () => {
    assertThrows(() => buildCexProgram({ candidateExercises: "not-an-array" }), "candidateExercises باید آرایه");
  });
  check("hasActiveInjury غیر Boolean رد می‌شود", () => {
    assertThrows(
      () => buildCexProgram({ candidateExercises: [], hasActiveInjury: "بله" }),
      "hasActiveInjury نامعتبر"
    );
  });
  check("hasNeurologicalSymptoms غیر Boolean رد می‌شود", () => {
    assertThrows(
      () => buildCexProgram({ candidateExercises: [], hasNeurologicalSymptoms: "بله" }),
      "hasNeurologicalSymptoms نامعتبر"
    );
  });

  console.log(`\n[test-engine-corrective-file10-cexarchitecture] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
