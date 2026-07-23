const { mergeRange } = require("../file3_hardVeto/mergeRestrictions");

function clampScalarIntoRange(value, range) {
  if (!range) return value;
  let result = value;
  if (range[0] !== null && range[0] !== undefined) result = Math.max(result, range[0]);
  if (range[1] !== null && range[1] !== undefined) result = Math.min(result, range[1]);
  return result;
}

// برخلاف mergeRange خام (که برای ترکیب چند محدودیت هم‌رتبه در فایل ۳ ساخته شده،
// جایی که هیچ‌کدام بر دیگری اولویت مطلق ندارد)، اینجا دو طرف هم‌رتبه نیستند:
// restrictionRange (خروجی فایل ۳) همیشه مطلق و برنده است. وقتی بازه‌ی خام کسکید
// اصلاً با محدودیت هم‌پوشانی ندارد (بعد از merge، min>max می‌شود — یعنی یک بازه‌ی
// نامعتبر)، به‌جای برگرداندن آن بازه‌ی نامعتبر، کل بازه به همان مرزِ محدودیت که
// نقض شده جمع می‌شود (یک بازه‌ی تک‌نقطه‌ای امن). این دقیقاً همان چیزی است که
// «clamp واقعی» را از «merge نمادین» متمایز می‌کند.
function clampRange(rawRange, restrictionRange) {
  if (!restrictionRange) return rawRange;
  if (!rawRange) return restrictionRange;

  const merged = mergeRange(rawRange, restrictionRange);
  const [min, max] = merged;

  if (min !== null && max !== null && min > max) {
    const rawMin = rawRange[0];
    let collapsedPoint;
    if (rawMin !== null && restrictionRange[1] !== null && rawMin > restrictionRange[1]) {
      collapsedPoint = restrictionRange[1]; // خام بالاتر از سقف محدودیت بود → به سقف بچسب
    } else {
      collapsedPoint = restrictionRange[0] !== null ? restrictionRange[0] : restrictionRange[1]; // خام پایین‌تر از کف بود → به کف بچسب
    }
    return [collapsedPoint, collapsedPoint];
  }

  return merged;
}

module.exports = { clampScalarIntoRange, clampRange };
