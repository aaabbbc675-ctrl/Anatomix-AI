// اسکریپت تست مستقل برای فایل ۵ موتور اصلاحی (تنظیمات سنی).
// اجرا: node scripts/test-engine-corrective-file5-ageadjustments.js

// engine/ اکنون ESM است (engine/package.json)؛ این اسکریپت CommonJS می‌ماند،
// پس باید ماژول موتور را با dynamic import() بارگذاری کند (پایین، داخل IIFE).
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
  const { resolveAgeGroup, resolveAgeAdjustment } = await import("../engine/corrective/file5_ageAdjustments.js");

  console.log("\n[تشخیص گروه سنی — هر سه گروه]");
  check("سن ۷ (کمینه‌ی کودک) → child", () => assert(resolveAgeGroup(7) === "child"));
  check("سن ۳۰ → adult", () => assert(resolveAgeGroup(30) === "adult"));
  check("سن ۹۰ → elderly", () => assert(resolveAgeGroup(90) === "elderly"));

  console.log("\n[مرزهای دقیق سنی]");
  check("سن ۱۲ → هنوز child", () => assert(resolveAgeGroup(12) === "child"));
  check("سن ۱۳ → adult (یک واحد بالاتر از مرز کودک)", () => assert(resolveAgeGroup(13) === "adult"));
  check("سن ۵۹ → هنوز adult", () => assert(resolveAgeGroup(59) === "adult"));
  check("سن ۶۰ → elderly (یک واحد بالاتر از مرز بزرگسال)", () => assert(resolveAgeGroup(60) === "elderly"));

  console.log("\n[کودکان ۷-۱۲]");
  check("سقف ۲ ست، ۱۵ تکرار، استراحت ۶۰-۱۲۰، تمرین‌تا‌ناتوانی و انفجاری ممنوع، سقف پیشروی ۱۰٪", () => {
    const result = resolveAgeAdjustment({ age: 9 });
    assertDeepEqual(result, {
      ageGroup: "child",
      setsCap: 2,
      repsCap: 15,
      tempoOptions: ["2-0-2-0", "3-0-3-0"],
      restSecRange: [60, 120],
      trainingToFailureBanned: true,
      explosiveMovementsBanned: true,
      monthlyProgressionCapPercent: 10,
    });
  });

  console.log("\n[بزرگسالان ۱۳-۵۹ — روال عادی]");
  check("هیچ محدودیت خاصی اعمال نمی‌شود", () => {
    const result = resolveAgeAdjustment({ age: 30 });
    assertDeepEqual(result, { ageGroup: "adult", specialRestrictions: false });
  });

  console.log("\n[سالمندان ۶۰+ — ست مبتدی/حرفه‌ای]");
  check("مبتدی: ست دقیقاً ۱ (به‌شکل بازه‌ی [۱,۱] نرمال‌شده)", () => {
    const result = resolveAgeAdjustment({
      age: 65,
      elderlyExperienceLevel: "beginner",
      elderlyTrainingFocus: "endurance",
      elderlyMovementType: "isolated",
    });
    assertDeepEqual(result.setsRange, [1, 1]);
  });

  check("حرفه‌ای: ست ۲-۳", () => {
    const result = resolveAgeAdjustment({
      age: 65,
      elderlyExperienceLevel: "professional",
      elderlyTrainingFocus: "endurance",
      elderlyMovementType: "isolated",
    });
    assertDeepEqual(result.setsRange, [2, 3]);
  });

  console.log("\n[سالمندان — هدف تمرینی: استقامت در برابر حفظ توده]");
  check("استقامت: تکرار ۱۰-۱۵، RPE ۴-۵", () => {
    const result = resolveAgeAdjustment({
      age: 70,
      elderlyExperienceLevel: "beginner",
      elderlyTrainingFocus: "endurance",
      elderlyMovementType: "isolated",
    });
    assertDeepEqual(result.repRange, [10, 15]);
    assertDeepEqual(result.rpeRange, [4, 5]);
  });

  check("حفظ توده: تکرار ۸-۱۲، RPE ۶-۷", () => {
    const result = resolveAgeAdjustment({
      age: 70,
      elderlyExperienceLevel: "beginner",
      elderlyTrainingFocus: "massMaintenance",
      elderlyMovementType: "isolated",
    });
    assertDeepEqual(result.repRange, [8, 12]);
    assertDeepEqual(result.rpeRange, [6, 7]);
  });

  console.log("\n[سالمندان — نوع حرکت: ایزوله در برابر مرکب]");
  check("ایزوله: استراحت ۶۰-۱۲۰ ثانیه", () => {
    const result = resolveAgeAdjustment({
      age: 70,
      elderlyExperienceLevel: "beginner",
      elderlyTrainingFocus: "endurance",
      elderlyMovementType: "isolated",
    });
    assertDeepEqual(result.restSecRange, [60, 120]);
  });

  check("مرکب: استراحت ۱۲۰-۱۸۰ ثانیه", () => {
    const result = resolveAgeAdjustment({
      age: 70,
      elderlyExperienceLevel: "beginner",
      elderlyTrainingFocus: "endurance",
      elderlyMovementType: "compound",
    });
    assertDeepEqual(result.restSecRange, [120, 180]);
  });

  console.log("\n[سالمندان — والسالوا/حبس نفس ممنوع، تمام مکث‌های ایزومتریک=۰]");
  check("valsalvaAndBreathHoldBanned و isometricPauseMustBeZero همیشه true هستند", () => {
    const result = resolveAgeAdjustment({
      age: 75,
      elderlyExperienceLevel: "professional",
      elderlyTrainingFocus: "massMaintenance",
      elderlyMovementType: "compound",
    });
    assert(result.valsalvaAndBreathHoldBanned === true);
    assert(result.isometricPauseMustBeZero === true);
    assertDeepEqual(result.tempoOptions, ["2-0-2-0", "1-0-3-0"]);
  });

  console.log("\n[اعتبارسنجی ورودی نامعتبر]");
  check("سن زیر ۷ رد می‌شود (خارج از پوشش سند)", () => {
    assertThrows(() => resolveAgeAdjustment({ age: 5 }), "age نامعتبر", "باید با خطای صریح رد شود");
  });

  check("سن غیرصحیح رد می‌شود", () => {
    assertThrows(() => resolveAgeAdjustment({ age: 30.5 }), "age نامعتبر", "باید با خطای صریح رد شود");
  });

  check("سالمند بدون elderlyExperienceLevel رد می‌شود", () => {
    assertThrows(
      () => resolveAgeAdjustment({ age: 65, elderlyTrainingFocus: "endurance", elderlyMovementType: "isolated" }),
      "elderlyExperienceLevel نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("سالمند بدون elderlyTrainingFocus رد می‌شود", () => {
    assertThrows(
      () => resolveAgeAdjustment({ age: 65, elderlyExperienceLevel: "beginner", elderlyMovementType: "isolated" }),
      "elderlyTrainingFocus نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("سالمند بدون elderlyMovementType رد می‌شود", () => {
    assertThrows(
      () => resolveAgeAdjustment({ age: 65, elderlyExperienceLevel: "beginner", elderlyTrainingFocus: "endurance" }),
      "elderlyMovementType نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("کودک/بزرگسال به پارامترهای سالمند نیازی ندارند (بدون آن‌ها هم کرش نمی‌کنند)", () => {
    const child = resolveAgeAdjustment({ age: 9 });
    const adult = resolveAgeAdjustment({ age: 30 });
    assert(child.ageGroup === "child");
    assert(adult.ageGroup === "adult");
  });

  console.log(`\n[test-engine-corrective-file5-ageadjustments] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
