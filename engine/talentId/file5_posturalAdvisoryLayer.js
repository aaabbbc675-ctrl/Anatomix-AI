// فایل ۵ موتور استعدادیابی (بخش ۶ سند معماری): لایه‌ی Advisory پوسچرال.
//
// ⚠️ اصل معماری غیرقابل‌مذاکره (بخش ۰.۳ اصل ۱ + بخش ۶.۱ سند): پوسچرال و
// اسکلتی هرگز رشته را حذف نمی‌کند. صرف‌نظر از severity (حتی ۳، شدیدترین
// حالت)، خروجی این فایل همیشه is_correctable=true دارد و applied_penalty
// —هر چقدر هم بزرگ— هرگز به یک veto/exclude تبدیل نمی‌شود.
//
// این اصل با دو لایه‌ی دفاعی محافظت می‌شود (تصمیم تاییدشده‌ی Commit 6):
//   ۱) runtime invariant assertion داخل _makePosturalAdjustment — هر بار
//      که یک PosturalAdjustment ساخته می‌شود چک می‌شود، نه فقط زمان تست.
//   ۲) تست regression guard در scripts/test-engine-talentid-file5-postural.js
//      که روی *کل* posturalSportImpactMap (نه فقط چند نمونه‌ی دستی) حلقه
//      می‌زند.
//
// ⚠️ درباره‌ی TalentIdError('POSTURAL_VETO_VIOLATION'): این خطا **هرگز
// نباید در production رخ بدهد** — برخلاف medical_hold (Commit 10، یک
// وضعیت عادی و قابل‌انتظار کسب‌وکاری که در UI نمایش داده می‌شود و مربی
// می‌تواند clear کند)، این صرفاً یک safety net توسعه است، دقیقاً هم‌رده‌ی
// BIO_SCORE_UNKNOWN_DRIVER_KEY در file4 (Commit 5). اگر جایی throw شود
// یعنی یک باگ در posturalSportImpactMap.js یا همین فایل معرفی شده. هیچ
// orchestrator بالادستی (از جمله file13 که این خروجی را مصرف می‌کند)
// نباید این خطا را catch کند و به‌عنوان یک حالت عادی نمایش بدهد — باید
// propagate شود و کل عملیات fail شود.

import { posturalSportImpactMap } from "./shared/posturalSportImpactMap.js";
import { postureCorrectionTime } from "./shared/postureCorrectionTime.js";
import { TalentIdError } from "./shared/talentIdErrors.js";

// طبق بخش ۶.۲/۶.۳ سند — بدون استثنا.
const SEVERITY_MULTIPLIER = { 1: 0.3, 2: 0.7, 3: 1.0 };

function severityMultiplier(severity) {
  const multiplier = SEVERITY_MULTIPLIER[severity];
  if (multiplier === undefined) {
    throw new TalentIdError("INVALID_SEVERITY", `severity نامعتبر: "${severity}". باید ۱، ۲ یا ۳ باشد.`, {
      severity,
    });
  }
  return multiplier;
}

function _makePosturalAdjustment({ postureType, severity, appliedPenalty, reason, beneficial }) {
  const correctionWeeks = postureCorrectionTime[postureType]?.[severity] ?? null;

  const adjustment = {
    driver_id: `postural.${postureType}.severity_${severity}`,
    posture_type: postureType,
    severity,
    applied_penalty: appliedPenalty,
    biomechanical_reason: reason,
    beneficial: beneficial ?? null,
    is_correctable: true,
    typical_correction_time_weeks: correctionWeeks,
    // طبق تصمیم تاییدشده‌ی Commit 6: هیچ "CORR-*" module ID واقعی در
    // engine/corrective/ وجود ندارد (وریفای شد) — به‌جای ساختن یک ID
    // قلابی، null + وضعیت صریح. رجوع کنید به
    // docs/TODO-corrective-module-linking.md.
    suggested_corrective_module_id: null,
    corrective_module_status: "not_yet_linked",
    // طبق بخش ۶.۶ سند: نوع ثابت 'trainable' (نه lookup از رجیستری) — همه‌ی
    // ناهنجاری‌های پوسچرال تا حدی قابل‌اصلاح‌اند، این یک literal type است.
    trainability: "trainable",
  };

  // ⚠️ REGRESSION GUARD (لایه‌ی ۱) — این چک را حذف نکنید. اصل معماری
  // غیرقابل‌مذاکره را در سطح runtime محافظت می‌کند، نه فقط تست.
  if (adjustment.is_correctable !== true) {
    throw new TalentIdError(
      "POSTURAL_VETO_VIOLATION",
      "اصل معماری غیرقابل‌مذاکره نقض شد: is_correctable باید همیشه true باشد.",
      { postureType, severity }
    );
  }
  if (!Number.isFinite(adjustment.applied_penalty)) {
    throw new TalentIdError(
      "POSTURAL_VETO_VIOLATION",
      "اصل معماری غیرقابل‌مذاکره نقض شد: applied_penalty باید همیشه یک عدد محدود باشد.",
      { postureType, severity, appliedPenalty }
    );
  }

  return adjustment;
}

// طبق بخش ۶.۳ سند: برای هر posture با severity>0، روی همه‌ی رشته‌های
// موجود در sportRequirementMatrix که در posturalSportImpactMap برای آن
// posture تعریف شده‌اند تنظیم اعمال می‌شود.
function computePosturalAdjustments(posture, sportRequirementMatrix) {
  const adjustmentsBySport = {};
  const activePostures = [];

  for (const [postureType, data] of Object.entries(posture ?? {})) {
    const severity = data?.severity ?? 0;
    if (severity === 0) continue;

    const impactMap = posturalSportImpactMap[postureType];
    if (!impactMap) continue;

    let affectedSportsCount = 0;
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      const impact = impactMap[sportId];
      if (!impact) continue;

      const scaledPenalty = impact.penalty * severityMultiplier(severity);
      const adjustment = _makePosturalAdjustment({
        postureType,
        severity,
        appliedPenalty: scaledPenalty,
        reason: impact.reason,
        beneficial: impact.beneficial,
      });

      if (!adjustmentsBySport[sportId]) adjustmentsBySport[sportId] = [];
      adjustmentsBySport[sportId].push(adjustment);
      affectedSportsCount++;
    }

    activePostures.push({ posture: postureType, severity, affected_sports_count: affectedSportsCount });
  }

  return { adjustments_by_sport: adjustmentsBySport, active_postures: activePostures };
}

export { computePosturalAdjustments, severityMultiplier, _makePosturalAdjustment };
