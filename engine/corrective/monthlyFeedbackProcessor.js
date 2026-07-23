// فایل حلقه‌ی بازخورد ماهانه‌ی موتور اصلاحی (بخش ۳.۱-ج سند، از ماه ۲ به بعد).
// طبق تصمیم معماری قبلی: دو تابع مستقل، نه یک تابع ترکیبی — چون RPE یک
// شاخص سطح‌جلسه/ماه است (یک اسکالر برای کل دوره)، اما درد مفصلی/عصبی ذاتاً
// سطح‌حرکت است (باید exercise_id مشخص داشته باشد تا در Injury_Blacklist
// معنا پیدا کند). قاطی‌کردن این دو در یک تابع یعنی یک شکل ورودی نامتجانس
// (یک اسکالر + یک آرایه) که هیچ‌کدام به داده‌ی تصمیم بخش دیگر نیاز ندارد.

const RPE_BANDS = [
  { min: 1, max: 4, adjustmentPercent: 20 },
  { min: 5, max: 7, adjustmentPercent: 10 },
  { min: 8, max: 10, adjustmentPercent: -10 },
];

function computeMonthlyIntensityAdjustment({ rpe } = {}) {
  const value = Number(rpe);
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error(`rpe نامعتبر: "${rpe}". باید عدد صحیح بین ۱ تا ۱۰ باشد.`);
  }

  const band = RPE_BANDS.find((b) => value >= b.min && value <= b.max);
  return { adjustmentPercent: band.adjustmentPercent };
}

const VALID_CAUSED_PAIN = ["none", "muscle_soreness", "joint_nerve_pain"];

// Muscle_Soreness عمداً هیچ خروجی تولید نمی‌کند: طبق بخش ۳.۱ سند «کوفتگی
// طبیعی، حذف نمی‌شود» — اما سند مشخص نکرده کجا باید نگه داشته شود، و فعلاً
// هیچ مصرف‌کننده‌ی مشخصی (UI یا موتور دیگر) برای چنین رکوردی تعریف نشده.
// ساختن یک کانال داده‌ی جدید بدون مصرف‌کننده‌ی مشخص، دقیقاً همان خطایی است
// که برای engine/shared/deviceJsonAdapter.js ازش پرهیز شد. اگر بعداً برای
// خلاصه‌ی ماهانه‌ی مربی (بخش ۸.۴ سند بدنسازی) نیاز به تاریخچه‌ی کوفتگی پیدا
// شد، آن‌موقع با مصرف‌کننده‌ی مشخص و به‌عنوان یک تصمیم جدا طراحی می‌شود.
function resolveExercisePainFeedback(feedbackPerExercise = []) {
  if (!Array.isArray(feedbackPerExercise)) {
    throw new Error("feedbackPerExercise باید آرایه باشد.");
  }

  return feedbackPerExercise
    .map((entry, index) => {
      if (!entry || typeof entry.exerciseId !== "string" || entry.exerciseId.length === 0) {
        throw new Error(`feedbackPerExercise[${index}] نامعتبر: exerciseId باید رشته‌ی غیرخالی باشد.`);
      }
      if (!VALID_CAUSED_PAIN.includes(entry.causedPain)) {
        throw new Error(
          `feedbackPerExercise[${index}] نامعتبر: causedPain باید یکی از ${VALID_CAUSED_PAIN.join("/")} باشد.`
        );
      }
      return entry;
    })
    .filter((entry) => entry.causedPain === "joint_nerve_pain")
    .map((entry) => ({
      exercise_id: entry.exerciseId,
      source_module: "corrective",
      // هم‌شکل با reasonNote در manualBlacklistExercises (فایل ۱): وقتی
      // مربی متنی ندهد، مقدار پیش‌فرض null است، نه یک رشته‌ی ثابت ساختگی.
      reason_note: typeof entry.note === "string" ? entry.note : null,
    }));
}

export { computeMonthlyIntensityAdjustment, resolveExercisePainFeedback, VALID_CAUSED_PAIN };
