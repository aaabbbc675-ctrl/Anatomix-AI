// اسکریپت تست مستقل برای schema بانک حرکات مشترک — بعد از افزودن ۴ فیلد
// اصلاحی (بخش ۳.۱۵ سند، دسته‌ی ۱)، سپس tags/phase (کامیت ۱)، سپس ۳۱ رکورد
// جدید بدنسازی (کامیت ۳)، و سپس ۴۳ رکورد جدید اصلاحی از
// corrective-exercises.csv + دو فیلد جدید target_posture_correction/
// triageCategory (کامیت ۴). برخلاف ۴۹ رکورد بدنسازی (که phase همیشه null
// است — همان امضای «این هنوز حرکت اصلاحی واقعی نیست»)، ۴۳ رکورد اصلاحی
// مقدار واقعی CSV روی contraindications/neural_tension_type/rehab_target/
// application_rule/tags/phase/target_posture_correction/triageCategory
// دارند — پس چک‌های «پیش‌فرض خالی/null» فقط روی زیرمجموعه‌ی phase===null
// اجرا می‌شوند، نه کل بانک.
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

  check("دقیقاً ۹۲ رکورد است (۴۹ بدنسازی + ۴۳ رکورد جدید اصلاحی، بدون کم/زیاد شدن)", () => {
    assert(EXERCISES.length === 92, `انتظار ۹۲ رکورد داشتیم، گرفتیم ${EXERCISES.length}`);
  });

  // ۴۹ رکورد بدنسازی همیشه phase=null دارند (امضای «هنوز حرکت اصلاحی واقعی
  // نیست»)؛ ۴۳ رکورد اصلاحی همیشه phase واقعی دارند — این تفکیک برای همه‌ی
  // چک‌های «پیش‌فرض خالی/null در برابر مقدار واقعی» زیر استفاده می‌شود.
  const bodybuildingOnly = EXERCISES.filter((ex) => ex.phase === null);
  const correctiveOnly = EXERCISES.filter((ex) => ex.phase !== null);

  check("۴۹ رکورد بدنسازی دقیقاً ۴ فیلد اصلاحی (batch ۱) را با مقدار پیش‌فرض دارند", () => {
    assert(bodybuildingOnly.length === 49, `انتظار ۴۹ رکورد بدنسازی داشتیم، گرفتیم ${bodybuildingOnly.length}`);
    bodybuildingOnly.forEach((exercise) => {
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

  check("application_rule روی رکوردهای بدنسازی (شامل ۵ حرکت unilateral) null است — چون هنوز مقدار مستندی نداریم", () => {
    const unilateralIds = ["LNG-DB", "BSS-DB", "DC-DB", "DR-DB", "HAB-MC"];
    const unilateralExercises = bodybuildingOnly.filter((ex) => unilateralIds.includes(ex.id));
    assert(unilateralExercises.length === 5, `انتظار ۵ حرکت unilateral داشتیم، پیدا شد ${unilateralExercises.length}`);
    unilateralExercises.forEach((exercise) => {
      assert(exercise.laterality === "unilateral", `${exercise.id}: باید laterality=unilateral باشد`);
      assert(
        exercise.application_rule === null,
        `${exercise.id}: application_rule باید فعلاً null باشد (بدون مقدار مستند حدس زده نشود)، گرفتیم ${JSON.stringify(exercise.application_rule)}`
      );
    });

    bodybuildingOnly.forEach((exercise) => {
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

  check("۴۹ رکورد بدنسازی دقیقاً فیلدهای tags/phase/target_posture_correction/triageCategory را با مقدار پیش‌فرض دارند", () => {
    bodybuildingOnly.forEach((exercise) => {
      assert(
        Array.isArray(exercise.tags) && exercise.tags.length === 0,
        `${exercise.id}: tags باید آرایه‌ی خالی باشد، گرفتیم ${JSON.stringify(exercise.tags)}`
      );
      assert(
        exercise.phase === null,
        `${exercise.id}: phase باید فعلاً null باشد (بدون مقدار مستند حدس زده نشود)، گرفتیم ${JSON.stringify(exercise.phase)}`
      );
      assert(
        Array.isArray(exercise.target_posture_correction) && exercise.target_posture_correction.length === 0,
        `${exercise.id}: target_posture_correction باید آرایه‌ی خالی باشد، گرفتیم ${JSON.stringify(exercise.target_posture_correction)}`
      );
      assert(
        exercise.triageCategory === null,
        `${exercise.id}: triageCategory باید null باشد، گرفتیم ${JSON.stringify(exercise.triageCategory)}`
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

  check("۴۳ رکورد جدید اصلاحی واقعاً اضافه شدند — id/tags/phase/neural_tension_type چند رکورد کلیدی با CSV مطابقت دارد", () => {
    const newCorrectiveIds = [
      "SMR-UPPERTRAP", "SMR-PEC-BALL", "SMR-LAT", "STR-UPPERTRAP", "STR-PEC-DOORWAY", "STR-LEVATOR",
      "ACT-CHIN-TUCK", "ACT-PRONE-Y", "ACT-PRONE-T", "ACT-SERRATUS-PUNCH", "ACT-PRONE-COBRA",
      "INT-WALL-SLIDE", "INT-CABLE-FACEPULL", "INT-BAND-PULLAPART", "SMR-HIPFLEXOR", "SMR-TFL",
      "STR-HIPFLEXOR-KNEEL", "STR-QUAD-STANDING", "STR-ERECTOR-CATCOW", "ACT-GLUTE-BRIDGE",
      "ACT-DEADBUG", "ACT-PLANK", "ACT-BIRDDOG", "INT-SQUAT-BW", "INT-LUNGE-REVERSE", "INT-STEPUP",
      "SMR-CALF", "SMR-ADDUCTOR", "SMR-ITBAND", "STR-CALF-WALL", "STR-ADDUCTOR-BUTTERFLY",
      "ACT-GLUTEMED-SIDELYING", "ACT-CLAMSHELL", "ACT-SHORTFOOT", "ACT-SINGLELEG-BALANCE",
      "INT-LATERAL-BAND-WALK", "INT-SQUAT-KNEETRACK", "CORE-PALLOF-PRESS", "CORE-BRIDGE-MARCH",
      "CORE-SIDEPLANK", "NEURO-MEDIAN-GLIDE", "NEURO-SCIATIC-SLIDER", "STR-HAMSTRING-SLR",
    ];
    assert(newCorrectiveIds.length === 43, `لیست id مرجع باید ۴۳ عضو داشته باشد، دارد ${newCorrectiveIds.length}`);
    newCorrectiveIds.forEach((id) => {
      const exercise = EXERCISES.find((ex) => ex.id === id);
      assert(exercise, `${id}: در EXERCISES پیدا نشد`);
    });
    assert(correctiveOnly.length === 43, `انتظار ۴۳ رکورد با phase!==null داشتیم، گرفتیم ${correctiveOnly.length}`);

    // نمونه ۱: phase=CEx_Inhibit واقعی (فوم رولینگ ذوزنقه‌ای فوقانی)
    const smrUpperTrap = EXERCISES.find((ex) => ex.id === "SMR-UPPERTRAP");
    assert(smrUpperTrap.phase === "CEx_Inhibit", `SMR-UPPERTRAP: phase باید CEx_Inhibit باشد، گرفتیم ${smrUpperTrap.phase}`);
    assert(
      JSON.stringify(smrUpperTrap.tags) === JSON.stringify(["SMR"]),
      `SMR-UPPERTRAP: tags باید ["SMR"] باشد، گرفتیم ${JSON.stringify(smrUpperTrap.tags)}`
    );

    // نمونه ۲: tags شامل Isometric,Stabilization واقعی (تمرین جمع‌کردن چانه)
    const actChinTuck = EXERCISES.find((ex) => ex.id === "ACT-CHIN-TUCK");
    assert(
      JSON.stringify(actChinTuck.tags) === JSON.stringify(["Isometric", "Stabilization"]),
      `ACT-CHIN-TUCK: tags باید ["Isometric","Stabilization"] باشد، گرفتیم ${JSON.stringify(actChinTuck.tags)}`
    );
    assert(actChinTuck.phase === "CEx_Activate", `ACT-CHIN-TUCK: phase باید CEx_Activate باشد`);
    assert(actChinTuck.triageCategory === "rehab", `ACT-CHIN-TUCK: triageCategory باید rehab باشد`);

    // نمونه ۳: neural_tension_type=Sliding واقعی (اسلایدر عصب مدیان) — طبق
    // بخش ۱.۳ سند، Sliding با Tensioning فرق دارد و نباید با آن قاطی شود.
    const neuroMedianGlide = EXERCISES.find((ex) => ex.id === "NEURO-MEDIAN-GLIDE");
    assert(
      neuroMedianGlide.neural_tension_type === "Sliding",
      `NEURO-MEDIAN-GLIDE: neural_tension_type باید Sliding باشد، گرفتیم ${neuroMedianGlide.neural_tension_type}`
    );
    assert(neuroMedianGlide.neural_tension_type !== "Tensioning", "NEURO-MEDIAN-GLIDE نباید Tensioning باشد");

    // چک متقابل: STR-HAMSTRING-SLR واقعاً Tensioning است (نه Sliding) —
    // اثبات این‌که این دو مقدار واقعاً از هم متمایزند، نه یک مقدار تصادفی.
    const strHamstringSlr = EXERCISES.find((ex) => ex.id === "STR-HAMSTRING-SLR");
    assert(
      strHamstringSlr.neural_tension_type === "Tensioning",
      `STR-HAMSTRING-SLR: neural_tension_type باید Tensioning باشد، گرفتیم ${strHamstringSlr.neural_tension_type}`
    );

    const smrPecBall = EXERCISES.find((ex) => ex.id === "SMR-PEC-BALL");
    assert(
      JSON.stringify(smrPecBall.contraindications) === JSON.stringify(["shoulder_pain"]),
      `SMR-PEC-BALL: contraindications باید ["shoulder_pain"] باشد، گرفتیم ${JSON.stringify(smrPecBall.contraindications)}`
    );

    const actGlueBridge = EXERCISES.find((ex) => ex.id === "ACT-GLUTE-BRIDGE");
    assert(actGlueBridge.rehab_target === "کمر", `ACT-GLUTE-BRIDGE: rehab_target باید "کمر" باشد`);
    assert(actGlueBridge.equipment === "bodyweight");
  });

  console.log(`\n[test-engine-exercises-seed-schema] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
