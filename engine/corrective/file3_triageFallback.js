// فایل ۳ موتور اصلاحی (بخش ۳.۵ سند): سلسله‌مراتب تریاژ + فیلتر
// Contraindications با Fallback + حلقه‌ی ایمنی RPE برای نواحی آسیب‌دیده.

// --- سلسله‌مراتب تریاژ: Rehab > Correction > Hypertrophy/Strength ---
const TRIAGE_PRIORITY_ORDER = ["rehab", "correction", "hypertrophy_strength"];

function sortByTriagePriority(exercises) {
  exercises.forEach((exercise) => {
    if (!TRIAGE_PRIORITY_ORDER.includes(exercise.triageCategory)) {
      throw new Error(
        `triageCategory ناشناخته: "${exercise.triageCategory}". مقادیر مجاز: ${TRIAGE_PRIORITY_ORDER.join(", ")}`
      );
    }
  });

  return [...exercises].sort(
    (a, b) => TRIAGE_PRIORITY_ORDER.indexOf(a.triageCategory) - TRIAGE_PRIORITY_ORDER.indexOf(b.triageCategory)
  );
}

// --- فیلتر Contraindications با Fallback ---
// طبق تصمیم صریح: Contraindication یک فیلتر ایمنی مطلق است (بر خلاف
// ناهنجاری وضعیتی نسبی در ماژول ۹). وقتی حرکتی contraindicated است:
//   ۱. اگر alternative_corrective_exercise دارد و آن جایگزین در بانک پیدا
//      شود و خودش هم هیچ Contraindication فعالی نداشته باشد → جایگزین
//      می‌شود (بدون زنجیره‌ی بازگشتی — سند فقط یک لایه جایگزینی گفته).
//   ۲. در غیر این صورت (فیلد جایگزین نیست، در بانک نیست، یا خودش هم
//      contraindicated است) → حرکت کاملاً حذف می‌شود و یک هشدار جدی جدا
//      (نه پرچم روی حرکت باقی‌مانده) در آرایه‌ی warnings برمی‌گردد.
function hasActiveContraindication(exercise, userContraindications) {
  const tags = exercise.contraindications ?? [];
  return tags.some((tag) => userContraindications.includes(tag));
}

function applyContraindicationFilterWithFallback(exercises, userContraindications, exerciseBankById = {}) {
  const resultExercises = [];
  const warnings = [];

  exercises.forEach((exercise) => {
    if (!hasActiveContraindication(exercise, userContraindications)) {
      resultExercises.push(exercise);
      return;
    }

    const alternativeId = exercise.alternative_corrective_exercise;
    const alternative = alternativeId ? exerciseBankById[alternativeId] : undefined;

    if (alternative && !hasActiveContraindication(alternative, userContraindications)) {
      resultExercises.push(alternative);
      return;
    }

    warnings.push({
      exerciseId: exercise.id,
      severity: "critical",
      reason: `حرکت "${exercise.id}" به‌خاطر Contraindication فعال حذف شد و هیچ جایگزین امنی (Alternative_Corrective_Exercise) پیدا نشد.`,
    });
  });

  return { exercises: resultExercises, warnings };
}

// --- حلقه‌ی ایمنی: RPE ماه قبل در ناحیه‌ی آسیب‌دیده ---
function resolveInjuredAreaProgressionCap({ previousMonthRpeInInjuredArea }) {
  if (!Number.isFinite(previousMonthRpeInInjuredArea) || previousMonthRpeInInjuredArea < 0 || previousMonthRpeInInjuredArea > 10) {
    throw new Error(
      `previousMonthRpeInInjuredArea نامعتبر: "${previousMonthRpeInInjuredArea}". باید عدد بین ۰ تا ۱۰ باشد.`
    );
  }

  if (previousMonthRpeInInjuredArea >= 7) {
    return { capped: true, progressionPercentRange: [0, 5] };
  }
  return { capped: false, progressionPercentRange: null };
}

export { TRIAGE_PRIORITY_ORDER, sortByTriagePriority, applyContraindicationFilterWithFallback, resolveInjuredAreaProgressionCap };
