// فایل ۱ موتور استعدادیابی (بخش ۲ سند معماری): اعتبارسنجی و نرمال‌سازی سه
// منبع ورودی خام (دستگاه بادی‌اسکن + فرم مربی + پاسخ‌های چت‌بات) به
// NormalizedIntake. برخلاف nutrition/corrective/bodybuilding که throw new
// Error ساده کافیه، اینجا طبق بخش ۲.۴ سند از TalentIdError با code استفاده
// می‌شود چون فایل‌های بعدی (مثلاً file3_normativeDataLookup با
// NORMATIVE_MISSING) باید بتوانند روی نوع خطا برنامه‌نویسی‌محور تصمیم
// بگیرند، نه فقط پیام را نمایش بدهند.
//
// rawDevice/rawCoach/rawChatbot طبق pseudocode بخش ۲.۵ سند، محتوای
// باز‌شده‌ی device_scan/coach_input/chatbot_responses هستند، نه wrapper
// کامل {device_scan:{...}} — caller باید raw.device_scan را (نه راو کامل)
// به این تابع بدهد.
//
// psych همیشه null است در این Commit: extractPsychFromChatbot از file8
// می‌آید که تا Commit 9 ساخته نمی‌شود؛ صدا زدنش الان یعنی import شکسته به
// فایلی که وجود ندارد. interests مستقل از psych است و همین حالا پیاده
// می‌شود چون فقط passthrough مستقیم از rawChatbot.explicit_sport_interest است.
//
// چند تابع محاسباتی (decimalAge, bestOfThree, computeAnthropometricRatios,
// normalizeComposition, estimateVO2max, computeHandgripAsymmetry) برخلاف
// الگوی معمول این کدبیس (که فقط یک تابع اصلی + چند ثابت export می‌کند،
// نگاه کنید به engine/bodybuilding/file2_biometrics.js) جداگانه export
// شده‌اند، چون فرمول‌هاشان مرجع علمی مستقیم دارند (مثلاً VO2max از Léger &
// Gadoury 1989) و طبق بخش ۲.۶ سند باید مستقل از normalizeIntake تست بشوند.

import { TalentIdError } from "./shared/talentIdErrors.js";

const MS_PER_DAY = 86400000;
const DAYS_PER_YEAR = 365.25;

const VALID_SEX = ["male", "female"];

// طبق بخش ۲.۴ سند — بازه‌های Reject دقیقاً همین‌ها هستند.
const HEIGHT_MIN_CM = 80;
const HEIGHT_MAX_CM = 220;
const WEIGHT_MIN_KG = 15;
const WEIGHT_MAX_KG = 200;
const AGE_MIN_YEARS = 8;
const AGE_MAX_YEARS = 25;
const BODY_FAT_MIN_PERCENT = 3;
const BODY_FAT_MAX_PERCENT = 50;

// طبق بخش ۲.۴ سند — بازه‌های Warning (رد نمی‌کنند، فقط flag می‌زنند).
const RESTING_HR_MIN = 45;
const RESTING_HR_MAX = 100;
const SIT_AND_REACH_MIN = -25;
const SIT_AND_REACH_MAX = 40;
const COMPLETENESS_WARNING_THRESHOLD = 0.85;

// طبق بخش ۲.۳.۶ سند — Léger LA, Gadoury C. Validity of the 20 m shuttle
// run test... Can J Sport Sci 1989;14(1):21-6.
function estimateVO2max(beepLevel, chronoAge) {
  if (beepLevel == null || !Number.isFinite(Number(beepLevel))) return null;
  const velocity = 8 + 0.5 * Number(beepLevel);
  return 31.025 + 3.238 * velocity - 3.248 * chronoAge + 0.1536 * velocity * chronoAge;
}

// طبق بخش ۲.۳.۱ سند (AAAAKS: Age = (assessmentDate - dob) / 365.25).
function decimalAge(dob, assessmentDate) {
  const dobDate = dob instanceof Date ? dob : new Date(dob);
  const assessDate = assessmentDate instanceof Date ? assessmentDate : new Date(assessmentDate);
  const days = (assessDate.getTime() - dobDate.getTime()) / MS_PER_DAY;
  return Number((days / DAYS_PER_YEAR).toFixed(3));
}

// طبق بخش ۲.۳.۲ سند.
function bestOfThree(trials, higherIsBetter) {
  const filtered = (trials ?? [])
    .filter((v) => v != null && Number.isFinite(Number(v)))
    .map(Number);
  if (filtered.length === 0) return null;
  return higherIsBetter ? Math.max(...filtered) : Math.min(...filtered);
}

// طبق بخش ۲.۳.۸ سند: ٪۲۰ ناهم‌ترازی = هشدار برای رشته‌های نیازمند bilateral
// symmetry (خودِ warning در جای دیگری — file4/file13 — استفاده می‌شود، نه اینجا).
function computeHandgripAsymmetry(domMax, nondomMax) {
  if (!(domMax > 0) || nondomMax == null) return null;
  return (Math.abs(domMax - nondomMax) / domMax) * 100;
}

// طبق بخش ۲.۲ سند: frame_size «بر اساس مچ» است، اما سند هیچ آستانه‌ای
// نمی‌دهد. طبق تصمیم تاییدشده، از شاخص شناخته‌شده‌ی Grant's Frame Size
// Index استفاده می‌شود: r = height_cm / wrist_circumference_cm. مرجع:
// Grant JP. Handbook of Total Parenteral Nutrition. Philadelphia: WB
// Saunders; 1980 — جدول آستانه‌ی رایج در متون بالینی تغذیه/پرستاری، به
// تفکیک جنس. اگر threshold دقیق‌تر یا منبع محکم‌تری در بازبینی بعدی پیدا
// شد این تابع باید به‌روزرسانی شود. طبق تصمیم تاییدشده، frame_size یک فیلد
// informational/ثانویه است و در امتیازدهی رشته‌ها حیاتی استفاده نمی‌شود
// مگر جایی که سند صراحتاً اشاره کرده (مثلاً small frame در بخش ۵.۳.۸ FFMI).
const FRAME_SIZE_THRESHOLDS = {
  male: { small: 10.4, large: 9.6 },
  female: { small: 11.0, large: 10.1 },
};

function computeFrameSize(heightCm, wristCircumferenceCm, sex) {
  const thresholds = FRAME_SIZE_THRESHOLDS[sex];
  if (!thresholds || !(wristCircumferenceCm > 0)) return null;
  const r = heightCm / wristCircumferenceCm;
  if (r > thresholds.small) return "small";
  if (r < thresholds.large) return "large";
  return "medium";
}

// طبق بخش ۲.۳.۳ تا ۲.۳.۵ سند. arm_span_cm طبق مثال warning بخش ۲.۲
// ("arm_span estimated from height") اگر خالی باشد از روی قد تخمین زده
// می‌شود (تقریب رایج anthropometric: arm_span ≈ height)، نه reject فوری —
// MISSING_ARM_SPAN فقط برای حالت فرضی‌ای نگه داشته شده که height هم در
// دسترس نباشد؛ چون height زودتر (در validateRanges) reject می‌شود، این
// شاخه در عمل هرگز trigger نمی‌شود، اما به‌صورت defensive نگه داشته شده.
function computeAnthropometricRatios(anthropometrics, sex) {
  const standingHeightCm = Number(anthropometrics.standing_height_cm);
  const sittingHeightCm = Number(anthropometrics.sitting_height_cm);
  const weightKg = Number(anthropometrics.weight_kg);

  let armSpanCm = anthropometrics.arm_span_cm;
  let armSpanEstimated = false;
  if (armSpanCm === null || armSpanCm === undefined) {
    if (!(standingHeightCm > 0)) {
      throw new TalentIdError(
        "MISSING_ARM_SPAN",
        "arm_span_cm خالی است و چون standing_height_cm هم در دسترس نیست، قابل تخمین نیست؛ Ape Index قابل محاسبه نیست.",
        { anthropometrics }
      );
    }
    armSpanCm = standingHeightCm;
    armSpanEstimated = true;
  } else {
    armSpanCm = Number(armSpanCm);
  }

  const legLengthCm = standingHeightCm - sittingHeightCm;
  const heightM = standingHeightCm / 100;

  return {
    standing_height_cm: standingHeightCm,
    sitting_height_cm: sittingHeightCm,
    weight_kg: weightKg,
    arm_span_cm: armSpanCm,
    leg_length_cm: legLengthCm,
    ape_index: armSpanCm / standingHeightCm,
    cormic_index: sittingHeightCm / standingHeightCm,
    skeliac_index: legLengthCm / sittingHeightCm,
    bmi: weightKg / (heightM * heightM),
    frame_size: computeFrameSize(standingHeightCm, anthropometrics.wrist_circumference_cm, sex),
    _arm_span_estimated: armSpanEstimated,
  };
}

// طبق بخش ۲.۳.۷ سند (FFMI = FFM / height²).
function normalizeComposition(bodyCompositionBia, standingHeightCm) {
  const heightM = standingHeightCm / 100;
  const ffmKg = Number(bodyCompositionBia.fat_free_mass_kg);
  return {
    body_fat_percent: Number(bodyCompositionBia.body_fat_percent),
    smm_percent: Number(bodyCompositionBia.smm_percent_of_body_weight),
    tbw_percent: Number(bodyCompositionBia.total_body_water_percent),
    ffm_kg: ffmKg,
    ffm_index: ffmKg / (heightM * heightM),
  };
}

function normalizeBiometric(biometric) {
  return {
    resting_hr: Number(biometric.resting_heart_rate_bpm),
    balance: Number(biometric.balance_score_0_to_10),
    bilateral_asymmetry_percent: Number(biometric.bilateral_weight_asymmetry_percent),
  };
}

function normalizePerf(performanceTests, chronoAge) {
  const verticalJumpCm = bestOfThree(performanceTests.vertical_jump_cm, true);
  const broadJumpCm = bestOfThree(performanceTests.broad_jump_cm, true);
  const sprint10mSec = bestOfThree(performanceTests.sprint_10m_sec, false);
  const sprint30mSec = bestOfThree(performanceTests.sprint_30m_sec, false);
  const agilitySec = bestOfThree(performanceTests.agility_5_10_5_sec, false);
  const beepLevel = performanceTests.beep_test?.level ?? null;
  const beepShuttle = performanceTests.beep_test?.shuttle ?? null;
  const handgripDominantKg = bestOfThree(performanceTests.handgrip_dynamometer_kg?.dominant, true);
  const handgripNondomKg = bestOfThree(performanceTests.handgrip_dynamometer_kg?.non_dominant, true);

  return {
    vertical_jump_cm: verticalJumpCm,
    broad_jump_cm: broadJumpCm,
    sprint_10m_sec: sprint10mSec,
    sprint_30m_sec: sprint30mSec,
    agility_sec: agilitySec,
    vo2max_estimated: estimateVO2max(beepLevel, chronoAge),
    beep_level: beepLevel,
    beep_shuttle: beepShuttle,
    handgrip_dominant_kg: handgripDominantKg,
    handgrip_asymmetry_percent: computeHandgripAsymmetry(handgripDominantKg, handgripNondomKg),
    pushups_count: performanceTests.pushups_60sec_count ?? null,
    sit_and_reach_cm: performanceTests.sit_and_reach_cm ?? null,
    wall_toss_count: performanceTests.wall_toss_30sec_count ?? null,
  };
}

// طبق فیلدهای coach_input.medical_history نمونه‌ی بخش ۲.۱ سند — passthrough
// مستقیم؛ تفسیر پزشکی (activePathologyMap) کار file10 است، نه اینجا.
function normalizeMedical(medicalHistory) {
  return {
    active_pathologies: medicalHistory?.active_injuries ?? [],
    chronic_conditions: medicalHistory?.chronic_conditions ?? [],
    pain_max: medicalHistory?.pain_scale_current_max_0_to_10 ?? 0,
    physician_clearance: medicalHistory?.physician_clearance_status ?? null,
  };
}

function normalizeFamily(familySportHistory) {
  return {
    parent_athletes: Boolean(familySportHistory?.parent_athletes),
    elite_relatives: Boolean(familySportHistory?.elite_relatives),
  };
}

// طبق تصمیم تاییدشده: completeness_percent نسبت واقعی فیلدهای غیر-null از
// کل فیلدهای انتظاری سه منبع خام است — نه ۱.۰ ثابت، چون یک مقدار ثابت
// باعث می‌شود مکانیزم warning داده‌ی ناقص (بخش ۲.۴ سند) هیچ‌وقت فعال نشود.
// device_confidence طبق تصمیم تاییدشده null می‌ماند اگر دستگاه ندهد —
// فرض اعتماد کامل (۱) بدون شواهد یعنی اختراع یک مقدار بالینی.
const DEVICE_FIELD_PATHS = [
  ["anthropometrics", "standing_height_cm"],
  ["anthropometrics", "sitting_height_cm"],
  ["anthropometrics", "weight_kg"],
  ["anthropometrics", "arm_span_cm"],
  ["anthropometrics", "wrist_circumference_cm"],
  ["anthropometrics", "shoulder_width_cm"],
  ["anthropometrics", "hip_width_cm"],
  ["body_composition_bia", "body_fat_percent"],
  ["body_composition_bia", "skeletal_muscle_mass_kg"],
  ["body_composition_bia", "total_body_water_percent"],
  ["body_composition_bia", "fat_free_mass_kg"],
  ["biometric", "resting_heart_rate_bpm"],
  ["biometric", "balance_score_0_to_10"],
  ["biometric", "bilateral_weight_asymmetry_percent"],
];

const COACH_FIELD_PATHS = [
  ["performance_tests", "vertical_jump_cm"],
  ["performance_tests", "broad_jump_cm"],
  ["performance_tests", "sprint_10m_sec"],
  ["performance_tests", "sprint_30m_sec"],
  ["performance_tests", "agility_5_10_5_sec"],
  ["performance_tests", "beep_test"],
  ["performance_tests", "handgrip_dynamometer_kg"],
  ["performance_tests", "pushups_60sec_count"],
  ["performance_tests", "sit_and_reach_cm"],
  ["performance_tests", "wall_toss_30sec_count"],
];

function fieldPresent(root, path) {
  let cur = root;
  for (const key of path) {
    if (cur == null) return false;
    cur = cur[key];
  }
  return cur !== null && cur !== undefined;
}

function assessDataQuality(rawDevice, rawCoach) {
  const allPaths = [
    ...DEVICE_FIELD_PATHS.map((path) => ({ root: rawDevice, path })),
    ...COACH_FIELD_PATHS.map((path) => ({ root: rawCoach, path })),
  ];
  const presentCount = allPaths.filter(({ root, path }) => fieldPresent(root, path)).length;
  const completenessPercent = allPaths.length === 0 ? 1 : presentCount / allPaths.length;

  return {
    completeness_percent: Number(completenessPercent.toFixed(3)),
    device_confidence: rawDevice.device_confidence ?? null,
  };
}

function assertRequired(rawDevice, rawCoach) {
  if (!rawDevice || typeof rawDevice !== "object") {
    throw new TalentIdError("MISSING_DEVICE_DATA", "rawDevice خالی یا نامعتبر است.", {});
  }
  if (!rawCoach || typeof rawCoach !== "object") {
    throw new TalentIdError("MISSING_COACH_DATA", "rawCoach خالی یا نامعتبر است.", {});
  }
}

// طبق بخش ۲.۴ سند — قوانین Reject دقیقاً همین‌ها هستند.
function validateRanges(rawDevice, rawCoach, chronoAge) {
  const heightCm = Number(rawDevice.anthropometrics?.standing_height_cm);
  if (!(heightCm >= HEIGHT_MIN_CM && heightCm <= HEIGHT_MAX_CM)) {
    throw new TalentIdError(
      "INVALID_HEIGHT",
      `height_cm نامعتبر: "${rawDevice.anthropometrics?.standing_height_cm}". باید بین ${HEIGHT_MIN_CM} تا ${HEIGHT_MAX_CM} سانتی‌متر باشد.`,
      { value: rawDevice.anthropometrics?.standing_height_cm }
    );
  }

  const weightKg = Number(rawDevice.anthropometrics?.weight_kg);
  if (!(weightKg >= WEIGHT_MIN_KG && weightKg <= WEIGHT_MAX_KG)) {
    throw new TalentIdError(
      "INVALID_WEIGHT",
      `weight_kg نامعتبر: "${rawDevice.anthropometrics?.weight_kg}". باید بین ${WEIGHT_MIN_KG} تا ${WEIGHT_MAX_KG} کیلوگرم باشد.`,
      { value: rawDevice.anthropometrics?.weight_kg }
    );
  }

  if (!Number.isFinite(chronoAge) || !(chronoAge >= AGE_MIN_YEARS && chronoAge <= AGE_MAX_YEARS)) {
    throw new TalentIdError(
      "INVALID_AGE",
      `سن دهدهی نامعتبر: "${chronoAge}". باید بین ${AGE_MIN_YEARS} تا ${AGE_MAX_YEARS} سال باشد (خارج از scope موتور).`,
      { value: chronoAge }
    );
  }

  const bodyFatPercent = Number(rawDevice.body_composition_bia?.body_fat_percent);
  if (!(bodyFatPercent >= BODY_FAT_MIN_PERCENT && bodyFatPercent <= BODY_FAT_MAX_PERCENT)) {
    throw new TalentIdError(
      "INVALID_BODY_FAT",
      `body_fat_percent نامعتبر: "${rawDevice.body_composition_bia?.body_fat_percent}". باید بین ${BODY_FAT_MIN_PERCENT} تا ${BODY_FAT_MAX_PERCENT} درصد باشد.`,
      { value: rawDevice.body_composition_bia?.body_fat_percent }
    );
  }

  if (!VALID_SEX.includes(rawCoach.biological_sex)) {
    throw new TalentIdError(
      "INVALID_SEX",
      `biological_sex نامعتبر: "${rawCoach.biological_sex}". مقادیر مجاز: ${VALID_SEX.join(", ")}`,
      { value: rawCoach.biological_sex }
    );
  }
}

function normalizeIntake(rawDevice, rawCoach, rawChatbot) {
  assertRequired(rawDevice, rawCoach);

  const dobDate = new Date(rawCoach.date_of_birth);
  const assessmentDate = new Date(rawCoach.assessment_date);
  if (Number.isNaN(dobDate.getTime())) {
    throw new TalentIdError(
      "INVALID_DATE_OF_BIRTH",
      `date_of_birth نامعتبر: "${rawCoach.date_of_birth}".`,
      { value: rawCoach.date_of_birth }
    );
  }
  if (Number.isNaN(assessmentDate.getTime())) {
    throw new TalentIdError(
      "INVALID_ASSESSMENT_DATE",
      `assessment_date نامعتبر: "${rawCoach.assessment_date}".`,
      { value: rawCoach.assessment_date }
    );
  }

  const chronoAge = decimalAge(dobDate, assessmentDate);
  validateRanges(rawDevice, rawCoach, chronoAge);

  const anthro = computeAnthropometricRatios(rawDevice.anthropometrics, rawCoach.biological_sex);
  const composition = normalizeComposition(rawDevice.body_composition_bia, anthro.standing_height_cm);
  const biometric = normalizeBiometric(rawDevice.biometric);
  const perf = normalizePerf(rawCoach.performance_tests, chronoAge);
  const dataQuality = assessDataQuality(rawDevice, rawCoach);
  const birthMonth = dobDate.getMonth() + 1;
  // طبق تصمیم تاییدشده‌ی Commit 11 (گزینه‌ی ج): birth_month بالا میلادی
  // است (JS Date.getMonth) و معنایش عوض نشد. برای RAE Alert (بخش ۱۲.۳ سند،
  // بر اساس فروردین/اردیبهشت/خرداد — ماه‌های تقویم شمسی) یک فیلد جداگانه
  // و صریح‌النام اضافه شد تا هیچ consumer آینده‌ای فرض نکند birth_month
  // خودش شمسی است. از Intl.DateTimeFormat با calendar شمسی built-in
  // استفاده شده (بدون کتابخانه‌ی خارجی جدید — همان خانواده‌ی الگوی
  // toLocaleDateString("fa-IR") که در src/components/StudentCard.jsx برای
  // نمایش تاریخ از قبل در پروژه استفاده می‌شود). وریفای شد با تاریخ‌های
  // مرزی (۲۰ و ۲۱ مارس ۲۰۱۳ → درست به ۱ فروردین و ۳۰ اسفند تفکیک می‌شوند).
  const birthMonthShamsi = Number(
    new Intl.DateTimeFormat("en-US-u-ca-persian", { month: "numeric" }).format(dobDate)
  );

  // طبق بخش ۲.۴ سند — Warning جمع می‌شوند، رد نمی‌کنند.
  const warnings = [];
  if (anthro._arm_span_estimated) {
    warnings.push("arm_span estimated from height");
  }
  if (dataQuality.completeness_percent < COMPLETENESS_WARNING_THRESHOLD) {
    warnings.push("data_quality_completeness_below_85_percent");
  }
  if (!(biometric.resting_hr >= RESTING_HR_MIN && biometric.resting_hr <= RESTING_HR_MAX)) {
    warnings.push(
      `resting_hr خارج از رنج طبیعی نوجوانان (${RESTING_HR_MIN}-${RESTING_HR_MAX}) — recheck cardio`
    );
  }
  if (
    perf.sit_and_reach_cm != null &&
    !(perf.sit_and_reach_cm >= SIT_AND_REACH_MIN && perf.sit_and_reach_cm <= SIT_AND_REACH_MAX)
  ) {
    warnings.push("sit_and_reach_cm مقدار غیرعادی — protocol error");
  }

  const { _arm_span_estimated, ...anthroPublic } = anthro;

  return {
    meta: {
      athlete_id: rawCoach.athlete_id ?? null,
      assessment_date: rawCoach.assessment_date,
      scan_id: rawDevice.scan_id ?? null,
      data_quality: {
        completeness_percent: dataQuality.completeness_percent,
        device_confidence: dataQuality.device_confidence,
        warnings,
      },
    },
    demographics: {
      chronological_age_decimal: chronoAge,
      biological_sex: rawCoach.biological_sex,
      date_of_birth: rawCoach.date_of_birth,
      birth_month: birthMonth,
      birth_month_shamsi: birthMonthShamsi,
    },
    anthropometrics: anthroPublic,
    body_composition: composition,
    biometric,
    posture: rawDevice.posture ?? {},
    rom: rawDevice.rom_deficits ?? {},
    hypermobility: Boolean(rawDevice.hypermobility_detected),
    performance: perf,
    medical: normalizeMedical(rawCoach.medical_history),
    psych: null,
    interests: rawChatbot?.explicit_sport_interest ?? [],
    family: normalizeFamily(rawCoach.family_sport_history),
  };
}

export {
  normalizeIntake,
  decimalAge,
  bestOfThree,
  computeAnthropometricRatios,
  normalizeComposition,
  estimateVO2max,
  computeHandgripAsymmetry,
  computeFrameSize,
  VALID_SEX,
  HEIGHT_MIN_CM,
  HEIGHT_MAX_CM,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  AGE_MIN_YEARS,
  AGE_MAX_YEARS,
  BODY_FAT_MIN_PERCENT,
  BODY_FAT_MAX_PERCENT,
};
