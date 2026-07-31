// اعتبارسنجی SportRequirementEntry طبق schema بخش ۱۸.۱ سند معماری
// استعدادیابی. طبق بخش ۱۸.۲ سند، حداقل باید جمع performance_weights ۱.۰۰
// باشه و psych_requirements بین ۱ تا ۵ باشن؛ بقیه‌ی چک‌ها (فیلدهای اجباری،
// category مجاز، آرایه بودن لیست‌های contraindication) اضافه‌ی این فایله
// تا خطاهای seed کردن رشته‌ها زودتر (در Commit 1) گرفته بشن، نه دیرتر در
// Commit 17-19 که ۵۲ رشته وارد می‌شن.
import { TalentIdError } from "./talentIdErrors.js";

const VALID_CATEGORIES = [
  "strength",
  "team_ball",
  "combat",
  "record",
  "endurance",
  "racket",
  "precision",
  "aesthetic",
];

// طبق بخش ۹.۱ و ۱۰.۲ سند — همین ۷ تا، نه کم نه زیاد.
const PSYCH_TRAITS = [
  "teamwork_score",
  "aggression_contact",
  "focus_patience",
  "pressure_tolerance",
  "dynamic_activity",
  "chaos_decision",
  "resilience",
];

const WEIGHT_SUM_TOLERANCE = 0.01;

// طبق تصمیم تاییدشده‌ی Commit 19: فقط رشته‌هایی که در این allowlist صریحاً
// نام برده شده‌اند مجازند performance_weights خالی داشته باشند (تنها مورد
// فعلی: chess — هیچ تست فیزیکی موجود ربطی به شطرنج ندارد). این یک محافظ
// عمدی است، نه راحتی: بدون این allowlist، یک رشته‌ی آینده که به‌اشتباه
// (نه آگاهانه) performance_weights را خالی بگذارد بی‌صدا از چک رد می‌شد.
// اگر رشته‌ی جدیدی واقعاً بدون بُعد فیزیکی معنادار اضافه شد، این لیست را
// آگاهانه گسترش بده.
const EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST = new Set(["chess"]);

function validateSportEntry(entry) {
  if (!entry || typeof entry !== "object") {
    throw new TalentIdError("SPORT_ENTRY_INVALID", "sport entry باید یک آبجکت باشد.", { entry });
  }

  for (const field of ["id", "name_fa", "name_en", "category", "subcategory"]) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      throw new TalentIdError(
        "SPORT_ENTRY_MISSING_FIELD",
        `فیلد "${field}" برای رشته اجباری است و باید رشته‌ی غیرخالی باشد. مقدار فعلی: "${entry[field]}"`,
        { sportId: entry.id, field }
      );
    }
  }

  if (typeof entry.is_position_specific !== "boolean") {
    throw new TalentIdError(
      "SPORT_ENTRY_INVALID_FIELD",
      `is_position_specific برای رشته "${entry.id}" باید true یا false باشد.`,
      { sportId: entry.id }
    );
  }

  if (!VALID_CATEGORIES.includes(entry.category)) {
    throw new TalentIdError(
      "SPORT_ENTRY_INVALID_CATEGORY",
      `category نامعتبر برای رشته "${entry.id}": "${entry.category}". مقادیر مجاز: ${VALID_CATEGORIES.join(", ")}`,
      { sportId: entry.id, category: entry.category }
    );
  }

  if (!entry.performance_weights || typeof entry.performance_weights !== "object") {
    throw new TalentIdError(
      "SPORT_ENTRY_MISSING_FIELD",
      `performance_weights برای رشته "${entry.id}" اجباری است.`,
      { sportId: entry.id }
    );
  }
  const weightSum = Object.values(entry.performance_weights).reduce((a, b) => a + b, 0);
  const hasEmptyWeights = Object.keys(entry.performance_weights).length === 0;
  if (hasEmptyWeights && !EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST.has(entry.id)) {
    throw new TalentIdError(
      "SPORT_ENTRY_WEIGHT_SUM",
      `رشته "${entry.id}": performance_weights خالی است. این فقط برای رشته‌های صراحتاً بدون بُعد فیزیکی مجاز است (فهرست فعلی: ${[...EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST].join(", ")}). اگر این یک رشته‌ی جدید و واقعاً بدون تست فیزیکی مرتبط است، EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST را آگاهانه گسترش بده؛ در غیر این صورت این احتمالاً یک باگ است.`,
      { sportId: entry.id }
    );
  }
  if (!hasEmptyWeights && Math.abs(weightSum - 1.0) > WEIGHT_SUM_TOLERANCE) {
    throw new TalentIdError(
      "SPORT_ENTRY_WEIGHT_SUM",
      `رشته "${entry.id}": مجموع performance_weights باید ۱.۰۰ باشد، مقدار فعلی ${weightSum.toFixed(3)} است.`,
      { sportId: entry.id, weightSum }
    );
  }

  if (!entry.psych_requirements || typeof entry.psych_requirements !== "object") {
    throw new TalentIdError(
      "SPORT_ENTRY_MISSING_FIELD",
      `psych_requirements برای رشته "${entry.id}" اجباری است.`,
      { sportId: entry.id }
    );
  }
  for (const trait of PSYCH_TRAITS) {
    const value = entry.psych_requirements[trait];
    if (typeof value !== "number" || value < 1 || value > 5) {
      throw new TalentIdError(
        "SPORT_ENTRY_INVALID_PSYCH_TRAIT",
        `رشته "${entry.id}": psych_requirements.${trait} باید عددی بین ۱ تا ۵ باشد، مقدار فعلی "${value}" است.`,
        { sportId: entry.id, trait, value }
      );
    }
  }

  for (const field of ["postural_contraindications", "medical_contraindications", "critical_perf_tests"]) {
    if (entry[field] !== undefined && !Array.isArray(entry[field])) {
      throw new TalentIdError(
        "SPORT_ENTRY_INVALID_FIELD",
        `رشته "${entry.id}": ${field} باید آرایه باشد (یا اصلاً تعریف نشود).`,
        { sportId: entry.id, field }
      );
    }
  }

  return true;
}

export { validateSportEntry, VALID_CATEGORIES, PSYCH_TRAITS, EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST };
