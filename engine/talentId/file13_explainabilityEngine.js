// فایل ۱۳ موتور استعدادیابی (بخش ۱۴ سند معماری): موتور Explainability —
// «برای هر رشته‌ای که رد شد، دقیقاً بگو چرا و چقدر با اصلاح می‌تونه بهتر بشه.»
//
// این فایل نقطه‌ی تلاقی همه‌ی Commitهای قبلی است: file4 (bio)، file5
// (postural)، file6 (rom)، file7 (perf)، file9 (psych match)، file10
// (medical)، file11 (bio-banding)، file12 (synthesis).
//
// ⚠️ یافته‌ی حیاتی Commit 13 (مستند کامل در docs/TODO-postural-rom-integration.md
// و بالای file12_scoreSynthesis.js): پوسچرال (file5) و ROM (file6) تا این
// Commit به هیچ امتیازی وصل نبودند. اینجا برای اولین بار، مجموع پنالتی‌های
// این دو منبع برای هر رشته محاسبه و به file12 پاس داده می‌شود (پارامترهای
// جدید posturalPenaltySum/romPenaltySum).
//
// ⚠️ Field Compatibility Audit (قبل از کدنویسی انجام شد، نتیجه به کاربر
// گزارش شد): فقط driver_id واقعاً بین هر ۵ منبع driver یکسان است. بقیه‌ی
// فیلدها (نام مقدار عددی، نام متن توضیحی، وجود/غیاب category و
// is_correctable) در هرکدام فرق دارد — به همین دلیل لایه‌ی normalization
// زیر (_normalize*Driver) قبل از هر ترکیبی لازم است؛ concatenation خام
// [...bioDrivers, ...posturalDrivers, ...] که سند بخش ۱۴.۳ فرض کرده بدون
// این لایه کار نمی‌کند.
//
// ⚠️ مثال JSON کامل بخش ۱۴.۵ سند (والیبال/کایفوز، final_score=62،
// bio_banding_adjustment=-24.2) به‌عنوان oracle عددی استفاده نشد — verified
// شد که خودِ اعداد آن مثال با pseudocode بخش ۱۳.۳ همان سند (bio-banding
// ضریبی پیش از وزن‌دهی، نه یک عدد افزودنی پس از وزن‌دهی) ناسازگار است؛
// دقیقاً هم‌رده‌ی عدد جعلی Mirwald در Commit 3. فقط برای شکل JSON/لحن
// narrative از آن الگو گرفته شد، نه برای مقادیر عددی.

import { synthesizeScoreForSport, computeDynamicWeights, BASELINE_CI_INPUTS } from "./file12_scoreSynthesis.js";
import { PSYCH_TRAITS } from "./shared/sportRequirementSchema.js";
import { generateCoachNarrative, generateClientNarrative } from "./shared/explanationTemplates.js";
import { TalentIdError } from "./shared/talentIdErrors.js";

// طبق بخش ۱۴.۳ سند pseudocode (خط ~۲۳۵۰/۲۶۱۲): >=85 → A، >=70 → B، else C.
const TIER_A_MIN = 85;
const TIER_B_MIN = 70;
const TOP_DRIVERS_COUNT = 3;
// طبق pseudocode بخش ۱۴.۳ سند: حداکثر ۵ اصلاح هم‌زمان شبیه‌سازی می‌شود.
const WHATIF_MAX_CORRECTIONS = 5;
// طبق pseudocode بخش ۱۴.۳ سند: فقط اگر بهبود واقعاً معنادار (>+۱۰) باشد نمایش داده می‌شود.
const WHATIF_MIN_GAIN_THRESHOLD = 10;
// طبق pseudocode بخش ۱۴.۳ سند: عدم‌قطعیت پیش‌بینی همیشه بالاتر از فعلی است.
const WHATIF_CI_INFLATION = 3;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// ─────────────────────────────────────────────────────────────────────────
// لایه‌ی Normalization — تبدیل هر ۵ شکل driver به یک NormalizedDriver مشترک.
// ─────────────────────────────────────────────────────────────────────────

// file4 (bio): تنها منبعی که واقعاً شکل کامل بخش ۵.۴ سند را دارد.
function _normalizeBioDriver(driver) {
  return {
    driver_id: driver.driver_id,
    category: driver.category,
    magnitude: driver.magnitude,
    trainability: driver.trainability,
    narrative: driver.narrative_short || "",
    is_correctable: false,
    correction_info: null,
    source: "bio",
  };
}

// file5 (postural): مقدار عددی روی applied_penalty است (نه magnitude)، متن
// روی biomechanical_reason (نه narrative_short).
function _normalizePosturalDriver(driver) {
  return {
    driver_id: driver.driver_id,
    category: "postural",
    magnitude: driver.applied_penalty,
    trainability: driver.trainability,
    narrative: driver.biomechanical_reason || "",
    is_correctable: driver.is_correctable === true,
    correction_info: {
      duration_weeks: driver.typical_correction_time_weeks ?? null,
      module_id: driver.suggested_corrective_module_id ?? null,
      module_status: driver.corrective_module_status ?? "not_yet_linked",
    },
    source: "postural",
  };
}

// file6 (rom): هم‌الگوی file5 اما بدون typical_correction_time_weeks/
// suggested_corrective_module_id (عمداً در Commit 7 حذف شدند) — duration_weeks
// همیشه null می‌ماند، نه یک عدد حدسی. category="flexibility" مستقیماً از
// مثال بخش ۱۴.۵ سند گرفته شده (خط ~۲۴۹۴: rom.shoulder_flexor_short →
// category:"flexibility")، تنها بخش قابل‌اتکای آن مثال.
function _normalizeRomDriver(driver) {
  return {
    driver_id: driver.driver_id,
    category: "flexibility",
    magnitude: driver.applied_penalty,
    trainability: driver.trainability,
    narrative: driver.biomechanical_reason || "",
    is_correctable: driver.is_correctable === true,
    correction_info: { duration_weeks: null, module_id: null, module_status: "not_yet_linked" },
    source: "rom",
  };
}

// file7 (perf): نوع عادی applied_bonus دارد اما هیچ متن توضیحی‌ای ندارد
// (نه narrative_short نه biomechanical_reason) — باید از test/tier ساخته
// شود. نوع critical_fail هیچ مقدار عددی مستقل ندارد (اثرش قبلاً در ضریب
// ۰.۵x روی کل perf_score اعمال شده، نه یک عدد افزودنی جداگانه) — magnitude
// آن عمداً null است تا در رتبه‌بندی جعلی وارد نشود، اما narrative آن (که
// واقعاً دارد) حفظ می‌شود.
function _normalizePerfDriver(driver) {
  const isCriticalFail = driver.criticality === "critical_failure";
  if (isCriticalFail) {
    return {
      driver_id: driver.driver_id,
      category: "performance",
      magnitude: null,
      trainability: null,
      narrative: driver.note || "",
      is_correctable: false,
      correction_info: null,
      source: "perf",
    };
  }
  return {
    driver_id: driver.driver_id,
    category: "performance",
    magnitude: driver.applied_bonus,
    trainability: driver.trainability,
    narrative: `آزمون ${driver.test} — رده‌ی ${driver.tier}`,
    is_correctable: false,
    correction_info: null,
    source: "perf",
  };
}

// طبق فرمول بخش ۱۰.۱ سند (file9): matchPercent = (1 - Σ(delta×importance)/totalWeight)×100
// با totalWeight = Σ(4×importance) روی همه‌ی ۷ trait — این یک ثابت خطی است،
// یعنی سهم دقیق هر driver در psych_score قابل استخراج است، نه اختراعی
// (طبق تصمیم تاییدشده‌ی Commit 13: مشتق دقیق از فرمول موجود، نه تخمین جدید).
function _computePsychTotalWeight(sportEntry) {
  let totalWeight = 0;
  for (const trait of PSYCH_TRAITS) {
    const importance = sportEntry.trait_importance?.[trait] ?? 1;
    totalWeight += 4 * importance;
  }
  return totalWeight;
}

// file9 (psych): driver نوع trait شکل نزدیک به کانونی دارد (category +
// narrative_short) اما فیلد عددی مستقیم ندارد (delta/importance دارد، نه
// magnitude) — magnitude دقیق طبق فرمول بالا مشتق می‌شود. driver نوع
// interest_bonus کاملاً متفاوت است (applied_bonus رشته‌ی متنی مثل "۱۰٪" است،
// نه عدد؛ فیلد متن narrative نه narrative_short) و چون یک ضریب انتهایی
// چندگانه است (نه یک امتیاز افزودنی هم‌مقیاس با بقیه)، magnitude آن عمداً
// null است — در رتبه‌بندی top_positive/negative شرکت نمی‌کند، فقط در متن
// narrative ظاهر می‌شود.
function _normalizePsychDriver(driver, sportEntry) {
  if (driver.driver_id === "interest.explicit_bonus") {
    return {
      driver_id: driver.driver_id,
      category: "psychological",
      magnitude: null,
      trainability: null,
      narrative: driver.narrative || "",
      is_correctable: false,
      correction_info: null,
      source: "psych",
    };
  }
  const totalWeight = _computePsychTotalWeight(sportEntry);
  const magnitude = totalWeight > 0 ? -((driver.delta * driver.importance) / totalWeight) * 100 : 0;
  return {
    driver_id: driver.driver_id,
    category: driver.category,
    magnitude,
    trainability: driver.trainability,
    narrative: driver.narrative_short || "",
    is_correctable: false,
    correction_info: null,
    source: "psych",
  };
}

function _collectNormalizedDrivers(sportId, sportEntry, sources) {
  const bioDrivers = (sources.bioScores[sportId]?.drivers ?? []).map(_normalizeBioDriver);
  const posturalDrivers = (sources.posturalResult.adjustments_by_sport[sportId] ?? []).map(_normalizePosturalDriver);
  const romDrivers = (sources.romResult.adjustments_by_sport[sportId] ?? []).map(_normalizeRomDriver);
  const perfDrivers = (sources.perfScores[sportId]?.drivers ?? []).map(_normalizePerfDriver);
  const psychDrivers = (sources.psychScores[sportId]?.drivers ?? []).map((d) => _normalizePsychDriver(d, sportEntry));
  return [...bioDrivers, ...posturalDrivers, ...romDrivers, ...perfDrivers, ...psychDrivers];
}

function _sumMagnitudeBySource(normalizedDrivers, source) {
  return normalizedDrivers
    .filter((d) => d.source === source)
    .reduce((sum, d) => sum + (d.magnitude ?? 0), 0);
}

function _rankDrivers(normalizedDrivers) {
  const rankable = normalizedDrivers.filter((d) => typeof d.magnitude === "number" && Number.isFinite(d.magnitude));
  const positive = rankable
    .filter((d) => d.magnitude > 0)
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, TOP_DRIVERS_COUNT);
  const negative = rankable
    .filter((d) => d.magnitude < 0)
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, TOP_DRIVERS_COUNT);
  return { positive, negative };
}

// طبق بخش ۱۴.۳ سند pseudocode: medical_hold → 'M' (اولویت بر عدد)، سپس
// آستانه‌های عددی.
function classifyTier(finalScore, medicalStatus) {
  if (medicalStatus === "medical_hold") return "M";
  if (finalScore >= TIER_A_MIN) return "A";
  if (finalScore >= TIER_B_MIN) return "B";
  return "C";
}

function _buildPrimaryExclusionCause(tier, medicalHold, negativeDrivers) {
  if (tier === "M" && medicalHold) {
    return {
      single_driver: `medical.${medicalHold.pathology}`,
      cause_narrative: medicalHold.reason_narrative,
      contribution_magnitude: null,
      category: "medical",
    };
  }
  if (tier !== "C") return undefined;
  const biggest = negativeDrivers[0];
  if (!biggest) return undefined;
  return {
    single_driver: biggest.driver_id,
    cause_narrative: biggest.narrative,
    contribution_magnitude: biggest.magnitude,
    category: biggest.category,
  };
}

// ⚠️ طبق تصمیم تاییدشده‌ی Commit 13: برخلاف pseudocode خام سند
// (`simulatedScore += gain`، نوشته‌شده پیش از کشف مشکل مقیاس در Commit 12)،
// اینجا فرمول کامل file12 (rescale ÷۲ + وزن‌دهی + clamp) از نو روی مقادیر
// شبیه‌سازی‌شده اجرا می‌شود — هم برای هر گام (gain مجزا) هم برای مجموع
// نهایی. clamp(0,100) خودکار از synthesizeScoreForSport می‌آید، نیازی به
// clamp دستی جداگانه نیست.
function _buildWhatIfAnalysis({
  baselineResult,
  normalizedDrivers,
  bioBandedEntry,
  medicalStatus,
  weights,
  posturalPenaltySum,
  romPenaltySum,
}) {
  const correctableNegatives = normalizedDrivers
    .filter((d) => d.is_correctable && typeof d.magnitude === "number" && d.magnitude < 0)
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, WHATIF_MAX_CORRECTIONS);

  if (correctableNegatives.length === 0) return undefined;

  let cumulativePostural = posturalPenaltySum;
  let cumulativeRom = romPenaltySum;
  const correctionSteps = [];
  let maxKnownWeeks = 0;
  let unknownWeeksCount = 0;

  for (const driver of correctableNegatives) {
    // شبیه‌سازی «فقط همین driver اصلاح شود» — مستقل از سایر گام‌ها، برای gain مجزا.
    const isolatedResult = synthesizeScoreForSport(
      bioBandedEntry,
      medicalStatus,
      weights,
      BASELINE_CI_INPUTS,
      driver.source === "postural" ? posturalPenaltySum - driver.magnitude : posturalPenaltySum,
      driver.source === "rom" ? romPenaltySum - driver.magnitude : romPenaltySum
    );
    const stepGain = isolatedResult.final_score - baselineResult.final_score;

    // انباشت برای شبیه‌سازی «همه‌ی این گام‌ها با هم اصلاح شوند».
    if (driver.source === "postural") cumulativePostural -= driver.magnitude;
    if (driver.source === "rom") cumulativeRom -= driver.magnitude;

    const weeks = driver.correction_info?.duration_weeks ?? null;
    // طبق تصمیم تاییدشده‌ی Commit 13 (سؤال ۴): فقط از correctionهای با
    // weeks معلوم جمع می‌زنیم (max، هم‌الگوی pseudocode سند)، نه یک عدد
    // حدسی برای موارد نامعلوم (مثل ROM که Commit 7 عمداً این را حذف کرد).
    if (weeks != null) {
      maxKnownWeeks = Math.max(maxKnownWeeks, weeks);
    } else {
      unknownWeeksCount++;
    }

    correctionSteps.push({
      step_id: `fix_${driver.driver_id}`,
      driver_id: driver.driver_id,
      description: driver.narrative,
      duration_weeks: weeks,
      expected_score_gain: Number(stepGain.toFixed(2)),
      linked_module: driver.correction_info?.module_id ?? null,
    });
  }

  const cumulativeResult = synthesizeScoreForSport(
    bioBandedEntry,
    medicalStatus,
    weights,
    BASELINE_CI_INPUTS,
    cumulativePostural,
    cumulativeRom
  );

  // طبق pseudocode بخش ۱۴.۳ سند: فقط اگر بهبود واقعاً معنادار باشد نمایش داده می‌شود.
  if (cumulativeResult.final_score <= baselineResult.final_score + WHATIF_MIN_GAIN_THRESHOLD) {
    return undefined;
  }

  const roundedFinal = Math.round(cumulativeResult.final_score);

  return {
    is_correctable: true,
    estimated_score_if_corrected: cumulativeResult.final_score,
    estimated_ci_if_corrected: cumulativeResult.ci + WHATIF_CI_INFLATION,
    estimated_tier_if_corrected: classifyTier(cumulativeResult.final_score, medicalStatus),
    correction_path: correctionSteps,
    total_estimated_weeks_to_A_tier: maxKnownWeeks > 0 ? maxKnownWeeks : null,
    partial_duration_estimate: unknownWeeksCount > 0,
    duration_warning:
      unknownWeeksCount > 0
        ? `این تخمین فقط بخشی از مسیر اصلاح را پوشش می‌دهد؛ ${unknownWeeksCount} مورد با زمان نامعلوم وجود دارد.`
        : null,
    highlight_message:
      roundedFinal >= TIER_A_MIN
        ? `⚡ این رشته می‌تواند بالاترین امتیاز شما (${roundedFinal}٪) شود!`
        : `با اصلاح این نقاط، امتیاز به ${roundedFinal}٪ می‌رسد`,
  };
}

function generateMatchReport(sportId, sportEntry, ctx) {
  const { bioBanded, medicalHolds, weights, maturityProfile } = ctx;
  const medicalHold = medicalHolds[sportId];
  const medicalStatus = medicalHold?.status ?? "clear";

  const normalizedDrivers = _collectNormalizedDrivers(sportId, sportEntry, ctx);
  const posturalPenaltySum = _sumMagnitudeBySource(normalizedDrivers, "postural");
  const romPenaltySum = _sumMagnitudeBySource(normalizedDrivers, "rom");

  const baselineResult = synthesizeScoreForSport(
    bioBanded[sportId],
    medicalStatus,
    weights,
    BASELINE_CI_INPUTS,
    posturalPenaltySum,
    romPenaltySum
  );

  const { positive, negative } = _rankDrivers(normalizedDrivers);
  const tier = classifyTier(baselineResult.final_score, medicalStatus);
  const primaryExclusionCause = _buildPrimaryExclusionCause(tier, medicalHold, negative);
  const whatIf = _buildWhatIfAnalysis({
    baselineResult,
    normalizedDrivers,
    bioBandedEntry: bioBanded[sportId],
    medicalStatus,
    weights,
    posturalPenaltySum,
    romPenaltySum,
  });

  const scoreBreakdown = {
    bio_component: {
      value: baselineResult.component_scores.bio,
      weight: baselineResult.applied_weights.bio,
      contribution: baselineResult.component_scores.bio * baselineResult.applied_weights.bio,
    },
    perf_component: {
      value: baselineResult.component_scores.perf,
      weight: baselineResult.applied_weights.perf,
      contribution: baselineResult.component_scores.perf * baselineResult.applied_weights.perf,
    },
    psych_component: {
      value: baselineResult.component_scores.psych,
      weight: baselineResult.applied_weights.psych,
      contribution: baselineResult.component_scores.psych * baselineResult.applied_weights.psych,
    },
    // ⚠️ انحراف آگاهانه از نام‌گذاری مثال بخش ۱۴.۵ سند (که "bio_banding_adjustment"
    // یک عدد افزودنی پس از وزن‌دهی نشان می‌داد — خودِ آن مثال ناسازگار بود،
    // رجوع کنید به کامنت بالای فایل). به‌جای یک عدد بازساخته‌ی نامطمئن، دو
    // مقدار *واقعاً محاسبه‌شده* مستقیماً افشا می‌شوند:
    maturity_adjustment_factor: bioBanded[sportId].maturity_adjustment_factor,
    postural_rom_penalty_applied: { postural: posturalPenaltySum, rom: romPenaltySum },
  };

  const coachNarrative = generateCoachNarrative({
    sportNameFa: sportEntry.name_fa,
    finalScore: baselineResult.final_score,
    tier,
    topPositiveDrivers: positive,
    primaryExclusionCause,
    whatIf,
    medicalHold,
    maturityType: maturityProfile.maturity_type,
  });
  const clientNarrative = generateClientNarrative({
    sportNameFa: sportEntry.name_fa,
    finalScore: baselineResult.final_score,
    tier,
    primaryExclusionCause,
    whatIf,
    medicalHold,
  });

  return {
    sport_id: sportId,
    sport_name_fa: sportEntry.name_fa,
    sport_name_en: sportEntry.name_en,
    final_score: baselineResult.final_score,
    ci: baselineResult.ci,
    final_tier: tier,
    score_breakdown: scoreBreakdown,
    top_positive_drivers: positive,
    top_negative_drivers: negative,
    primary_exclusion_cause: primaryExclusionCause,
    what_if_analysis: whatIf,
    medical_hold: medicalStatus !== "clear" ? medicalHold : null,
    coach_narrative: coachNarrative,
    client_narrative: clientNarrative,
  };
}

const VALID_TIERS = new Set(["A", "B", "C", "M"]);

function generateMatchReports(sportRequirementMatrix, sources) {
  const weights = computeDynamicWeights(sources.psychProfile, sources.maturityProfile);
  const ctx = { ...sources, weights };
  const reports = {};

  for (const sportId of Object.keys(sportRequirementMatrix)) {
    reports[sportId] = generateMatchReport(sportId, sportRequirementMatrix[sportId], ctx);
  }

  // ⚠️ REGRESSION GUARD — این چک را حذف نکنید. هم‌الگوی file7/file10/file11/file12:
  // هیچ رشته‌ای از خروجی حذف نمی‌شود، final_score همیشه ۰-۱۰۰ و final_tier
  // همیشه یکی از چهار مقدار معتبر است.
  const expectedIds = Object.keys(sportRequirementMatrix);
  const actualIds = Object.keys(reports);
  if (actualIds.length !== expectedIds.length) {
    throw new TalentIdError(
      "EXPLAINABILITY_VETO_VIOLATION",
      `اصل «هرگز حذف نشو» نقض شد: انتظار ${expectedIds.length} رشته در خروجی بود، ${actualIds.length} گرفتیم.`,
      { expectedIds, actualIds }
    );
  }
  for (const [sportId, report] of Object.entries(reports)) {
    if (!Number.isFinite(report.final_score) || report.final_score < 0 || report.final_score > 100) {
      throw new TalentIdError(
        "EXPLAINABILITY_VETO_VIOLATION",
        `اصل «هرگز حذف نشو» نقض شد: final_score نامعتبر "${report.final_score}" برای "${sportId}".`,
        { sportId, value: report.final_score }
      );
    }
    if (!VALID_TIERS.has(report.final_tier)) {
      throw new TalentIdError(
        "EXPLAINABILITY_VETO_VIOLATION",
        `اصل «هرگز حذف نشو» نقض شد: final_tier نامعتبر "${report.final_tier}" برای "${sportId}".`,
        { sportId, value: report.final_tier }
      );
    }
  }

  return reports;
}

export {
  generateMatchReports,
  generateMatchReport,
  classifyTier,
  TIER_A_MIN,
  TIER_B_MIN,
  WHATIF_MIN_GAIN_THRESHOLD,
  WHATIF_MAX_CORRECTIONS,
};
