// نقشه‌ی تأثیر کوتاهی عضلانی (ROM deficits) روی رشته‌ها، طبق بخش ۷.۳ سند
// معماری.
//
// طبق تصمیم تاییدشده‌ی Commit 7: دوکلیدی — هم sport-id عمومی سند
// (swimming, soccer, wrestling, ...) هم sport-id دقیق ۵ رشته‌ی matrix
// (swimming_general, soccer_striker, wrestling_freestyle، در
// hypermobilityImpact) — همون الگوی Commit 5/6.
//
// wrestling_freestyle و hamstring_short عمداً بدون پوشش می‌مانند: سند در
// هیچ‌کدام از ۵ دسته‌ی ROM (achilles/hamstring/shoulder_flexor/hip_flexor/
// pectoralis) اصلاً اسم کشتی را نبرده، حتی به‌صورت عمومی — طبق اصل «چیزی
// که سند نگفته را نساز»، چیزی برایش حدس زده نشد (مثل forward_head در
// Commit 6 که هیچ‌کدام از ۵ رشته را پوشش نمی‌داد).
const romSportImpactMap = {
  achilles_short: {
    weightlifting_olympic: { penalty: -25, reason: "ناتوانی در Deep Squat" },
    sprint_100m: { penalty: -20, reason: "پیش‌تحمل کاهش" },
    high_jump: { penalty: -20, reason: "محدودیت take-off" },
  },
  hamstring_short: {
    gymnastics: { penalty: -15, reason: "محدودیت split" },
    hurdles: { penalty: -20, reason: "رد شدن از مانع" },
    taekwondo: { penalty: -20, reason: "لگد بالا" },
    ballet: { penalty: -25, reason: "requires extreme ROM" },
  },
  shoulder_flexor_short: {
    swimming: { penalty: -25, reason: "بازوی جلو در کرال" },
    swimming_general: { penalty: -25, reason: "بازوی جلو در کرال" },
    tennis: { penalty: -25, reason: "سرویس" },
    javelin: { penalty: -25, reason: "پرتاب نیزه" },
    weightlifting_olympic: { penalty: -20, reason: "Overhead" },
    baseball_pitcher: { penalty: -25, reason: "شوت" },
  },
  hip_flexor_short: {
    sprint_100m: { penalty: -15, reason: "دامنه ران" },
    hurdles: { penalty: -20, reason: "رد شدن از مانع" },
    soccer: { penalty: -10, reason: "شوت" },
    soccer_striker: { penalty: -10, reason: "شوت" },
  },
  pectoralis_short: {
    swimming: { penalty: -20, reason: "شبیه rounded shoulder" },
    swimming_general: { penalty: -20, reason: "شبیه rounded shoulder" },
    volleyball: { penalty: -15, reason: "اسپک" },
    volleyball_middle_blocker: { penalty: -15, reason: "اسپک" },
  },
};

const hypermobilityImpact = {
  positive: ["swimming", "swimming_general", "gymnastics", "taekwondo", "weightlifting_olympic", "wrestling", "wrestling_freestyle", "judo", "diving"],
  positive_bonus: 15,
  negative: ["powerlifting", "high_jump", "volleyball_middle_blocker"],
  negative_penalty: -15,
  reason_negative: "خطر دررفتگی زیر بار سنگین / بی‌ثباتی مفصل",
  reason_positive: "مزیت ROM اضافی برای اجرای تکنیک",
};

export { romSportImpactMap, hypermobilityImpact };
