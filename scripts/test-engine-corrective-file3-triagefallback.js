// اسکریپت تست مستقل برای فایل ۳ موتور اصلاحی (تریاژ + فیلتر Contraindications
// با Fallback + حلقه‌ی ایمنی RPE).
// اجرا: node scripts/test-engine-corrective-file3-triagefallback.js

// engine/ اکنون ESM است (engine/package.json)؛ این اسکریپت CommonJS می‌ماند،
// پس باید ماژول موتور را با dynamic import() بارگذاری کند (پایین، داخل IIFE).
//
// طبق تصمیم صریح: فیلد alternative_corrective_exercise هنوز روی هیچ رکورد
// واقعی exercises.seed.js وجود ندارد (دسته‌ی ۱ فقط ۴ فیلد دیگر اضافه کرد).
// این تست از آبجکت‌های ادبی/فرضی با شناسه‌های به‌سبک SQ-BB/DL-CV استفاده
// می‌کند، نه از دیتای واقعی seed.js — اضافه‌کردن بانک واقعی حرکات اصلاحی
// یک تصمیم تخصصی جداست.
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
  const { sortByTriagePriority, applyContraindicationFilterWithFallback, resolveInjuredAreaProgressionCap } = await import(
    "../engine/corrective/file3_triageFallback.js"
  );

  console.log("\n[سلسله‌مراتب تریاژ — Rehab > Correction > Hypertrophy/Strength]");
  check("ترتیب دقیق سند رعایت می‌شود، صرف‌نظر از ترتیب ورودی", () => {
    const shuffled = [
      { id: "a", triageCategory: "hypertrophy_strength" },
      { id: "b", triageCategory: "rehab" },
      { id: "c", triageCategory: "correction" },
    ];
    const sorted = sortByTriagePriority(shuffled);
    assertDeepEqual(
      sorted.map((x) => x.id),
      ["b", "c", "a"]
    );
  });

  check("triageCategory ناشناخته رد می‌شود", () => {
    assertThrows(
      () => sortByTriagePriority([{ id: "z", triageCategory: "unknown_phase" }]),
      "triageCategory ناشناخته",
      "باید با خطای صریح رد شود"
    );
  });

  console.log("\n[فیلتر Contraindications واقعی روی چند حرکت]");
  check("حرکت بدون تداخل Contraindication دست‌نخورده باقی می‌ماند", () => {
    const exercises = [{ id: "SQ-BB", contraindications: ["disc_herniation"] }];
    const result = applyContraindicationFilterWithFallback(exercises, ["knee_pain"], {});
    assertDeepEqual(result.exercises, exercises);
    assertDeepEqual(result.warnings, []);
  });

  check("چند حرکت هم‌زمان: فقط آن‌هایی که واقعاً تداخل دارند فیلتر می‌شوند", () => {
    const exercises = [
      { id: "SQ-BB", contraindications: ["knee_pain"] },
      { id: "DL-CV", contraindications: ["disc_herniation"] },
      { id: "BP-BB", contraindications: [] },
    ];
    const result = applyContraindicationFilterWithFallback(exercises, ["knee_pain"], {});
    assertDeepEqual(
      result.exercises.map((e) => e.id),
      ["DL-CV", "BP-BB"]
    );
    assert(result.warnings.length === 1);
    assert(result.warnings[0].exerciseId === "SQ-BB");
  });

  console.log("\n[Fallback — با جایگزین امن موجود]");
  check("حرکت contraindicated با alternative_corrective_exercise امن جایگزین می‌شود", () => {
    const exerciseBankById = {
      "LNG-DB": { id: "LNG-DB", contraindications: ["shoulder_pain"] }, // بدون تداخل با knee_pain
    };
    const exercises = [{ id: "SQ-BB", contraindications: ["knee_pain"], alternative_corrective_exercise: "LNG-DB" }];
    const result = applyContraindicationFilterWithFallback(exercises, ["knee_pain"], exerciseBankById);
    assertDeepEqual(
      result.exercises.map((e) => e.id),
      ["LNG-DB"]
    );
    assertDeepEqual(result.warnings, []);
  });

  console.log("\n[Fallback — بدون جایگزین امن (سه حالت جدا)]");
  check("بدون فیلد alternative_corrective_exercise اصلاً → حذف کامل + هشدار جدی", () => {
    const exercises = [{ id: "SQ-BB", contraindications: ["knee_pain"] }];
    const result = applyContraindicationFilterWithFallback(exercises, ["knee_pain"], {});
    assertDeepEqual(result.exercises, []);
    assert(result.warnings.length === 1);
    assertDeepEqual(result.warnings[0], {
      exerciseId: "SQ-BB",
      severity: "critical",
      reason: 'حرکت "SQ-BB" به‌خاطر Contraindication فعال حذف شد و هیچ جایگزین امنی (Alternative_Corrective_Exercise) پیدا نشد.',
    });
  });

  check("alternative_corrective_exercise به شناسه‌ای اشاره می‌کند که در بانک نیست → حذف کامل + هشدار", () => {
    const exercises = [{ id: "SQ-BB", contraindications: ["knee_pain"], alternative_corrective_exercise: "NOT-IN-BANK" }];
    const result = applyContraindicationFilterWithFallback(exercises, ["knee_pain"], {});
    assertDeepEqual(result.exercises, []);
    assert(result.warnings.length === 1);
    assert(result.warnings[0].exerciseId === "SQ-BB");
  });

  check("جایگزین در بانک هست ولی خودش هم همان Contraindication را دارد → حذف کامل + هشدار (بدون زنجیره‌ی بازگشتی)", () => {
    const exerciseBankById = {
      "LNG-DB": { id: "LNG-DB", contraindications: ["knee_pain"] }, // خودش هم تداخل دارد
    };
    const exercises = [{ id: "SQ-BB", contraindications: ["knee_pain"], alternative_corrective_exercise: "LNG-DB" }];
    const result = applyContraindicationFilterWithFallback(exercises, ["knee_pain"], exerciseBankById);
    assertDeepEqual(result.exercises, []);
    assert(result.warnings.length === 1);
    assert(result.warnings[0].exerciseId === "SQ-BB");
  });

  console.log("\n[حلقه‌ی ایمنی — RPE ماه قبل در ناحیه‌ی آسیب‌دیده]");
  check("RPE دقیقاً روی مرز ۷ → پیشروی به ۰-۵٪ محدود می‌شود", () => {
    const result = resolveInjuredAreaProgressionCap({ previousMonthRpeInInjuredArea: 7 });
    assertDeepEqual(result, { capped: true, progressionPercentRange: [0, 5] });
  });

  check("RPE زیر مرز (۶) → هیچ محدودیت ویژه‌ای اعمال نمی‌شود", () => {
    const result = resolveInjuredAreaProgressionCap({ previousMonthRpeInInjuredArea: 6 });
    assertDeepEqual(result, { capped: false, progressionPercentRange: null });
  });

  check("RPE بالاتر از ۷ (مثلاً ۹) هم محدود می‌شود", () => {
    const result = resolveInjuredAreaProgressionCap({ previousMonthRpeInInjuredArea: 9 });
    assertDeepEqual(result, { capped: true, progressionPercentRange: [0, 5] });
  });

  check("RPE خارج از بازه‌ی ۰ تا ۱۰ رد می‌شود", () => {
    assertThrows(
      () => resolveInjuredAreaProgressionCap({ previousMonthRpeInInjuredArea: 11 }),
      "previousMonthRpeInInjuredArea نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  console.log(`\n[test-engine-corrective-file3-triagefallback] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
