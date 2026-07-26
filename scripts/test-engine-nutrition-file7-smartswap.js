// اسکریپت تست مستقل (بدون DB) برای منطق خالص فایل ۷ موتور تغذیه — Smart Swap.
// اجرا: node scripts/test-engine-nutrition-file7-smartswap.js
//
// همه‌ی اعداد انتظار با دست (خارج از کد موتور) محاسبه و با node -e جداگانه
// صحت‌سنجی شده‌اند، دقیقاً هم‌الگوی batch ۲/۳/۴/۵/۶.
//
// تست جدای getSameGroupCandidates (تابع وابسته به DB) در
// scripts/test-db-nutrition-smartswap.js است — آن یکی نیاز به
// ELECTRON_RUN_AS_NODE=1 electron دارد (هم‌الگوی test-db-nutrition-foods.js
// در batch ۱)، این یکی نه.

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
  const { computeSameGroupSwap, computeCrossGroupAnchorSwap, computeFoodSwap, CROSS_GROUP_DEVIATION_THRESHOLD_PERCENT } =
    await import("../engine/nutrition/file7_smartSwap.js");

  // اعداد واقعی از engine/nutrition/data/foods.seed.js (batch ۱) — نه ساختگی.
  const RICE = { id: "RICE-WHITE-COOKED", exchange_group: "starch", exchange_serving_grams: 54 };
  const POTATO = { id: "POTATO-BOILED", exchange_group: "starch", exchange_serving_grams: 75 };
  const EGG = {
    id: "EGG-WHOLE-BOILED",
    name_fa: "تخم‌مرغ آب‌پز",
    exchange_group: "medium_high_fat_meat",
    primary_macro: "protein",
    protein_g: 13,
    carbs_g: 1.1,
    fat_g: 11,
    calories: 155,
  };
  const COTTAGE = {
    id: "COTTAGE-CHEESE-LOWFAT",
    name_fa: "پنیر کوتاژ کم‌چرب",
    exchange_group: "lean_meat",
    protein_g: 12.4,
    carbs_g: 2.7,
    fat_g: 1,
    calories: 72,
  };
  const APPLE_NO_PROTEIN = { id: "FAKE-ZERO-PROTEIN", name_fa: "میوه‌ی فرضی بدون پروتئین", protein_g: 0, carbs_g: 20, fat_g: 0, calories: 80 };

  console.log("\n[ثابت — طبق سند]");
  check("آستانه‌ی انحراف کالری بین‌گروهی دقیقاً ۱۰٪ (مستند سند، نه UX محض)", () => {
    assert(CROSS_GROUP_DEVIATION_THRESHOLD_PERCENT === 10);
  });

  console.log("\n[computeSameGroupSwap — مسیر هم‌گروهی، بدون هشدار]");
  check("RICE(exchange_serving=54) → POTATO(exchange_serving=75), old_weight=108 → new_weight=150", () => {
    const result = computeSameGroupSwap({ old_food: RICE, new_food: POTATO, old_weight_g: 108 });
    assertClose(result.units, 2, 0.001);
    assertClose(result.new_weight_g, 150, 0.001);
  });

  console.log("\n[computeCrossGroupAnchorSwap — مسیر بین‌گروهی]");
  check("EGG(protein anchor)→COTTAGE, weight=50, meal_calories=500 → زیر آستانه، فقط هشدار info", () => {
    // oldAnchor=50/100×13=6.5؛ newWeight=6.5/(12.4/100)=52.4194
    // oldCal=77.5، newCal=37.742، delta=-39.758 → |delta|=39.758 < 10%×500=50 (زیر آستانه)
    const result = computeCrossGroupAnchorSwap({
      old_food: EGG,
      new_food: COTTAGE,
      old_weight_g: 50,
      meal_calories: 500,
    });
    assertClose(result.new_weight_g, 52.4194, 0.001);
    assertClose(result.delta_calories, -39.758, 0.01);
    assertClose(result.delta_protein_g, 0, 0.001, "دلتای ماکروی لنگر باید تقریباً صفر باشد");
    assertClose(result.delta_carb_g, 0.8653, 0.001);
    assertClose(result.delta_fat_g, -4.9758, 0.001);
    assert(result.warnings.length === 1, `انتظار فقط ۱ هشدار (info) داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
    assert(result.warnings[0].code === "cross_group_swap_not_guaranteed");
    assert(result.warnings[0].severity === "info");
  });

  check("همان دو غذا، meal_calories=300 → بالای آستانه، هشدار caution هم اضافه می‌شود", () => {
    // |delta|=39.758 > 10%×300=30 → cross_group_swap_large_calorie_deviation
    const result = computeCrossGroupAnchorSwap({
      old_food: EGG,
      new_food: COTTAGE,
      old_weight_g: 50,
      meal_calories: 300,
    });
    assert(result.warnings.length === 2, `انتظار ۲ هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
    assert(result.warnings.some((w) => w.code === "cross_group_swap_not_guaranteed" && w.severity === "info"));
    const deviationWarning = result.warnings.find((w) => w.code === "cross_group_swap_large_calorie_deviation");
    assert(deviationWarning, "انتظار cross_group_swap_large_calorie_deviation داشتیم");
    assert(deviationWarning.severity === "caution");
    assertClose(deviationWarning.deviation_kcal, -39.758, 0.01);
  });

  check("غذای جدید مقدار صفر از ماکروی لنگر دارد → throw صریح (نه تقسیم بر صفر خاموش)", () => {
    let threw = false;
    try {
      computeCrossGroupAnchorSwap({ old_food: EGG, new_food: APPLE_NO_PROTEIN, old_weight_g: 50, meal_calories: 500 });
    } catch (err) {
      threw = true;
      assert(err.message.includes("نمی‌تواند لنگر جایگزینی باشد"), `پیام خطای نامنتظره: ${err.message}`);
    }
    assert(threw, "انتظار throw داشتیم");
  });

  console.log("\n[computeFoodSwap — مسیریابی خودکار بر اساس exchange_group]");
  check("هر دو غذا هم‌گروه (starch) → path=same_group، بدون هشدار", () => {
    const result = computeFoodSwap({ old_food: RICE, new_food: POTATO, old_weight_g: 108, meal_calories: 500 });
    assert(result.path === "same_group");
    assertClose(result.new_weight_g, 150, 0.001);
    assert(result.warnings.length === 0);
  });
  check("دو غذا گروه متفاوت (medium_high_fat_meat vs lean_meat) → path=cross_group، با هشدار info", () => {
    const result = computeFoodSwap({ old_food: EGG, new_food: COTTAGE, old_weight_g: 50, meal_calories: 500 });
    assert(result.path === "cross_group");
    assertClose(result.new_weight_g, 52.4194, 0.001);
    assert(result.warnings.some((w) => w.code === "cross_group_swap_not_guaranteed"));
  });

  console.log(`\n[test-engine-nutrition-file7-smartswap] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
