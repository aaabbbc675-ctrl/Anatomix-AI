// گیت مشترک بدنسازی/اصلاحی (بخش ۰ و ۳.۹ سند موتور اصلاحی — نسخه‌ی
// اصلاح‌شده، نه سند خام). خروجی همیشه یکی از سه decision زیر است. این فایل
// عمداً در engine/shared/ است چون طبق بخش ۲ سند باید بین هر دو موتور مشترک
// باشد؛ فعلاً فقط پیاده‌سازی شده و به هیچ کد موتور بدنسازی وصل نشده — اتصال
// یک تصمیم جدای بعدی است.
function resolveBodybuildingReadiness({ activeInjuriesCount, deformitiesCount, hardVetoMedical }) {
  if (!Number.isInteger(activeInjuriesCount) || activeInjuriesCount < 0) {
    throw new Error(`activeInjuriesCount نامعتبر: "${activeInjuriesCount}". باید عدد صحیح ≥۰ باشد.`);
  }
  if (!Number.isInteger(deformitiesCount) || deformitiesCount < 0) {
    throw new Error(`deformitiesCount نامعتبر: "${deformitiesCount}". باید عدد صحیح ≥۰ باشد.`);
  }
  if (typeof hardVetoMedical !== "boolean") {
    throw new Error(`hardVetoMedical نامعتبر: "${hardVetoMedical}". باید true یا false باشد.`);
  }

  if (activeInjuriesCount > 0 || hardVetoMedical === true) {
    return { decision: "force_corrective_warmup_injection", locked: true };
  }

  // طبق سند: >۴ ناهنجاری، یعنی خودِ ۴ هنوز عادی است (proceed)، نه Advisory.
  if (deformitiesCount > 4) {
    return { decision: "suggest_corrective_warmup", locked: false, suggestedBodybuildingShareMax: 0.3 };
  }

  return { decision: "proceed", locked: false };
}

export { resolveBodybuildingReadiness };
