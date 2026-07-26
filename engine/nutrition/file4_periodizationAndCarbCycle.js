// فایل ۴ موتور تغذیه (بخش ۲.۴ سند: دوره‌بندی بلوکی + بخش ۲.۵: چرخه‌ی
// کربوهیدرات + قانون حل تعارض ۵مرحله‌ای). طبق تصمیم صریح تاییدشده (batch ۴):
// این ماژول روی خروجی فایل ۳ (ماکروی رشته‌ای) کار می‌کند، نه روی
// default_macros عمومی فایل ۲ — چون از batch ۳ به بعد آن چیزی است که واقعاً
// به شاگرد نشان داده می‌شود. کف‌ها/گیت EA همچنان از فایل ۲ بازاستفاده
// می‌شوند، نه بازسازی (اصل ۴ سند).

import { computeGenericFatFloorG, computeEnergyAvailability, CARB_FLOOR_G_PER_KG } from "./file2_energyTargets.js";

// طبق بازبینی صریح تاییدشده‌ی batch ۴ (پیدا شد با بررسی مستقل بلوک ۳، نه
// فرضی): در بلوک‌های کاهش‌یافته، وقتی تقریباً کل بار افت میانگین روی
// Low-Day تخلیه می‌شود (چون High-Day معمولاً کربویش دست‌نخورده می‌ماند)،
// فرمول حفظ میانگین می‌تواند lowFatG را زیر highFatG ببرد — دقیقاً برعکسِ
// جهتی که سند ادعا می‌کند (Low-Day باید چربی بیشتر داشته باشد). طبق تصمیم
// صریح: این جهت هرگز نقض نمی‌شود (کلامپ)؛ اگر کلامپ فعال شد، میانگین
// واقعی دیگر دقیقاً با target_calories برابر نیست — این انحراف صادقانه
// گزارش می‌شود (average_calories_deviated_from_target)، نه پنهان یا فقط
// علامت‌گذاری بدون اصلاح.
const MIN_LOW_HIGH_FAT_MARGIN_G = 0.1;

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
  const rawLowFatG = (lowDayCalories - protein_g * 4 - low_carb_g * 4) / 9;

  const warnings = [];
  if (rawLowFatG < 0) {
    warnings.push({ code: "target_calories_unrealistic", severity: "caution", coach_note: null });
  }

  // کلامپ جهت: طبق تصمیم صریح تاییدشده، Low-Day هرگز چربی کمتر یا مساوی
  // High-Day نمی‌گیرد (حداقل فاصله‌ی معنادار). اگر محاسبه‌ی خام این جهت را
  // نقض کند، عدد اصلاح می‌شود و انحراف از میانگین دقیق صادقانه گزارش
  // می‌شود — نه اینکه جهت غلط بی‌سروصدا برگردانده شود.
  let lowFatG = rawLowFatG;
  if (rawLowFatG <= highFatG + MIN_LOW_HIGH_FAT_MARGIN_G) {
    lowFatG = highFatG + MIN_LOW_HIGH_FAT_MARGIN_G;
    // اندازه‌ی انحراف نامحدود است (می‌تواند از چند کالری تا چند صد کالری
    // باشد، بسته به شدت عدم‌تعادل تقسیم روزها) — پس عدد واقعی در خودِ
    // هشدار درج می‌شود، نه فقط یک پرچم صریح بدون بزرگی. severity یکسان
    // (caution) می‌ماند چون سند فقط دو سطح تعریف کرده (بخش ۳.۲)، اختراع
    // سطح سوم درست نیست؛ اما عدد دقیق پنهان نمی‌شود.
    const actualHighDayCalories = protein_g * 4 + high_carb_g * 4 + highFatG * 9;
    const actualLowDayCalories = protein_g * 4 + low_carb_g * 4 + lowFatG * 9;
    const actualAverageCalories = (actualHighDayCalories + actualLowDayCalories) / 2;
    warnings.push({
      code: "average_calories_deviated_from_target",
      severity: "caution",
      coach_note: null,
      deviation_kcal: actualAverageCalories - target_calories,
    });
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
