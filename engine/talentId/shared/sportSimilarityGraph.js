// گراف شباهت رشته‌ها برای Talent Transfer، طبق بخش ۱۵.۲ سند معماری.
//
// ⚠️ تغییر معماری در Commit 17 (نه یک عدد جدید — همان قاعده‌ی تاییدشده‌ی
// Commit 14 باقی می‌ماند، فقط مکانیزم ساختش عوض شده): تا Commit 14/16،
// این فایل یک آبجکت دستی‌نوشته بود (۵ رشته، قابل مدیریت با دست). با اضافه
// شدن ۲۴ رشته در Commit 17 (جمعاً ۲۹)، نوشتن دستی یعنی رونویسی حداکثر ۸۷
// ارجاع (۲۹ رشته × ۳ دسته) با ریسک واقعی خطای انسانی — دقیقاً همان نوع
// خطایی که در جدول‌های خلاصه‌ی این Commit چندبار با دقت گرفتیم (مثل
// اصلاح skeliac_index). به همین دلیل این فایل حالا از similar_sports هر
// رشته در sportRequirementMatrix.js (منبع واحد حقیقت) به‌صورت برنامه‌ای
// محاسبه می‌شود — قاعده‌ی عددی («۳ دسته→۰.۹۰، ۲ دسته→۰.۷۵، ۱ دسته→۰.۶۰»)
// دقیقاً همان چیزی است که در Commit 14 تأیید شد، رجوع کنید به
// docs/TODO-transfer-potential-formula.md.
//
// transfer_potential فقط شامل رشته‌هایی می‌شود که واقعاً در sportRequirementMatrix
// ساخته شده‌اند (پیشنهاد دادن رشته‌ای که هیچ MatchReport ای برایش نداریم
// بی‌فایده است) — دقیقاً همان محدودیت تاییدشده‌ی Commit 14.
//
// ⚠️ دوکلیدی (طبق قرارداد Commit 5/6/11): چند رشته‌ی موجود از قبل به
// sport-id عمومی سند اشاره کرده بودند که با id خاص matrix ما یکی است —
// "swimming"→swimming_general (در volleyball_middle_blocker، از Commit 1)
// و "gymnastics"→gymnastics_artistic (در volleyball_middle_blocker، از
// Commit 1 — تا Commit 17 که gymnastics_artistic ساخته شد، این ارجاع
// خاموش/بی‌اثر بود). هیچ alias دیگری اضافه نشد — "handball" عمداً alias
// نشد چون بین ۴ پست هندبال ما مبهم است (کدام پست؟ حدس زدن ممنوع).
import { sportRequirementMatrix } from "./sportRequirementMatrix.js";

const SPORT_ID_ALIASES = {
  swimming: "swimming_general",
  gymnastics: "gymnastics_artistic",
};

// طبق تصمیم تاییدشده‌ی Commit 14.
const CATEGORY_COUNT_TO_SCORE = { 1: 0.6, 2: 0.75, 3: 0.9 };

function _resolveSportId(rawId) {
  return SPORT_ID_ALIASES[rawId] ?? rawId;
}

function _buildTransferPotential(ownSportId, similarSports, allSportIds) {
  const categoryCountByTarget = new Map();
  const lists = [
    similarSports.by_anthropometry ?? [],
    similarSports.by_performance ?? [],
    similarSports.by_psychology ?? [],
  ];

  for (const list of lists) {
    // یک رشته‌ی هدف حداکثر یک‌بار در همین دسته شمرده می‌شود (لیست‌های سند
    // تکراری ندارند، ولی این دفاعی است).
    const uniqueInThisCategory = new Set(list.map(_resolveSportId));
    for (const targetId of uniqueInThisCategory) {
      if (targetId === ownSportId) continue;
      if (!allSportIds.has(targetId)) continue; // فقط رشته‌های واقعاً ساخته‌شده
      categoryCountByTarget.set(targetId, (categoryCountByTarget.get(targetId) ?? 0) + 1);
    }
  }

  const transferPotential = {};
  for (const [targetId, count] of categoryCountByTarget) {
    transferPotential[targetId] = CATEGORY_COUNT_TO_SCORE[Math.min(count, 3)];
  }
  return transferPotential;
}

function _buildSportSimilarityGraph(sportRequirementMatrix) {
  const allSportIds = new Set(Object.keys(sportRequirementMatrix));
  const graph = {};

  for (const [sportId, entry] of Object.entries(sportRequirementMatrix)) {
    const similarSports = entry.similar_sports ?? { by_anthropometry: [], by_performance: [], by_psychology: [] };
    graph[sportId] = {
      similar_by_anthropometry: similarSports.by_anthropometry ?? [],
      similar_by_performance: similarSports.by_performance ?? [],
      similar_by_psychology: similarSports.by_psychology ?? [],
      transfer_potential: _buildTransferPotential(sportId, similarSports, allSportIds),
    };
  }

  return graph;
}

// طبق قرارداد Commit 14: مصرف‌کننده‌ی این فایل (file14_talentTransferSuggester.js)
// یک آبجکت ثابت import می‌کند، نه یک تابع — پس محاسبه همین‌جا، در زمان
// import، انجام می‌شود (نه lazily در هر فراخوانی).
const sportSimilarityGraph = _buildSportSimilarityGraph(sportRequirementMatrix);

export { sportSimilarityGraph, _buildSportSimilarityGraph, SPORT_ID_ALIASES, CATEGORY_COUNT_TO_SCORE };
