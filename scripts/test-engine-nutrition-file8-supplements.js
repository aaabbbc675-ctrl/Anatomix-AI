// اسکریپت تست مستقل (بدون DB) برای فایل ۸ موتور تغذیه — مکمل‌ها.
// اجرا: node scripts/test-engine-nutrition-file8-supplements.js
//
// اعداد انتظار با دست (خارج از کد موتور، با node -e جداگانه) صحت‌سنجی
// شده‌اند: weight=75→caffeine_mg=225,hydration_base_ml=2250؛
// weight=60→caffeine_mg=180,hydration_base_ml=1800؛
// weight=100→caffeine_mg=300,hydration_base_ml=3000. دقیقاً هم‌الگوی
// batch ۲/۳/۴/۵/۶.
//
// weight=75 عیناً همان مثال خودِ سند است («برای فرد ۷۵ کیلویی — ۲.۳-۳ لیتر
// پایه» برای بازه‌ی ۳۰-۴۰ml/kg). با MEV=30ml/kg: 30×75=2250ml=2.25L — سند
// این را به‌طور تقریبی «۲.۳» نوشته (گرد کردن نویسنده‌ی سند، نه اختلاف واقعی).

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
    computeSupplementRecommendations,
    CREATINE_MIN_G,
    CAFFEINE_MIN_MG_PER_KG,
    HYDRATION_MIN_ML_PER_KG,
  } = await import("../engine/nutrition/file8_supplements.js");

  const { PRE_SLEEP_PROTEIN_G } = await import("../engine/nutrition/file5_mealTiming.js");

  console.log("\n[ثابت‌ها — طبق سند، مقدار MEV هر بازه]");
  check("CREATINE_MIN_G = 3 (پایین‌ترین نقطه‌ی بازه‌ی ۳-۵ گرم روزانه)", () => {
    assert(CREATINE_MIN_G === 3);
  });
  check("CAFFEINE_MIN_MG_PER_KG = 3 (پایین‌ترین نقطه‌ی بازه‌ی ۳-۶ میلی‌گرم/کیلو)", () => {
    assert(CAFFEINE_MIN_MG_PER_KG === 3);
  });
  check("HYDRATION_MIN_ML_PER_KG = 30 (پایین‌ترین نقطه‌ی بازه‌ی ۳۰-۴۰ میلی‌لیتر/کیلو)", () => {
    assert(HYDRATION_MIN_ML_PER_KG === 30);
  });

  console.log("\n[computeSupplementRecommendations — weight_kg=75 (مثال خودِ سند)]");
  check("creatine_g=3, caffeine_mg=225, hydration_base_ml=2250, casein_pre_sleep_g=30 (ارجاع به فایل ۵)", () => {
    const result = computeSupplementRecommendations({ weight_kg: 75 });
    assertClose(result.creatine_g, 3, 0.001);
    assertClose(result.caffeine_mg, 225, 0.001);
    assertClose(result.hydration_base_ml, 2250, 0.001);
    assertClose(result.casein_pre_sleep_g, 30, 0.001);
    assert(result.casein_pre_sleep_g === PRE_SLEEP_PROTEIN_G, "casein_pre_sleep_g باید عیناً همان ثابت فایل ۵ باشد، نه عدد جدید");
  });
  check("caffeine_requires_coach_approval=true (سند: «فقط با تایید مربی»)", () => {
    const result = computeSupplementRecommendations({ weight_kg: 75 });
    assert(result.caffeine_requires_coach_approval === true);
  });
  check("multivitamin_note و hydration_sweat_compensation_note رشته‌ی غیرخالی‌اند (یادداشت صرف، بدون عدد ساختگی)", () => {
    const result = computeSupplementRecommendations({ weight_kg: 75 });
    assert(typeof result.multivitamin_note === "string" && result.multivitamin_note.length > 0);
    assert(typeof result.hydration_sweat_compensation_note === "string" && result.hydration_sweat_compensation_note.length > 0);
  });
  check("whey_protein_note رشته‌ی غیرخالی است و عدد گرمی جدیدی (whey_protein_g) در خروجی نیست", () => {
    const result = computeSupplementRecommendations({ weight_kg: 75 });
    assert(typeof result.whey_protein_note === "string" && result.whey_protein_note.length > 0);
    assert(result.whey_protein_g === undefined, "طبق اصل «یک منبع حقیقت»، نباید عدد گرمی جداگانه‌ای برای وی ساخته شود");
  });

  console.log("\n[computeSupplementRecommendations — وابستگی خطی به weight_kg]");
  check("weight_kg=60 → caffeine_mg=180, hydration_base_ml=1800", () => {
    const result = computeSupplementRecommendations({ weight_kg: 60 });
    assertClose(result.caffeine_mg, 180, 0.001);
    assertClose(result.hydration_base_ml, 1800, 0.001);
  });
  check("weight_kg=100 → caffeine_mg=300, hydration_base_ml=3000", () => {
    const result = computeSupplementRecommendations({ weight_kg: 100 });
    assertClose(result.caffeine_mg, 300, 0.001);
    assertClose(result.hydration_base_ml, 3000, 0.001);
  });
  check("creatine_g و casein_pre_sleep_g به weight_kg وابسته نیستند (مقدار مطلق مستند)", () => {
    const r60 = computeSupplementRecommendations({ weight_kg: 60 });
    const r100 = computeSupplementRecommendations({ weight_kg: 100 });
    assert(r60.creatine_g === r100.creatine_g && r60.creatine_g === 3);
    assert(r60.casein_pre_sleep_g === r100.casein_pre_sleep_g && r60.casein_pre_sleep_g === 30);
  });

  console.log(`\n[test-engine-nutrition-file8-supplements] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
