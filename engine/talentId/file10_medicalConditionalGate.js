// فایل ۱۰ موتور استعدادیابی (بخش ۱۱ سند معماری): گیت پزشکی مشروط.
//
// ⚠️ اصل معماری غیرقابل‌مذاکره‌ی دوم (بخش ۰.۳ اصل ۲ + بخش ۱۱.۱ سند):
// پاتولوژی پزشکی فعال = Conditional Exclusion، نه Absolute Veto. آسیب حاد
// فعال رشته را به کلاس خاکستری M می‌برد، نه حذف دائم.
//
// برخلاف file5/file6 (Commit 6/7) که «هرگز حذف نشو» بود، اینجا invariant
// دقیق‌تر است (تصمیم تاییدشده‌ی Commit 10): هر رشته‌ای که وارد می‌شود،
// باید دقیقاً یک‌بار در خروجی ظاهر شود — یا status='clear' یا
// status='medical_hold' یا status='clearance_obtained' — هرگز غایب،
// هرگز دو وضعیت هم‌زمان. این با دو لایه‌ی دفاعی محافظت می‌شود: ۱) runtime
// invariant در انتهای calculateMedicalHolds، ۲) regression guard در
// scripts/test-engine-talentid-file10-medical.js روی کل activePathologyMap.

import { activePathologyMap } from "./shared/activePathologyMap.js";
import { TalentIdError } from "./shared/talentIdErrors.js";

// طبق بخش ۱۱.۳ سند: coach_can_override=false فقط برای critical_risk.
const NON_HOLD_RISK_LEVELS = new Set(["safe", "therapeutic"]);

function isAlwaysSafe(pathologyDef, sportId) {
  return (pathologyDef.always_safe ?? []).includes(sportId);
}

function _parseRecoveryWeeks(duration) {
  const match = /(\d+)_to_(\d+)_weeks/.exec(duration ?? "");
  if (!match) return undefined;
  return Math.round((Number(match[1]) + Number(match[2])) / 2);
}

function _riskLevelForSport(pathologyDef, sportId) {
  if (pathologyDef.is_universal_hold) {
    return isAlwaysSafe(pathologyDef, sportId) ? "safe" : "high_risk";
  }
  return pathologyDef.affects_sports?.[sportId];
}

// طبق بخش ۱۱.۲/۱۱.۳ سند: کلید ورودی می‌تواند از active_pathologies یا
// chronic_conditions بیاید — سند این دو را به‌وضوح تفکیک نکرده (تصمیم
// طراحی این Commit: هر دو آرایه با هم چک می‌شوند، چون مواردی مثل
// cardiovascular_disease مفهوماً به «شرایط مزمن» نزدیک‌تر است تا «آسیب
// فعال»، ولی کلیدهای هر دو در همان activePathologyMap هستند).
function computeMedicalHoldForSport(sportId, pathologyNames, clearanceData) {
  for (const pathologyName of pathologyNames) {
    const pathologyDef = activePathologyMap[pathologyName];
    if (!pathologyDef) continue; // پاتولوژی ناشناخته — رد می‌شود، نه throw

    const riskLevel = _riskLevelForSport(pathologyDef, sportId);
    if (!riskLevel || NON_HOLD_RISK_LEVELS.has(riskLevel)) continue;

    const isCleared = (clearanceData?.cleared_sports ?? []).includes(sportId);
    const coachCanOverride = riskLevel !== "critical_risk";

    return {
      status: isCleared ? "clearance_obtained" : "medical_hold",
      pathology: pathologyName,
      risk_level: riskLevel,
      required_specialist: pathologyDef.required_specialist,
      reason_narrative: pathologyDef.reason ?? "",
      is_temporary: pathologyDef.duration != null,
      estimated_recovery_weeks: _parseRecoveryWeeks(pathologyDef.duration),
      coach_can_override: coachCanOverride,
      // طبق بخش ۱۱.۳ سند فقط یک نمونه‌ی تصویری داده شده (['ECG','MRI knee',...])،
      // نه جدول دقیق per-pathology — ساختن آن یعنی اختراع جزئیات پزشکی
      // نداشته. حداقلی نگه داشته شد.
      clearance_requirements: [`${pathologyDef.required_specialist} signature`],
      ...(isCleared ? { clearance_date: clearanceData.date, clearance_notes: clearanceData.notes } : {}),
    };
  }

  return { status: "clear" };
}

function calculateMedicalHolds(sportRequirementMatrix, medical) {
  const activePathologyNames = [
    ...(medical?.active_pathologies ?? []),
    ...(medical?.chronic_conditions ?? []),
  ];
  const clearanceData = medical?.physician_clearance ?? null;

  const medicalHolds = {};
  for (const sportId of Object.keys(sportRequirementMatrix)) {
    medicalHolds[sportId] = computeMedicalHoldForSport(sportId, activePathologyNames, clearanceData);
  }

  // ⚠️ REGRESSION GUARD — این چک را حذف نکنید. اصل «هرگز حذف نشو» این
  // ماژول را در سطح runtime محافظت می‌کند.
  const expectedIds = Object.keys(sportRequirementMatrix);
  const actualIds = Object.keys(medicalHolds);
  if (actualIds.length !== expectedIds.length) {
    throw new TalentIdError(
      "MEDICAL_GATE_VETO_VIOLATION",
      `اصل «هرگز حذف نشو» نقض شد: انتظار ${expectedIds.length} رشته در خروجی بود، ${actualIds.length} گرفتیم.`,
      { expectedIds, actualIds }
    );
  }
  const validStatuses = new Set(["clear", "medical_hold", "clearance_obtained"]);
  for (const [sportId, hold] of Object.entries(medicalHolds)) {
    if (!validStatuses.has(hold.status)) {
      throw new TalentIdError(
        "MEDICAL_GATE_VETO_VIOLATION",
        `اصل «هرگز حذف نشو» نقض شد: status نامعتبر "${hold.status}" برای "${sportId}".`,
        { sportId, status: hold.status }
      );
    }
  }

  return medicalHolds;
}

export { calculateMedicalHolds, computeMedicalHoldForSport, isAlwaysSafe, NON_HOLD_RISK_LEVELS };
