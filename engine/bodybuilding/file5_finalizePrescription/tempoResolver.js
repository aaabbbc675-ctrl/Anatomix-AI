import { parseEccentricSeconds } from "../file4_trainingSystem/tempoRule.js";

// اگر فایل ۳ یک یا چند تمپوی اجباری داده باشد، این یک تجویز مطلق است (مثل
// «تمپو روان اجباری 2-0-2-0» برای بیماری قلبی) — نه صرفاً یک آستانه‌ی حداقلیِ
// کندی اکسنتریک. پس هر وقت override وجود دارد، همیشه جایگزین تمپوی خام کسکید
// می‌شود (مقایسه‌ای با تمپوی خام لازم نیست)؛ وقتی چند override هم‌زمان معتبرند
// (مثلاً سالمند: دو گزینه)، امن‌ترین (کندترین فاز اکسنتریک) بین خودِ آن‌ها
// انتخاب می‌شود.
function resolveTempo(rawTempo, tempoOverrides = []) {
  if (!tempoOverrides || tempoOverrides.length === 0) return rawTempo;

  let safestTempo = tempoOverrides[0];
  let safestEccentric = parseEccentricSeconds(safestTempo) ?? 0;
  for (const candidate of tempoOverrides.slice(1)) {
    const eccentric = parseEccentricSeconds(candidate) ?? 0;
    if (eccentric > safestEccentric) {
      safestEccentric = eccentric;
      safestTempo = candidate;
    }
  }

  return safestTempo;
}

export { resolveTempo };
