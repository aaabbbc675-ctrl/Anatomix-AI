// اسکریپت تست مستقل برای فایل ۴ کسکید (ضرایب سیستم تمرینی) + override جنسیتی
// فایل ۲ + فیلتر Injury_Blacklist (این یکی با یک دیتابیس واقعی موقت، مثل
// الگوی test-db.js، تا یکپارچگی واقعی هم دیده شود).
// اجرا: node scripts/test-engine-file4-trainingsystem.js

const fs = require("fs");
const os = require("os");
const path = require("path");

const { applyTrainingTechnique } = require("../engine/bodybuilding/file4_trainingSystem/eligibility");
const { filterExercisesByInjuryBlacklist } = require("../engine/bodybuilding/file4_trainingSystem/injuryFilter");
const { applyGenderExerciseWeighting } = require("../engine/bodybuilding/file4_trainingSystem/genderExerciseWeighting");
const { parseEccentricSeconds } = require("../engine/bodybuilding/file4_trainingSystem/tempoRule");
const { computeBiometrics } = require("../engine/bodybuilding/file2_biometrics");
const { EXERCISES } = require("../engine/bodybuilding/data/exercises.seed");

const { openDatabase } = require("../electron/db/connection");
const { createStudentsRepository } = require("../electron/db/repositories/studentsRepository");
const { createInjuryBlacklistRepository } = require("../electron/db/repositories/injuryBlacklistRepository");

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

console.log("\n[صلاحیت تکنیک‌ها بر اساس سطح تجربه]");
check("straight_sets برای مبتدی مجاز است", () => {
  const r = applyTrainingTechnique({ techniqueId: "straight_sets", experience: "beginner", tempo: "1-0-1-0" });
  assert(r.eligible === true && r.volumeMultiplier === 1.0 && r.intensityMultiplier === 1.0);
});
check("rest_pause برای مبتدی مجاز نیست", () => {
  const r = applyTrainingTechnique({ techniqueId: "rest_pause", experience: "beginner", tempo: "3-0-1-0" });
  assert(r.eligible === false && r.reason.includes("advanced"));
});
check("rest_pause برای پیشرفته با ضرایب درست مجاز است", () => {
  const r = applyTrainingTechnique({ techniqueId: "rest_pause", experience: "advanced", tempo: "1-0-1-0" });
  assert(r.eligible === true && r.volumeMultiplier === 1.3 && r.intensityMultiplier === 0.95);
});

console.log("\n[قانون هالتر + دراپ‌ست]");
check("دراپ‌ست روی حرکت هالتر رد می‌شود", () => {
  const r = applyTrainingTechnique({ techniqueId: "drop_set", experience: "advanced", exerciseEquipment: "barbell", tempo: "3-0-1-0" });
  assert(r.eligible === false && r.reason.includes("barbell"));
});
check("دراپ‌ست روی حرکت دمبل مجاز است", () => {
  const r = applyTrainingTechnique({ techniqueId: "drop_set", experience: "advanced", exerciseEquipment: "dumbbell", tempo: "1-0-1-0" });
  assert(r.eligible === true && r.volumeMultiplier === 1.5 && r.intensityMultiplier === 0.85);
});

console.log("\n[giant_set — انتخاب دستی اجباری]");
check("بدون انتخاب دستی مربی رد می‌شود", () => {
  const r = applyTrainingTechnique({ techniqueId: "giant_set", experience: "advanced", coachManuallySelected: false, tempo: "3-0-1-0" });
  assert(r.eligible === false && r.reason.includes("دستی"));
});
check("با انتخاب دستی مربی مجاز است", () => {
  const r = applyTrainingTechnique({ techniqueId: "giant_set", experience: "advanced", coachManuallySelected: true, tempo: "3-0-1-0" });
  assert(r.eligible === true && r.volumeMultiplier === 2.0);
});

console.log("\n[heavy_low_rep — فقط هدف قدرت]");
check("برای هدف هایپرتروفی رد می‌شود", () => {
  const r = applyTrainingTechnique({ techniqueId: "heavy_low_rep", experience: "advanced", main_goal: "hypertrophy", tempo: "3-0-1-0" });
  assert(r.eligible === false);
});
check("برای هدف قدرت مجاز است", () => {
  const r = applyTrainingTechnique({ techniqueId: "heavy_low_rep", experience: "advanced", main_goal: "strength", tempo: "3-0-1-0" });
  assert(r.eligible === true);
});

console.log("\n[pre_post_exhaust — نیازمند ترکیب ایزوله+ترکیبی]");
check("بدون ترکیب مجاز نیست", () => {
  const r = applyTrainingTechnique({ techniqueId: "pre_post_exhaust", experience: "advanced", exerciseMovementType: "compound", tempo: "3-0-1-0" });
  assert(r.eligible === false);
});
check("با ترکیب مجاز است", () => {
  const r = applyTrainingTechnique({ techniqueId: "pre_post_exhaust", experience: "advanced", exerciseMovementType: "mixed", tempo: "3-0-1-0" });
  assert(r.eligible === true && r.volumeMultiplier === 1.15 && r.intensityMultiplier === 0.8);
});

console.log("\n[fst_7 — مکانیزم افزودن ثابت، نه ضرب]");
check("۷ ست ثابت + استراحت کوتاه + finisher، فقط پیشرفته", () => {
  const r = applyTrainingTechnique({ techniqueId: "fst_7", experience: "advanced" });
  assert(r.eligible === true);
  assert(r.additionalSets === 7, "additionalSets باید ۷ باشد");
  assert(r.restSecOverride[0] === 30 && r.restSecOverride[1] === 45, "استراحت باید ۳۰-۴۵ باشد");
  assert(r.placement === "last_isolation_exercise", "باید فقط روی finisher اعمال شود");
});
check("fst_7 برای متوسط رد می‌شود", () => {
  const r = applyTrainingTechnique({ techniqueId: "fst_7", experience: "intermediate" });
  assert(r.eligible === false);
});

console.log("\n[قانون تمپوی کند → سقف شدت ۰.۸۰]");
check("پارس فاز اکسنتریک از رشته‌ی تمپو", () => {
  assert(parseEccentricSeconds("3-0-1-0") === 3);
  assert(parseEccentricSeconds("2-0-X-0") === 2);
});
check("اکسنتریک ۳ ثانیه روی superset (شدت پیش‌فرض ۰.۹۰) → سقف به ۰.۸۰ محدود می‌شود", () => {
  const r = applyTrainingTechnique({ techniqueId: "superset", experience: "advanced", tempo: "3-0-1-0" });
  assert(r.intensityMultiplier === 0.8, `انتظار ۰.۸۰ داشتیم، گرفتیم ${r.intensityMultiplier}`);
});
check("اکسنتریک ۱ ثانیه روی superset → دست‌نخورده (۰.۹۰) می‌ماند", () => {
  const r = applyTrainingTechnique({ techniqueId: "superset", experience: "advanced", tempo: "1-0-1-0" });
  assert(r.intensityMultiplier === 0.9, `انتظار ۰.۹۰ داشتیم، گرفتیم ${r.intensityMultiplier}`);
});

console.log("\n[override جنسیتی + بازگردانی به پیشنهاد سیستم (فایل ۲)]");
check("بدون override، ضرایب پیش‌فرض سند اعمال می‌شود", () => {
  const r = computeBiometrics({ main_goal: "hypertrophy", experience: "intermediate", gender: "female" });
  assert(r.gender_advisory.isOverridden === false);
  assert(r.gender_advisory.appliedVolumeFactor === 1.15);
});
check("با override دستی مربی، مقدار override اعمال و پیشنهاد سیستم هم نگه داشته می‌شود", () => {
  const r = computeBiometrics({
    main_goal: "hypertrophy",
    experience: "intermediate",
    gender: "female",
    genderOverrides: { volumeFactor: 1.05 },
  });
  assert(r.gender_advisory.isOverridden === true);
  assert(r.gender_advisory.appliedVolumeFactor === 1.05);
  assert(r.gender_advisory.systemSuggested.volumeFactor === 1.15, "پیشنهاد سیستم برای دکمه‌ی بازگردانی باید حفظ شود");
});

console.log("\n[وزن‌دهی انتخاب حرکت بر اساس جنسیت]");
check("بدون boost، وزن همه‌ی حرکات ۱ است", () => {
  const weighted = applyGenderExerciseWeighting(EXERCISES, null);
  assert(weighted.every((e) => e.selectionWeight === 1));
});
check("با boost، فقط حرکات با muscle_group مرتبط وزن بیشتر می‌گیرند (دیتاست فعلی چنین حرکتی ندارد)", () => {
  const weighted = applyGenderExerciseWeighting(EXERCISES, { hipAbductorSelectionBoost: 0.3 });
  const boosted = weighted.filter((e) => e.selectionWeight !== 1);
  assert(boosted.length === 0, "طبق محدودیت شناخته‌شده‌ی دیتاست فعلی، انتظار می‌رود صفر باشد");
});

console.log("\n[فیلتر Injury_Blacklist — با دیتابیس واقعی موقت]");
check("حرکت ثبت‌شده در Injury_Blacklist شاگرد از لیست حذف می‌شود", () => {
  const dbPath = path.join(os.tmpdir(), `anatomix-file4-test-${Date.now()}.db`);
  const db = openDatabase(dbPath);
  const students = createStudentsRepository(db);
  const injuryBlacklist = createInjuryBlacklistRepository(db);

  const student = students.create({ full_name: "تست فیلتر آسیب" });
  injuryBlacklist.create({
    student_id: student.id,
    exercise_id: "BP-BB", // پرس سینه با هالتر
    source_module: "bodybuilding",
    reason_note: "درد شانه راست",
  });

  const blacklistEntries = injuryBlacklist.getByStudentId(student.id);
  const filtered = filterExercisesByInjuryBlacklist(EXERCISES, blacklistEntries);

  assert(EXERCISES.length === 18, "دیتاست اصلی باید دست‌نخورده بماند");
  assert(filtered.length === 17, "دقیقاً یک حرکت باید حذف شده باشد");
  assert(!filtered.some((e) => e.id === "BP-BB"), "پرس سینه هالتر نباید در لیست فیلترشده باشد");

  db.close();
  fs.rmSync(dbPath, { force: true });
});

console.log(`\n[test-engine-file4-trainingsystem] ${passCount} PASS, ${failCount} FAIL`);
process.exit(failCount > 0 ? 1 : 0);
