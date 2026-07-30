// فایل ۶ موتور استعدادیابی (بخش ۷ سند معماری): تنظیم امتیاز بر اساس
// کوتاهی عضلانی (ROM deficits) و Hypermobility.
//
// ⚠️ درباره‌ی سطح احتیاط این فایل (تصمیم تاییدشده‌ی Commit 7): برخلاف
// file5 (postural)، ROM هیچ‌جای بخش ۰.۳ سند به‌عنوان یکی از ۷ اصل
// قفل‌شده نیامده — یعنی این فایل یک اصل معماری مجزای مستندشده ندارد.
// دلیل اینکه همان سطح احتیاط (دو لایه‌ی دفاعی) اینجا هم پیاده شده، **نه**
// ادعای یک اصل قفل‌شده‌ی جدید است، بلکه یکسان بودن شکل کد با file5: هیچ‌کدام
// از file4/file5/file6 مکانیزمی برای حذف یک رشته از خروجی ندارند (فقط
// file10 در Commit 10 این قدرت را دارد) — پس ریسک واقعی، مثل file5،
// معرفی‌شدن یک عدد خراب یا یک is_correctable اشتباه در آینده است، نه
// نقض یک اصل رسمی سند.
//
// severityMultiplier مستقیماً از file5 (Commit 6) بازاستفاده شده: سند در
// بخش ۷.۳ فرمول مقیاس‌بندی جداگانه‌ای برای ROM نداده، اما severity دستگاه
// برای ROM هم دقیقاً ۳ سطح است (mild_short/moderate_short/severe_short) —
// طبق تصمیم تاییدشده، بازاستفاده از قرارداد موجود بهتر از حدس زدن عدد
// جدید است.
//
// typical_correction_time_weeks و suggested_corrective_module_id طبق
// تصمیم تاییدشده کاملاً از schema این فایل حذف شده‌اند (نه null) — سند
// هیچ جدول مشابه postureCorrectionTime برای ROM نداده.

import { romSportImpactMap, hypermobilityImpact } from "./shared/romSportImpactMap.js";
import { severityMultiplier } from "./file5_posturalAdvisoryLayer.js";
import { TalentIdError } from "./shared/talentIdErrors.js";

// طبق بخش ۷.۲ سند: severity دستگاه به‌صورت رشته می‌آید، نه عدد ۰-۳ مثل
// postural. 'normal' یعنی هیچ کوتاهی‌ای نیست (مثل severity=0 در file5).
const ROM_SEVERITY_TO_LEVEL = {
  mild_short: 1,
  moderate_short: 2,
  severe_short: 3,
};

function _assertNeverVeto(adjustment, context) {
  // ⚠️ REGRESSION GUARD (لایه‌ی ۱) — این چک را حذف نکنید.
  if (adjustment.is_correctable !== true) {
    throw new TalentIdError(
      "ROM_VETO_VIOLATION",
      "اصل «هرگز veto» نقض شد: is_correctable باید همیشه true باشد.",
      context
    );
  }
  if (!Number.isFinite(adjustment.applied_penalty)) {
    throw new TalentIdError(
      "ROM_VETO_VIOLATION",
      "اصل «هرگز veto» نقض شد: applied_penalty باید همیشه یک عدد محدود باشد.",
      context
    );
  }
}

function _makeRomAdjustment({ deficitType, severityLevel, appliedPenalty, reason }) {
  const adjustment = {
    driver_id: `rom.${deficitType}`,
    deficit_type: deficitType,
    severity_level: severityLevel,
    applied_penalty: appliedPenalty,
    biomechanical_reason: reason,
    is_correctable: true,
    // طبق بخش ۷.۱ سند: کوتاهی عضلانی trainable است (با کشش قابل تغییر).
    trainability: "trainable",
  };
  _assertNeverVeto(adjustment, { deficitType, severityLevel });
  return adjustment;
}

function _makeHypermobilityAdjustment({ appliedMagnitude, reason }) {
  const adjustment = {
    driver_id: "rom.hypermobility",
    deficit_type: "hypermobility",
    applied_penalty: appliedMagnitude,
    biomechanical_reason: reason,
    is_correctable: true,
    // طبق بخش ۷.۱ سند: Hypermobility partial است (تا حدی ژنتیک).
    trainability: "partial",
  };
  _assertNeverVeto(adjustment, { deficitType: "hypermobility" });
  return adjustment;
}

// طبق بخش ۷.۳ سند: برای هر deficit با severity غیر 'normal'، روی رشته‌های
// موجود در romSportImpactMap تنظیم اعمال می‌شود؛ سپس اگر hypermobility
// تشخیص داده شده، بونوس/جریمه‌ی ثابت hypermobilityImpact اعمال می‌شود.
function computeRomAdjustments(rom, hypermobilityDetected, sportRequirementMatrix) {
  const adjustmentsBySport = {};

  for (const [deficitType, severityString] of Object.entries(rom ?? {})) {
    if (!severityString || severityString === "normal") continue;

    const severityLevel = ROM_SEVERITY_TO_LEVEL[severityString];
    if (severityLevel === undefined) continue; // مقدار severity ناشناخته — رد می‌شود، نه حدس زده می‌شود

    const impactMap = romSportImpactMap[deficitType];
    if (!impactMap) continue;

    for (const sportId of Object.keys(sportRequirementMatrix)) {
      const impact = impactMap[sportId];
      if (!impact) continue;

      const scaledPenalty = impact.penalty * severityMultiplier(severityLevel);
      const adjustment = _makeRomAdjustment({
        deficitType,
        severityLevel,
        appliedPenalty: scaledPenalty,
        reason: impact.reason,
      });

      if (!adjustmentsBySport[sportId]) adjustmentsBySport[sportId] = [];
      adjustmentsBySport[sportId].push(adjustment);
    }
  }

  if (hypermobilityDetected) {
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      if (hypermobilityImpact.positive.includes(sportId)) {
        const adjustment = _makeHypermobilityAdjustment({
          appliedMagnitude: hypermobilityImpact.positive_bonus,
          reason: hypermobilityImpact.reason_positive,
        });
        if (!adjustmentsBySport[sportId]) adjustmentsBySport[sportId] = [];
        adjustmentsBySport[sportId].push(adjustment);
      }
      if (hypermobilityImpact.negative.includes(sportId)) {
        const adjustment = _makeHypermobilityAdjustment({
          appliedMagnitude: hypermobilityImpact.negative_penalty,
          reason: hypermobilityImpact.reason_negative,
        });
        if (!adjustmentsBySport[sportId]) adjustmentsBySport[sportId] = [];
        adjustmentsBySport[sportId].push(adjustment);
      }
    }
  }

  return { adjustments_by_sport: adjustmentsBySport };
}

export { computeRomAdjustments, ROM_SEVERITY_TO_LEVEL, _makeRomAdjustment, _makeHypermobilityAdjustment };
