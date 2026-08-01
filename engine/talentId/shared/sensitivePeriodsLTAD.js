// پنجره‌های حساس آموزش‌پذیری (Sensitive Periods)، طبق بخش ۱۹.۲ سند معماری.
// منبع: Balyi I, Way R, Higgs C. Long-Term Athlete Development. Human
// Kinetics 2013 (بخش ۲۳.۱ سند، رجوع رسمی).
//
// ⚠️ سطح شواهد (طبق بخش ۲۳.۴ سند، عیناً نقل‌شده): «Level II (LTAD
// framework) — controversial in 2024 research، ولی consensus برای امروز».
// این با Mirwald (Commit 3، Level I، فرمول ریاضی قابل‌بازمحاسبه‌ی دقیق) فرق
// اساسی دارد: این‌ها بازه‌های اجماعی برگرفته از یک framework هستند، نه یک
// فرمول با یک جواب عددی واحد قابل‌وریفای. به همین دلیل هر ۶ رکورد زیر
// confidence:'level_ii_consensus' دارند (طبق تصمیم تاییدشده‌ی Commit 20) —
// نه سطح اطمینان Mirwald، نه یک قانون محصولی صرف مثل تصمیمات Commit 5.
//
// ⚠️ وریفای مستقل (جست‌وجوی وب، نه فقط کپی از سند) انجام شد — نتیجه:
// شکل کلی هر ۶ پنجره (سن/جهت) با ادبیات LTAD شناخته‌شده (Balyi & Hamilton
// 2004) مطابقت دارد؛ عبارت «۱۲-۱۸ ماه پس از PHV» برای قدرت پسران عیناً در
// منبع مستقل هم آمده. **یک ناسازگاری عددی خاص افشا می‌شود، نه پنهان**: یک
// منبع مستقل بازه‌ی «۱۴-۱۷ پسر / ۱۲-۱۵ دختر» را به aerobic_capacity نسبت
// می‌دهد، در حالی که همین اعداد دقیق در سند به‌جای آن به `strength` تعلق
// گرفته (و aerobic_capacity در سند بازه‌ی متفاوتی دارد: ۱۲-۱۶ پسر/۱۱-۱۵
// دختر). این می‌تواند تفاوت طبیعی بین منابع ثانویه‌ی LTAD باشد (بر خلاف
// Mirwald، این‌ها بازه‌های اجماعی از چند مطالعه‌اند، نه یک فرمول
// بازمحاسبه‌پذیر) — با اطمینان Mirwald-سطح نمی‌توان این را رد یا تأیید
// کرد. طبق تصمیم تاییدشده‌ی Commit 20: اعداد سند عیناً استفاده شدند (منبع‌دار
// و داخلاً سازگارند)، این عدم‌قطعیت فقط مستند شد.
const sensitivePeriodsLTAD = {
  speed_1: {
    ability_label_fa: "پنجره‌ی اول سرعت (CNS)",
    description_fa: "plyometrics پایه — توسعه‌ی سرعت مبتنی بر بلوغ سیستم عصبی مرکزی",
    confidence: "level_ii_consensus",
    windows: {
      male: { start_bio_age: 7, end_bio_age: 9 },
      female: { start_bio_age: 6, end_bio_age: 8 },
    },
  },
  speed_2: {
    ability_label_fa: "پنجره‌ی دوم سرعت",
    description_fa: "توسعه‌ی سرعت پس از PHV (Post-PHV)",
    confidence: "level_ii_consensus",
    windows: {
      male: { start_bio_age: 13, end_bio_age: 16 },
      female: { start_bio_age: 11, end_bio_age: 13 },
    },
  },
  strength: {
    ability_label_fa: "پنجره‌ی قدرت",
    // طبق کامنت خودِ سند: "12-18 months after PHV" — عیناً در منبع مستقل هم تأیید شد.
    description_fa: "استفاده از androgen surge برای توسعه‌ی قدرت (۱۲-۱۸ ماه پس از PHV در پسران)",
    confidence: "level_ii_consensus",
    windows: {
      male: { start_bio_age: 14, end_bio_age: 17 },
      female: { start_bio_age: 12, end_bio_age: 15 },
    },
  },
  aerobic_capacity: {
    ability_label_fa: "پنجره‌ی ظرفیت هوازی (VO2max)",
    description_fa: "رشد قلب و ریه هم‌زمان با PHV",
    confidence: "level_ii_consensus",
    windows: {
      male: { start_bio_age: 12, end_bio_age: 16 },
      female: { start_bio_age: 11, end_bio_age: 15 },
    },
  },
  flexibility: {
    ability_label_fa: "پنجره‌ی طلایی انعطاف",
    description_fa: "دوره‌ی طلایی انعطاف‌پذیری در کودکی",
    confidence: "level_ii_consensus",
    windows: {
      universal: { start_bio_age: 6, end_bio_age: 12 },
    },
  },
  skill_acquisition: {
    ability_label_fa: "پنجره‌ی طلایی یادگیری تکنیک",
    description_fa: "دوره‌ی طلایی یادگیری مهارت‌های حرکتی",
    confidence: "level_ii_consensus",
    windows: {
      male: { start_bio_age: 9, end_bio_age: 12 },
      female: { start_bio_age: 8, end_bio_age: 11 },
    },
  },
};

export { sensitivePeriodsLTAD };
