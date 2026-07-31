// فایل ۱۱ موتور استعدادیابی (بخش ۱۲ سند معماری): Bio-Banding + RAE Alert.
// دو کار مجزا طبق تعریف کاربر برای Commit 11:
// ۱) Bio-Banding: تعدیل امتیازهای Bio/Perf/Psych بر اساس maturity_type
//    (خروجی Commit 3) — Early Maturer در رشته‌های قدرتی -۱۰٪، Late Maturer
//    +۱۵٪ در همه‌ی رشته‌ها.
// ۲) RAE Alert: هشدار Relative Age Effect بر اساس ماه تولد شمسی.
//
// ⚠️ ورودی‌های این فایل خروجی ۴ Commit قبلی‌اند. طبق درس Commit 8
// (mismatch نام فیلد بین performance_weights و NormalizedIntake.performance)،
// قبل از این پیاده‌سازی هر ۴ ورودی مستقیماً Read/grep شدند، نه فرض:
// - maturityProfile (file2/Commit 3): آبجکت flat با `maturity_type` ∈
//   {early_maturer, late_maturer, on_time_maturer, unknown}.
// - bioScores (file4/Commit 5، calculateBioScores): sportId-keyed،
//   فیلد قابل تعدیل = `final_bio_score`.
// - perfScores (file7/Commit 8، calculatePerfScores): sportId-keyed،
//   فیلد قابل تعدیل = `final_perf_score`.
// - psychScores (file9/Commit 9، calculatePsychScores): sportId-keyed،
//   فیلد قابل تعدیل = `final_psych_score`.
// این سه اسم («final_bio_score»/«final_perf_score»/«final_psych_score»)
// عمداً یکسان نیستند — دقیقاً همان طبقه از mismatch که در Commit 8 گرفتار
// شدیم؛ اینجا هرکدام جداگانه و صریح خوانده می‌شوند، نه با یک نام مشترک فرضی.
//
// ⚠️ birth_month_shamsi (تصمیم تاییدشده‌ی Commit 11، گزینه‌ی ج): در همین
// Commit به file1_intakeInputs.js اضافه شد، چون birth_month موجود (از
// Commit 2) میلادی است (JS Date.getMonth) و RAE بر اساس فروردین/اردیبهشت/
// خرداد (ماه‌های تقویم شمسی) تعریف می‌شود — این دو معادل هم نیستند.

import { isPowerSport } from "./shared/sportCategories.js";
import { TalentIdError } from "./shared/talentIdErrors.js";

const VALID_MATURITY_TYPES = new Set(["early_maturer", "late_maturer", "on_time_maturer", "unknown"]);

// طبق تصمیم تاییدشده‌ی Commit 11 (پیام کاربر: تعریف Commit 11).
const EARLY_MATURER_POWER_SPORT_FACTOR = 0.9; // -۱۰٪
const LATE_MATURER_FACTOR = 1.15; // +۱۵٪
const NEUTRAL_FACTOR = 1.0;

// طبق تصمیم تاییدشده‌ی Commit 3: "unknown" یعنی selectMaturityFormula به
// chronological_fallback رفته (سن خارج از بازه‌ی معتبر Mirwald) — نه early
// نه late داریم، پس بدون تعدیل (۱.۰)؛ حدس زدن جهت غلط است.
const VALID_ADJUSTMENT_FACTORS = new Set([EARLY_MATURER_POWER_SPORT_FACTOR, NEUTRAL_FACTOR, LATE_MATURER_FACTOR]);

// طبق بخش ۱۲.۳ سند: فروردین=۱، اردیبهشت=۲، خرداد=۳ (سه‌ماهه‌ی اول سال شمسی).
const RAE_ALERT_MONTHS_SHAMSI = new Set([1, 2, 3]);
const SHAMSI_MONTH_NAMES_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeMaturityAdjustmentFactor(maturityType, isPower) {
  if (!VALID_MATURITY_TYPES.has(maturityType)) {
    throw new TalentIdError(
      "BIO_BANDING_UNKNOWN_MATURITY_TYPE",
      `maturity_type نامعتبر: "${maturityType}". مقادیر مجاز: ${[...VALID_MATURITY_TYPES].join(", ")}`,
      { maturityType }
    );
  }
  if (maturityType === "late_maturer") return LATE_MATURER_FACTOR;
  if (maturityType === "early_maturer" && isPower) return EARLY_MATURER_POWER_SPORT_FACTOR;
  return NEUTRAL_FACTOR;
}

function _makeBioBandingDriver(maturityType, isPower, factor) {
  if (factor === NEUTRAL_FACTOR) return null;
  const percent = Math.round((factor - 1) * 100);
  return {
    driver_id: `bio_banding.${maturityType}`,
    category: "bio_banding",
    maturity_type: maturityType,
    is_power_sport: isPower,
    factor,
    magnitude_percent: percent,
    narrative_short:
      factor === LATE_MATURER_FACTOR
        ? "بلوغ دیررس — تعدیل مثبت جبرانی روی همه‌ی امتیازها (بخش ۱۲.۲ سند)"
        : "بلوغ زودرس در رشته‌ی قدرتی — تعدیل منفی برای جبران مزیت موقت رشد فیزیکی",
  };
}

function calculateBioBanding(sportRequirementMatrix, bioScores, perfScores, psychScores, maturityProfile) {
  const maturityType = maturityProfile.maturity_type;
  const results = {};

  for (const sportId of Object.keys(sportRequirementMatrix)) {
    const isPower = isPowerSport(sportId);
    const factor = computeMaturityAdjustmentFactor(maturityType, isPower);
    const driver = _makeBioBandingDriver(maturityType, isPower, factor);

    results[sportId] = {
      adjusted_bio_score: clamp(bioScores[sportId].final_bio_score * factor, 0, 200),
      adjusted_perf_score: clamp(perfScores[sportId].final_perf_score * factor, 0, 200),
      adjusted_psych_score: clamp(psychScores[sportId].final_psych_score * factor, 0, 100),
      maturity_adjustment_factor: factor,
      drivers: driver ? [driver] : [],
    };
  }

  // ⚠️ REGRESSION GUARD — این چک را حذف نکنید. هم‌الگوی file7/file10:
  // هیچ رشته‌ای از خروجی حذف نمی‌شود و factor همیشه یکی از سه مقدار
  // تعریف‌شده در سند است (بدون مقدار میانی حدسی).
  const expectedIds = Object.keys(sportRequirementMatrix);
  const actualIds = Object.keys(results);
  if (actualIds.length !== expectedIds.length) {
    throw new TalentIdError(
      "BIO_BANDING_VETO_VIOLATION",
      `اصل «هرگز حذف نشو» نقض شد: انتظار ${expectedIds.length} رشته در خروجی بود، ${actualIds.length} گرفتیم.`,
      { expectedIds, actualIds }
    );
  }
  for (const [sportId, result] of Object.entries(results)) {
    if (!VALID_ADJUSTMENT_FACTORS.has(result.maturity_adjustment_factor)) {
      throw new TalentIdError(
        "BIO_BANDING_VETO_VIOLATION",
        `اصل «هرگز حذف نشو» نقض شد: factor نامعتبر "${result.maturity_adjustment_factor}" برای "${sportId}".`,
        { sportId, factor: result.maturity_adjustment_factor }
      );
    }
  }

  return results;
}

// طبق بخش ۱۲.۳ سند: RAE Alert در سطح ورزشکار است، نه per-sport — مستقل از
// calculateBioBanding فراخوانی می‌شود.
function computeRaeAlert(birthMonthShamsi) {
  if (!Number.isInteger(birthMonthShamsi) || birthMonthShamsi < 1 || birthMonthShamsi > 12) {
    throw new TalentIdError(
      "BIO_BANDING_INVALID_MONTH",
      `birth_month_shamsi نامعتبر: "${birthMonthShamsi}". باید عدد صحیح بین ۱ تا ۱۲ باشد.`,
      { birthMonthShamsi }
    );
  }

  const alert = RAE_ALERT_MONTHS_SHAMSI.has(birthMonthShamsi);
  return {
    alert,
    birth_month_shamsi: birthMonthShamsi,
    month_name_fa: SHAMSI_MONTH_NAMES_FA[birthMonthShamsi - 1],
    narrative: alert
      ? "تولد در سه‌ماهه‌ی اول سال شمسی (فروردین/اردیبهشت/خرداد) — این ورزشکار نسبت به هم‌گروهی‌های متولد اواخر سال، در همان رده‌ی سنی، مسن‌تر و از نظر رشد فیزیکی جلوتر است. مزیت عملکردی فعلی ممکن است ناشی از این تفاوت سنی نسبی (Relative Age Effect) باشد، نه استعداد واقعی — در قضاوت مربی لحاظ شود."
      : null,
  };
}

export {
  calculateBioBanding,
  computeMaturityAdjustmentFactor,
  computeRaeAlert,
  EARLY_MATURER_POWER_SPORT_FACTOR,
  LATE_MATURER_FACTOR,
  NEUTRAL_FACTOR,
  RAE_ALERT_MONTHS_SHAMSI,
};
