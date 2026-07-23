// اسکریپت تست مستقل (بدون Electron/UI) برای فایل ۳ کسکید (Hard Veto).
// اجرا: node scripts/test-engine-file3-hardveto.js
//
// چون engine/ اکنون ESM است (engine/package.json) ولی این اسکریپت CommonJS
// می‌ماند، از dynamic import() به‌جای require() برای فایل‌های موتور استفاده
// می‌شود — به همین دلیل کل بدنه‌ی اسکریپت داخل یک async IIFE قرار گرفته است.

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

function assertArrayEqual(actual, expected, message) {
  const ok = Array.isArray(actual) && actual.length === expected.length && actual.every((v, i) => v === expected[i]);
  if (!ok) throw new Error(`${message || "array mismatch"} — actual: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)}`);
}

(async () => {
  const { evaluateHardVeto } = await import("../engine/bodybuilding/file3_hardVeto/index.js");
  const { calibrateAerobicPercent } = await import("../engine/bodybuilding/file3_hardVeto/hrRestCalibration.js");

  console.log("\n[بزرگسال سالم، بدون بیماری]");
  check("بدون هیچ محدودیتی، ولی هشدار سربرگ همیشه هست", () => {
    const result = evaluateHardVeto({ age: 30, experience: "intermediate", main_goal: "hypertrophy", medicalFlags: {} });
    assert(result.sets_range === null, "sets_range باید null باشد");
    assert(result.hard_stop === false, "hard_stop نباید true باشد");
    assert(result.warnings.length === 1, "فقط هشدار سربرگ ثابت باید وجود داشته باشد");
    assert(result.requires_coach_confirmation.length === 0, "نیازی به تایید مربی نیست");
  });

  console.log("\n[بیماری قلبی/فشارخون — سه سقف هم‌زمان]");
  check("هر سه سقف (RPE، شدت، RIR) هم‌زمان اعمال می‌شود", () => {
    const result = evaluateHardVeto({
      age: 35,
      experience: "intermediate",
      main_goal: "strength",
      medicalFlags: { heartOrHypertension: true },
    });
    assertArrayEqual(result.rpe_range, [null, 5], "rpe_range");
    assertArrayEqual(result.intensity_percent_1rm_range, [null, 70], "intensity_percent_1rm_range");
    assertArrayEqual(result.rir_range, [3, null], "rir_range");
    assert(result.banned_tags.includes("Valsalva"), "Valsalva باید ممنوع باشد");
    assert(result.specific_exercise_overrides.some((o) => o.matches === "leg_press"), "پرس پا باید قفل شده باشد");
  });

  console.log("\n[کودک ≤۱۲ سال]");
  check("بدون تایید مربی → روال بزرگسالان، فقط درخواست تایید ثبت می‌شود", () => {
    const result = evaluateHardVeto({
      age: 10,
      experience: "beginner",
      main_goal: "hypertrophy",
      coachConfirmedAgeException: false,
      medicalFlags: {},
    });
    assert(result.sets_range === null, "بدون تایید، سقف ست کودکان نباید اعمال شود");
    assert(result.requires_coach_confirmation.length === 1, "درخواست تایید باید ثبت شده باشد");
  });
  check("با تایید مربی → پروتکل کامل کودکان اعمال می‌شود", () => {
    const result = evaluateHardVeto({
      age: 10,
      experience: "beginner",
      main_goal: "hypertrophy",
      coachConfirmedAgeException: true,
      medicalFlags: {},
    });
    assertArrayEqual(result.sets_range, [null, 2], "sets_range کودکان");
    assertArrayEqual(result.rep_range, [null, 15], "rep_range کودکان");
    assert(result.monthly_progression_cap_percent === 10, "سقف پیشروی ماهانه باید ۱۰ باشد");
    assert(result.banned_tags.includes("1RM_test"), "تست 1RM باید ممنوع باشد");
  });

  console.log("\n[سالمند ≥۶۰ سال]");
  check("مبتدی + هدف کاهش‌چربی → مسیر استقامتی (۱ ست، رپ ۱۰-۱۵، RPE ۴-۵)", () => {
    const result = evaluateHardVeto({
      age: 65,
      experience: "beginner",
      main_goal: "fat_loss",
      coachConfirmedAgeException: true,
      medicalFlags: {},
    });
    assertArrayEqual(result.sets_range, [1, 1], "sets_range مبتدی سالمند");
    assertArrayEqual(result.rep_range, [10, 15], "rep_range مسیر استقامتی");
    assertArrayEqual(result.rpe_range, [4, 5], "rpe_range مسیر استقامتی");
    assert(result.max_training_days_per_week === 3, "حداکثر ۳ روز تمرین در هفته");
  });
  check("باتجربه + هدف هایپرتروفی → مسیر حفظ توده (۲-۳ ست، رپ ۸-۱۲، RPE ۶-۷)", () => {
    const result = evaluateHardVeto({
      age: 70,
      experience: "intermediate",
      main_goal: "hypertrophy",
      coachConfirmedAgeException: true,
      medicalFlags: {},
    });
    assertArrayEqual(result.sets_range, [2, 3], "sets_range باتجربه سالمند");
    assertArrayEqual(result.rep_range, [8, 12], "rep_range مسیر حفظ توده");
    assertArrayEqual(result.rpe_range, [6, 7], "rpe_range مسیر حفظ توده");
  });

  console.log("\n[ترکیب هم‌زمان چند بیماری — سخت‌گیرترین برنده است]");
  check("دیابت (شدت ۶۰-۸۰) + آرتروز (شدت ۵۰-۷۰) → قطع بازه‌ها = ۶۰-۷۰", () => {
    const result = evaluateHardVeto({
      age: 40,
      experience: "intermediate",
      main_goal: "hypertrophy",
      medicalFlags: { diabetes: true, arthritis: true },
    });
    assertArrayEqual(result.intensity_percent_1rm_range, [60, 70], "قطع بازه‌ی شدت دو بیماری");
    assert(result.banned_tags.includes("High_Impact"), "بن‌شده‌های آرتروز باید حفظ شوند");
  });

  console.log("\n[بیماری کلیوی]");
  check("روز دیالیز → hard_stop مطلق", () => {
    const result = evaluateHardVeto({
      age: 45,
      experience: "intermediate",
      main_goal: "hypertrophy",
      medicalFlags: { kidneyDisease: true, onDialysis: true },
      isDialysisDayToday: true,
    });
    assert(result.hard_stop === true, "روز دیالیز باید hard_stop باشد");
  });
  check("فیستول (بدون روز دیالیز) → فقط حذف حرکات فشار مستقیم مچ", () => {
    const result = evaluateHardVeto({
      age: 45,
      experience: "intermediate",
      main_goal: "hypertrophy",
      medicalFlags: { kidneyDisease: true, hasFistula: true },
      isDialysisDayToday: false,
    });
    assert(result.hard_stop === false, "بدون روز دیالیز نباید hard_stop باشد");
    assert(result.banned_tags.includes("direct_wrist_load"), "حرکات فشار مستقیم مچ باید حذف شوند");
  });

  console.log("\n[کالیبراسیون هوازی HRrest]");
  check("HRrest < 60 → کاهش ۱۰٪", () => {
    const r = calibrateAerobicPercent(55, 50);
    assert(r.hr_rest_modifier === -10 && r.final_aerobic_percent === 40, "مقدار نهایی باید ۴۰ باشد");
  });
  check("HRrest بین ۶۰-۷۰ → بدون تغییر", () => {
    const r = calibrateAerobicPercent(65, 50);
    assert(r.hr_rest_modifier === 0 && r.final_aerobic_percent === 50, "مقدار نهایی باید ۵۰ باشد");
  });
  check("HRrest بین ۷۱-۸۰ → افزایش ۱۰٪", () => {
    const r = calibrateAerobicPercent(75, 50);
    assert(r.hr_rest_modifier === 10 && r.final_aerobic_percent === 60, "مقدار نهایی باید ۶۰ باشد");
  });
  check("HRrest > 80 → افزایش ۲۰٪", () => {
    const r = calibrateAerobicPercent(90, 50);
    assert(r.hr_rest_modifier === 20 && r.final_aerobic_percent === 70, "مقدار نهایی باید ۷۰ باشد");
  });

  console.log(`\n[test-engine-file3-hardveto] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
