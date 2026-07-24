// اسکریپت تست مستقل برای فایل ۸ موتور اصلاحی (فیلتر تجهیزات + ظرفیت
// داینامیک + موتور MIN/MAX + تکرار بدون Failure + وتوی تمپو).
// اجرا: node scripts/test-engine-corrective-file8-capacityengine.js

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
  const {
    filterExercisesByAvailableEquipment,
    computeSessionCapacity,
    resolveFinalSetsAndRest,
    resolveRepRangeWithoutFailure,
    applyTempoVeto,
  } = await import("../engine/corrective/file8_capacityEngine.js");
  const { EXERCISES } = await import("../engine/bodybuilding/data/exercises.seed.js");

  console.log("\n[فیلتر جهانی تجهیزات — روی داده‌ی واقعی exercises.seed.js]");
  check("فقط حرکات با equipment موجود باقی می‌مانند", () => {
    const result = filterExercisesByAvailableEquipment(EXERCISES, ["barbell", "cable"]);
    assert(result.length > 0, "باید حداقل چند حرکت هالتر/کابل وجود داشته باشد");
    result.forEach((ex) => assert(["barbell", "cable"].includes(ex.equipment)));
    assert(
      result.every((ex) => ex.equipment !== "dumbbell" && ex.equipment !== "machine"),
      "هیچ حرکت دمبل/دستگاهی نباید باقی بماند"
    );
  });

  check("لیست تجهیزات خالی → هیچ حرکتی باقی نمی‌ماند", () => {
    const result = filterExercisesByAvailableEquipment(EXERCISES, []);
    assertDeepEqual(result, []);
  });

  check("availableEquipment نامعتبر رد می‌شود", () => {
    assertThrows(() => filterExercisesByAvailableEquipment(EXERCISES, "barbell"), "availableEquipment باید آرایه");
  });

  console.log("\n[ظرفیت داینامیک جلسه]");
  check("محاسبه‌ی صحیح Main_Workout_Time و تعداد حرکات مجاز", () => {
    // ۶۰ دقیقه کل، ۱۰ گرم‌کردن، ۰ هوازی، ۵ سرد → ۴۵ دقیقه بدنه‌ی اصلی = ۲۷۰۰ ثانیه
    // هر حرکت: ۳ ست × (۴۰ ثانیه اجرا + ۹۰ ثانیه استراحت) = ۳۹۰ ثانیه
    // ۲۷۰۰ / ۳۹۰ = ۶.۹۲ → floor = ۶
    const result = computeSessionCapacity({
      totalAllowedMinutes: 60,
      warmupMinutes: 10,
      aerobicMinutes: 0,
      cooldownMinutes: 5,
      setsPerExercise: 3,
      executionSecPerSet: 40,
      restSecPerSet: 90,
    });
    assert(result.mainWorkoutMinutes === 45);
    assert(result.maxExerciseCount === 6, `انتظار ۶ داشتیم، گرفتیم ${result.maxExerciseCount}`);
  });

  check("وقتی گرم+هوازی+سرد از کل زمان بیشتر/مساوی شود، خطای صریح می‌دهد", () => {
    assertThrows(
      () =>
        computeSessionCapacity({
          totalAllowedMinutes: 30,
          warmupMinutes: 12,
          aerobicMinutes: 10,
          cooldownMinutes: 10,
          setsPerExercise: 3,
          executionSecPerSet: 40,
          restSecPerSet: 90,
        }),
      "زمان بدنه‌ی اصلی جلسه منفی/صفر شد"
    );
  });

  console.log("\n[موتور MIN/MAX — چهار مقدار واقعاً متفاوت، نه دو مقدار برابر]");
  check("Final_Sets = MIN با ۴ مقدار متفاوت (نتیجه باید دقیقاً کمترین، ۳، از منبع آسیب باشد)", () => {
    const result = resolveFinalSetsAndRest({
      defaultSets: 6,
      systemicMaxSets: 5,
      injuryMaxSets: 3,
      ageMaxSets: 4,
      defaultRest: 60,
    });
    assert(result.finalSets === 3, `انتظار ۳ (کمترین از بین ۶/۵/۳/۴) داشتیم، گرفتیم ${result.finalSets}`);
  });

  check("Final_Rest = MAX با ۴ مقدار متفاوت (نتیجه باید دقیقاً بیشترین، ۱۵۰، از منبع آسیب باشد)", () => {
    const result = resolveFinalSetsAndRest({
      defaultSets: 4,
      defaultRest: 60,
      systemicMinRest: 90,
      injuryMinRest: 150,
      ageMinRest: 75,
    });
    assert(result.finalRest === 150, `انتظار ۱۵۰ (بیشترین از بین ۶۰/۹۰/۱۵۰/۷۵) داشتیم، گرفتیم ${result.finalRest}`);
  });

  check("مقادیر null نادیده گرفته می‌شوند، نه به‌عنوان صفر محاسبه شوند", () => {
    const result = resolveFinalSetsAndRest({
      defaultSets: 5,
      systemicMaxSets: null,
      injuryMaxSets: 3,
      ageMaxSets: null,
      defaultRest: 60,
      systemicMinRest: null,
      injuryMinRest: 100,
      ageMinRest: null,
    });
    assert(result.finalSets === 3);
    assert(result.finalRest === 100);
  });

  check("همه‌ی محدودیت‌های اختیاری غایب → فقط پیش‌فرض‌ها برنده‌اند", () => {
    const result = resolveFinalSetsAndRest({ defaultSets: 4, defaultRest: 90 });
    assert(result.finalSets === 4);
    assert(result.finalRest === 90);
  });

  console.log("\n[تکرار بدون Failure]");
  check("همیشه بازه‌ی ۱۰-۱۵ و trainingToFailure=false", () => {
    assertDeepEqual(resolveRepRangeWithoutFailure(), { repRange: [10, 15], trainingToFailure: false });
  });

  console.log("\n[وتوی تمپو — ترکیب OR از خروجی file4 و file5]");
  check("فقط شرط بیماری (قلبی/فشارخون) فعال → true", () => {
    const result = applyTempoVeto({
      diseasePatch: { isometricPauseMustBeZero: true },
      ageAdjustment: { ageGroup: "adult", specialRestrictions: false },
    });
    assert(result.allIsometricPausesZero === true);
  });

  check("فقط شرط سنی (سالمند) فعال → true", () => {
    const result = applyTempoVeto({
      diseasePatch: { isometricPauseMustBeZero: false },
      ageAdjustment: { ageGroup: "elderly", isometricPauseMustBeZero: true },
    });
    assert(result.allIsometricPausesZero === true);
  });

  check("هر دو هم‌زمان فعال → همچنان فقط true (نه خطا)", () => {
    const result = applyTempoVeto({
      diseasePatch: { isometricPauseMustBeZero: true },
      ageAdjustment: { ageGroup: "elderly", isometricPauseMustBeZero: true },
    });
    assert(result.allIsometricPausesZero === true);
  });

  check("هیچ‌کدام فعال نیست → false", () => {
    const result = applyTempoVeto({
      diseasePatch: { isometricPauseMustBeZero: false },
      ageAdjustment: { ageGroup: "adult", specialRestrictions: false },
    });
    assert(result.allIsometricPausesZero === false);
  });

  check("ورودی‌های غایب (undefined) کرش نمی‌کنند و false می‌دهند", () => {
    const result = applyTempoVeto({});
    assert(result.allIsometricPausesZero === false);
  });

  console.log(`\n[test-engine-corrective-file8-capacityengine] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
