// دسته‌بندی «Power Sport» برای Bio-Banding (فایل ۱۱، بخش ۱۲.۲ سند معماری).
//
// ⚠️ این دسته‌بندی مستقل از `category` موجود در sportRequirementMatrix.js
// است (که team_ball/combat/endurance/strength/... است). سند بخش ۱۲.۲ فقط
// می‌گوید تعدیل early-maturer روی «رشته‌های قدرتی» اعمال می‌شود، بدون اینکه
// این را به enum موجود نگاشت کند یا لیست دقیق ۵۲ رشته را بدهد — طبق تصمیم
// تاییدشده‌ی Commit 11، این یک قضاوت طراحی مستند‌شده است، نه یک عدد از سند:
//
// - weightlifting_olympic: بله — قدرت انفجاری خالص، کلاسیک‌ترین نمونه‌ی
//   power sport در ادبیات ورزشی.
// - wrestling_freestyle: بله — رشته‌ی تماسی/ترکیبی است، اما ادبیات
//   maturation (Malina et al.) کشتی نوجوانان را جزو رشته‌هایی می‌داند که
//   اندازه/قدرت بدنی زودرس مزیت مستقیم می‌دهد — همان الگویی که خودِ
//   RAE/early-maturer bias را توضیح می‌دهد.
// - volleyball_middle_blocker: بله — critical_perf_tests این رشته
//   (sportRequirementMatrix.js) فقط "vertical_jump" است: نیاز حیاتی به
//   قدرت پای انفجاری، نه استقامت.
// - soccer_striker: بله (تصمیم تاییدشده، نه قطعیت سندی) — critical_perf_tests
//   این رشته دقیقاً "sprint_10m" و "vertical_jump" است، هر دو تست انفجاری
//   (نه استقامتی)؛ این استدلال، نه صرفاً برچسب کلی «فوتبال»، مبنای این
//   تصمیم بود.
// - swimming_general: خیر — category صریحاً "endurance" و
//   critical_perf_tests فقط "beep_test" (استقامت هوازی) است.
const POWER_SPORTS = new Set([
  "weightlifting_olympic",
  "wrestling_freestyle",
  "volleyball_middle_blocker",
  "soccer_striker",
]);

function isPowerSport(sportId) {
  return POWER_SPORTS.has(sportId);
}

export { POWER_SPORTS, isPowerSport };
