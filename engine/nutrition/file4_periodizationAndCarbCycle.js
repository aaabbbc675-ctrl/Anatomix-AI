// فایل ۴ موتور تغذیه (بخش ۲.۴ سند: دوره‌بندی بلوکی + بخش ۲.۵: چرخه‌ی
// کربوهیدرات + قانون حل تعارض ۵مرحله‌ای). طبق تصمیم صریح تاییدشده (batch ۴):
// این ماژول روی خروجی فایل ۳ (ماکروی رشته‌ای) کار می‌کند، نه روی
// default_macros عمومی فایل ۲ — چون از batch ۳ به بعد آن چیزی است که واقعاً
// به شاگرد نشان داده می‌شود. کف‌ها/گیت EA همچنان از فایل ۲ بازاستفاده
// می‌شوند، نه بازسازی (اصل ۴ سند).

import { computeGenericFatFloorG, computeEnergyAvailability, CARB_FLOOR_G_PER_KG } from "./file2_energyTargets.js";

// --- لایه‌ی ۱: دوره‌بندی بلوکی (بخش ۲.۴) ---
//
// خوانش من از «چربی فقط تا کف ۲۰٪ کالری — پس از رسیدن به کف چربی، کاهش فقط
// از کربوهیدرات»: ترتیب صریح است — اول کل کاهش از چربی گرفته می‌شود؛ اگر
// چربی به کف دینامیک (که با کالری هر بلوک دوباره محاسبه می‌شود) برسد،
// باقی‌مانده از کربوهیدرات کم می‌شود. پروتئین (خروجی فایل ۳) هرگز دست
// نمی‌خورد.
function computeBlockReduction({ prevProtein_g, prevFat_g, prevTarget_calories, reduction_kcal, weight_kg }) {
  const newTargetCalories = prevTarget_calories - reduction_kcal;
  const dynamicFatFloorG = computeGenericFatFloorG({ target_calories: newTargetCalories, weight_kg });
  const attemptedFatG = prevFat_g - reduction_kcal / 9;
  const newFatG = Math.max(dynamicFatFloorG, attemptedFatG);
  const carbG = (newTargetCalories - prevProtein_g * 4 - newFatG * 9) / 4;

  const warnings = [];
  if (carbG < 0) {
    // همان کد فایل ۲/۳ — بازاستفاده، نه بازسازی.
    warnings.push({ code: "target_calories_unrealistic", severity: "caution", coach_note: null });
  }

  return { target_calories: newTargetCalories, protein_g: prevProtein_g, fat_g: newFatG, carb_g: carbG, warnings };
}

// طبق بخش ۲.۴ سند: «اگر کاهش باعث افت EA زیر ۳۰ شد، کاهش همچنان اعلام
// می‌شود (اصل ۱.۴: هرگز قفل نمی‌شود) اما هشدار قرمز درج می‌شود». برای
// suboptimal/optimal/not_calculable همان هشدارهای عمومی فایل ۲ بازاستفاده
// می‌شوند؛ فقط برای low یک کد اختصاصی جایگزین ea_low عمومی می‌شود تا معلوم
// باشد این افت مشخصاً ناشی از همین کاهش بلوکی است، نه صرفاً یک هشدار عمومی
// EA بدون بافت.
function blockEaWarnings(eaResult) {
  if (eaResult.ea_status === "low") {
    return [{ code: "block_reduction_dropped_ea", severity: "caution", coach_note: null }];
  }
  return eaResult.warnings;
}

// --- لایه‌ی ۲: تقسیم High-Day/Low-Day (بخش ۲.۵) ---

// بلوک ۱ (بدون کاهش) — طبق تصمیم صریح تاییدشده: پارامتر درصدی مربی/شاگرد.
function computeBaselineHighLowCarbSplit({ carb_g, carb_cycling_percent }) {
  return {
    high_carb_g: carb_g * (1 + carb_cycling_percent / 100),
    low_carb_g: carb_g * (1 - carb_cycling_percent / 100),
  };
}

// بلوک ۲/۳ (با کاهش) — طبق الگوریتم دقیق خودِ سند: اولویت جذب با Low-Day
// تا کف عملکردی (بخش ۱.۲، بازاستفاده از CARB_FLOOR_G_PER_KG)، سپس باقی‌مانده.
//
// تصمیم تفسیری من درباره‌ی «باقی‌مانده به‌طور مساوی بین هردوی روزها پخش
// می‌شود» (گام ۴): این نمی‌تواند به‌معنای واقعیِ ۵۰/۵۰ باشد، چون گام ۵ خودِ
// همین قانون می‌گوید «کف‌های بخش ۱.۲ در هیچ مرحله نقض نمی‌شوند» — و کف
// کربوهیدرات بخش ۱.۲ دقیقاً همان کف عملکردی Low-Day است. اگر باقی‌مانده را
// واقعاً مساوی پخش کنیم، Low-Day زیر کفش می‌رود و گام ۵ نقض می‌شود. پس تنها
// خوانش سازگار با گام ۵: وقتی Low-Day به کف رسید، تمام باقی‌مانده از
// High-Day کم می‌شود (نه اینکه بین هر دو پخش شود).
function computeReducedHighLowCarbSplit({ prev_high_carb_g, prev_low_carb_g, carb_reduction_g, weight_kg }) {
  const lowFloorG = CARB_FLOOR_G_PER_KG * weight_kg;
  const lowAbsorbableG = Math.max(0, prev_low_carb_g - lowFloorG);

  if (carb_reduction_g <= lowAbsorbableG) {
    return { high_carb_g: prev_high_carb_g, low_carb_g: prev_low_carb_g - carb_reduction_g };
  }
  const remainingReductionG = carb_reduction_g - lowAbsorbableG;
  return { high_carb_g: prev_high_carb_g - remainingReductionG, low_carb_g: lowFloorG };
}

// مشترک بین بلوک ۱ و بلوک‌های ۲/۳: با داشتن تقسیم کربوهیدرات (از هر کدام
// از دو تابع بالا)، چربی هر روز از «حداقل استاندارد» (=کف پویا، برای
// High-Day) + قید حفظ میانگین دوروزه (گام ۱ قانون حل تعارض: «کاهش روی
// میانگین هفتگی اعلام می‌شود») مشتق می‌شود — بدون اختراع پارامتر جدید.
function deriveHighLowFatFromCarbSplit({ protein_g, high_carb_g, low_carb_g, target_calories, weight_kg }) {
  const highFatG = computeGenericFatFloorG({ target_calories, weight_kg });
  const highDayCalories = protein_g * 4 + high_carb_g * 4 + highFatG * 9;
  const lowDayCalories = 2 * target_calories - highDayCalories;
  const lowFatG = (lowDayCalories - protein_g * 4 - low_carb_g * 4) / 9;

  const warnings = [];
  if (lowFatG < 0) {
    warnings.push({ code: "target_calories_unrealistic", severity: "caution", coach_note: null });
  } else if (lowFatG <= highFatG) {
    // طبق تایید صریح: کد جدید — فرض جهت سند (Low-Day چربی بیشتر) اینجا
    // صریحاً تست می‌شود، نه فرض گرفته می‌شود.
    warnings.push({ code: "low_day_fat_below_high_day", severity: "caution", coach_note: null });
  }

  return { high_fat_g: highFatG, low_fat_g: lowFatG, warnings };
}

function buildBlock({ blockNumber, flat, eaResult, carbSplit, weight_kg, eaWarnings }) {
  const fatSplit = deriveHighLowFatFromCarbSplit({
    protein_g: flat.protein_g,
    high_carb_g: carbSplit.high_carb_g,
    low_carb_g: carbSplit.low_carb_g,
    target_calories: flat.target_calories,
    weight_kg,
  });

  return {
    block: blockNumber,
    target_calories: flat.target_calories,
    protein_g: flat.protein_g,
    fat_g: flat.fat_g,
    carb_g: flat.carb_g,
    ea_status: eaResult.ea_status,
    energy_availability_kcal_per_kg_ffm: eaResult.ea_kcal_per_kg_ffm,
    warnings: [...flat.warnings, ...eaWarnings],
    high_day: { protein_g: flat.protein_g, carb_g: carbSplit.high_carb_g, fat_g: fatSplit.high_fat_g },
    low_day: { protein_g: flat.protein_g, carb_g: carbSplit.low_carb_g, fat_g: fatSplit.low_fat_g },
    day_warnings: fatSplit.warnings,
  };
}

function processPeriodizationAndCarbCycle({
  weight_kg,
  training_calories_burned,
  ffm_kg,
  target_calories,
  protein_g,
  fat_g,
  carb_g,
  block2_reduction_kcal,
  block3_reduction_kcal,
  carb_cycling_percent,
}) {
  // بلوک ۱ — بدون کاهش، مستقیماً خروجی فایل ۳.
  const block1Ea = computeEnergyAvailability({ target_calories, training_calories_burned, ffm_kg });
  const block1CarbSplit = computeBaselineHighLowCarbSplit({ carb_g, carb_cycling_percent });
  const block1 = buildBlock({
    blockNumber: 1,
    flat: { target_calories, protein_g, fat_g, carb_g, warnings: [] },
    eaResult: block1Ea,
    carbSplit: block1CarbSplit,
    weight_kg,
    eaWarnings: block1Ea.warnings,
  });

  // بلوک ۲ — کاهش روی بلوک ۱.
  const block2Flat = computeBlockReduction({
    prevProtein_g: protein_g,
    prevFat_g: fat_g,
    prevTarget_calories: target_calories,
    reduction_kcal: block2_reduction_kcal,
    weight_kg,
  });
  const block2Ea = computeEnergyAvailability({
    target_calories: block2Flat.target_calories,
    training_calories_burned,
    ffm_kg,
  });
  const block2CarbSplit = computeReducedHighLowCarbSplit({
    prev_high_carb_g: block1CarbSplit.high_carb_g,
    prev_low_carb_g: block1CarbSplit.low_carb_g,
    carb_reduction_g: carb_g - block2Flat.carb_g,
    weight_kg,
  });
  const block2 = buildBlock({
    blockNumber: 2,
    flat: block2Flat,
    eaResult: block2Ea,
    carbSplit: block2CarbSplit,
    weight_kg,
    eaWarnings: blockEaWarnings(block2Ea),
  });

  // بلوک ۳ — کاهش روی بلوک ۲.
  const block3Flat = computeBlockReduction({
    prevProtein_g: block2Flat.protein_g,
    prevFat_g: block2Flat.fat_g,
    prevTarget_calories: block2Flat.target_calories,
    reduction_kcal: block3_reduction_kcal,
    weight_kg,
  });
  const block3Ea = computeEnergyAvailability({
    target_calories: block3Flat.target_calories,
    training_calories_burned,
    ffm_kg,
  });
  const block3CarbSplit = computeReducedHighLowCarbSplit({
    prev_high_carb_g: block2CarbSplit.high_carb_g,
    prev_low_carb_g: block2CarbSplit.low_carb_g,
    carb_reduction_g: block2Flat.carb_g - block3Flat.carb_g,
    weight_kg,
  });
  const block3 = buildBlock({
    blockNumber: 3,
    flat: block3Flat,
    eaResult: block3Ea,
    carbSplit: block3CarbSplit,
    weight_kg,
    eaWarnings: blockEaWarnings(block3Ea),
  });

  return { blocks: [block1, block2, block3] };
}

export {
  processPeriodizationAndCarbCycle,
  computeBlockReduction,
  blockEaWarnings,
  computeBaselineHighLowCarbSplit,
  computeReducedHighLowCarbSplit,
  deriveHighLowFatFromCarbSplit,
};
