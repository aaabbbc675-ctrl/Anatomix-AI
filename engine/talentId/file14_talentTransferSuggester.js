// فایل ۱۴ موتور استعدادیابی (بخش ۱۵ سند معماری): پیشنهاد Talent Transfer.
// ورودی این فایل مستقیماً خروجی Commit 13 (generateMatchReports) است.
//
// ⚠️ بررسی سازگاری فیلد با pseudocode بخش ۱۵.۳ سند (قبل از کد انجام شد،
// تأیید کاربر): دو ناسازگاری با شکل واقعی MatchReport پیدا و اصلاح شد:
// ۱) سند از `report.what_if_analysis?.estimated_tier` استفاده می‌کند، اما
//    خروجی واقعی file13 (که خودش از type definition بخش ۱۴.۲ همان سند
//    پیروی می‌کند) این فیلد را `estimated_tier_if_corrected` نام‌گذاری
//    کرده — دو بخش از یک سند با هم ناسازگار بودند؛ نسخه‌ی واقعی استفاده شد.
// ۲) پارامتر دوم pseudocode (`allFinalScores`) زائد بود — `final_score`
//    از قبل مستقیماً روی خودِ هر MatchReport هست. امضای تابع ساده شد به
//    (matchReports, sportRequirementMatrix)، بدون پارامتر اضافه.
//
// همچنین matchReports یک آبجکت sportId-keyed ساده است (نه Map که سند با
// .entries()/.get() فرض کرده) — هم‌قرارداد همیشگی از Commit 1.

import { sportSimilarityGraph } from "./shared/sportSimilarityGraph.js";

// طبق pseudocode بخش ۱۵.۳ سند. توجه: چون TIER_A_MIN در file13 برابر ۸۵ است
// (>۸۰)، این چک در عمل همیشه true است وقتی final_tier==='A' — اما به‌صورت
// defensive نگه داشته شد، دقیقاً طبق سند، برای حالتی که در آینده این دو
// آستانه از هم مستقل تغییر کنند.
const TRANSFER_TARGET_SCORE_THRESHOLD = 80;
const TRANSFER_TARGET_REQUIRED_TIER = "A";

function _buildSuggestionNarrative(sportId, similarId, similarReport, similarity, sportRequirementMatrix, report) {
  const excludedName = sportRequirementMatrix[sportId].name_fa;
  const targetName = sportRequirementMatrix[similarId].name_fa;
  const reasonPhrase = report.primary_exclusion_cause?.cause_narrative
    ? `به دلیل ${report.primary_exclusion_cause.cause_narrative} `
    : "";
  return `به جای ${excludedName} که فعلاً ${reasonPhrase}مناسب نیست، می‌توانید ${targetName} را در نظر بگیرید (امتیاز ${Math.round(similarReport.final_score)}٪، تشابه ${Math.round(similarity * 100)}٪).`;
}

function _suggestionsForSport(sportId, report, matchReports, sportRequirementMatrix) {
  const suggestions = [];
  if (report.final_tier !== "C") return suggestions;
  if (report.what_if_analysis?.estimated_tier_if_corrected !== "A") return suggestions;

  const candidates = sportSimilarityGraph[sportId]?.transfer_potential ?? {};
  for (const [similarId, similarity] of Object.entries(candidates)) {
    const similarReport = matchReports[similarId];
    if (!similarReport) continue; // رشته‌ی هدف در matchReports نیست (خارج از رشته‌های seed‌شده)

    if (similarReport.final_score >= TRANSFER_TARGET_SCORE_THRESHOLD && similarReport.final_tier === TRANSFER_TARGET_REQUIRED_TIER) {
      suggestions.push({
        excluded_sport: sportId,
        transfer_target: similarId,
        similarity_score: similarity,
        transfer_target_score: similarReport.final_score,
        narrative: _buildSuggestionNarrative(sportId, similarId, similarReport, similarity, sportRequirementMatrix, report),
      });
    }
  }
  return suggestions;
}

function suggestTalentTransfers(matchReports, sportRequirementMatrix) {
  const suggestions = [];
  for (const sportId of Object.keys(matchReports)) {
    suggestions.push(..._suggestionsForSport(sportId, matchReports[sportId], matchReports, sportRequirementMatrix));
  }
  return suggestions;
}

export { suggestTalentTransfers, TRANSFER_TARGET_SCORE_THRESHOLD, TRANSFER_TARGET_REQUIRED_TIER };
