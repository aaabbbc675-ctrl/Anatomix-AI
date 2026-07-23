// اسکریپت تست مستقل برای engine/corrective/monthlyFeedbackProcessor.js.
// اجرا: node scripts/test-engine-corrective-monthlyfeedbackprocessor.js

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
  const { computeMonthlyIntensityAdjustment, resolveExercisePainFeedback } = await import(
    "../engine/corrective/monthlyFeedbackProcessor.js"
  );

  console.log("\n[computeMonthlyIntensityAdjustment — مرزهای دقیق باند]");
  check("rpe=4 (بالای باند اول) → +۲۰٪", () => {
    assertDeepEqual(computeMonthlyIntensityAdjustment({ rpe: 4 }), { adjustmentPercent: 20 });
  });
  check("rpe=5 (پایین باند دوم) → +۱۰٪", () => {
    assertDeepEqual(computeMonthlyIntensityAdjustment({ rpe: 5 }), { adjustmentPercent: 10 });
  });
  check("rpe=7 (بالای باند دوم) → +۱۰٪", () => {
    assertDeepEqual(computeMonthlyIntensityAdjustment({ rpe: 7 }), { adjustmentPercent: 10 });
  });
  check("rpe=8 (پایین باند سوم) → −۱۰٪", () => {
    assertDeepEqual(computeMonthlyIntensityAdjustment({ rpe: 8 }), { adjustmentPercent: -10 });
  });

  console.log("\n[computeMonthlyIntensityAdjustment — مقدار وسط هر سه باند]");
  check("rpe=2 (وسط باند اول) → +۲۰٪", () => {
    assertDeepEqual(computeMonthlyIntensityAdjustment({ rpe: 2 }), { adjustmentPercent: 20 });
  });
  check("rpe=6 (وسط باند دوم) → +۱۰٪", () => {
    assertDeepEqual(computeMonthlyIntensityAdjustment({ rpe: 6 }), { adjustmentPercent: 10 });
  });
  check("rpe=9 (وسط باند سوم) → −۱۰٪", () => {
    assertDeepEqual(computeMonthlyIntensityAdjustment({ rpe: 9 }), { adjustmentPercent: -10 });
  });

  console.log("\n[computeMonthlyIntensityAdjustment — رد ورودی نامعتبر]");
  check("rpe=0 (زیر بازه) رد می‌شود", () => {
    assertThrows(() => computeMonthlyIntensityAdjustment({ rpe: 0 }), "rpe نامعتبر", "باید رد شود");
  });
  check("rpe=11 (بالای بازه) رد می‌شود", () => {
    assertThrows(() => computeMonthlyIntensityAdjustment({ rpe: 11 }), "rpe نامعتبر", "باید رد شود");
  });
  check("rpe غیرعددی رد می‌شود", () => {
    assertThrows(() => computeMonthlyIntensityAdjustment({ rpe: "زیاد" }), "rpe نامعتبر", "باید رد شود");
  });

  console.log("\n[resolveExercisePainFeedback — سه حالت causedPain به‌تنهایی]");
  check("causedPain='none' هیچ خروجی تولید نمی‌کند", () => {
    const result = resolveExercisePainFeedback([{ exerciseId: "SQ-BB", causedPain: "none" }]);
    assertDeepEqual(result, []);
  });
  check("causedPain='muscle_soreness' هیچ خروجی تولید نمی‌کند", () => {
    const result = resolveExercisePainFeedback([{ exerciseId: "SQ-BB", causedPain: "muscle_soreness" }]);
    assertDeepEqual(result, []);
  });
  check("causedPain='joint_nerve_pain' رکورد Injury_Blacklist تولید می‌کند", () => {
    const result = resolveExercisePainFeedback([
      { exerciseId: "SQ-BB", causedPain: "joint_nerve_pain", note: "درد زانو حین اسکوات" },
    ]);
    assertDeepEqual(result, [{ exercise_id: "SQ-BB", source_module: "corrective", reason_note: "درد زانو حین اسکوات" }]);
  });
  check("note ندادن → reason_note پیش‌فرض null (نه رشته‌ی ساختگی)", () => {
    const result = resolveExercisePainFeedback([{ exerciseId: "DL-CV", causedPain: "joint_nerve_pain" }]);
    assertDeepEqual(result, [{ exercise_id: "DL-CV", source_module: "corrective", reason_note: null }]);
  });

  console.log("\n[resolveExercisePainFeedback — آرایه‌ی مخلوط]");
  check("فقط joint_nerve_pain‌ها در خروجی می‌مانند، بقیه فیلتر می‌شوند", () => {
    const result = resolveExercisePainFeedback([
      { exerciseId: "SQ-BB", causedPain: "none" },
      { exerciseId: "DL-CV", causedPain: "joint_nerve_pain", note: "تیر کشیدن کمر" },
      { exerciseId: "BP-BB", causedPain: "muscle_soreness" },
      { exerciseId: "OHP-BB", causedPain: "joint_nerve_pain" },
    ]);
    assertDeepEqual(result, [
      { exercise_id: "DL-CV", source_module: "corrective", reason_note: "تیر کشیدن کمر" },
      { exercise_id: "OHP-BB", source_module: "corrective", reason_note: null },
    ]);
  });

  console.log("\n[resolveExercisePainFeedback — آرایه‌ی خالی و ورودی نامعتبر]");
  check("آرایه‌ی خالی → خروجی آرایه‌ی خالی، بدون کرش", () => {
    assertDeepEqual(resolveExercisePainFeedback([]), []);
  });
  check("نبود آرگومان → پیش‌فرض آرایه‌ی خالی، بدون کرش", () => {
    assertDeepEqual(resolveExercisePainFeedback(), []);
  });
  check("exerciseId خالی رد می‌شود و ایندکس مشکل‌دار را مشخص می‌کند", () => {
    assertThrows(
      () => resolveExercisePainFeedback([{ exerciseId: "SQ-BB", causedPain: "none" }, { exerciseId: "", causedPain: "joint_nerve_pain" }]),
      "feedbackPerExercise[1] نامعتبر",
      "باید رد شود و ایندکس ۱ را نشان دهد"
    );
  });
  check("exerciseId غیررشته‌ای رد می‌شود", () => {
    assertThrows(
      () => resolveExercisePainFeedback([{ exerciseId: 123, causedPain: "none" }]),
      "feedbackPerExercise[0] نامعتبر",
      "باید رد شود"
    );
  });
  check("causedPain نامعتبر رد می‌شود", () => {
    assertThrows(
      () => resolveExercisePainFeedback([{ exerciseId: "SQ-BB", causedPain: "severe_pain" }]),
      "feedbackPerExercise[0] نامعتبر",
      "باید رد شود"
    );
  });

  console.log(`\n[test-engine-corrective-monthlyfeedbackprocessor] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
