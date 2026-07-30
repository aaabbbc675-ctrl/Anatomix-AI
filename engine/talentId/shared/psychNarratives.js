// قالب‌های روایی تطابق/عدم‌تطابق روانی، طبق بخش ۱۰.۴ سند معماری.
// سند فقط یک نمونه‌ی کامل (aggression_contact) داده بود؛ بقیه‌ی ۶ trait
// طبق همون الگو (high_user_low_target / low_user_high_target / match)
// نوشته شدند — تعمیم منطقی از نمونه‌ی سند، نه چیز بی‌ربط جدید.
const psychNarratives = {
  teamwork_score: {
    high_user_low_target: "روحیه‌ی تیمی بالا، این رشته فردی است — ممکن است در محیط تک‌نفره احساس تنهایی کند",
    low_user_high_target: "تمایل به کار انفرادی، این رشته نیازمند هماهنگی تیمی مداوم است",
    match: "روحیه‌ی تیمی مطابق با نیاز رشته",
  },
  aggression_contact: {
    high_user_low_target: "میل به برخورد بالا، این رشته کم‌برخورد است — انرژی سرکش صرف تکنیک شود",
    low_user_high_target: "اجتناب از برخورد فیزیکی، این رشته high-contact نیازمند سازگاری روانی است",
    match: "میل به برخورد مطابق با نیاز رشته",
  },
  focus_patience: {
    high_user_low_target: "صبر و تمرکز بالا، این رشته سریع و کم‌تمرکز است — ممکن است بی‌حوصله شود",
    low_user_high_target: "نیاز به هیجان مداوم، این رشته صبر و تکرار طولانی می‌طلبد",
    match: "سطح تمرکز/صبر مطابق با نیاز رشته",
  },
  pressure_tolerance: {
    high_user_low_target: "تحمل فشار بالا، این رشته فشار رقابتی کمی دارد — پتانسیل کامل استفاده نمی‌شود",
    low_user_high_target: "استرس در لحظات حساس، این رشته نیازمند تحمل فشار بالاست",
    match: "تحمل فشار مطابق با نیاز رشته",
  },
  dynamic_activity: {
    high_user_low_target: "نیاز به تحرک مداوم بالا، این رشته نسبتاً ساکن است",
    low_user_high_target: "تمایل به سکون، این رشته نیازمند تحرک و تخلیه‌ی انرژی مداوم است",
    match: "نیاز به تحرک مطابق با نیاز رشته",
  },
  chaos_decision: {
    high_user_low_target: "سرعت تصمیم‌گیری بالا در هرج‌ومرج، این رشته محیط قابل‌پیش‌بینی‌تری دارد",
    low_user_high_target: "ترجیح تصمیم‌گیری آرام، این رشته نیازمند واکنش صدم‌ثانیه‌ای است",
    match: "سبک تصمیم‌گیری مطابق با نیاز رشته",
  },
  resilience: {
    high_user_low_target: "تاب‌آوری بالا، این رشته فشار روانی شکست کمتری دارد",
    low_user_high_target: "حساسیت بالا به شکست، این رشته نیازمند تاب‌آوری زیاد است",
    match: "تاب‌آوری مطابق با نیاز رشته",
  },
};

function getPsychMismatchNarrative(trait, userValue, targetValue) {
  const templates = psychNarratives[trait];
  if (!templates) return "";
  return userValue > targetValue ? templates.high_user_low_target : templates.low_user_high_target;
}

function getPsychMatchNarrative(trait) {
  return psychNarratives[trait]?.match ?? "";
}

export { psychNarratives, getPsychMismatchNarrative, getPsychMatchNarrative };
