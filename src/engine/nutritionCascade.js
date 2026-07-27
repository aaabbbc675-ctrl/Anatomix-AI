// پل بین renderer (ESM/React) و موتور تغذیه — هم‌الگوی نام‌گذاری
// src/engine/correctiveCascade.js و src/engine/bodybuildingCascade.js.
//
// برخلاف آن دو (که چند فایل موتور را دستی داخل خودشان ترکیب می‌کنند، چون
// هیچ فایل دیگری از قبل این ترکیب را نساخته بود)، اینجا
// engine/nutrition/file6_stage1Orchestrator.js از قبل دقیقاً همین نقش را
// دارد: processStage1 خودش مستقیماً زنجیر می‌کند:
//   processIntakeInputs (فایل۱)
//   → processEnergyTargets (فایل۲ — که خودش computeBmr/computeTdee/
//     computeTargetCalories/computeEnergyAvailability/computeDefaultMacroFloors
//     را صدا می‌زند)
//   → computeSportMacros (فایل۳)
// پس این پل چیزی بازسازی نمی‌کند، فقط دوباره صادر می‌کند — طبق تصمیم صریح
// تاییدشده در تحلیل ۶-د، فقط برای هم‌نامی با دو پل دیگر.
export { processStage1, applyMacroOverride } from "../../engine/nutrition/file6_stage1Orchestrator.js";
