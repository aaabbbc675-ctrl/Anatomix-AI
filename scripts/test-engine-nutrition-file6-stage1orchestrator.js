// اسکریپت تست مستقل برای فایل ۶ موتور تغذیه (processStage1/applyMacroOverride).
// اجرا: node scripts/test-engine-nutrition-file6-stage1orchestrator.js
//
// همه‌ی اعداد انتظار با دست (خارج از کد موتور) محاسبه و با node -e جداگانه
// صحت‌سنجی شده‌اند، دقیقاً هم‌الگوی batch ۲/۳/۴/۵.

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
  const { processStage1, applyMacroOverride, checkMacroFloors, VALID_OVERRIDE_MACROS } = await import(
    "../engine/nutrition/file6_stage1Orchestrator.js"
  );

  const validRawInput = () => ({
    age: 30,
    weight_kg: 80,
    height_cm: 175,
    sex: "male",
    body_fat_percent: 20,
    activity_level: "moderate",
    sport_type: "powerlifting_weightlifting",
    main_goal: "maintenance",
    budget_tier: "medium",
    meals_count_requested: 5,
    pre_workout_meal_index: 2,
    post_workout_meal_index: 3,
    training_time: "18:00",
    training_calories_burned: 300,
    session_intensity: 5,
    time_until_next_session_hours: 24,
    block2_reduction_kcal: 175,
    block3_reduction_kcal: 180,
    carb_cycling_percent: 20,
    allergies: [],
    dietary_restrictions: [],
  });

  console.log("\n[processStage1 — خط لوله‌ی کامل، بدون override]");
  check("weight=80,bfp=20,moderate,powerlifting,maintenance — همه‌ی اعداد دقیق، بدون هشدار", () => {
    // bmr=370+21.6×64=1752.4؛ tdee=1752.4×1.55=2716.22؛ maintenance→target=2716.22
    // powerlifting: protein=1.5×80=120؛ sportFat=1.0×80=80؛ کف پویا=max(40,0.2×2716.22/9=60.36)=60.36<80→fat=80
    // carb=(2716.22-480-720)/4=379.055 → /80=4.738 (داخل بازه‌ی منطقی ۴-۶، بدون هشدار)
    // EA=(2716.22-300)/64=37.7534 → suboptimal → هشدار info
    const result = processStage1({ rawInput: validRawInput() });
    assertClose(result.approved_macros.target_calories, 2716.22, 0.001);
    assertClose(result.approved_macros.protein_grams, 120, 0.001);
    assertClose(result.approved_macros.fat_grams, 80, 0.001);
    assertClose(result.approved_macros.carb_grams, 379.055, 0.001);
    assert(result.approved_macros.meals_count === 5);
    assertClose(result.safety_check.energy_availability_kcal_per_kg_ffm, 37.7534, 0.001);
    assert(result.safety_check.ea_status === "suboptimal");
    assert(result.safety_check.bmr_formula_used === "katch_mcardle");
    assert(result.safety_check.sport_row_used === "POWERLIFTING_WEIGHTLIFTING");
    assert(result.safety_check.ffm_source === "device_bia");
    assert(
      result.safety_check.warnings.length === 1 && result.safety_check.warnings[0].code === "ea_suboptimal",
      `انتظار فقط ea_suboptimal داشتیم، گرفتیم: ${JSON.stringify(result.safety_check.warnings)}`
    );
    assert(result.coach_overrides.is_protein_manually_edited === false);
    assert(result.coach_overrides.is_fat_manually_edited === false);
    assert(result.coach_overrides.is_carb_manually_edited === false);
    assert(result.coach_overrides.diet_budget_tier === "medium");
    assertClose(result.coach_overrides.overridden_warnings.length, 0, 0);
  });

  console.log("\n[processStage1 — با override]");
  check("override پروتئین به ۱۵۰ → کربو جذب می‌کند (چربی دست‌نخورده)", () => {
    // carb=(2716.22-600-720)/4=349.055؛ 150/80=1.875 و 349.055/80=4.363 هر دو بالای کف
    const result = processStage1({
      rawInput: validRawInput(),
      overrides: [{ macro: "protein_g", value: 150 }],
    });
    assertClose(result.approved_macros.protein_grams, 150, 0.001);
    assertClose(result.approved_macros.fat_grams, 80, 0.001, "چربی نباید دست بخورد وقتی پروتئین override می‌شود");
    assertClose(result.approved_macros.carb_grams, 349.055, 0.001);
    assert(result.coach_overrides.is_protein_manually_edited === true);
    assert(
      !result.safety_check.warnings.some((w) => w.code === "protein_below_floor" || w.code === "fat_below_floor" || w.code === "carb_below_floor"),
      `انتظار بدون هشدار کف داشتیم، گرفتیم: ${JSON.stringify(result.safety_check.warnings)}`
    );
  });

  check("override چربی به ۵۰ (زیر کف پویا) → کربو جذب می‌کند + fat_below_floor", () => {
    // کف پویا=60.36>50 → هشدار؛ carb=(2716.22-480-450)/4=446.555
    const result = processStage1({
      rawInput: validRawInput(),
      overrides: [{ macro: "fat_g", value: 50 }],
    });
    assertClose(result.approved_macros.fat_grams, 50, 0.001, "برخلاف override کربو، اینجا مقدار override شده دقیقاً همان می‌ماند (کلامپ نمی‌شود)");
    assertClose(result.approved_macros.carb_grams, 446.555, 0.001);
    assert(
      result.safety_check.warnings.some((w) => w.code === "fat_below_floor" && w.severity === "info"),
      `انتظار fat_below_floor داشتیم، گرفتیم: ${JSON.stringify(result.safety_check.warnings)}`
    );
  });

  check("override کربو به ۵۰۰ (باعث افت چربی زیر کف پویا می‌شود) → چربی کلامپ + override_calories_deviated_from_target", () => {
    // attemptedFatG=(2716.22-480-2000)/9=26.247 <کف(60.36) → fat=60.36 (کلامپ)
    // کالری واقعی=480+543.244+2000=3023.244 → انحراف=307.024
    const result = applyMacroOverride({
      protein_g: 120,
      fat_g: 80,
      carb_g: 379.055,
      target_calories: 2716.22,
      weight_kg: 80,
      overridden_macro: "carb_g",
      new_value: 500,
    });
    assertClose(result.carb_g, 500, 0.001);
    assertClose(result.fat_g, 60.3604, 0.001, "چربی باید کلامپ‌شده روی کف پویا باشد، نه attemptedFatG=26.25");
    assert(result.protein_g === 120, "پروتئین در override کربو دست نمی‌خورد");
    const deviationWarning = result.warnings.find((w) => w.code === "override_calories_deviated_from_target");
    assert(deviationWarning, `انتظار override_calories_deviated_from_target داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
    assertClose(deviationWarning.deviation_kcal, 307.024, 0.01);
    assert(deviationWarning.severity === "caution");
  });

  check("override کربو به ۳۵۰ (چربی هنوز بالای کف) → بدون کلامپ، بدون هشدار انحراف", () => {
    // attemptedFatG=(2716.22-480-1400)/9=92.913 > کف(60.36) → clamp نمی‌زند
    const result = applyMacroOverride({
      protein_g: 120,
      fat_g: 80,
      carb_g: 379.055,
      target_calories: 2716.22,
      weight_kg: 80,
      overridden_macro: "carb_g",
      new_value: 350,
    });
    assertClose(result.fat_g, 92.9133, 0.001);
    assert(
      !result.warnings.some((w) => w.code === "override_calories_deviated_from_target"),
      `انتظار بدون هشدار انحراف داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`
    );
  });

  console.log("\n[applyMacroOverride — اعتبارسنجی]");
  check(`overridden_macro نامعتبر throw می‌کند (مقادیر مجاز: ${VALID_OVERRIDE_MACROS.join("/")})`, () => {
    let threw = false;
    try {
      applyMacroOverride({
        protein_g: 120,
        fat_g: 80,
        carb_g: 379.055,
        target_calories: 2716.22,
        weight_kg: 80,
        overridden_macro: "fiber_g",
        new_value: 10,
      });
    } catch {
      threw = true;
    }
    assert(threw, "انتظار throw داشتیم");
  });

  console.log("\n[checkMacroFloors — مستقیم]");
  check("پروتئین زیر کف ۱.۲ گرم/کیلو → protein_below_floor", () => {
    // 50/80=0.625<1.2
    const warnings = checkMacroFloors({ protein_g: 50, fat_g: 80, carb_g: 379.055, target_calories: 2716.22, weight_kg: 80 });
    assert(warnings.some((w) => w.code === "protein_below_floor" && w.severity === "info"));
  });
  check("همه‌ی ماکروها بالای کف → بدون هشدار", () => {
    const warnings = checkMacroFloors({ protein_g: 120, fat_g: 80, carb_g: 379.055, target_calories: 2716.22, weight_kg: 80 });
    assert(warnings.length === 0, `انتظار بدون هشدار داشتیم، گرفتیم: ${JSON.stringify(warnings)}`);
  });

  console.log(`\n[test-engine-nutrition-file6-stage1orchestrator] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
