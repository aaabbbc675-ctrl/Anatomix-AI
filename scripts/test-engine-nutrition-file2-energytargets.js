// اسکریپت تست مستقل برای فایل ۲ موتور تغذیه (processEnergyTargets و
// توابع زیرمجموعه‌اش). اجرا: node scripts/test-engine-nutrition-file2-energytargets.js
//
// همه‌ی اعداد انتظار در این فایل با دست (خارج از کد موتور) محاسبه و با
// node -e جداگانه صحت‌سنجی شده‌اند، نه از خروجی خودِ تابع کپی شده‌اند —
// وگرنه یک تست حلقوی می‌شد که باگ فرمول را نمی‌گرفت (دقیقاً همان باگی که
// در DEFAULT_FAT_LOSS_RATE_PERCENT قبل از نوشتن این تست پیدا شد).

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

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || "mismatch"} — actual: ${actual}, expected: ${expected} (±${tolerance})`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

(async () => {
  const {
    processEnergyTargets,
    computeBmr,
    computeTdee,
    computeTargetCalories,
    computeEnergyAvailability,
    computeDefaultMacroFloors,
    ACTIVITY_MULTIPLIERS,
    DEFAULT_FAT_LOSS_RATE_PERCENT,
    EA_OPTIMAL_THRESHOLD_KCAL_PER_KG_FFM,
    EA_SUBOPTIMAL_THRESHOLD_KCAL_PER_KG_FFM,
    PROTEIN_FLOOR_G_PER_KG,
    FAT_FLOOR_G_PER_KG,
    FAT_FLOOR_PERCENT_OF_CALORIES,
    CARB_FLOOR_G_PER_KG,
  } = await import("../engine/nutrition/file2_energyTargets.js");

  console.log("\n[ثابت‌ها — طبق سند]");
  check("ACTIVITY_MULTIPLIERS دقیقاً پنج سطح بخش ۲.۱-ب است", () => {
    assert(ACTIVITY_MULTIPLIERS.sedentary === 1.2);
    assert(ACTIVITY_MULTIPLIERS.light === 1.375);
    assert(ACTIVITY_MULTIPLIERS.moderate === 1.55);
    assert(ACTIVITY_MULTIPLIERS.heavy === 1.725);
    assert(ACTIVITY_MULTIPLIERS.athlete === 1.9);
  });
  check("DEFAULT_FAT_LOSS_RATE_PERCENT دقیقاً ۰.۵ است (نه وسط بازه)", () => {
    assert(DEFAULT_FAT_LOSS_RATE_PERCENT === 0.5);
  });
  check("آستانه‌های EA دقیقاً ۴۵ و ۳۰ هستند", () => {
    assert(EA_OPTIMAL_THRESHOLD_KCAL_PER_KG_FFM === 45);
    assert(EA_SUBOPTIMAL_THRESHOLD_KCAL_PER_KG_FFM === 30);
  });
  check("کف‌های ماکرو دقیقاً طبق بخش ۱.۲ هستند", () => {
    assert(PROTEIN_FLOOR_G_PER_KG === 1.2);
    assert(FAT_FLOOR_G_PER_KG === 0.5);
    assert(FAT_FLOOR_PERCENT_OF_CALORIES === 0.2);
    assert(CARB_FLOOR_G_PER_KG === 2);
  });

  console.log("\n[computeBmr]");
  check("Katch-McArdle وقتی body_fat_percent موجود است (weight=80,bfp=20 → FFM=64)", () => {
    const result = computeBmr({ sex: "male", age: 30, weight_kg: 80, height_cm: 175, body_fat_percent: 20 });
    assert(result.formula_used === "katch_mcardle");
    assertClose(result.ffm_kg, 64, 0.001);
    assertClose(result.bmr, 1752.4, 0.001, "BMR باید 370+21.6×64=1752.4 باشد");
  });
  check("Mifflin-St Jeor مرد وقتی body_fat_percent نیست", () => {
    const result = computeBmr({ sex: "male", age: 30, weight_kg: 80, height_cm: 175, body_fat_percent: null });
    assert(result.formula_used === "mifflin_st_jeor");
    assert(result.ffm_kg === null);
    assertClose(result.bmr, 1748.75, 0.001, "BMR مرد باید 10×80+6.25×175-5×30+5=1748.75 باشد");
  });
  check("Mifflin-St Jeor زن وقتی body_fat_percent نیست", () => {
    const result = computeBmr({ sex: "female", age: 30, weight_kg: 80, height_cm: 175, body_fat_percent: null });
    assertClose(result.bmr, 1582.75, 0.001, "BMR زن باید 10×80+6.25×175-5×30-161=1582.75 باشد");
  });

  console.log("\n[computeTdee]");
  check("ضریب هر پنج سطح فعالیت درست اعمال می‌شود (bmr=1752.4)", () => {
    assertClose(computeTdee(1752.4, "sedentary"), 2102.88, 0.001);
    assertClose(computeTdee(1752.4, "light"), 2409.55, 0.01);
    assertClose(computeTdee(1752.4, "moderate"), 2716.22, 0.01);
    assertClose(computeTdee(1752.4, "heavy"), 3022.89, 0.01);
    assertClose(computeTdee(1752.4, "athlete"), 3329.56, 0.01);
  });
  check("activity_level نامعتبر throw می‌کند", () => {
    let threw = false;
    try {
      computeTdee(1752.4, "extreme");
    } catch {
      threw = true;
    }
    assert(threw, "انتظار throw داشتیم");
  });

  console.log("\n[computeTargetCalories]");
  check("fat_loss: کسری روزانه دقیقاً ۰.۵٪ وزن (weight=70 → 385 kcal/day)", () => {
    // BMR زن، weight=70,height=170,age=25: 10×70+6.25×170-5×25-161=1476.5
    // TDEE (light=1.375): 1476.5×1.375=2030.1875
    // کسری: (0.5/100)×70×7700/7 = 385
    // هدف: 2030.1875-385=1645.1875
    const target = computeTargetCalories({
      tdee: 2030.1875,
      main_goal: "fat_loss",
      weight_kg: 70,
      muscle_gain_surplus_kcal: null,
    });
    assertClose(target, 1645.1875, 0.001, "کسری باید 385 kcal/day باشد، نه 38500 (باگ قبلی که پیدا و رفع شد)");
  });
  check("muscle_gain: TDEE + muscle_gain_surplus_kcal دقیقاً جمع می‌شود", () => {
    const target = computeTargetCalories({
      tdee: 2716.22,
      main_goal: "muscle_gain",
      weight_kg: 80,
      muscle_gain_surplus_kcal: 400,
    });
    assertClose(target, 3116.22, 0.01);
  });
  check("maintenance: کالری هدف دقیقاً TDEE است", () => {
    const target = computeTargetCalories({
      tdee: 2500,
      main_goal: "maintenance",
      weight_kg: 80,
      muscle_gain_surplus_kcal: null,
    });
    assert(target === 2500);
  });

  console.log("\n[computeEnergyAvailability]");
  check("EA زیر ۳۰ → ea_status=low، هشدار caution", () => {
    // (2102.88-300)/64 = 28.17
    const result = computeEnergyAvailability({ target_calories: 2102.88, training_calories_burned: 300, ffm_kg: 64 });
    assertClose(result.ea_kcal_per_kg_ffm, 28.17, 0.01);
    assert(result.ea_status === "low");
    assert(result.warnings.length === 1);
    assert(result.warnings[0].code === "ea_low");
    assert(result.warnings[0].severity === "caution");
  });
  check("EA بین ۳۰ تا ۴۵ → ea_status=suboptimal، هشدار info", () => {
    // (2102.88-100)/64 = 31.295
    const result = computeEnergyAvailability({ target_calories: 2102.88, training_calories_burned: 100, ffm_kg: 64 });
    assertClose(result.ea_kcal_per_kg_ffm, 31.295, 0.01);
    assert(result.ea_status === "suboptimal");
    assert(result.warnings.length === 1);
    assert(result.warnings[0].code === "ea_suboptimal");
    assert(result.warnings[0].severity === "info");
  });
  check("EA بالای ۴۵ → ea_status=optimal، بدون هشدار", () => {
    // (3329.56-200)/64 = 48.899375
    const result = computeEnergyAvailability({ target_calories: 3329.56, training_calories_burned: 200, ffm_kg: 64 });
    assertClose(result.ea_kcal_per_kg_ffm, 48.899375, 0.01);
    assert(result.ea_status === "optimal");
    assert(result.warnings.length === 0);
  });
  check("ffm_kg=null → not_calculable، بدون فرض جایگزین", () => {
    const result = computeEnergyAvailability({ target_calories: 2500, training_calories_burned: 300, ffm_kg: null });
    assert(result.ea_kcal_per_kg_ffm === null);
    assert(result.ea_status === "not_calculable");
    assert(result.warnings.length === 0);
  });
  check("training_calories_burned=null → not_calculable حتی وقتی ffm موجود است", () => {
    const result = computeEnergyAvailability({ target_calories: 2500, training_calories_burned: null, ffm_kg: 64 });
    assert(result.ea_status === "not_calculable");
  });
  check("training_calories_burned=0 یک مقدار واقعی است، نه null (نباید not_calculable شود)", () => {
    const result = computeEnergyAvailability({ target_calories: 2500, training_calories_burned: 0, ffm_kg: 64 });
    assert(result.ea_status !== "not_calculable");
  });

  console.log("\n[computeDefaultMacroFloors]");
  check("حالت عادی (بالای کف): بدون هشدار (weight=80, target=2500)", () => {
    const result = computeDefaultMacroFloors({ target_calories: 2500, weight_kg: 80 });
    assertClose(result.protein_g, 96, 0.001, "پروتئین باید 1.2×80=96 باشد");
    assertClose(result.fat_g, 55.5556, 0.001, "چربی باید max(0.5×80, 0.2×2500/9)=max(40,55.56)=55.56 باشد");
    assertClose(result.carb_g, 404, 0.001);
    assert(result.warnings.length === 0);
  });
  check("کمی زیر کف کربوهیدرات (مثبت اما <2 گرم/کیلو) → carb_below_floor، نه target_calories_unrealistic", () => {
    // weight=100, target=1690 → protein=120, fat=50, carb=190 → 190/100=1.9<2
    const result = computeDefaultMacroFloors({ target_calories: 1690, weight_kg: 100 });
    assertClose(result.carb_g, 190, 0.001);
    assert(result.carb_g >= 0, "این سناریو باید کربوهیدرات مثبت داشته باشد، نه منفی");
    assert(result.warnings.length === 1);
    assert(result.warnings[0].code === "carb_below_floor");
    assert(result.warnings[0].severity === "caution");
  });
  check("کربوهیدرات منفی (کالری هدف غیرواقعی) → target_calories_unrealistic، نه carb_below_floor", () => {
    // weight=100, target=800 → protein=120(480kcal), fat=50(450kcal) → carb=(800-930)/4=-32.5
    const result = computeDefaultMacroFloors({ target_calories: 800, weight_kg: 100 });
    assertClose(result.carb_g, -32.5, 0.001);
    assert(result.warnings.length === 1);
    assert(result.warnings[0].code === "target_calories_unrealistic", `کد باید target_calories_unrealistic باشد، گرفتیم: ${result.warnings[0].code}`);
    assert(result.warnings[0].severity === "caution");
  });
  check("عدد منفی carb_g پنهان نمی‌شود — همان مقدار واقعی در خروجی می‌ماند", () => {
    const result = computeDefaultMacroFloors({ target_calories: 800, weight_kg: 100 });
    assert(result.carb_g < 0, "عدد واقعی (منفی) باید در خروجی بماند، نه صفر یا حذف‌شده");
  });

  console.log("\n[processEnergyTargets — یکپارچه]");
  check("سناریوی کامل fat_loss با body_fat_percent (EA=low) — همه‌ی فیلدها یک‌جا درست", () => {
    const intake = {
      sex: "male",
      age: 30,
      weight_kg: 80,
      height_cm: 175,
      body_fat_percent: 20,
      activity_level: "sedentary",
      main_goal: "maintenance",
      muscle_gain_surplus_kcal: null,
      training_calories_burned: 300,
    };
    const result = processEnergyTargets(intake);
    assertClose(result.bmr, 1752.4, 0.001);
    assert(result.bmr_formula_used === "katch_mcardle");
    assertClose(result.ffm_kg, 64, 0.001);
    assertClose(result.tdee, 2102.88, 0.001);
    assertClose(result.target_calories, 2102.88, 0.001, "maintenance باید دقیقاً TDEE باشد");
    assertClose(result.energy_availability_kcal_per_kg_ffm, 28.17, 0.01);
    assert(result.ea_status === "low");
    assert(result.warnings.some((w) => w.code === "ea_low"));
  });
  check("سناریوی muscle_gain کامل — کالری هدف و هشدارهای ماکرو با هم سازگارند", () => {
    const intake = {
      sex: "male",
      age: 30,
      weight_kg: 80,
      height_cm: 175,
      body_fat_percent: 20,
      activity_level: "moderate",
      main_goal: "muscle_gain",
      muscle_gain_surplus_kcal: 400,
      training_calories_burned: 200,
    };
    const result = processEnergyTargets(intake);
    assertClose(result.tdee, 2716.22, 0.01);
    assertClose(result.target_calories, 3116.22, 0.01);
    assert(result.default_macros.protein_g === 96, "پروتئین باید 1.2×80=96 باشد");
  });
  check("نبودن body_fat_percent → not_calculable، بدون هشدار EA (نه crash نه فرض جایگزین)", () => {
    const intake = {
      sex: "female",
      age: 25,
      weight_kg: 70,
      height_cm: 170,
      body_fat_percent: null,
      activity_level: "light",
      main_goal: "fat_loss",
      muscle_gain_surplus_kcal: null,
      training_calories_burned: 300,
    };
    const result = processEnergyTargets(intake);
    assert(result.bmr_formula_used === "mifflin_st_jeor");
    assert(result.ffm_kg === null);
    assert(result.ea_status === "not_calculable");
    assertClose(result.target_calories, 1645.1875, 0.001, "کسری fat_loss باید 385 kcal/day باشد");
    assert(!result.warnings.some((w) => w.code === "ea_low" || w.code === "ea_suboptimal"));
  });
  check("main_goal نامعتبر throw می‌کند (دفاع داخلی، حتی اگر فایل ۱ قبلاً رد کرده باشد)", () => {
    let threw = false;
    try {
      processEnergyTargets({
        sex: "male",
        age: 30,
        weight_kg: 80,
        height_cm: 175,
        body_fat_percent: 20,
        activity_level: "moderate",
        main_goal: "recomposition",
        muscle_gain_surplus_kcal: null,
        training_calories_burned: 200,
      });
    } catch {
      threw = true;
    }
    assert(threw, "انتظار throw داشتیم");
  });

  console.log(`\n[test-engine-nutrition-file2-energytargets] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
