// قانون عدم‌جمع دی‌لود دوره‌ای / پروتکل بازگشت ایمن (بخش ۳.۴ سند). اگر هر دو
// هم‌زمان trigger شوند، فقط پروتکل بازگشت ایمن اعمال می‌شود تا کاهش مضاعف حجم/
// شدت رخ ندهد.
//
// deloadMultipliers ورودی است، نه هاردکد، چون موتور دی‌لود اتوریگولیتد کامل هنوز
// در زیرمرحله‌ی ۵.۶ ساخته نشده — وقتی ساخته شد، فقط کافی است اعداد خودش را به
// این تابع بدهد؛ قانون عدم‌جمع همین حالا و بدون نیاز به تغییر دوباره‌ی این فایل
// برقرار می‌ماند.
function resolveVolumeIntensityAdjustment({ returnProtocolTriggered = false, deloadTriggered = false, deloadMultipliers } = {}) {
  if (returnProtocolTriggered) {
    return { source: "return_protocol", loadMultiplier: 0.85, setsMultiplier: 0.8 };
  }
  if (deloadTriggered) {
    if (!deloadMultipliers) {
      throw new Error("deloadTriggered=true اما deloadMultipliers داده نشده (زیرمرحله‌ی ۵.۶ باید این را تأمین کند)");
    }
    return { source: "deload", loadMultiplier: deloadMultipliers.loadMultiplier, setsMultiplier: deloadMultipliers.setsMultiplier };
  }
  return { source: "none", loadMultiplier: 1, setsMultiplier: 1 };
}

module.exports = { resolveVolumeIntensityAdjustment };
