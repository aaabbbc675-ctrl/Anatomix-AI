// تست مستقل (بدون UI، بدون Electron) برای فایل ۱ (Coach_Goal) و فایل ۲
// (بیومتریک) موتور بدنسازی. اجرا: node scripts/test-engine-file1-2.js

const { processCoachGoal } = require("../engine/bodybuilding/file1_coachGoal");
const { computeBiometrics } = require("../engine/bodybuilding/file2_biometrics");

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

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n     expected: ${e}\n     actual:   ${a}`);
}

function expectThrow(fn, message) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(message || "expected function to throw, but it did not");
}

console.log("\n[File 1: Coach_Goal]");

check("ورودی معتبر رد نمی‌شود", () => {
  const result = processCoachGoal({ main_goal: "hypertrophy", experience: "beginner", weekly_training_days: 4 });
  assertEqual(result, { main_goal: "hypertrophy", experience: "beginner", weekly_training_days: 4 }, "خروجی باید همان ورودی نرمال‌شده باشد");
});

check("main_goal نامعتبر رد می‌شود", () => {
  expectThrow(() => processCoachGoal({ main_goal: "endurance", experience: "beginner", weekly_training_days: 4 }));
});

check("experience نامعتبر رد می‌شود", () => {
  expectThrow(() => processCoachGoal({ main_goal: "hypertrophy", experience: "elite", weekly_training_days: 4 }));
});

check("weekly_training_days خارج از بازه رد می‌شود (۸ روز)", () => {
  expectThrow(() => processCoachGoal({ main_goal: "hypertrophy", experience: "beginner", weekly_training_days: 8 }));
});

check("weekly_training_days غیرعددی رد می‌شود", () => {
  expectThrow(() => processCoachGoal({ main_goal: "hypertrophy", experience: "beginner", weekly_training_days: "چهار" }));
});

console.log("\n[File 2: Biometrics]");

check("مبتدی، مرد، هایپرتروفی — کف بازه‌ی حجم، بدون تعدیل جنسیتی", () => {
  const result = computeBiometrics({ main_goal: "hypertrophy", experience: "beginner", gender: "male" });
  assertEqual(result.weekly_sets_per_muscle, 8, "حجم شروع باید ۸ (کف بازه‌ی مبتدی) باشد");
  assertEqual(result.weekly_sets_progression_ceiling, 12, "سقف پیشروی باید ۱۲ باشد");
  assertEqual(result.rest_sec, [60, 90], "استراحت نباید بدون جنسیت زن تغییر کند");
  assertEqual(result.isolation_ratio, 0.4, "isolationRatio هایپرتروفی باید ۰.۴ باشد");
  assertEqual(result.gender_advisory, null, "برای مرد نباید gender_advisory ست شود");
});

check("مبتدی، زن، هایپرتروفی — حجم ceil(8×1.15)=10، استراحت ×0.85", () => {
  const result = computeBiometrics({ main_goal: "hypertrophy", experience: "beginner", gender: "female" });
  assertEqual(result.weekly_sets_per_muscle, 10, "حجم شروع زن باید ceil(8×1.15)=10 باشد");
  assertEqual(result.weekly_sets_progression_ceiling, 14, "سقف پیشروی زن باید ceil(12×1.15)=14 باشد");
  assertEqual(result.rest_sec, [51, 77], "استراحت زن باید [60×0.85, 90×0.85] گرد‌شده باشد");
  assertEqual(result.gender_advisory.hipAbductorSelectionBoost, 0.3, "ضریب انتخاب حرکت باید ۰.۳ باشد (مصرف در فایل ۴)");
});

check("پیشرفته، مرد، قدرت — بازه‌ی سطح مهارت مستقیم، بدون فرمول ضربی مصنوعی", () => {
  const result = computeBiometrics({ main_goal: "strength", experience: "advanced", gender: "male" });
  assertEqual(result.weekly_sets_per_muscle, 15, "حجم شروع پیشرفته باید ۱۵ (کف بازه) باشد");
  assertEqual(result.weekly_sets_progression_ceiling, 20, "سقف پیشروی پیشرفته باید ۲۰ باشد");
  assertEqual(result.rep_range, [1, 6], "بازه‌ی تکرار قدرت باید [۱,۶] باشد");
  assertEqual(result.rir, [1, 2], "RIR قدرت باید [۱,۲] باشد");
  assertEqual(result.isolation_ratio, 0.15, "isolationRatio قدرت باید ۰.۱۵ باشد");
});

check("متوسط، زن، نگهداری — حجم hypertrophy×0.5 سپس ×1.15، ایزوله=۰، RIR هرگز صفر نیست", () => {
  const result = computeBiometrics({ main_goal: "maintenance", experience: "intermediate", gender: "female" });
  assertEqual(result.weekly_sets_per_muscle, 7, "۱۲×۰.۵=۶ سپس ceil(۶×۱.۱۵)=۷");
  assertEqual(result.weekly_sets_progression_ceiling, 11, "۱۸×۰.۵=۹ سپس ceil(۹×۱.۱۵)=۱۱");
  assertEqual(result.isolation_ratio, 0, "نگهداری باید حذف مطلق ایزوله (۰) داشته باشد");
  assertEqual(result.rir, [1, 2], "RIR نگهداری هرگز نباید صفر باشد (ناتوانی ممنوع)");
  assertEqual(result.rep_range, [8, 12], "بازه‌ی تکرار نگهداری باید از ردیف hypertrophy گرفته شود");
});

check("جنسیت نامعتبر رد می‌شود", () => {
  expectThrow(() => computeBiometrics({ main_goal: "hypertrophy", experience: "beginner", gender: "other" }));
});

check("age_factor_applied صریحاً 'neutral_13_59' است (یادآوری که سن واقعی در فایل ۳ است)", () => {
  const result = computeBiometrics({ main_goal: "hypertrophy", experience: "beginner", gender: "male" });
  assertEqual(result.age_factor_applied, "neutral_13_59", "باید صراحتاً خنثی‌بودن سن را نشان دهد");
});

console.log(`\n[test-engine-file1-2] ${passCount} PASS, ${failCount} FAIL`);
process.exit(failCount > 0 ? 1 : 0);
