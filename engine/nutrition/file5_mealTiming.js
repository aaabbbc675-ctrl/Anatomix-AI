// فایل ۵ موتور تغذیه (بخش ۲.۳ سند: زمان‌بندی وعده‌ها) + تابع مستقل بخش ۲.۶
// (بودجه) که در همین فایل ساخته و تست می‌شود اما در processMealTiming مصرف
// نمی‌شود (طبق تصمیم صریح تاییدشده batch ۵ — تعدیل پروتئین اقتصادی فقط
// وقتی معنا دارد که Smart Swap واقعاً یک protein_quality=incomplete انتخاب
// کرده باشد، چیزی که فقط در batch ۶ معلوم می‌شود).
//
// ورودی: protein_g/carb_g/fat_g یک «روز» (خروجی فایل ۳ یا هر کدام از
// high_day/low_day فایل ۴) + weight_kg + meals_count_requested +
// pre_workout_meal_index/post_workout_meal_index (فایل ۱) +
// session_intensity/time_until_next_session_hours (فایل ۱).

// طبق بخش ۲.۳ سند، نقطه‌ی MEV هر بازه (پایین‌ترین نقطه‌ی مستند)، هم‌الگوی
// batch ۳/۴.
const PRE_WORKOUT_CARB_PERCENT = 20; // بازه‌ی سند: ۲۰-۳۰٪
const PRE_WORKOUT_PROTEIN_PERCENT = 10; // بازه‌ی سند: ۱۰-۱۵٪
// چربی+فیبر پیش‌تمرین <۱۰ گرم: چون این معده اصلاً چربی تخصیص‌یافته نمی‌گیرد
// (چربی «تبعید» می‌شود، پایین‌تر)، این سقف همیشه به‌طور بدیهی رعایت می‌شود.
const PRE_WORKOUT_FAT_FIBER_MAX_G = 10;

const POST_WORKOUT_CARB_PERCENT = 20; // بازه‌ی سند: ۲۰-۳۰٪
const POST_WORKOUT_PROTEIN_PERCENT = 15; // بازه‌ی سند: ۱۵-۲۰٪

// طبق تصمیم صریح تاییدشده (batch ۵): ۳۰-۴۰ گرم پروتئین قبل‌خواب مقدار
// مطلق مستند ISSN است (نه گرم/کیلو نسبی)، هم‌الگوی کراتین/کافئین در batch ۳
// که ثابت ماندند نه ورودی جدید شدند. MEV=۳۰ (پایین‌ترین نقطه).
const PRE_SLEEP_PROTEIN_G = 30;

// طبق بخش ۲.۳ سند: بازه‌ی سلامت پروتئین هر وعده.
const MEAL_PROTEIN_MIN_G_PER_KG = 0.25;
const MEAL_PROTEIN_MAX_G_PER_KG = 0.4;

// طبق تصمیم صریح تاییدشده (batch ۵): برخلاف SEVERE_DEVIATION_THRESHOLD_PERCENT
// (که یک آستانه‌ی UX محض بود)، RPE≥۷ یک قرارداد شناخته‌شده در ادبیات تمرین
// مبتنی بر RPE است (معادل ۲-۳ تکرار تا ناتوانی) — هم‌رده با آستانه‌های EA
// (۳۰/۴۵) که از اجماع علمی می‌آیند، نه یک عدد حدسی محصولی.
const HIGH_INTENSITY_RPE_THRESHOLD = 7;

// طبق بخش ۲.۳ سند: «فاصله تا جلسه‌ی بعدی کمتر از ۸ ساعت».
const URGENT_NEXT_SESSION_HOURS_THRESHOLD = 8;

// طبق بخش ۲.۶ سند: «~۱۰-۲۰٪ افزایش پروتئین» برای منابع گیاهی ناقص. MEV=۱۰٪.
// این تابع فقط ساخته و تست می‌شود؛ صدا زدنش کار batch ۶ است (بالای فایل).
const INCOMPLETE_PROTEIN_ADJUSTMENT_PERCENT = 10;

function computeIncompleteProteinAdjustment({ protein_g }) {
  return protein_g * (1 + INCOMPLETE_PROTEIN_ADJUSTMENT_PERCENT / 100);
}

// طبق بخش ۲.۳ سند، شاخه‌ی دوعاملی پنجره‌ی بعد تمرین — فقط زمان‌بندی پیشنهادی
// را عوض می‌کند (urgency)، نه مقدار ماکرو (که همیشه همان ۲۰-۳۰٪/۱۵-۲۰٪ است).
function determinePostWorkoutUrgency({ session_intensity, time_until_next_session_hours }) {
  const highIntensityDepleted = session_intensity >= HIGH_INTENSITY_RPE_THRESHOLD;
  const nextSessionSoon = time_until_next_session_hours < URGENT_NEXT_SESSION_HOURS_THRESHOLD;
  return highIntensityDepleted || nextSessionSoon ? "immediate" : "relaxed";
}

function processMealTiming({
  protein_g,
  carb_g,
  fat_g,
  weight_kg,
  meals_count_requested,
  pre_workout_meal_index,
  post_workout_meal_index,
  session_intensity,
  time_until_next_session_hours,
}) {
  const warnings = [];

  // طبق تصمیم صریح تاییدشده: اگر بعد‌تمرین = آخرین وعده (تمرین درست قبل
  // خواب)، قاعده‌ی قبل‌خواب برنده می‌شود (پروتئین دیرجذب ثابت، نه زودجذب
  // بعد‌تمرین) — چون MPS شبانه از فرصت کوتاه‌مدت پس از تمرین مهم‌تر است.
  // این فقط هشدار می‌دهد، هرگز throw نمی‌کند (اصل بخش ۱.۴).
  const isMerged = post_workout_meal_index === meals_count_requested;
  if (isMerged) {
    warnings.push({ code: "post_workout_pre_sleep_meal_merged", severity: "info", coach_note: null });
  }

  const preWorkoutCarbG = (PRE_WORKOUT_CARB_PERCENT / 100) * carb_g;
  const preWorkoutProteinG = (PRE_WORKOUT_PROTEIN_PERCENT / 100) * protein_g;

  // کربوی بعد‌تمرین صرف‌نظر از merge بودن همچنان اعمال می‌شود — فقط قاعده‌ی
  // سرعت جذب پروتئین است که در حالت merge عوض می‌شود، نه بازسازی گلیکوژن.
  const postWorkoutCarbG = (POST_WORKOUT_CARB_PERCENT / 100) * carb_g;
  const postWorkoutProteinG = isMerged ? PRE_SLEEP_PROTEIN_G : (POST_WORKOUT_PROTEIN_PERCENT / 100) * protein_g;
  const urgency = isMerged ? null : determinePostWorkoutUrgency({ session_intensity, time_until_next_session_hours });

  const preSleepMealIndex = meals_count_requested; // همیشه آخرین وعده.

  // مجموعه‌ی وعده‌های «ویژه» برای پروتئین: قبل‌تمرین + بعد‌تمرین + قبل‌خواب
  // (اگر merge نشده باشد؛ اگر merge شده، قبل‌خواب همان وعده‌ی بعد‌تمرین است،
  // دوباره شمرده نمی‌شود).
  const proteinSpecialIndices = new Set([pre_workout_meal_index, post_workout_meal_index]);
  if (!isMerged) proteinSpecialIndices.add(preSleepMealIndex);

  // مجموعه‌ی وعده‌های «ویژه» برای کربو/چربی: فقط قبل‌تمرین + بعد‌تمرین —
  // قبل‌خواب هیچ قاعده‌ی کربو/چربی خاصی در سند ندارد، پس مثل یک وعده‌ی
  // معمولی سهم می‌برد.
  const carbFatSpecialIndices = new Set([pre_workout_meal_index, post_workout_meal_index]);

  const allIndices = Array.from({ length: meals_count_requested }, (_, i) => i + 1);
  let proteinRegularIndices = allIndices.filter((i) => !proteinSpecialIndices.has(i));
  let carbFatRegularIndices = allIndices.filter((i) => !carbFatSpecialIndices.has(i));

  const proteinClaimedG = preWorkoutProteinG + postWorkoutProteinG + (isMerged ? 0 : PRE_SLEEP_PROTEIN_G);
  const proteinRemainderG = protein_g - proteinClaimedG;
  if (proteinRemainderG < 0) {
    // مثل target_calories_unrealistic خانواده‌ی فایل‌های قبلی: سهم‌های ثابت
    // (پیش‌تمرین+بعدتمرین+قبل‌خواب) از کل پروتئین روز بیشتر شده‌اند.
    warnings.push({ code: "meal_timing_protein_exceeds_total", severity: "caution", coach_note: null });
  }

  const carbClaimedG = preWorkoutCarbG + postWorkoutCarbG;
  const carbRemainderG = carb_g - carbClaimedG;
  if (carbRemainderG < 0) {
    warnings.push({ code: "meal_timing_carb_exceeds_total", severity: "caution", coach_note: null });
  }

  // چربی هرگز به وعده‌ی ویژه‌ای تخصیص نمی‌یابد (تبعید چربی از این معده‌ها،
  // طبق سند)، پس کل fat_g باقی‌مانده است.
  const fatRemainderG = fat_g;

  // شبکه‌ی ایمنی (طبق اصل ۱.۴: هرگز قفل نمی‌شود): اگر با تعداد وعده‌ی کم
  // (مثلاً ۳ وعده با هر سه نقش متفاوت) هیچ وعده‌ی «معمولی»ای باقی نماند،
  // باقی‌مانده بین همه‌ی وعده‌ها (حتی ویژه‌ها) پخش می‌شود تا هیچ گرمی گم
  // نشود — نه اینکه throw کند یا مقداری را نادیده بگیرد.
  let noRegularSlotWarned = false;
  if (proteinRegularIndices.length === 0) {
    proteinRegularIndices = allIndices;
    noRegularSlotWarned = true;
  }
  if (carbFatRegularIndices.length === 0) {
    carbFatRegularIndices = allIndices;
    noRegularSlotWarned = true;
  }
  if (noRegularSlotWarned) {
    warnings.push({ code: "no_regular_meal_slot_available", severity: "info", coach_note: null });
  }

  const proteinPerRegularMealG = proteinRemainderG / proteinRegularIndices.length;
  const carbPerRegularMealG = carbRemainderG / carbFatRegularIndices.length;
  const fatPerRegularMealG = fatRemainderG / carbFatRegularIndices.length;

  // مدل «پایه + سهم» (نه یا/یا): پایه از نقش وعده می‌آید (ثابت/درصدی ویژه)،
  // سهمِ باقی‌مانده جدا و همیشه روی همان پایه جمع می‌شود. این تفکیک لازم
  // است تا شبکه‌ی ایمنی «هیچ وعده‌ی معمولی باقی نماند» (بالاتر) واقعاً کار
  // کند: در آن حالت proteinRegularIndices=allIndices می‌شود، یعنی حتی
  // وعده‌های ویژه هم باید سهمی از باقی‌مانده اضافه بگیرند، نه اینکه چون
  // «نقش ویژه» دارند از گرفتن سهم محروم بمانند (وگرنه باقی‌مانده گم می‌شود).
  const meals = [];
  for (let mealIndex = 1; mealIndex <= meals_count_requested; mealIndex++) {
    let role;
    let baseProteinG = 0;
    let baseCarbG = 0;

    if (mealIndex === pre_workout_meal_index) {
      role = "pre_workout";
      baseProteinG = preWorkoutProteinG;
      baseCarbG = preWorkoutCarbG;
    } else if (mealIndex === post_workout_meal_index) {
      role = isMerged ? "post_workout_pre_sleep" : "post_workout";
      baseProteinG = postWorkoutProteinG;
      baseCarbG = postWorkoutCarbG;
    } else if (!isMerged && mealIndex === preSleepMealIndex) {
      role = "pre_sleep";
      baseProteinG = PRE_SLEEP_PROTEIN_G;
    } else {
      role = "regular";
    }

    const proteinShareG = proteinRegularIndices.includes(mealIndex) ? proteinPerRegularMealG : 0;
    const carbShareG = carbFatRegularIndices.includes(mealIndex) ? carbPerRegularMealG : 0;
    const fatShareG = carbFatRegularIndices.includes(mealIndex) ? fatPerRegularMealG : 0;

    meals.push({
      meal_index: mealIndex,
      role,
      protein_g: baseProteinG + proteinShareG,
      carb_g: baseCarbG + carbShareG,
      fat_g: fatShareG,
    });
  }

  // چک سلامت طبق بخش ۲.۳: فقط برای وعده‌های «معمولی» — وعده‌های ویژه
  // (پیش/بعدتمرین/قبل‌خواب) قاعده‌ی خودشان را دارند، نه این بازه را.
  for (const meal of meals) {
    if (meal.role === "regular") {
      const perKg = meal.protein_g / weight_kg;
      if (perKg < MEAL_PROTEIN_MIN_G_PER_KG || perKg > MEAL_PROTEIN_MAX_G_PER_KG) {
        warnings.push({
          code: "meal_protein_outside_sane_range",
          severity: "info",
          coach_note: null,
          meal_index: meal.meal_index,
        });
      }
    }
  }

  return { meals, post_workout_urgency: urgency, warnings };
}

export {
  processMealTiming,
  determinePostWorkoutUrgency,
  computeIncompleteProteinAdjustment,
  PRE_WORKOUT_CARB_PERCENT,
  PRE_WORKOUT_PROTEIN_PERCENT,
  PRE_WORKOUT_FAT_FIBER_MAX_G,
  POST_WORKOUT_CARB_PERCENT,
  POST_WORKOUT_PROTEIN_PERCENT,
  PRE_SLEEP_PROTEIN_G,
  MEAL_PROTEIN_MIN_G_PER_KG,
  MEAL_PROTEIN_MAX_G_PER_KG,
  HIGH_INTENSITY_RPE_THRESHOLD,
  URGENT_NEXT_SESSION_HOURS_THRESHOLD,
  INCOMPLETE_PROTEIN_ADJUSTMENT_PERCENT,
};
