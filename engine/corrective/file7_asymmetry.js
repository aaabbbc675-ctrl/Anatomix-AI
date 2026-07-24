// فایل ۷ موتور اصلاحی (بخش ۳.۶ سند): پردازش عدم‌تقارن.
//
// این فایل مستقیماً از فیلد application_rule که در دسته‌ی ۱ به
// engine/bodybuilding/data/exercises.seed.js اضافه شد استفاده می‌کند (چک شد:
// همان فیلد است، Same_Side/Opposite_Side)، نه یک فیلد جدید و جدا.
//
// طبق تصمیم صریح: نوع حرکت (کشش/تقویت) پارامتر ورودی از فراخوان است، نه
// استنباط از movement_type — چون compound/isolation و stretch/strengthen دو
// محور متفاوتند (مثلاً جلو پا isolation است ولی تقویتی، نه کششی؛ نگاشتن
// یکی به دیگری یک پروکسی غلط می‌ساخت).

const AFFECTED_SIDES = ["Right", "Left", "Bilateral", "Unknown"];
const DEFORMITY_CATEGORIES = ["axial", "joint_or_pain"];
const EXERCISE_FUNCTIONS = ["stretch", "strengthen"];
const APPLICATION_RULES = ["Same_Side", "Opposite_Side"];

// --- کالیبراسیون: نوع ناهنجاری + نوع حرکت → application_rule درست ---
function calibrateApplicationRule({ deformityCategory, exerciseFunction }) {
  if (!DEFORMITY_CATEGORIES.includes(deformityCategory)) {
    throw new Error(`deformityCategory نامعتبر: "${deformityCategory}". مقادیر مجاز: ${DEFORMITY_CATEGORIES.join(", ")}`);
  }
  if (!EXERCISE_FUNCTIONS.includes(exerciseFunction)) {
    throw new Error(`exerciseFunction نامعتبر: "${exerciseFunction}". مقادیر مجاز: ${EXERCISE_FUNCTIONS.join(", ")}`);
  }

  // ناهنجاری محوری (اسکولیوز/تیلت لگن): کشش→Same_Side، تقویت→Opposite_Side
  if (deformityCategory === "axial") {
    return exerciseFunction === "stretch" ? "Same_Side" : "Opposite_Side";
  }

  // ناهنجاری مفصلی/درد (کجی سر/مچ): کشش و تقویت هر دو→Same_Side
  return "Same_Side";
}

// --- مصرف application_rule واقعیِ حرکت + Affected_Side کاربر → سمت فیزیکی اجرا ---
function resolveEffectiveSide({ affectedSide, applicationRule }) {
  if (affectedSide === "Unknown") {
    throw new Error("affectedSide='Unknown' اینجا قابل‌حل نیست — باید از applyUnknownSideGuardrail استفاده شود.");
  }
  if (!["Right", "Left", "Bilateral"].includes(affectedSide)) {
    throw new Error(`affectedSide نامعتبر: "${affectedSide}". مقادیر مجاز: ${AFFECTED_SIDES.join(", ")}`);
  }
  if (!APPLICATION_RULES.includes(applicationRule)) {
    throw new Error(`applicationRule نامعتبر: "${applicationRule}". مقادیر مجاز: ${APPLICATION_RULES.join(", ")}`);
  }

  if (affectedSide === "Bilateral") return "Bilateral";

  const opposite = affectedSide === "Right" ? "Left" : "Right";
  return applicationRule === "Same_Side" ? affectedSide : opposite;
}

// راحتی: مستقیماً از exercise.application_rule واقعی (فیلد schema بانک حرکات) می‌خواند
function resolveExerciseSide({ exercise, affectedSide }) {
  return resolveEffectiveSide({ affectedSide, applicationRule: exercise.application_rule });
}

// --- گاردریل Unknown/S-شکل ---
// طبق تصمیم صریح: چون هیچ حرکتی در exercises.seed.js فعلی با تگ «Bilateral
// Core Stabilization» مشخص نشده، این فهرست پارامتر صریح از فراخوان است، نه
// فیلتر حدسی بر اساس laterality (bilateral فقط یعنی «یک‌طرفه نیست»، نه
// «حرکت تثبیت مرکزی است» — مثلاً اسکوات هم bilateral است).
function applyUnknownSideGuardrail({ hasSShapeDeformity, affectedSide, exercises, coreStabilizationExerciseIds = [] }) {
  if (typeof hasSShapeDeformity !== "boolean") {
    throw new Error(`hasSShapeDeformity نامعتبر: "${hasSShapeDeformity}". باید true یا false باشد.`);
  }
  if (!AFFECTED_SIDES.includes(affectedSide)) {
    throw new Error(`affectedSide نامعتبر: "${affectedSide}". مقادیر مجاز: ${AFFECTED_SIDES.join(", ")}`);
  }
  if (!Array.isArray(exercises)) {
    throw new Error("exercises باید آرایه باشد.");
  }

  const triggered = hasSShapeDeformity || affectedSide === "Unknown";
  if (!triggered) {
    return { guardrailActive: false, exercises, warnings: [] };
  }

  // همه‌ی حرکات یک‌طرفه باطل می‌شوند؛ از باقی‌مانده فقط آن‌هایی که صریحاً
  // Core Stabilization معرفی شده‌اند مجازند.
  const filtered = exercises.filter(
    (exercise) => exercise.laterality !== "unilateral" && coreStabilizationExerciseIds.includes(exercise.id)
  );

  const warnings = [];
  if (coreStabilizationExerciseIds.length === 0) {
    warnings.push(
      "گاردریل Unknown/S-شکل فعال است، اما هیچ لیست حرکت Bilateral Core Stabilization به این تابع داده نشده — فعلاً هیچ حرکتی تجویز نمی‌شود تا حرکت نامناسب جایگزین نشود."
    );
  }

  return { guardrailActive: true, exercises: filtered, warnings };
}

export {
  AFFECTED_SIDES,
  DEFORMITY_CATEGORIES,
  EXERCISE_FUNCTIONS,
  APPLICATION_RULES,
  calibrateApplicationRule,
  resolveEffectiveSide,
  resolveExerciseSide,
  applyUnknownSideGuardrail,
};
