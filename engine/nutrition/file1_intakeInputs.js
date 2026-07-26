// فایل ۱ موتور تغذیه (بخش ۳.۱ سند معماری، ایستگاه اول Pre-Generation):
// اعتبارسنجی و شکل‌دهی پایه‌ی ورودی‌های خام فرم — نوع داده، مقادیر مجاز
// enum. هیچ محاسبه‌ی BMR/TDEE/EA اینجا نیست — آن منطق ماژول ۱ (بخش ۲.۱) و
// گیت EA (بخش ۱.۱) است که دسته‌ی جدای بعدی خواهد بود، نه این فایل. هم‌الگوی
// engine/corrective/file1_systemInputs.js: تابع خالص، throw صریح فارسی روی
// enum نامعتبر، بدون هیچ تصمیم‌گیری بالینی/محصولی.

const VALID_SEX = ["male", "female"];

// طبق بخش ۲.۱-ب سند: پنج سطح فعالیت جدول ضریب TDEE.
const VALID_ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "heavy", "athlete"];

// طبق بخش ۲.۲ سند: هفت رشته‌ی فیزیولوژیک متمایز جدول ماتریس ماکرو. سطر
// «بادی‌بیلدینگ در کات» یک رشته‌ی جدا نیست — بلکه همان fitness_bodybuilding
// وقتی main_goal=fat_loss است (تصمیم تفسیری من، چون سند این را صریح نگفته؛
// انتخاب سطر ماکرو مربوطه کار ماژول ۲ در دسته‌ی بعدی است، نه اینجا).
const VALID_SPORT_TYPES = [
  "fitness_bodybuilding",
  "powerlifting_weightlifting",
  "team_sports",
  "combat_sports",
  "endurance",
  "sprint",
  "skill_sports",
];

const VALID_MAIN_GOALS = ["fat_loss", "muscle_gain", "maintenance"];
const VALID_BUDGET_TIERS = ["economic", "medium", "premium"];

// طبق فیلترهای رژیمی/پزشکی بانک غذا (بخش ۲.۸ سند) — تا محدودیت‌های ورودی
// ایستگاه اول مستقیماً با فیلترهای واقعی Foods قابل اعمال باشند.
const VALID_DIETARY_RESTRICTIONS = ["vegan", "vegetarian", "gluten_free", "lactose_free", "diabetic_friendly"];

const MIN_MEALS_COUNT = 3;
const MAX_MEALS_COUNT = 8;

// طبق بخش ۲.۱-ج سند: افزایش وزن = TDEE + ۳۰۰ تا ۵۰۰. برخلاف fat_loss (که
// سند صریح ۰.۵٪ را با دلیل «بیشینه حفظ عضله» پیش‌فرض گذاشته)، برای این بازه
// هیچ نقطه‌ی پیش‌فرضی در سند نیامده — طبق تصمیم صریح تاییدشده، موتور یک عدد
// حدسی وسط بازه نمی‌سازد؛ مربی/شاگرد خودشان عدد را از این بازه انتخاب
// می‌کنند (اجباری، فقط وقتی main_goal=muscle_gain باشد).
const MUSCLE_GAIN_SURPLUS_MIN_KCAL = 300;
const MUSCLE_GAIN_SURPLUS_MAX_KCAL = 500;

// طبق بخش ۲.۴ سند: هر بلوک (۲ و ۳) کاهش ۱۵۰-۲۰۰ کالری. بازه صریح مستند
// است، اما نقطه‌ی پیش‌فرض داخل بازه نیست — طبق تصمیم صریح تاییدشده (batch ۴):
// مربی/شاگرد خودشان از این بازه انتخاب می‌کنند، هم‌الگوی muscle_gain_surplus_kcal.
const BLOCK_REDUCTION_MIN_KCAL = 150;
const BLOCK_REDUCTION_MAX_KCAL = 200;

// طبق بخش ۲.۵ سند: سند هیچ نسبت/فرمول عددی برای تقسیم پایه‌ی کربوهیدرات
// بین High-Day/Low-Day نمی‌دهد (فقط جهت کیفی: «بالاتر»/«پایین‌تر»). طبق
// تصمیم صریح تاییدشده (batch ۴): پارامتر اجباری از مربی/شاگرد، فقط برای
// تقسیم پایه‌ی بلوک ۱ (بدون کاهش) استفاده می‌شود. بازه‌ی [0,100) صرفاً یک
// ضرورت ریاضی است (نه عدد حدسی): در ≥۱۰۰٪، Low-Day carb به صفر یا منفی
// می‌رسد که بی‌معنی است.
const CARB_CYCLING_PERCENT_MIN = 0;
const CARB_CYCLING_PERCENT_MAX_EXCLUSIVE = 100;

function processIntakeInputs(input = {}) {
  const age = Number(input.age);
  if (!Number.isInteger(age) || age <= 0) {
    throw new Error(`age نامعتبر: "${input.age}". باید عدد صحیح مثبت باشد.`);
  }

  const weightKg = Number(input.weight_kg);
  if (!(weightKg > 0)) {
    throw new Error(`weight_kg نامعتبر: "${input.weight_kg}". باید عدد مثبت باشد.`);
  }

  const heightCm = Number(input.height_cm);
  if (!(heightCm > 0)) {
    throw new Error(`height_cm نامعتبر: "${input.height_cm}". باید عدد مثبت باشد.`);
  }

  if (!VALID_SEX.includes(input.sex)) {
    throw new Error(`sex نامعتبر: "${input.sex}". مقادیر مجاز: ${VALID_SEX.join(", ")}`);
  }

  // طبق بخش ۱.۱ سند: nullable عمدی — نبودش یعنی EA بعداً «محاسبه نشد»
  // گزارش می‌شود، نه اینکه با یک فرض جایگزین جایگزین شود.
  let bodyFatPercent = null;
  if (input.body_fat_percent !== null && input.body_fat_percent !== undefined) {
    bodyFatPercent = Number(input.body_fat_percent);
    if (!(bodyFatPercent > 0 && bodyFatPercent < 100)) {
      throw new Error(`body_fat_percent نامعتبر: "${input.body_fat_percent}". باید عددی بین ۰ و ۱۰۰ باشد یا خالی/null بماند.`);
    }
  }

  // طبق تصمیم صریح تاییدشده (پیش از batch ۲): گیت EA بخش ۱.۱ به «کالری سوخته
  // در تمرین» نیاز دارد که جدا از ضریب TDEE است و در سند برای‌اش منبعی معین
  // نشده بود. راه‌حل تاییدشده: فیلد ورودی دستی nullable، هم‌الگوی
  // body_fat_percent — نبودنش یعنی EA بعداً صادقانه «محاسبه نشد» می‌شود، نه
  // اینکه با تخمین MET حدسی جایگزین شود.
  let trainingCaloriesBurned = null;
  if (input.training_calories_burned !== null && input.training_calories_burned !== undefined) {
    trainingCaloriesBurned = Number(input.training_calories_burned);
    if (!(trainingCaloriesBurned >= 0)) {
      throw new Error(`training_calories_burned نامعتبر: "${input.training_calories_burned}". باید عدد ≥۰ باشد یا خالی/null بماند.`);
    }
  }

  if (!VALID_ACTIVITY_LEVELS.includes(input.activity_level)) {
    throw new Error(`activity_level نامعتبر: "${input.activity_level}". مقادیر مجاز: ${VALID_ACTIVITY_LEVELS.join(", ")}`);
  }

  if (!VALID_SPORT_TYPES.includes(input.sport_type)) {
    throw new Error(`sport_type نامعتبر: "${input.sport_type}". مقادیر مجاز: ${VALID_SPORT_TYPES.join(", ")}`);
  }

  if (!VALID_MAIN_GOALS.includes(input.main_goal)) {
    throw new Error(`main_goal نامعتبر: "${input.main_goal}". مقادیر مجاز: ${VALID_MAIN_GOALS.join(", ")}`);
  }

  // فقط برای muscle_gain اجباری است (طبق تصمیم صریح تاییدشده بالا) — برای
  // fat_loss/maintenance این فیلد بی‌ربط است و اعتبارسنجی نمی‌شود.
  let muscleGainSurplusKcal = null;
  if (input.main_goal === "muscle_gain") {
    muscleGainSurplusKcal = Number(input.muscle_gain_surplus_kcal);
    if (
      !Number.isFinite(muscleGainSurplusKcal) ||
      muscleGainSurplusKcal < MUSCLE_GAIN_SURPLUS_MIN_KCAL ||
      muscleGainSurplusKcal > MUSCLE_GAIN_SURPLUS_MAX_KCAL
    ) {
      throw new Error(
        `muscle_gain_surplus_kcal نامعتبر: "${input.muscle_gain_surplus_kcal}". برای main_goal=muscle_gain باید عددی بین ${MUSCLE_GAIN_SURPLUS_MIN_KCAL} تا ${MUSCLE_GAIN_SURPLUS_MAX_KCAL} باشد.`
      );
    }
  }

  // طبق بخش ۲.۴ سند و تصمیم صریح تاییدشده (batch ۴): هر دو فیلد اجباری‌اند،
  // بدون پیش‌فرض داخلی — همیشه لازم‌اند چون هر برنامه‌ی ۱۰ماهه سه بلوک دارد.
  const block2ReductionKcal = Number(input.block2_reduction_kcal);
  if (
    !Number.isFinite(block2ReductionKcal) ||
    block2ReductionKcal < BLOCK_REDUCTION_MIN_KCAL ||
    block2ReductionKcal > BLOCK_REDUCTION_MAX_KCAL
  ) {
    throw new Error(
      `block2_reduction_kcal نامعتبر: "${input.block2_reduction_kcal}". باید عددی بین ${BLOCK_REDUCTION_MIN_KCAL} تا ${BLOCK_REDUCTION_MAX_KCAL} باشد.`
    );
  }
  const block3ReductionKcal = Number(input.block3_reduction_kcal);
  if (
    !Number.isFinite(block3ReductionKcal) ||
    block3ReductionKcal < BLOCK_REDUCTION_MIN_KCAL ||
    block3ReductionKcal > BLOCK_REDUCTION_MAX_KCAL
  ) {
    throw new Error(
      `block3_reduction_kcal نامعتبر: "${input.block3_reduction_kcal}". باید عددی بین ${BLOCK_REDUCTION_MIN_KCAL} تا ${BLOCK_REDUCTION_MAX_KCAL} باشد.`
    );
  }

  // طبق بخش ۲.۵ سند و تصمیم صریح تاییدشده (batch ۴).
  const carbCyclingPercent = Number(input.carb_cycling_percent);
  if (
    !Number.isFinite(carbCyclingPercent) ||
    carbCyclingPercent < CARB_CYCLING_PERCENT_MIN ||
    carbCyclingPercent >= CARB_CYCLING_PERCENT_MAX_EXCLUSIVE
  ) {
    throw new Error(
      `carb_cycling_percent نامعتبر: "${input.carb_cycling_percent}". باید عددی بین ${CARB_CYCLING_PERCENT_MIN} تا کمتر از ${CARB_CYCLING_PERCENT_MAX_EXCLUSIVE} باشد.`
    );
  }

  if (!VALID_BUDGET_TIERS.includes(input.budget_tier)) {
    throw new Error(`budget_tier نامعتبر: "${input.budget_tier}". مقادیر مجاز: ${VALID_BUDGET_TIERS.join(", ")}`);
  }

  const mealsCountRequested = Number(input.meals_count_requested);
  if (!Number.isInteger(mealsCountRequested) || mealsCountRequested < MIN_MEALS_COUNT || mealsCountRequested > MAX_MEALS_COUNT) {
    throw new Error(
      `meals_count_requested نامعتبر: "${input.meals_count_requested}". باید عدد صحیح بین ${MIN_MEALS_COUNT} تا ${MAX_MEALS_COUNT} باشد.`
    );
  }

  // طبق بخش ۲.۳ سند و تصمیم صریح تاییدشده (batch ۵): چون هیچ ورودی ساعت
  // بیداری/شروع روز نداریم، «قبل تمرین»/«بعد تمرین» با محاسبه‌ی ساعت واقعی
  // ممکن نیست — مربی/شاگرد مستقیماً شماره‌ی وعده را برچسب می‌زنند. قاعده‌ی
  // ترتیبی (نه عدد حدسی، فقط منطق ساختاری): وعده‌ی بعد تمرین باید شماره‌ای
  // بزرگ‌تر از وعده‌ی قبل تمرین داشته باشد — این خودش تضمین می‌کند وعده‌ی
  // قبل‌تمرین هرگز آخرین وعده نباشد.
  const preWorkoutMealIndex = Number(input.pre_workout_meal_index);
  if (!Number.isInteger(preWorkoutMealIndex) || preWorkoutMealIndex < 1 || preWorkoutMealIndex > mealsCountRequested) {
    throw new Error(
      `pre_workout_meal_index نامعتبر: "${input.pre_workout_meal_index}". باید عدد صحیح بین ۱ تا ${mealsCountRequested} (meals_count_requested) باشد.`
    );
  }
  const postWorkoutMealIndex = Number(input.post_workout_meal_index);
  if (
    !Number.isInteger(postWorkoutMealIndex) ||
    postWorkoutMealIndex < 1 ||
    postWorkoutMealIndex > mealsCountRequested
  ) {
    throw new Error(
      `post_workout_meal_index نامعتبر: "${input.post_workout_meal_index}". باید عدد صحیح بین ۱ تا ${mealsCountRequested} (meals_count_requested) باشد.`
    );
  }
  if (postWorkoutMealIndex <= preWorkoutMealIndex) {
    throw new Error(
      `post_workout_meal_index (${postWorkoutMealIndex}) باید بزرگ‌تر از pre_workout_meal_index (${preWorkoutMealIndex}) باشد — وعده‌ی بعد تمرین ساختاراً بعد از وعده‌ی قبل تمرین می‌آید.`
    );
  }

  // طبق بخش ۲.۳ سند: RPE عددی، هم‌الگوی computeMonthlyIntensityAdjustment
  // در engine/corrective/monthlyFeedbackProcessor.js — نه enum سبک/متوسط/سنگین
  // (تصمیم صریح تاییدشده، برای هم‌قراردادی بین دو موتور).
  const sessionIntensity = Number(input.session_intensity);
  if (!Number.isInteger(sessionIntensity) || sessionIntensity < 1 || sessionIntensity > 10) {
    throw new Error(`session_intensity نامعتبر: "${input.session_intensity}". باید عدد صحیح RPE بین ۱ تا ۱۰ باشد.`);
  }

  const timeUntilNextSessionHours = Number(input.time_until_next_session_hours);
  if (!(timeUntilNextSessionHours >= 0)) {
    throw new Error(`time_until_next_session_hours نامعتبر: "${input.time_until_next_session_hours}". باید عدد ≥۰ باشد.`);
  }

  // ساعت تمرین: سند بازه‌ی عددی مشخصی برایش نگفته (فقط «ساعت تمرین» به‌عنوان
  // یک ورودی خام ایستگاه اول)، پس اینجا فقط رشته‌ی غیرخالی پذیرفته می‌شود —
  // بدون اختراع یک بازه‌ی عددی حدسی.
  if (typeof input.training_time !== "string" || input.training_time.length === 0) {
    throw new Error(`training_time نامعتبر: "${input.training_time}". باید رشته‌ی غیرخالی باشد.`);
  }

  const allergiesInput = input.allergies ?? [];
  if (!Array.isArray(allergiesInput) || allergiesInput.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new Error("allergies باید آرایه‌ای از رشته‌های غیرخالی باشد.");
  }

  const dietaryRestrictionsInput = input.dietary_restrictions ?? [];
  if (
    !Array.isArray(dietaryRestrictionsInput) ||
    dietaryRestrictionsInput.some((entry) => !VALID_DIETARY_RESTRICTIONS.includes(entry))
  ) {
    throw new Error(
      `dietary_restrictions نامعتبر: "${JSON.stringify(input.dietary_restrictions)}". مقادیر مجاز: ${VALID_DIETARY_RESTRICTIONS.join(", ")}`
    );
  }

  return {
    age,
    weight_kg: weightKg,
    height_cm: heightCm,
    sex: input.sex,
    body_fat_percent: bodyFatPercent,
    activity_level: input.activity_level,
    sport_type: input.sport_type,
    main_goal: input.main_goal,
    muscle_gain_surplus_kcal: muscleGainSurplusKcal,
    block2_reduction_kcal: block2ReductionKcal,
    block3_reduction_kcal: block3ReductionKcal,
    carb_cycling_percent: carbCyclingPercent,
    budget_tier: input.budget_tier,
    meals_count_requested: mealsCountRequested,
    pre_workout_meal_index: preWorkoutMealIndex,
    post_workout_meal_index: postWorkoutMealIndex,
    training_time: input.training_time,
    training_calories_burned: trainingCaloriesBurned,
    session_intensity: sessionIntensity,
    time_until_next_session_hours: timeUntilNextSessionHours,
    allergies: allergiesInput,
    dietary_restrictions: dietaryRestrictionsInput,
  };
}

export {
  processIntakeInputs,
  VALID_SEX,
  VALID_ACTIVITY_LEVELS,
  VALID_SPORT_TYPES,
  VALID_MAIN_GOALS,
  VALID_BUDGET_TIERS,
  VALID_DIETARY_RESTRICTIONS,
  MIN_MEALS_COUNT,
  MAX_MEALS_COUNT,
  MUSCLE_GAIN_SURPLUS_MIN_KCAL,
  MUSCLE_GAIN_SURPLUS_MAX_KCAL,
  BLOCK_REDUCTION_MIN_KCAL,
  BLOCK_REDUCTION_MAX_KCAL,
  CARB_CYCLING_PERCENT_MIN,
  CARB_CYCLING_PERCENT_MAX_EXCLUSIVE,
};
