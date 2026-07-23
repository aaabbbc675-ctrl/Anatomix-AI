// فایل ۱ موتور اصلاحی (بخش ۳.۱ سند، بخش‌های الف+ب): شکل‌دهی و اعتبارسنجی
// پایه‌ی ورودی‌های اولیه‌ی سیستم (نوع داده، مقادیر مجاز enum). هیچ منطق
// تصمیم‌گیری بالینی/گیت اینجا نیست — تصمیم proceed/suggest_corrective_warmup/
// force_corrective_warmup_injection در دسته‌ی ۲ توسط
// engine/shared/bodybuildingReadinessGate.js گرفته می‌شود، نه اینجا.
//
// بخش ج (حلقه‌ی بازخورد ماهانه: Muscle_Soreness/Joint_Nerve_Pain/RPE) در این
// فایل نیست — آن ورودی تکرارشونده‌ی ماه ۲+ است، نه ورودی اولیه؛ در
// monthlyFeedbackProcessor.js (کامیت بعدی) پیاده می‌شود.
import { adaptDeviceJson } from "../shared/deviceJsonAdapter.js";

const VALID_USER_LEVELS = ["Beginner", "Intermediate", "Advanced"];

function processIntakeInputs(input = {}) {
  if (!VALID_USER_LEVELS.includes(input.userLevel)) {
    throw new Error(`userLevel نامعتبر: "${input.userLevel}". مقادیر مجاز: ${VALID_USER_LEVELS.join(", ")}`);
  }

  if (typeof input.bodybuildingRequest !== "boolean") {
    throw new Error(`bodybuildingRequest نامعتبر: "${input.bodybuildingRequest}". باید true یا false باشد.`);
  }

  const days = Number(input.workoutDaysPerWeek);
  if (!Number.isInteger(days) || days < 1 || days > 7) {
    throw new Error(`workoutDaysPerWeek نامعتبر: "${input.workoutDaysPerWeek}". باید عدد صحیح بین ۱ تا ۷ باشد.`);
  }

  const coachPrioritizedDeformities = input.coachPrioritizedDeformities ?? [];
  if (
    !Array.isArray(coachPrioritizedDeformities) ||
    coachPrioritizedDeformities.some((deformityId) => typeof deformityId !== "string" || deformityId.length === 0)
  ) {
    throw new Error("coachPrioritizedDeformities باید آرایه‌ای از رشته‌های غیرخالی باشد (ترتیب آرایه = اولویت).");
  }

  const manualBlacklistExercisesInput = input.manualBlacklistExercises ?? [];
  if (!Array.isArray(manualBlacklistExercisesInput)) {
    throw new Error("manualBlacklistExercises باید آرایه باشد.");
  }
  const manualBlacklistExercises = manualBlacklistExercisesInput.map((entry, index) => {
    if (!entry || typeof entry.exerciseId !== "string" || entry.exerciseId.length === 0) {
      throw new Error(`manualBlacklistExercises[${index}] نامعتبر: exerciseId باید رشته‌ی غیرخالی باشد.`);
    }
    return {
      exerciseId: entry.exerciseId,
      reasonNote: typeof entry.reasonNote === "string" ? entry.reasonNote : null,
    };
  });

  return {
    // طبق بخش ۲ سند: داده‌ی خام دستگاه همیشه از آداپتور مشترک عبور می‌کند،
    // نه مستقیم مصرف می‌شود — حتی وقتی خودِ آداپتور فعلاً pass-through است.
    assessmentData: adaptDeviceJson(input.assessmentData ?? null),
    userLevel: input.userLevel,
    bodybuildingRequest: input.bodybuildingRequest,
    workoutDaysPerWeek: days,
    coachPrioritizedDeformities,
    manualBlacklistExercises,
    generalNotes: typeof input.generalNotes === "string" ? input.generalNotes : "",
  };
}

export { processIntakeInputs, VALID_USER_LEVELS };
