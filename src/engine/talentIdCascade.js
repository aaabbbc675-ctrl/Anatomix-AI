// پل بین renderer و فایل‌های موتور استعدادیابی (engine/talentId/) — عیناً
// هم‌الگوی bodybuildingCascade.js/nutritionCascade.js: اجرای مستقیم در
// renderer (نه IPC)، چون engine/talentId کاملاً pure است.
//
// ⚠️ یافته‌ی حیاتی پیش از نوشتن این فایل (وریفای مستقیم روی
// file13_explainabilityEngine.js، نه از حافظه): generateMatchReports خودش
// calculateBioBanding را صدا نمی‌زند — bioBanded باید از بیرون در sources
// باشد، **در کنار** bioScores/perfScores/psychScores خام (نه جایگزین آن‌ها)
// چون _collectNormalizedDrivers هنوز به drivers خام برای narrative نیاز دارد.
//
// ⚠️ یافته‌ی دوم (حین نوشتن این فایل): calculatePsychScores از
// psychProfile.explicit_interests برای بونوس علاقه‌مندی (بخش ۱۰.۳ سند)
// استفاده می‌کند — اما defaultNeutralProfile() همیشه explicit_interests:[]
// برمی‌گرداند. چون interests (از Step۶ فرم) در normalizedIntake.interests
// جداگانه است (از rawChatbot.explicit_sport_interest، مستقل از psych)،
// اینجا صریحاً merge می‌شود؛ وگرنه چندانتخابی علاقه‌مندی در UI هیچ اثر
// عددی‌ای نداشت — فقط تزئینی می‌ماند.
import { normalizeIntake } from "../../engine/talentId/file1_intakeInputs.js";
import { calculateMaturityProfile } from "../../engine/talentId/file2_maturityCalculator.js";
import { calculateBioScores } from "../../engine/talentId/file4_bioScoreCalculator.js";
import { computePosturalAdjustments } from "../../engine/talentId/file5_posturalAdvisoryLayer.js";
import { computeRomAdjustments } from "../../engine/talentId/file6_flexibilityROMAdjustments.js";
import { calculatePerfScores } from "../../engine/talentId/file7_perfScoreCalculator.js";
import { defaultNeutralProfile } from "../../engine/talentId/file8_psychProfileExtractor.js";
import { calculatePsychScores } from "../../engine/talentId/file9_psychMatchCalculator.js";
import { calculateMedicalHolds } from "../../engine/talentId/file10_medicalConditionalGate.js";
import { calculateBioBanding, computeRaeAlert } from "../../engine/talentId/file11_bioBandingAdjuster.js";
import {
  generateMatchReports,
  attachSensitivePeriodNotesToReports,
} from "../../engine/talentId/file13_explainabilityEngine.js";
import { suggestTalentTransfers } from "../../engine/talentId/file14_talentTransferSuggester.js";
import { classifyTiers } from "../../engine/talentId/file15_tierClassifier.js";
import { renderCoachDashboard, renderClientReport } from "../../engine/talentId/file16_reportRenderer.js";
import { sportRequirementMatrix } from "../../engine/talentId/shared/sportRequirementMatrix.js";

// ورودی: rawDevice/rawCoach/rawChatbot دقیقاً همان شکل خام بخش ۲.۱ سند —
// رجوع کنید به TalentIdAssessment/index.jsx برای این‌که فرم چطور این سه
// آبجکت را از ۶ Step می‌سازد.
function runTalentIdAssessment(rawDevice, rawCoach, rawChatbot, athleteName) {
  const normalizedIntake = normalizeIntake(rawDevice, rawCoach, rawChatbot);
  const { demographics, medical, interests } = normalizedIntake;

  const maturityProfile = calculateMaturityProfile({
    chronological_age_decimal: demographics.chronological_age_decimal,
    biological_sex: demographics.biological_sex,
    standing_height_cm: normalizedIntake.anthropometrics.standing_height_cm,
    sitting_height_cm: normalizedIntake.anthropometrics.sitting_height_cm,
    leg_length_cm: normalizedIntake.anthropometrics.leg_length_cm,
    weight_kg: normalizedIntake.anthropometrics.weight_kg,
  });

  // طبق docs/TODO-api-key-security.md: مسیر واقعی چت‌بات نیازمند IPC/کلید API
  // است که هنوز ساخته نشده — عمداً همیشه پروفایل خنثی، به‌علاوه‌ی
  // explicit_interests واقعی کاربر (که مستقل از چت‌بات جمع‌آوری می‌شود).
  const psychProfile = { ...defaultNeutralProfile(), explicit_interests: interests };

  const bioScores = calculateBioScores(sportRequirementMatrix, normalizedIntake);
  const posturalResult = computePosturalAdjustments(normalizedIntake.posture, sportRequirementMatrix);
  const romResult = computeRomAdjustments(normalizedIntake.rom, normalizedIntake.hypermobility, sportRequirementMatrix);
  const perfScores = calculatePerfScores(sportRequirementMatrix, normalizedIntake, maturityProfile.biological_age);
  const psychScores = calculatePsychScores(sportRequirementMatrix, psychProfile);
  const medicalHolds = calculateMedicalHolds(sportRequirementMatrix, medical);
  const bioBanded = calculateBioBanding(sportRequirementMatrix, bioScores, perfScores, psychScores, maturityProfile);
  const raeAlertResult = computeRaeAlert(demographics.birth_month_shamsi);

  const rawReports = generateMatchReports(sportRequirementMatrix, {
    bioScores,
    posturalResult,
    romResult,
    perfScores,
    psychScores,
    psychProfile,
    medicalHolds,
    maturityProfile,
    bioBanded,
  });
  const matchReports = attachSensitivePeriodNotesToReports(
    rawReports,
    maturityProfile.biological_age,
    demographics.biological_sex
  );

  const tierClassification = classifyTiers(matchReports);
  const talentTransferSuggestions = suggestTalentTransfers(matchReports, sportRequirementMatrix);

  const coachDashboard = renderCoachDashboard(
    matchReports,
    tierClassification,
    talentTransferSuggestions,
    maturityProfile,
    raeAlertResult,
    normalizedIntake,
    psychProfile,
    athleteName
  );
  const clientReport = renderClientReport(
    matchReports,
    tierClassification,
    normalizedIntake,
    coachDashboard.drivers_summary,
    athleteName
  );

  // ltad_notes یکسان برای همه‌ی رشته‌هاست (Commit 20، universal نه per-sport)
  // — یک‌بار از اولین گزارش استخراج می‌شود، نه در header (که این فیلد را
  // ندارد، رجوع کنید به کامنت بالای این فایل).
  const firstReport = matchReports[Object.keys(matchReports)[0]];

  return {
    normalizedIntake,
    matchReports,
    tierClassification,
    coachDashboard,
    clientReport,
    ltadNotes: firstReport?.ltad_notes ?? [],
  };
}

export { runTalentIdAssessment };
