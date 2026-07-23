// اسکریپت تست مستقل برای فایل ۵ کسکید (ایمنی نهایی / finalizePrescription).
// اجرا: node scripts/test-engine-file5-finalizeprescription.js

const { finalizePrescription } = require("../engine/bodybuilding/file5_finalizePrescription");
const { computeBiometrics } = require("../engine/bodybuilding/file2_biometrics");
const { evaluateHardVeto } = require("../engine/bodybuilding/file3_hardVeto");

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

console.log("\n[سناریو ۱: بزرگسال سالم، بدون هیچ محدودیتی]");
check("خروجی خام دست‌نخورده عبور می‌کند", () => {
  const cascadeOutput = computeBiometrics({ main_goal: "hypertrophy", experience: "intermediate", gender: "male" });
  const restriction = evaluateHardVeto({ age: 30, experience: "intermediate", main_goal: "hypertrophy", medicalFlags: {} });
  const result = finalizePrescription({ cascadeOutput, hardVetoRestriction: restriction });

  assert(result.blocked === false);
  assert(result.adjustment_source === "none");
  assert(result.prescription.weekly_sets_per_muscle === cascadeOutput.weekly_sets_per_muscle, "ست‌ها نباید تغییر کنند");
  assertArrayEqual(result.prescription.rep_range, cascadeOutput.rep_range, "rep_range نباید تغییر کند");
  assert(result.prescription.tempo === cascadeOutput.tempo, "تمپو نباید تغییر کند");
});

console.log("\n[سناریو ۲: بیماری قلبی — clamp واقعی شدت/RIR/تمپو]");
check("شدت، RIR و تمپو طبق سقف پزشکی clamp می‌شوند", () => {
  // هدف قدرت یعنی شدت خام حداقل ۸۵٪ و RIR ۱-۲ — هر دو باید توسط سقف قلبی
  // (شدت<=۷۰٪, RIR>=۳) واقعاً پایین/بالا کشیده شوند، نه فقط محاسبه.
  const cascadeOutput = computeBiometrics({ main_goal: "strength", experience: "advanced", gender: "male" });
  const restriction = evaluateHardVeto({
    age: 35,
    experience: "advanced",
    main_goal: "strength",
    medicalFlags: { heartOrHypertension: true },
  });
  const result = finalizePrescription({ cascadeOutput, hardVetoRestriction: restriction });

  assert(result.blocked === false);
  assertArrayEqual(result.prescription.intensity_percent_1rm, [70, 70], "شدت خام (۸۵+) باید به سقف ۷۰ جمع شود");
  assertArrayEqual(result.prescription.rir, [3, 3], "RIR خام (۱-۲) باید به کف ۳ جمع شود");
  assert(result.prescription.tempo === "2-0-2-0", "تمپو باید به تمپوی امن قلبی جایگزین شود");
  assert(result.prescription.rest_sec[0] >= 90, "استراحت باید حداقل ۹۰ ثانیه شود");
});

console.log("\n[سناریو ۳: روز دیالیز → blocked]");
check("هیچ عددی تجویز نمی‌شود", () => {
  const cascadeOutput = computeBiometrics({ main_goal: "hypertrophy", experience: "intermediate", gender: "male" });
  const restriction = evaluateHardVeto({
    age: 40,
    experience: "intermediate",
    main_goal: "hypertrophy",
    medicalFlags: { kidneyDisease: true, onDialysis: true },
    isDialysisDayToday: true,
  });
  const result = finalizePrescription({ cascadeOutput, hardVetoRestriction: restriction });

  assert(result.blocked === true);
  assert(result.prescription === null);
  assert(result.block_reasons.length > 0);
});

console.log("\n[سناریو ۴: دی‌لود + بازگشت ایمن هم‌زمان → فقط بازگشت ایمن (بدون کاهش مضاعف)]");
check("ضرایب بازگشت ایمن (۰.۸۵/۰.۸۰) اعمال می‌شود، نه ضرایب دی‌لود (که عمداً خیلی تهاجمی‌تر انتخاب شده تا تفاوت مشهود باشد)", () => {
  const cascadeOutput = computeBiometrics({ main_goal: "hypertrophy", experience: "advanced", gender: "male" });
  const restriction = evaluateHardVeto({ age: 30, experience: "advanced", main_goal: "hypertrophy", medicalFlags: {} });
  const result = finalizePrescription({
    cascadeOutput,
    hardVetoRestriction: restriction,
    returnProtocolTriggered: true,
    deloadTriggered: true,
    deloadMultipliers: { loadMultiplier: 0.5, setsMultiplier: 0.4 }, // عمداً خیلی متفاوت از بازگشت ایمن
  });

  assert(result.adjustment_source === "return_protocol", "منبع باید return_protocol باشد، نه deload");
  const expectedSets = Math.round(cascadeOutput.weekly_sets_per_muscle * 0.8);
  assert(result.prescription.weekly_sets_per_muscle === expectedSets, `انتظار ${expectedSets} داشتیم (۰.۸۰×خام)، نه ضریب دی‌لود`);
});

console.log("\n[سناریو ۵: فقط دی‌لود trigger شده]");
check("ضرایب دی‌لود همان‌طور که داده شده اعمال می‌شود", () => {
  const cascadeOutput = computeBiometrics({ main_goal: "hypertrophy", experience: "advanced", gender: "male" });
  const restriction = evaluateHardVeto({ age: 30, experience: "advanced", main_goal: "hypertrophy", medicalFlags: {} });
  const result = finalizePrescription({
    cascadeOutput,
    hardVetoRestriction: restriction,
    returnProtocolTriggered: false,
    deloadTriggered: true,
    deloadMultipliers: { loadMultiplier: 0.6, setsMultiplier: 0.5 },
  });

  assert(result.adjustment_source === "deload");
  const expectedSets = Math.round(cascadeOutput.weekly_sets_per_muscle * 0.5);
  assert(result.prescription.weekly_sets_per_muscle === expectedSets);
});

console.log("\n[سناریو ۶: هیچ‌کدام trigger نشده]");
check("بدون تعدیل، adjustment_source برابر none است", () => {
  const cascadeOutput = computeBiometrics({ main_goal: "hypertrophy", experience: "intermediate", gender: "male" });
  const restriction = evaluateHardVeto({ age: 30, experience: "intermediate", main_goal: "hypertrophy", medicalFlags: {} });
  const result = finalizePrescription({ cascadeOutput, hardVetoRestriction: restriction });
  assert(result.adjustment_source === "none");
  assert(result.prescription.weekly_sets_per_muscle === cascadeOutput.weekly_sets_per_muscle);
});

console.log("\n[سناریو ۷ — حیاتی: کودک با veto سخت‌گیرتر از خروجی خام کسکید]");
check("clamp واقعاً کار می‌کند: خروجی خام (مبتدی، ۸-۱۲ ست) باید به سقف مطلق کودکان (۲ ست) جمع شود", () => {
  const cascadeOutput = computeBiometrics({ main_goal: "hypertrophy", experience: "beginner", gender: "male" });
  // پیش از clamp، خروجی خام باید حجمی به‌مراتب بالاتر از سقف کودکان باشد —
  // این پیش‌شرط تست است، نه چیزی که ادعا می‌کنیم.
  assert(cascadeOutput.weekly_sets_per_muscle >= 8, "پیش‌فرض تست نامعتبر شد: خط پایه‌ی خام باید >=۸ باشد");

  const restriction = evaluateHardVeto({
    age: 10,
    experience: "beginner",
    main_goal: "hypertrophy",
    coachConfirmedAgeException: true,
    medicalFlags: {},
  });
  assertArrayEqual(restriction.sets_range, [null, 2], "پیش‌شرط: محدودیت کودکان باید سقف ۲ باشد");

  const result = finalizePrescription({ cascadeOutput, hardVetoRestriction: restriction });

  assert(result.blocked === false);
  assert(result.prescription.weekly_sets_per_muscle === 2, `انتظار clamp دقیق به ۲ داشتیم، گرفتیم ${result.prescription.weekly_sets_per_muscle}`);
  // rep_range خام هایپرتروفی [۸،۱۲] از قبل کاملاً داخل سقف کودکان [null,15] است
  // (۱۲<۱۵) — پس نباید تغییر کند؛ این خودش تأیید می‌کند clamp فقط وقتی واقعاً
  // لازم است دخالت می‌کند، نه همیشه.
  assertArrayEqual(result.prescription.rep_range, cascadeOutput.rep_range, "rep_range از قبل مطابق محدودیت بود، نباید تغییر کند");
});

console.log("\n[سناریوی مکمل: انتخاب امن‌ترین تمپو وقتی چند override هم‌زمان بود]");
check("سالمند + مانع تمپوی کندتر → کندترین تمپو انتخاب می‌شود", () => {
  const cascadeOutput = computeBiometrics({ main_goal: "hypertrophy", experience: "intermediate", gender: "male" }); // تمپوی خام: 3-0-1-0
  const restriction = evaluateHardVeto({
    age: 65,
    experience: "intermediate",
    main_goal: "hypertrophy",
    coachConfirmedAgeException: true,
    medicalFlags: {},
  });
  // سالمند: تمپوهای مجاز ["2-0-2-0", "1-0-3-0"] (اکسنتریک ۲ و ۱) — چون تمپوی
  // پزشکی همیشه تجویز مطلق است، امن‌ترین گزینه‌ی خودِ این دو (۲-۰-۲-۰) باید
  // جایگزین تمپوی خام کسکید شود، حتی اگر تمپوی خام هم اکسنتریک کندتری داشت.
  const result = finalizePrescription({ cascadeOutput, hardVetoRestriction: restriction });
  assert(result.prescription.tempo === "2-0-2-0", `انتظار جایگزینی با ۲-۰-۲-۰ داشتیم، گرفتیم ${result.prescription.tempo}`);
});

console.log("\n[سناریوی مکمل: clampRange واقعاً بازه را جمع می‌کند، نه فقط نگه می‌دارد]");
check("بازه‌ی خام کاملاً خارج از محدودیت → به مرز محدودیت جمع می‌شود", () => {
  const { clampRange } = require("../engine/bodybuilding/file5_finalizePrescription/clamp");
  assertArrayEqual(clampRange([85, null], [null, 70]), [70, 70], "بازه‌ی بالا باید به سقف جمع شود");
  assertArrayEqual(clampRange([1, 6], [70, 80]), [70, 70], "بازه‌ی پایین باید به کف جمع شود");
  assertArrayEqual(clampRange([8, 12], [null, 15]), [8, 12], "بازه‌ی از قبل سازگار نباید تغییر کند");
});

console.log(`\n[test-engine-file5-finalizeprescription] ${passCount} PASS, ${failCount} FAIL`);
process.exit(failCount > 0 ? 1 : 0);
