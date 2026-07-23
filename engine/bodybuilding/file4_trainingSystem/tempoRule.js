// پارس تمپو با قرارداد «اکسنتریک-مکث۱-کانسنتریک-مکث۲» (مثل "3-0-1-0") که در
// slotStandards.js هم استفاده شده. اگر فاز اکسنتریک بیش از ۲ ثانیه باشد،
// Intensity_Modifier نهایی نباید از ۰.۸۰ بیشتر شود (سقف، نه ضریب اضافه).
const SLOW_ECCENTRIC_THRESHOLD_SEC = 2;
const SLOW_ECCENTRIC_INTENSITY_CAP = 0.8;

// دفاعی: بخش‌های غیرعددی مثل 'X' (کانسنتریک انفجاری) باید بدون خطا نادیده
// گرفته شوند، نه باعث کرش شوند.
function parseEccentricSeconds(tempo) {
  if (typeof tempo !== "string") return null;
  const [eccentric] = tempo.split("-");
  const parsed = Number(eccentric);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyTempoRule(intensityMultiplier, tempo) {
  const eccentricSeconds = parseEccentricSeconds(tempo);
  if (eccentricSeconds === null || eccentricSeconds <= SLOW_ECCENTRIC_THRESHOLD_SEC) {
    return intensityMultiplier;
  }
  return Math.min(intensityMultiplier, SLOW_ECCENTRIC_INTENSITY_CAP);
}

module.exports = { applyTempoRule, parseEccentricSeconds };
