// کلاس خطای اختصاصی talentId، طبق بخش ۲.۴ سند معماری استعدادیابی.
// برخلاف nutrition/corrective/bodybuilding که همه‌جا throw new Error ساده
// دارن، اینجا یک code لازم است چون فایل‌های بعدی (مثلاً file3_normativeDataLookup
// با NORMATIVE_MISSING) باید بتونن روی نوعِ خطا برنامه‌نویسی‌محور تصمیم بگیرن
// (مثلاً fallback بزنن)، نه فقط پیام رو نمایش بدن. پیام‌ها همچنان فارسی و
// هم‌سبک بقیه‌ی موتورها هستن؛ فقط ساختار حامل کد/context اضافه شده.
class TalentIdError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.name = "TalentIdError";
    this.code = code;
    this.context = context;
  }
}

export { TalentIdError };
