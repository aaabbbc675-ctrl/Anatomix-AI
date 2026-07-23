// اسکریپت تست مستقل برای schema بانک حرکات مشترک بعد از افزودن ۴ فیلد
// اصلاحی (بخش ۳.۱۵ سند موتور اصلاحی، دسته‌ی ۱).
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

  check("دقیقاً همان ۱۸ حرکت placeholder موجود است (بدون کم/زیاد شدن رکورد)", () => {
    assert(EXERCISES.length === 18, `انتظار ۱۸ رکورد داشتیم، گرفتیم ${EXERCISES.length}`);
  });

  check("هر ۱۸ رکورد دقیقاً ۴ فیلد جدید را با نوع درست دارند", () => {
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

  check("application_rule فعلاً روی همه (شامل ۴ حرکت unilateral) null است — چون هنوز مقدار مستندی نداریم", () => {
    const unilateralIds = ["LNG-DB", "BSS-DB", "DC-DB", "DR-DB"];
    const unilateralExercises = EXERCISES.filter((ex) => unilateralIds.includes(ex.id));
    assert(unilateralExercises.length === 4, `انتظار ۴ حرکت unilateral داشتیم، پیدا شد ${unilateralExercises.length}`);
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

  console.log(`\n[test-engine-exercises-seed-schema] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
