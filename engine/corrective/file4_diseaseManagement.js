// فایل ۴ موتور اصلاحی (بخش ۳.۳ سند): مدیریت بیماری‌ها + معماری اجباری جلسه.
//
// تصمیم معماری مهم (چرا بازسازی نشده، ولی هم کپی هم نشده): الگوریتم «ترکیب
// چند محدودیت هم‌زمان — سخت‌گیرترین برنده است» از
// engine/bodybuilding/file3_hardVeto/mergeRestrictions.js مستقیماً import
// و بازاستفاده می‌شود (خودِ الگوریتم عمومی و از قبل تست‌شده است، دامنه‌محور
// نیست). اما توابع هر بیماری اینجا از نو نوشته شده‌اند، نه کپی از
// engine/bodybuilding/file3_hardVeto/conditions/*.js — چون مقایسه‌ی متن دو
// سند فرق‌های واقعی نشان داد: مثلاً حذف تعادل یک‌طرفه برای دیابت در سند
// بدنسازی فقط مشروط به نوروپاتی است ولی در سند اصلاحی بی‌قیدوشرط آمده؛ و
// چند بیماری در نسخه‌ی بدنسازی یک بازه‌ی %۱RM هم دارند که در سند اصلاحی
// اصلاً ذکر نشده (و بی‌ربط است، چون موتور اصلاحی—فایل ۲—اصلاً مفهوم %۱RM
// ندارد). کپی مستقیم یعنی وارد کردن قانون یا عدد اشتباه.
import { mergeRestrictions, emptyPatch } from "../bodybuilding/file3_hardVeto/mergeRestrictions.js";

const SUPPORTED_DISEASES = ["diabetes", "arthritis", "heartOrHypertension", "cerebralPalsy", "multipleSclerosis", "kidneyDisease"];

const MANDATORY_HEADER_WARNING = "در صورت تنگی نفس/سرگیجه فوراً متوقف کنید.";

// --- استراتژی‌های اختصاصی بیماری (بخش ۳.۳ سند) ---

function diabetes() {
  return {
    ...emptyPatch(),
    banned_tags: ["unilateral_balance"],
    equipment_priority: ["seated_supported"],
    warnings: ["هشدار مصرف کربوهیدرات پیش/حین تمرین اجباری است."],
  };
}

function arthritis() {
  return {
    ...emptyPatch(),
    rep_range: [15, 20],
    tempo_overrides: ["3-0-3-0"],
    banned_tags: ["High_Impact", "Jumping", "Plyometric"],
    equipment_priority: ["closed_kinetic_chain"],
  };
}

function heartOrHypertension() {
  return {
    ...emptyPatch(),
    rpe_range: [null, 5],
    // سند: «استراحت پایه +۲۰٪ (حداقل ۹۰-۱۲۰ ثانیه)» — چون پایه‌ی دقیق اینجا
    // مشخص نیست، ۹۰ کف مطلق تضمین‌شده در نظر گرفته می‌شود (همان الگوی
    // مستندشده‌ی heartDisease.js بدنسازی)؛ اعمال +۲۰٪ کار لایه‌ی نهایی است.
    rest_sec_min: 90,
    tempo_overrides: ["2-0-2-0"],
    banned_tags: ["Valsalva", "Isometric"],
  };
}

function cerebralPalsy() {
  return {
    ...emptyPatch(),
    rest_sec_min: 90, // قفل ۹۰-۱۲۰ ثانیه؛ ۹۰ کف تضمین‌شده
    tempo_overrides: ["4-0-2-0"],
    banned_tags: ["Explosive"],
    equipment_priority: ["static_stretching_priority"],
  };
}

function multipleSclerosis() {
  return {
    ...emptyPatch(),
    rpe_range: [null, 5],
    equipment_priority: ["seated_balance_core_stability"],
    warnings: [
      "الزام محیط خنک (گرمای بیش‌ازحد علائم را بدتر می‌کند).",
      "ساختار ست‌ها باید اینتروالی باشد (کار کوتاه + استراحت کافی برای بازگشت دما)، نه سری‌های پیوسته‌ی طولانی — طبق بخش ۱.۲ سند، بدون سقف زمانی ثابت چون منبع علمی دقیقی برای آن یافت نشد.",
    ],
  };
}

function kidneyDisease({ onDialysis = false, hasFistula = false, isDialysisDayToday = false } = {}) {
  const isHardStop = onDialysis && isDialysisDayToday;
  return {
    ...emptyPatch(),
    banned_tags: hasFistula ? ["direct_wrist_load"] : [],
    equipment_priority: hasFistula ? ["pressure_machine"] : [],
    specific_exercise_overrides: hasFistula ? [{ matches: "pull_up", action: "ban" }] : [],
    hard_stop: isHardStop,
    hard_stop_reasons: isHardStop ? ["روز دیالیز — تمرین سنگین کاملاً ممنوع"] : [],
  };
}

// --- ترکیب چند بیماری هم‌زمان (سخت‌گیرترین برنده است) ---
function evaluateDiseaseManagement({ diseases = [], onDialysis = false, hasFistula = false, isDialysisDayToday = false } = {}) {
  if (!Array.isArray(diseases) || diseases.some((d) => !SUPPORTED_DISEASES.includes(d))) {
    throw new Error(`diseases نامعتبر: "${JSON.stringify(diseases)}". مقادیر مجاز: ${SUPPORTED_DISEASES.join(", ")}`);
  }

  const patches = [];
  if (diseases.includes("diabetes")) patches.push(diabetes());
  if (diseases.includes("arthritis")) patches.push(arthritis());
  if (diseases.includes("heartOrHypertension")) patches.push(heartOrHypertension());
  if (diseases.includes("cerebralPalsy")) patches.push(cerebralPalsy());
  if (diseases.includes("multipleSclerosis")) patches.push(multipleSclerosis());
  if (diseases.includes("kidneyDisease")) patches.push(kidneyDisease({ onDialysis, hasFistula, isDialysisDayToday }));

  return mergeRestrictions(patches);
}

// --- معماری اجباری جلسه (بخش ۳.۳ سند، «تریگر» + «معماری اجباری جلسه») ---
// این یک لایه‌ی جدا از evaluateDiseaseManagement است: سقف RPE=۶ اینجا یک
// سقف عمومی حالت پزشکی است، مستقل از سقف‌های سخت‌گیرتر اختصاصی بیماری
// (مثلاً RPE=۵ برای قلبی/MS) — ترکیب نهایی این دو لایه کار یک مرحله‌ی
// بعدی (fascade نهایی، هنوز ساخته نشده) است، نه این فایل.
function resolveMedicalModeSessionArchitecture({ diseases = [], monthNumber, hasCardiacCondition = false }) {
  if (!Array.isArray(diseases) || diseases.some((d) => !SUPPORTED_DISEASES.includes(d))) {
    throw new Error(`diseases نامعتبر: "${JSON.stringify(diseases)}". مقادیر مجاز: ${SUPPORTED_DISEASES.join(", ")}`);
  }
  if (!Number.isInteger(monthNumber) || monthNumber < 1) {
    throw new Error(`monthNumber نامعتبر: "${monthNumber}". باید عدد صحیح ≥۱ باشد.`);
  }

  if (diseases.length === 0) {
    return { medicalModeActive: false };
  }

  return {
    medicalModeActive: true,
    rpeCap: 6,
    sessionMinutesRange: monthNumber === 1 ? [30, 45] : [null, 60],
    restSecRange: [60, 120],
    monthlyProgressionCapPercent: 5,
    warmupMinutes: hasCardiacCondition ? 12 : 10,
    lissForcedFromMinute: 10,
    lissMonthlyIncreasePercent: 20,
    lissSessionCapMinutes: 60,
    cooldownMinutes: 5,
    requiresIntervalStructure: diseases.includes("multipleSclerosis"),
    mandatoryHeaderWarning: MANDATORY_HEADER_WARNING,
  };
}

export {
  SUPPORTED_DISEASES,
  diabetes,
  arthritis,
  heartOrHypertension,
  cerebralPalsy,
  multipleSclerosis,
  kidneyDisease,
  evaluateDiseaseManagement,
  resolveMedicalModeSessionArchitecture,
};
