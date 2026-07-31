// فایل ۱۶ موتور استعدادیابی (بخش ۱۷ سند معماری): رندر گزارش نهایی — آخرین
// حلقه‌ی زنجیره. ورودی مستقیماً خروجی خام Commitهای قبلی است (بدون
// orchestrator واسط‌ای که نساخته‌ایم — دقیقاً هم‌الگوی file12/file13):
// normalizedIntake (Commit 2)، maturityProfile (Commit 3)، خروجی
// computeRaeAlert (Commit 11)، matchReports (Commit 13)، tierClassification
// (Commit 15)، talentTransferSuggestions (Commit 14)، psychProfile (Commit 8).
//
// ⚠️ دو ناسازگاری type که حین تحلیل Commit 16 کشف شدند (تصمیم تاییدشده:
// نگاشت فقط در همین مرز خروجی، بدون تغییر Commit 13):
// ۱) TopDriver رسمی سند (بخش ۱۴.۲): {contribution_magnitude, short_narrative}
//    — خروجی واقعی Commit 13 (top_positive_drivers/top_negative_drivers):
//    {magnitude, narrative}. نگاشت در _toDocTopDriver.
// ۲) CorrectionStep رسمی سند: {step_id, action_title, description, ...}
//    — خروجی واقعی Commit 13 (correction_path) فاقد action_title است. طبق
//    تصمیم همین Commit، از description به‌عنوان action_title هم استفاده
//    می‌شود (تکرار محتوا، نه اختراع متن جدید) — رجوع کنید به
//    _buildCorrectiveActionPlan.
//
// ⚠️ radar_charts: سند هیچ‌جا type رسمی برای RadarChartData نداده (grep
// کامل تأیید کرد). شکل {labels, values} زیر استنتاج ماست، نه از سند —
// تصمیم تاییدشده‌ی Commit 16.
//
// ⚠️ athlete_name: NormalizedIntake (Commit 2) هرگز فیلد نام ورزشکار را
// capture نکرده (فقط athlete_id) — نامش احتمالاً در سطح بالاتر برنامه
// (جدول دانش‌آموزان) موجود است، نه در scope این engine. به همین دلیل
// athlete_name یک پارامتر مستقیم و اختیاری این فایل است، نه از
// normalizedIntake استخراج می‌شود.

import { generateCoachNarrative, generateClientNarrative, generateOverallNarrative } from "./shared/explanationTemplates.js";

const ENGINE_VERSION = "talentId-1.0.0-commit16";
const TOP_N_STRENGTHS = 5;
const TOP_N_AREAS_TO_IMPROVE = 5;
const TOP_N_RECOMMENDED = 3;

// طبق تصمیم تاییدشده‌ی Commit 16: نگاشت شکل داخلی Commit 13 به TopDriver رسمی سند.
function _toDocTopDriver(driver) {
  const result = {
    driver_id: driver.driver_id,
    category: driver.category,
    contribution_magnitude: driver.magnitude,
    trainability: driver.trainability,
    short_narrative: driver.narrative,
  };
  if (driver.magnitude < 0 && driver.trainability !== "innate" && driver.correction_info?.duration_weeks != null) {
    result.improvement_potential = {
      is_improvable: true,
      estimated_time_weeks: driver.correction_info.duration_weeks,
      corrective_action: driver.narrative,
    };
  }
  return result;
}

function _buildHeader(normalizedIntake, maturityProfile, raeAlertResult, athleteName) {
  return {
    athlete_name: athleteName ?? null,
    athlete_id: normalizedIntake.meta.athlete_id,
    assessment_date: normalizedIntake.meta.assessment_date,
    chronological_age: normalizedIntake.demographics.chronological_age_decimal,
    biological_age: maturityProfile.biological_age,
    maturity_type: maturityProfile.maturity_type,
    // طبق سند: RAEAlert | null — computeRaeAlert (Commit 11) همیشه آبجکت
    // برمی‌گرداند (حتی alert:false)، پس اینجا تبدیل می‌شود.
    rae_alert: raeAlertResult.alert ? raeAlertResult : null,
    data_quality_score: Math.round(normalizedIntake.meta.data_quality.completeness_percent * 100),
    scan_id: normalizedIntake.meta.scan_id,
    physician_clearance: normalizedIntake.medical.physician_clearance ?? null,
  };
}

function _topNByScore(matchReports, n) {
  return Object.values(matchReports)
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, n);
}

function _buildExecutiveSummary(matchReports, tierClassification, maturityProfile) {
  const top3 = _topNByScore(matchReports, TOP_N_RECOMMENDED);
  const totalCorrectableSports = tierClassification.tier_C_correctable.length;
  const totalMedicalHolds = tierClassification.tier_M_medical_hold.length;

  return {
    top_3_recommended: top3,
    total_correctable_sports: totalCorrectableSports,
    total_medical_holds: totalMedicalHolds,
    overall_narrative: generateOverallNarrative({
      top3Reports: top3,
      totalCorrectableSports,
      totalMedicalHolds,
      maturityType: maturityProfile.maturity_type,
    }),
  };
}

// طبق تصمیم تاییدشده‌ی Commit 16: چون همان driver آثر-سطح-ورزشکار (مثل
// cormic_high) در top_positive/negative_drivers چند رشته هم‌زمان ظاهر
// می‌شود، قبل از رتبه‌بندی سراسری بر اساس driver_id یکتاسازی می‌شود —
// وگرنه «۵ نقطه‌قوت برتر» می‌توانست تکرار همان یک ویژگی باشد.
function _collectUniqueDriversAcrossSports(matchReports) {
  const seen = new Map();
  for (const report of Object.values(matchReports)) {
    for (const driver of [...report.top_positive_drivers, ...report.top_negative_drivers]) {
      if (!seen.has(driver.driver_id)) seen.set(driver.driver_id, driver);
    }
  }
  return [...seen.values()];
}

function _buildDriversSummary(matchReports) {
  const uniqueDrivers = _collectUniqueDriversAcrossSports(matchReports);

  const strengths = uniqueDrivers
    .filter((d) => typeof d.magnitude === "number" && d.magnitude > 0)
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, TOP_N_STRENGTHS)
    .map(_toDocTopDriver);

  // طبق بخش ۱۷.۱.۱ سند: «منفی‌ترین trainable ها» — trainability='innate' فیلتر می‌شود.
  const areasToImprove = uniqueDrivers
    .filter((d) => typeof d.magnitude === "number" && d.magnitude < 0 && d.trainability !== "innate")
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, TOP_N_AREAS_TO_IMPROVE)
    .map(_toDocTopDriver);

  return { top_5_athlete_strengths: strengths, top_5_athlete_areas_to_improve: areasToImprove };
}

// ⚠️ تصمیم مهندسی جدید Commit 16 (نه از سند — سند فقط می‌گوید «بیشترین
// impact»، بدون فرمول؛ هم‌رده‌ی نگاشت transfer_potential در Commit 14):
// معیار اولویت = مجموع expected_score_gain همان اصلاح (driver_id یکسان)
// در تمام رشته‌هایی که آن اصلاح در correction_path‌شان ظاهر شده — یعنی
// اصلاحی که بیشترین سود *جمعی روی کل پروفایل ورزشکار* دارد اول می‌آید،
// نه فقط بزرگ‌ترین سود در یک رشته‌ی منفرد.
function _buildCorrectiveActionPlan(matchReports) {
  const stepsByDriverId = new Map();

  for (const report of Object.values(matchReports)) {
    const steps = report.what_if_analysis?.correction_path ?? [];
    for (const step of steps) {
      if (!stepsByDriverId.has(step.driver_id)) {
        stepsByDriverId.set(step.driver_id, {
          step_id: step.step_id,
          // طبق کامنت بالای فایل: action_title از description (چون Commit 13
          // این فیلد را جداگانه نساخته)، نه متن اختراعی جدید.
          action_title: step.description,
          description: step.description,
          duration_weeks: step.duration_weeks,
          total_expected_gain: 0,
          linked_module: step.linked_module,
          affected_sports: [],
        });
      }
      const entry = stepsByDriverId.get(step.driver_id);
      entry.total_expected_gain += step.expected_score_gain;
      entry.affected_sports.push(report.sport_id);
    }
  }

  const priorityOrder = [...stepsByDriverId.values()]
    .sort((a, b) => b.total_expected_gain - a.total_expected_gain)
    .map((entry) => ({
      step_id: entry.step_id,
      action_title: entry.action_title,
      description: entry.description,
      duration_weeks: entry.duration_weeks,
      expected_score_gain: Number(entry.total_expected_gain.toFixed(2)),
      linked_module: entry.linked_module,
    }));

  // طبق تصمیم Commit 13 (هم‌الگوی total_estimated_weeks_to_A_tier): فقط از
  // duration های معلوم، max (نه sum، چون اصلاحات می‌توانند موازی انجام شوند).
  const knownDurations = priorityOrder.map((s) => s.duration_weeks).filter((w) => w != null);
  const totalEstimatedTimeWeeks = knownDurations.length > 0 ? Math.max(...knownDurations) : 0;

  // طبق docs/TODO-corrective-module-linking.md (Commit 6): هیچ CORR-* واقعی
  // وجود ندارد، پس این آرایه فعلاً همیشه خالی است — صادقانه، نه جعلی.
  const linkedEngineSessions = [...new Set(priorityOrder.map((s) => s.linked_module).filter(Boolean))];

  return {
    priority_order: priorityOrder,
    total_estimated_time_weeks: totalEstimatedTimeWeeks,
    linked_engine_sessions: linkedEngineSessions,
  };
}

// ⚠️ تصمیم تاییدشده‌ی Commit 16: شکل {labels, values} استنتاج ماست (سند
// RadarChartData را تعریف نکرده)؛ اما خودِ اعداد داخل آن‌ها واقعی و از
// داده‌ی موجود گرفته شده‌اند، نه اختراعی.
function _buildRadarCharts(matchReports, normalizedIntake, psychProfile) {
  const { anthropometrics, body_composition: composition } = normalizedIntake;

  const physicalProfile = {
    labels: ["Ape Index", "Cormic Index", "درصد چربی بدن", "FFMI"],
    values: [anthropometrics.ape_index, anthropometrics.cormic_index, composition.body_fat_percent, composition.ffm_index],
  };

  const psychTraits = [
    "teamwork_score",
    "aggression_contact",
    "focus_patience",
    "pressure_tolerance",
    "dynamic_activity",
    "chaos_decision",
    "resilience",
  ];
  const psychologicalProfile = {
    labels: psychTraits,
    values: psychTraits.map((trait) => psychProfile?.[trait] ?? null),
  };

  const top3 = _topNByScore(matchReports, TOP_N_RECOMMENDED);
  const topSportComparison = {
    labels: top3.map((r) => r.sport_name_fa),
    values: top3.map((r) => r.final_score),
  };

  return { physical_profile: physicalProfile, psychological_profile: psychologicalProfile, top_sport_comparison: topSportComparison };
}

// طبق تصمیم تاییدشده‌ی Commit 16 (هم‌رده‌ی مقیاس high/medium/low بخش ۱۳.۲
// سند که در Commit 12 پیاده شد): نگاشت ساده و افشا‌شده، نه محاسبه‌ی علمی —
// چون سند فرمولی برای confidence_overall نداده.
const CONFIDENCE_TIER_SCORE = { high: 90, medium: 60, low: 30 };

function _buildMetadata(matchReports) {
  const reports = Object.values(matchReports);
  const avgConfidenceScore =
    reports.length > 0
      ? reports.reduce((sum, r) => sum + (CONFIDENCE_TIER_SCORE[r.confidence_tier] ?? 0), 0) / reports.length
      : 0;

  return {
    engine_version: ENGINE_VERSION,
    timestamp: new Date().toISOString(),
    confidence_overall: Math.round(avgConfidenceScore),
  };
}

// طبق بخش ۱۷.۱.۱ سند.
function renderCoachDashboard(
  matchReports,
  tierClassification,
  talentTransferSuggestions,
  maturityProfile,
  raeAlertResult,
  normalizedIntake,
  psychProfile,
  athleteName
) {
  return {
    header: _buildHeader(normalizedIntake, maturityProfile, raeAlertResult, athleteName),
    executive_summary: _buildExecutiveSummary(matchReports, tierClassification, maturityProfile),
    tiers: tierClassification,
    radar_charts: _buildRadarCharts(matchReports, normalizedIntake, psychProfile),
    drivers_summary: _buildDriversSummary(matchReports),
    corrective_action_plan: _buildCorrectiveActionPlan(matchReports),
    talent_transfer_summary: talentTransferSuggestions,
    metadata: _buildMetadata(matchReports),
  };
}

// طبق بخش ۱۷.۱.۲ سند (تصمیم تاییدشده‌ی Commit 16): فقط آبجکت داده‌ی
// ساختاریافته — بدون رندر HTML/PDF واقعی، که کار لایه‌ی Electron/UI است
// (هم‌مرز با تصمیم جداسازی IPC در Commit 9).
function renderClientReport(matchReports, tierClassification, normalizedIntake, driversSummary, athleteName) {
  const top3 = _topNByScore(matchReports, TOP_N_RECOMMENDED);

  return {
    athlete_name: athleteName ?? null,
    age: normalizedIntake.demographics.chronological_age_decimal,
    top_3_ideal_sports: top3.map((r) => ({ sport_name_fa: r.sport_name_fa, final_score: Math.round(r.final_score) })),
    strengths: driversSummary.top_5_athlete_strengths.slice(0, 3).map((d) => d.short_narrative),
    correctable_potential_sports: tierClassification.tier_C_correctable.map((r) => ({
      sport_name_fa: r.sport_name_fa,
      estimated_score_if_corrected: r.what_if_analysis ? Math.round(r.what_if_analysis.estimated_score_if_corrected) : null,
    })),
    medical_notes: tierClassification.tier_M_medical_hold
      .map((r) => r.medical_hold?.reason_narrative)
      .filter(Boolean),
  };
}

export { renderCoachDashboard, renderClientReport, ENGINE_VERSION };
