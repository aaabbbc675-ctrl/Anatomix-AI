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
//
// ⚠️ افزوده‌شده در Commit 17 (بازبینی docs/TODO-power-sports-wave2.md): ۱۰
// رشته از ۲۴ رشته‌ی جدید Commit 17. سطح شواهد این ۱۰ یکسان نیست — دو گروه:
//
// گروه الف (شواهد مستقیم و قوی — critical_perf_tests دقیقاً تست‌های
// انفجاری هستند، بدون هیچ مؤلفه‌ی استقامتی/فنی در لیست حیاتی):
// - judo: بله — critical_perf_tests فقط "handgrip" است (قدرت گیر برای فن،
//   محور فنی کومی‌کاتا).
// - wrestling_greco: بله — critical_perf_tests "handgrip"+"pushups" است،
//   هر دو قدرت/توان بالاتنه‌ی انفجاری؛ حتی خالص‌تر از wrestling_freestyle
//   (که beep_test هم در لیست حیاتی‌اش دارد).
// - sprint_100m: بله — critical_perf_tests دقیقاً "sprint_10m"+"sprint_30m"
//   است؛ تعریف تحت‌اللفظی قدرت انفجاری، بدون هیچ مؤلفه‌ی فنی/تاکتیکی اضافه
//   — بدیهی‌ترین مورد کل این لیست.
// - sprint_200m: بله — critical_perf_tests "sprint_30m" است، همان خانواده‌ی
//   sprint_100m.
// - handball_back: بله — critical_perf_tests "handgrip"+"vertical_jump"
//   است (قدرت پرتاب + پرش، دقیقاً هم‌الگوی soccer_striker/volleyball
//   موجود در این لیست).
// - handball_pivot: بله — critical_perf_tests "handgrip" است + composition_bonuses
//   شامل smm_high(۱۵)/ffmi_athletic(۱۵) (حضور فیزیکی زیر دروازه، هم‌رده‌ی
//   weightlifting_olympic).
//
// گروه ب (شواهد ضعیف‌تر — critical_perf_tests این رشته‌ها مستقیماً «انفجاری»
// نیستند؛ استدلال بر پایه‌ی ادبیات عمومی رشته‌های رزمی ضربه‌ای است، نه
// تطابق مستقیم schema — دقیقاً هم‌سطح استدلال ادبیاتی wrestling_freestyle
// اصلی، نه استدلال داده‌محور judo/wrestling_greco):
// - boxing: بله — critical_perf_tests ("agility_5_10_5"+"beep_test") خودشان
//   انفجاری نیستند، اما ادبیات عمومی بوکس (قدرت ضربه، توان بی‌هوازی
//   ترکیبی) و anthropometric_bonus ape_index_high (اهرم قدرت ضربه) این
//   طبقه‌بندی را پشتیبانی می‌کنند.
// - MMA: بله — critical_perf_tests فقط "beep_test" است (نه انفجاری)، اما
//   composition_bonuses (smm_high+ffmi_athletic) و سخت‌ترین پروفایل روانی
//   رزمی این ماتریس (aggression/pressure/resilience/chaos همه=۵) استدلال
//   را پشتیبانی می‌کند.
// - karate: بله — critical_perf_tests ("agility_5_10_5") انفجاری نیست؛
//   استدلال صرفاً ادبیاتی (رشته‌ی ضربه‌ای پرقدرت)، ضعیف‌ترین شواهد این گروه.
// - wushu_sanda: بله — همان استدلال karate، به‌علاوه‌ی هشدار اطمینان پایین
//   کلی این رشته (رجوع کنید به کامنت wushu_sanda در sportRequirementMatrix.js).
const POWER_SPORTS = new Set([
  "weightlifting_olympic",
  "wrestling_freestyle",
  "volleyball_middle_blocker",
  "soccer_striker",
  "judo",
  "wrestling_greco",
  "sprint_100m",
  "sprint_200m",
  "handball_back",
  "handball_pivot",
  "boxing",
  "MMA",
  "karate",
  "wushu_sanda",
]);

function isPowerSport(sportId) {
  return POWER_SPORTS.has(sportId);
}

export { POWER_SPORTS, isPowerSport };
