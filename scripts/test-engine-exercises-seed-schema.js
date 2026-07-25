// اسکریپت تست مستقل برای schema بانک حرکات مشترک — بعد از افزودن ۴ فیلد
// اصلاحی (بخش ۳.۱۵ سند، دسته‌ی ۱)، سپس ۲ فیلد tags/phase (کامیت ۱)، و سپس
// ۳۱ رکورد جدید بدنسازی از bodybuilding-exercises.csv (کامیت ۳؛ tags/phase
// روی این ۳۱ رکورد هم پیش‌فرض خالی/null ماند، چون خودِ CSV اصلاً ستون
// tags/phase ندارد — تصمیم صریح تاییدشده). عدد کل و چک‌ها هنوز یک‌بار دیگر
// در کامیت ۴ (افزودن ۴۳ رکورد اصلاحی) به‌روزرسانی می‌شوند.
// اجرا: node scripts/test-engine-exercises-seed-schema.js

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

(async () => {
  const { EXERCISES } = await import("../engine/bodybuilding/data/exercises.seed.js");

  check("دقیقاً ۴۹ رکورد است (۱۸ اولیه + ۳۱ رکورد جدید بدنسازی، بدون کم/زیاد شدن)", () => {
    assert(EXERCISES.length === 49, `انتظار ۴۹ رکورد داشتیم، گرفتیم ${EXERCISES.length}`);
  });

  check("هر ۴۹ رکورد دقیقاً ۴ فیلد اصلاحی (batch ۱) را با نوع درست دارند", () => {
    EXERCISES.forEach((exercise) => {
      assert(
        Array.isArray(exercise.contraindications) && exercise.contraindications.length === 0,
        `${exercise.id}: contraindications باید آرایه‌ی خالی باشد، گرفتیم ${JSON.stringify(exercise.contraindications)}`
      );
      assert(
        exercise.neural_tension_type === "None",
        `${exercise.id}: neural_tension_type باید "None" باشد، گرفتیم ${JSON.stringify(exercise.neural_tension_type)}`
      );
      assert(
        exercise.rehab_target === null,
        `${exercise.id}: rehab_target باید null باشد، گرفتیم ${JSON.stringify(exercise.rehab_target)}`
      );
      assert(
        Object.prototype.hasOwnProperty.call(exercise, "application_rule"),
        `${exercise.id}: فیلد application_rule باید وجود داشته باشد`
      );
    });
  });

  check("application_rule فعلاً روی همه (شامل ۵ حرکت unilateral) null است — چون هنوز مقدار مستندی نداریم", () => {
    const unilateralIds = ["LNG-DB", "BSS-DB", "DC-DB", "DR-DB", "HAB-MC"];
    const unilateralExercises = EXERCISES.filter((ex) => unilateralIds.includes(ex.id));
    assert(unilateralExercises.length === 5, `انتظار ۵ حرکت unilateral داشتیم، پیدا شد ${unilateralExercises.length}`);
    unilateralExercises.forEach((exercise) => {
      assert(exercise.laterality === "unilateral", `${exercise.id}: باید laterality=unilateral باشد`);
      assert(
        exercise.application_rule === null,
        `${exercise.id}: application_rule باید فعلاً null باشد (بدون مقدار مستند حدس زده نشود)، گرفتیم ${JSON.stringify(exercise.application_rule)}`
      );
    });

    EXERCISES.forEach((exercise) => {
      assert(
        exercise.application_rule === null,
        `${exercise.id}: application_rule باید روی همه null باشد، گرفتیم ${JSON.stringify(exercise.application_rule)}`
      );
    });
  });

  check("فیلدهای قدیمی (equipment/laterality/trainingGoal/movement_type) دست‌نخورده ماندند", () => {
    const sqBb = EXERCISES.find((ex) => ex.id === "SQ-BB");
    assert(sqBb.equipment === "barbell");
    assert(sqBb.laterality === "bilateral");
    assert(sqBb.movement_type === "compound");
    assert(Array.isArray(sqBb.trainingGoal) && sqBb.trainingGoal.includes("hypertrophy"));
  });

  check("هر ۴۹ رکورد دقیقاً فیلدهای tags/phase را با نوع/مقدار پیش‌فرض درست دارند", () => {
    EXERCISES.forEach((exercise) => {
      assert(
        Array.isArray(exercise.tags) && exercise.tags.length === 0,
        `${exercise.id}: tags باید آرایه‌ی خالی باشد، گرفتیم ${JSON.stringify(exercise.tags)}`
      );
      assert(
        exercise.phase === null,
        `${exercise.id}: phase باید فعلاً null باشد (بدون مقدار مستند حدس زده نشود)، گرفتیم ${JSON.stringify(exercise.phase)}`
      );
    });
  });

  check("۳۱ رکورد جدید بدنسازی واقعاً اضافه شدند — id/equipment/laterality/trainingGoal آن‌ها با CSV مطابقت دارد", () => {
    const newIds = [
      "INCBP-BB", "DFLY-DB", "CCO-CB", "PU-BW", "PLUP-BW", "SCR-CB", "TBR-BB", "BBFP-CB",
      "LR-DB", "ARN-DB", "RDF-CB", "UPR-BB", "HT-BB", "HAB-MC", "SCLF-MC", "SLC-MC",
      "FSQ-BB", "HACK-MC", "GOB-DB", "KBS-DB", "HC-DB", "CC-CB", "PC-BB", "OHE-DB",
      "CGBP-BB", "DIP-BW", "WC-DB", "CCR-CB", "HLR-BW", "RT-BW", "CLEAN-BB",
    ];
    assert(newIds.length === 31, `لیست id مرجع باید ۳۱ عضو داشته باشد، دارد ${newIds.length}`);
    newIds.forEach((id) => {
      const exercise = EXERCISES.find((ex) => ex.id === id);
      assert(exercise, `${id}: در EXERCISES پیدا نشد`);
    });

    const puBw = EXERCISES.find((ex) => ex.id === "PU-BW");
    assert(puBw.equipment === "bodyweight", `PU-BW: equipment باید bodyweight باشد، گرفتیم ${puBw.equipment}`);
    assert(puBw.muscle_group === "chest");

    const habMc = EXERCISES.find((ex) => ex.id === "HAB-MC");
    assert(habMc.laterality === "unilateral", `HAB-MC: laterality باید unilateral باشد، گرفتیم ${habMc.laterality}`);
    assert(habMc.equipment === "machine");

    const cleanBb = EXERCISES.find((ex) => ex.id === "CLEAN-BB");
    assert(
      JSON.stringify(cleanBb.trainingGoal) === JSON.stringify(["power", "strength"]),
      `CLEAN-BB: trainingGoal باید ["power","strength"] باشد، گرفتیم ${JSON.stringify(cleanBb.trainingGoal)}`
    );
  });

  console.log(`\n[test-engine-exercises-seed-schema] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
