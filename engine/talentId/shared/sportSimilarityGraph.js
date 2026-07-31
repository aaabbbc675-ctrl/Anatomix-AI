// گراف شباهت رشته‌ها برای Talent Transfer، طبق بخش ۱۵.۲ سند معماری.
//
// ⚠️ similar_by_anthropometry/performance/psychology هر رشته عیناً از فیلد
// similar_sports همان رشته در sportRequirementMatrix.js (Commit 1، بخش ۲۰.۴
// سند) کپی شده — نه داده‌ی جدید. شامل رشته‌های خارج از ۵ رشته‌ی seed‌شده هم
// هست (مثلاً judo، handball) چون این لیست‌ها توصیفی/مستندسازی هستند، برای
// آمادگی Wave 2-3 (Commit 17-19)، نه فقط برای محاسبه‌ی همین Commit.
//
// ⚠️ transfer_potential برخلاف بالا، **محدود به ۵ رشته‌ی seed‌شده‌ی فعلی**
// است — چون این تنها لایه‌ای است که واقعاً توسط file14 مصرف می‌شود
// (پیشنهاد دادن رشته‌ای که هیچ MatchReport ای برایش نداریم بی‌فایده است).
// طبق تصمیم تاییدشده‌ی Commit 14: عدد از تعداد دسته‌ی هم‌پوشان (نه فرمول
// علمی — سند فرمولی نداده، فقط نمونه‌ی عددی نمادین مثل بخش ۱۴.۵) به‌صورت
// جهت‌دار (از دید خودِ رشته‌ی مبدأ) ساخته شده: ۳ دسته→۰.۹۰، ۲ دسته→۰.۷۵،
// ۱ دسته→۰.۶۰. رجوع کنید به docs/TODO-transfer-potential-formula.md.
//
// ⚠️ بررسی صادقانه‌ی داده‌ی واقعی بین ۵ رشته‌ی خودمان (نه نمونه‌ی سند که
// rowing/basketball_forward ندارد): فقط دو رابطه‌ی واقعی وجود دارد —
// wrestling_freestyle↔weightlifting_olympic (هر دو جهت، اما نامتقارن: از
// دید wrestling فقط ۱ دسته «anthropometry»، از دید weightlifting ۲ دسته
// «anthropometry+psychology»، چون similar_sports هر رشته مستقل از دیگری
// نوشته شده) و volleyball_middle_blocker→swimming_general (فقط یک‌طرفه —
// "swimming" در لیست والیبال هست، اما swimming_general هیچ ارجاعی به
// والیبال ندارد). soccer_striker هیچ رابطه‌ای با ۴ رشته‌ی دیگر ندارد —
// transfer_potential آن عمداً خالی است، نه حدس زده شده.
const sportSimilarityGraph = {
  soccer_striker: {
    similar_by_anthropometry: ["handball", "basketball_forward"],
    similar_by_performance: ["sprint_100m", "rugby_center"],
    similar_by_psychology: ["boxing", "handball_pivot"],
    transfer_potential: {},
  },

  wrestling_freestyle: {
    similar_by_anthropometry: ["judo", "weightlifting_olympic"],
    similar_by_performance: ["judo"],
    similar_by_psychology: ["boxing"],
    // weightlifting_olympic فقط در similar_by_anthropometry آمده (۱ دسته از دید wrestling).
    transfer_potential: { weightlifting_olympic: 0.6 },
  },

  volleyball_middle_blocker: {
    similar_by_anthropometry: ["basketball_center", "high_jump", "swimming"],
    similar_by_performance: ["basketball", "handball", "high_jump"],
    similar_by_psychology: ["basketball", "volleyball_outside", "gymnastics"],
    // "swimming" فقط در similar_by_anthropometry آمده (۱ دسته) — طبق تصمیم
    // تاییدشده‌ی Commit 11/دوکلیدی، sport-id عمومی سند "swimming" معادل
    // sport-id خاص matrix ما "swimming_general" در نظر گرفته می‌شود.
    transfer_potential: { swimming_general: 0.6 },
  },

  swimming_general: {
    similar_by_anthropometry: ["rowing"],
    similar_by_performance: ["rowing"],
    similar_by_psychology: ["rowing", "cycling_road"],
    // بدون رابطه‌ی معکوس به volleyball_middle_blocker — لیست‌های sportRequirementMatrix
    // این رشته اصلاً به والیبال اشاره نمی‌کنند. خالی گذاشته شد، نه حدس زده شد.
    transfer_potential: {},
  },

  weightlifting_olympic: {
    similar_by_anthropometry: ["wrestling_freestyle", "powerlifting"],
    similar_by_performance: ["powerlifting"],
    similar_by_psychology: ["powerlifting", "wrestling_freestyle"],
    // wrestling_freestyle هم در similar_by_anthropometry هم similar_by_psychology
    // آمده (۲ دسته از دید weightlifting — نامتقارن با جهت مقابل، عمداً).
    transfer_potential: { wrestling_freestyle: 0.75 },
  },
};

export { sportSimilarityGraph };
