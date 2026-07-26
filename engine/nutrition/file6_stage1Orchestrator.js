// فایل ۶ موتور تغذیه — زیرکامیت ۶-الف (بخش ۳.۱ سند: ایستگاه اول Pre-Generation).
// اولین جایی که file1→file2→file3 واقعاً زنجیر می‌شوند؛ تا این‌جا هرکدام
// مستقل و با ورودی دستی تست شده بودند. خروجی دقیقاً schema بخش ۳.۳ سند
// (approved_macros/safety_check/coach_overrides) را می‌سازد.
//
// دامنه‌ی عمدی این فایل: فقط اعداد «تخت» (کالری هدف + یک ماکروی روزانه)،
// نه دوره‌بندی بلوکی (فایل ۴) و نه زمان‌بندی وعده (فایل ۵) — چون نمونه‌ی
// JSON بخش ۳.۳ سند هم دقیقاً همین شکل تخت را دارد (بدون blocks، بدون
// high_day/low_day، بدون meals[]). فایل ۴/۵ در Stage ۲ (زیرکامیت ۶-د)
// روی همین approved_macros اجرا می‌شوند، نه اینجا.

import { processIntakeInputs } from "./file1_intakeInputs.js";
import {
  processEnergyTargets,
  computeEnergyAvailability,
  computeGenericFatFloorG,
  PROTEIN_FLOOR_G_PER_KG,
  CARB_FLOOR_G_PER_KG,
} from "./file2_energyTargets.js";
import { computeSportMacros } from "./file3_macroMatrix.js";

const VALID_OVERRIDE_MACROS = ["protein_g", "fat_g", "carb_g"];

// طبق بخش ۱.۲ سند: «اگر مربی دستی مقداری را زیر این کف‌ها ببرد، سیستم اجازه
// می‌دهد و ذخیره می‌کند — فقط یک هشدار». این چک روی اعداد نهایی (بعد از هر
// override) اجرا می‌شود، نه فقط خروجی خام فایل ۳ — چون خودِ override می‌تواند
// عددی را زیر کف ببرد که قبلش بالای کف بود.
function checkMacroFloors({ protein_g, fat_g, carb_g, target_calories, weight_kg }) {
  const warnings = [];
  if (protein_g / weight_kg < PROTEIN_FLOOR_G_PER_KG) {
    warnings.push({ code: "protein_below_floor", severity: "info", coach_note: null });
  }
  if (fat_g < computeGenericFatFloorG({ target_calories, weight_kg })) {
    warnings.push({ code: "fat_below_floor", severity: "info", coach_note: null });
  }
  if (carb_g / weight_kg < CARB_FLOOR_G_PER_KG) {
    // هم‌نام با کد فایل ۲ (computeDefaultMacroFloors) — بازاستفاده، نه بازسازی.
    warnings.push({ code: "carb_below_floor", severity: "info", coach_note: null });
  }
  return warnings;
}

// طبق بخش ۳.۱ سند: «با تغییر دستی هر ماکرو، سیستم بلافاصله بقیه را
// بازمحاسبه می‌کند تا کل کالری ثابت بماند». طبق تصمیم صریح تاییدشده (batch ۶):
// کربوهیدرات همیشه ماکروی باقی‌مانده است (همان الگوی بدون‌استثنای فایل‌های
// ۲/۳/۴)؛ فقط وقتی خودِ کربو دستی عوض شود، چربی با همان کف پویای فایل ۲
// جذب می‌کند — دقیقاً همان الگوی «تلاش در برابر کف پویا، بیشترین برنده است»
// که در computeBlockReduction فایل ۴ استفاده شده.
function applyMacroOverride({ protein_g, fat_g, carb_g, target_calories, weight_kg, overridden_macro, new_value }) {
  if (!VALID_OVERRIDE_MACROS.includes(overridden_macro)) {
    throw new Error(`overridden_macro نامعتبر: "${overridden_macro}". مقادیر مجاز: ${VALID_OVERRIDE_MACROS.join(", ")}`);
  }

  const warnings = [];
  let newProteinG = protein_g;
  let newFatG = fat_g;
  let newCarbG = carb_g;

  if (overridden_macro === "protein_g") {
    newProteinG = new_value;
    newCarbG = (target_calories - newProteinG * 4 - newFatG * 9) / 4;
  } else if (overridden_macro === "fat_g") {
    newFatG = new_value;
    newCarbG = (target_calories - newProteinG * 4 - newFatG * 9) / 4;
  } else {
    newCarbG = new_value;
    const attemptedFatG = (target_calories - newProteinG * 4 - newCarbG * 4) / 9;
    const genericFatFloorG = computeGenericFatFloorG({ target_calories, weight_kg });
    newFatG = Math.max(genericFatFloorG, attemptedFatG);
    if (attemptedFatG < genericFatFloorG) {
      // کف چربی هرگز نقض نمی‌شود؛ اگر این باعث شود کالری واقعی از هدف فاصله
      // بگیرد، صادقانه گزارش می‌شود — هم‌الگوی average_calories_deviated_from_target
      // در فایل ۴، نه پنهان‌کاری.
      const actualCalories = newProteinG * 4 + newFatG * 9 + newCarbG * 4;
      warnings.push({
        code: "override_calories_deviated_from_target",
        severity: "caution",
        coach_note: null,
        deviation_kcal: actualCalories - target_calories,
      });
    }
  }

  if (newCarbG < 0) {
    // هم‌نام با کد فایل‌های ۲/۳/۴ — بازاستفاده، نه بازسازی.
    warnings.push({ code: "target_calories_unrealistic", severity: "caution", coach_note: null });
  }

  warnings.push(...checkMacroFloors({ protein_g: newProteinG, fat_g: newFatG, carb_g: newCarbG, target_calories, weight_kg }));

  return { protein_g: newProteinG, fat_g: newFatG, carb_g: newCarbG, warnings };
}

function processStage1({ rawInput, overrides = [], student_id = null }) {
  const intake = processIntakeInputs(rawInput);
  const energyTargets = processEnergyTargets(intake);
  const sportMacros = computeSportMacros({
    sport_type: intake.sport_type,
    main_goal: intake.main_goal,
    weight_kg: intake.weight_kg,
    target_calories: energyTargets.target_calories,
  });

  let macros = { protein_g: sportMacros.protein_g, fat_g: sportMacros.fat_g, carb_g: sportMacros.carb_g };
  const overrideWarnings = [];
  for (const override of overrides) {
    const result = applyMacroOverride({
      ...macros,
      target_calories: energyTargets.target_calories,
      weight_kg: intake.weight_kg,
      overridden_macro: override.macro,
      new_value: override.value,
    });
    macros = { protein_g: result.protein_g, fat_g: result.fat_g, carb_g: result.carb_g };
    overrideWarnings.push(...result.warnings);
  }
  // اگر هیچ override نبود، کف‌ها را روی خروجی خام فایل ۳ هم چک می‌کنیم — هرچند
  // فایل ۳ خودش MEV پروتئین/کف چربی را همیشه رعایت می‌کند (batch ۳)، این چک
  // مستقل و صریح می‌ماند، نه فرض بی‌آزمون.
  if (overrides.length === 0) {
    overrideWarnings.push(
      ...checkMacroFloors({ ...macros, target_calories: energyTargets.target_calories, weight_kg: intake.weight_kg })
    );
  }

  // طبق بخش ۳.۱ سند: «گیت EA دوباره چک می‌شود». override فقط تقسیم ماکرو را
  // عوض می‌کند، نه target_calories — پس عدد EA واقعاً تغییر نمی‌کند، اما
  // خودِ چک به‌طور صریح دوباره اجرا می‌شود (نه از کش فایل ۲ خوانده شود)، تا
  // منطق «recheck» سند به معنای واقعی کلمه رعایت شود.
  const eaResult = computeEnergyAvailability({
    target_calories: energyTargets.target_calories,
    training_calories_burned: intake.training_calories_burned,
    ffm_kg: energyTargets.ffm_kg,
  });

  return {
    user_id: student_id,
    approved_macros: {
      target_calories: energyTargets.target_calories,
      protein_grams: macros.protein_g,
      carb_grams: macros.carb_g,
      fat_grams: macros.fat_g,
      meals_count: intake.meals_count_requested,
    },
    safety_check: {
      energy_availability_kcal_per_kg_ffm: eaResult.ea_kcal_per_kg_ffm,
      ea_status: eaResult.ea_status,
      ffm_source: intake.body_fat_percent !== null ? "device_bia" : null,
      bmr_formula_used: energyTargets.bmr_formula_used,
      sport_row_used: sportMacros.sport_row_used,
      warnings: [...eaResult.warnings, ...sportMacros.warnings, ...overrideWarnings],
    },
    coach_overrides: {
      is_protein_manually_edited: overrides.some((o) => o.macro === "protein_g"),
      is_fat_manually_edited: overrides.some((o) => o.macro === "fat_g"),
      is_carb_manually_edited: overrides.some((o) => o.macro === "carb_g"),
      diet_budget_tier: intake.budget_tier,
      // پرکردن واقعی این آرایه (کدام هشدار را مربی آگاهانه رد کرده) یک کنش
      // تعاملی UI است، نه چیزی که این تابع خالص تصمیم بگیرد — خارج از دامنه‌ی
      // ۶-الف، احتمالاً بخشی از ۶-د.
      overridden_warnings: [],
    },
  };
}

export { processStage1, applyMacroOverride, checkMacroFloors, VALID_OVERRIDE_MACROS };
