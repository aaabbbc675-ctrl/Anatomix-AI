// بازه‌های سنی طبق داده‌ی تاییدشده‌ی سند اصلی (نه فرضی). دو بازه‌ی مرزی
// (کودکان <=۱۲ و سالمندان >=۶۰) نیازمند «تایید مسئولیت مربی» (Disclaimer) هستند.
// طبق متن صریح کاربر: «اگر مربی نپذیرفت، سیستم روال بزرگسالان را با مسئولیت
// مربی پیش می‌برد» — یعنی رد Disclaimer باعث بلاک‌شدن نمی‌شود، فقط باعث می‌شود
// این محدودیت‌های سخت‌گیرانه اعمال نشوند. به همین دلیل خروجی این تابع همیشه دو
// بخش دارد: آیا اصلاً تایید لازم بود؟ و در صورت تایید/عدم‌تایید، وصله چیست؟
//
// بازه‌ی ۱۳-۵۹: عمداً "روال استاندارد سیستم" است — هیچ محدودیتی از این‌جا اعمال
// نمی‌شود (سن به‌عنوان ضریب پیوسته در فایل ۲ هم خنثی/۱.۰ در نظر گرفته شده).

const CHILD_MAX_AGE = 12;
const ELDERLY_MIN_AGE = 60;

function childPatch() {
  return {
    sets_range: [null, 2],
    rep_range: [null, 15],
    intensity_percent_1rm_range: null,
    rpe_range: null,
    rir_range: null,
    rest_sec_min: 60, // بازه‌ی ۶۰-۱۲۰؛ ۶۰ کف تضمین‌شده
    tempo_overrides: ["2-0-2-0", "3-0-3-0"], // هرکدام مجاز است (بدون مکث)
    warmup_extra_min: null,
    warmup_cooldown_extra_percent: null,
    max_training_days_per_week: null,
    monthly_progression_cap_percent: 10,
    banned_tags: ["1RM_test", "explosive_movement", "jumping"],
    equipment_priority: [],
    specific_exercise_overrides: [],
    warnings: [],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

// طبق سند: مبتدی ۱ ست / باتجربه ۲-۳ ست؛ رپ استقامتی (fat_loss) در برابر حفظ توده
// (بقیه‌ی اهداف) دو مسیر جدا دارد.
function elderlyPatch({ experience, main_goal }) {
  const isBeginnerLike = experience === "beginner";
  const isEndurancePath = main_goal === "fat_loss";
  return {
    sets_range: isBeginnerLike ? [1, 1] : [2, 3],
    rep_range: isEndurancePath ? [10, 15] : [8, 12],
    intensity_percent_1rm_range: null,
    rpe_range: isEndurancePath ? [4, 5] : [6, 7],
    rir_range: null,
    // بازه‌ی ایزوله ۶۰-۱۲۰ / مرکب ۱۲۰-۱۸۰؛ ۱۲۰ به‌عنوان کف عمومی و محافظه‌کارانه‌ی
    // جلسه گرفته شده — تفکیک دقیق ایزوله/مرکب کار فایل ۴/۵ (انتخاب حرکت) است.
    rest_sec_min: 120,
    tempo_overrides: ["2-0-2-0", "1-0-3-0"],
    warmup_extra_min: null,
    warmup_cooldown_extra_percent: 50,
    max_training_days_per_week: 3,
    monthly_progression_cap_percent: null,
    banned_tags: ["Valsalva", "Isometric_Hold"],
    equipment_priority: ["machine"],
    specific_exercise_overrides: [],
    warnings: ["اولویت با حرکات دستگاه؛ حداکثر ۱ حرکت یک‌طرفه در ماه ۱ و ۲ برنامه"],
    hard_stop: false,
    hard_stop_reasons: [],
    requires_coach_confirmation: [],
  };
}

function evaluateAgeProtocol({ age, experience, main_goal, coachConfirmedAgeException }) {
  const isChild = age <= CHILD_MAX_AGE;
  const isElderly = age >= ELDERLY_MIN_AGE;

  if (!isChild && !isElderly) {
    return { requiresConfirmation: false, confirmationReason: null, patch: null };
  }

  const confirmationReason = isChild
    ? `سن ${age} — کودک (۱۲ سال یا کمتر)، نیازمند تایید مسئولیت مربی`
    : `سن ${age} — سالمند (۶۰ سال یا بیشتر)، نیازمند تایید مسئولیت مربی`;

  if (!coachConfirmedAgeException) {
    // رد/عدم‌تایید → روال بزرگسالان استاندارد، بدون محدودیت اضافه از این ماژول.
    return { requiresConfirmation: true, confirmationReason, patch: null };
  }

  const patch = isChild ? childPatch() : elderlyPatch({ experience, main_goal });
  return { requiresConfirmation: true, confirmationReason, patch };
}

export { evaluateAgeProtocol, CHILD_MAX_AGE, ELDERLY_MIN_AGE };
