// فایل ۱۵ موتور استعدادیابی (بخش ۱۶ سند معماری): طبقه‌بندی نهایی برای
// Coach Dashboard. ورودی مستقیماً خروجی Commit 13 (generateMatchReports) است.
//
// ⚠️ این ماژول یک **لایه‌ی نمایشی/فیلترکننده** است، نه منبع حقیقتِ داده
// (تصمیم تاییدشده‌ی Commit 15). MatchReport کامل هر رشته همیشه در خروجی
// خودِ Commit 13 (generateMatchReports) در دسترس می‌ماند — این فایل فقط
// تصمیم می‌گیرد چه چیزی در نمای *پیش‌فرض* داشبورد نشان داده شود. رشته‌ای
// که اینجا (طبق تصمیم زیر) از هیچ سطلی سر در نمی‌آورد، **حذف داده نشده**،
// فقط از نمای پیش‌فرض بیرون مانده — تمایزی که باید در توسعه‌ی آینده
// (مثلاً یک UI «مشاهده‌ی همه» در Commit 21) رعایت شود، نه با data loss
// اشتباه گرفته شود.
//
// ⚠️ یافته‌ی Commit 15 (تصمیم تاییدشده، گزینه‌ی الف + TODO): سند بخش ۱۶.۳/
// ۱۶.۴ برای رشته‌های A/B مازاد بر سقف (رتبه‌ی ۴+ در A، رتبه‌ی ۶+ در B) هیچ
// سطلی تعریف نکرده — برخلاف C که «بقیه» صریحاً tier_C_low_potential می‌شود.
// با ۵ رشته‌ی فعلی این هرگز رخ نمی‌دهد؛ رجوع کنید به
// docs/TODO-tier-overflow-wave2.md برای بازبینی لازم در Wave 2-3.

// طبق بخش ۱۶.۳ سند.
const TIER_A_MAX = 3;
const TIER_B_MAX = 5;
const TIER_C_CORRECTABLE_MAX = 5;

function _sortByFinalScoreDesc(reports) {
  return [...reports].sort((a, b) => b.final_score - a.final_score);
}

// طبق بخش ۱۶.۳/۱۶.۴ سند: matchReports یک آبجکت sportId-keyed است (خروجی
// واقعی Commit 13)، نه Map — هم‌قرارداد همیشگی از Commit 1.
function classifyTiers(matchReports) {
  const allReports = Object.values(matchReports);

  const aReports = _sortByFinalScoreDesc(allReports.filter((r) => r.final_tier === "A"));
  const bReports = _sortByFinalScoreDesc(allReports.filter((r) => r.final_tier === "B"));
  const cReports = allReports.filter((r) => r.final_tier === "C");
  const mReports = allReports.filter((r) => r.final_tier === "M");

  // طبق بخش ۱۶.۳ سند: «کلاس C: حداکثر ۵ رشته که what_if_analysis آنها A است».
  const cCorrectableCandidates = _sortByFinalScoreDesc(
    cReports.filter((r) => r.what_if_analysis?.estimated_tier_if_corrected === "A")
  );

  // طبق تصمیم تاییدشده‌ی Commit 15: رشته‌های A/B مازاد بر سقف کاملاً از
  // خروجی این تابع کنار گذاشته می‌شوند (گزینه‌ی الف) — نه data loss، فقط
  // بیرون از نمای پیش‌فرض؛ رجوع کنید به کامنت بالای فایل.
  const tier_A_golden = aReports.slice(0, TIER_A_MAX);
  const tier_B_development = bReports.slice(0, TIER_B_MAX);
  const tier_C_correctable = cCorrectableCandidates.slice(0, TIER_C_CORRECTABLE_MAX);

  // طبق بخش ۱۶.۴ سند: tier_C_low_potential = «بقیه‌ی C ها» — یعنی هر C ای
  // که یا اصلاً whatIf→A ندارد، یا داشت ولی به‌خاطر سقف ۵تایی جا نشد.
  const correctableIncludedIds = new Set(tier_C_correctable.map((r) => r.sport_id));
  const tier_C_low_potential = _sortByFinalScoreDesc(cReports.filter((r) => !correctableIncludedIds.has(r.sport_id)));

  // طبق بخش ۱۶.۳ سند: «کلاس M: همه (چون کاربر باید بداند)» — بدون سقف،
  // بدون فیلتر امتیاز.
  const tier_M_medical_hold = mReports;

  // طبق بخش ۱۶.۴ سند: فقط tier_C_low_potential، نه M (که همیشه باید دیده شود).
  const hidden_from_default = tier_C_low_potential.map((r) => r.sport_id);

  return {
    tier_A_golden,
    tier_B_development,
    tier_C_correctable,
    tier_C_low_potential,
    tier_M_medical_hold,
    hidden_from_default,
  };
}

export { classifyTiers, TIER_A_MAX, TIER_B_MAX, TIER_C_CORRECTABLE_MAX };
