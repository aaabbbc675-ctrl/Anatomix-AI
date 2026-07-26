// فایل ۲ موتور تغذیه (بخش ۲.۱ سند: BMR/TDEE/کالری هدف) + گیت EA (بخش ۱.۱) +
// کف‌های پیش‌فرض ماکرو (بخش ۱.۲). ورودی این فایل خروجی processIntakeInputs
// (فایل ۱) است — enum‌های sex/activity_level/main_goal آنجا اعتبارسنجی
// شده‌اند، اینجا فقط محاسبه (هم‌الگوی engine/corrective/file2_priorityAndOverload.js:
// فایل بعدی enum فایل قبلی را دوباره اعتبارسنجی نمی‌کند).
//
// طبق تصمیم صریح بخش ۱.۱/۱.۴ سند: این گیت هرگز چیزی را قفل نمی‌کند —
// فقط warnings[] تولید می‌کند، تولید/ذخیره‌ی برنامه هرگز متوقف نمی‌شود.

// طبق بخش ۲.۱-ب سند: پنج سطح فعالیت، همان ترتیب VALID_ACTIVITY_LEVELS
// (فایل ۱).
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  athlete: 1.9,
};

// طبق بخش ۲.۱-ج سند: پیش‌فرض مستند صریح برای کاهش وزن — نه وسط بازه‌ی
// ۰.۵-۱.۰٪، بلکه دقیقاً ۰.۵٪ چون سند دلیل صریح آورده («بیشینه‌ی حفظ عضله»).
// خودِ عدد کالری هدف در خروجی نهایی توسط مربی قابل ویرایش است (بخش ۳.۱)،
// نه اینکه این نرخ یک ورودی جدای ایستگاه اول باشد.
const DEFAULT_FAT_LOSS_RATE_PERCENT = 0.5;
const KCAL_PER_KG_BODYWEIGHT = 7700;

// طبق بخش ۱.۱ سند: آستانه‌های EA.
const EA_OPTIMAL_THRESHOLD_KCAL_PER_KG_FFM = 45;
const EA_SUBOPTIMAL_THRESHOLD_KCAL_PER_KG_FFM = 30;

// طبق بخش ۱.۲ سند: کف‌های پیش‌فرض ماکرو.
const PROTEIN_FLOOR_G_PER_KG = 1.2;
const FAT_FLOOR_G_PER_KG = 0.5;
const FAT_FLOOR_PERCENT_OF_CALORIES = 0.2;
const CARB_FLOOR_G_PER_KG = 2;

// بخش ۲.۱-الف: انتخاب فرمول BMR.
function computeBmr({ sex, age, weight_kg, height_cm, body_fat_percent }) {
  if (body_fat_percent !== null) {
    const ffmKg = weight_kg * (1 - body_fat_percent / 100);
    return { bmr: 370 + 21.6 * ffmKg, formula_used: "katch_mcardle", ffm_kg: ffmKg };
  }
  const mifflinBase = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  const bmr = sex === "male" ? mifflinBase + 5 : mifflinBase - 161;
  return { bmr, formula_used: "mifflin_st_jeor", ffm_kg: null };
}

// بخش ۲.۱-ب.
function computeTdee(bmr, activityLevel) {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  if (multiplier === undefined) {
    throw new Error(`activity_level نامعتبر برای TDEE: "${activityLevel}"`);
  }
  return bmr * multiplier;
}

// بخش ۲.۱-ج.
function computeTargetCalories({ tdee, main_goal, weight_kg, muscle_gain_surplus_kcal }) {
  if (main_goal === "fat_loss") {
    // DEFAULT_FAT_LOSS_RATE_PERCENT=0.5 یعنی «۰.۵٪ وزن بدن»؛ باید اول به
    // کسر تبدیل شود (÷۱۰۰) وگرنه کسری روزانه دو رقم بزرگ‌تر از واقعی می‌شود.
    const dailyDeficit = ((DEFAULT_FAT_LOSS_RATE_PERCENT / 100) * weight_kg * KCAL_PER_KG_BODYWEIGHT) / 7;
    return tdee - dailyDeficit;
  }
  if (main_goal === "muscle_gain") {
    return tdee + muscle_gain_surplus_kcal;
  }
  if (main_goal === "maintenance") {
    return tdee;
  }
  throw new Error(`main_goal نامعتبر برای محاسبه‌ی کالری هدف: "${main_goal}"`);
}

// بخش ۱.۱: گیت EA. صداقت در نبود داده (بخش ۴، اصل ۵): اگر FFM یا کالری
// سوخته‌ی تمرین در دسترس نباشد، «محاسبه نشد» گزارش می‌شود، نه یک فرض
// جایگزین.
//
// تصمیم تفسیری من درباره‌ی severity: خودِ سند بین بخش ۳.۲ («caution مثلاً
// EA زیر ۳۰») و نمونه‌ی JSON بخش ۳.۳ (EA=41.2، یعنی داخل باند suboptimal
// ۳۰-۴۵، با severity=caution) ناسازگار است. اینجا تعریف بخش ۱.۱ را معیار
// گرفتم: باند suboptimal («هشدار زرد») فقط در داشبورد مربی می‌ماند →
// severity=info؛ باند low زیر ۳۰ («هشدار قرمز») → severity=caution. اگر این
// برداشت درست نیست، همین‌جا قابل تغییر است.
function computeEnergyAvailability({ target_calories, training_calories_burned, ffm_kg }) {
  if (ffm_kg === null || training_calories_burned === null) {
    return { ea_kcal_per_kg_ffm: null, ea_status: "not_calculable", warnings: [] };
  }
  const ea = (target_calories - training_calories_burned) / ffm_kg;
  if (ea >= EA_OPTIMAL_THRESHOLD_KCAL_PER_KG_FFM) {
    return { ea_kcal_per_kg_ffm: ea, ea_status: "optimal", warnings: [] };
  }
  if (ea >= EA_SUBOPTIMAL_THRESHOLD_KCAL_PER_KG_FFM) {
    return {
      ea_kcal_per_kg_ffm: ea,
      ea_status: "suboptimal",
      warnings: [{ code: "ea_suboptimal", severity: "info", coach_note: null }],
    };
  }
  return {
    ea_kcal_per_kg_ffm: ea,
    ea_status: "low",
    warnings: [{ code: "ea_low", severity: "caution", coach_note: null }],
  };
}

// کف چربی عمومی (بخش ۱.۲) — تابع مستقل تا فایل ۳ (ماتریس ماکرو رشته‌ای)
// دقیقاً همین را بازاستفاده کند، نه اینکه فرمول را دوباره بنویسد.
function computeGenericFatFloorG({ target_calories, weight_kg }) {
  return Math.max(FAT_FLOOR_G_PER_KG * weight_kg, (FAT_FLOOR_PERCENT_OF_CALORIES * target_calories) / 9);
}

// بخش ۱.۲: کف‌های پیش‌فرض ماکرو — پروتئین ثابت → چربی تا کف ۲۰٪ کالری →
// کربوهیدرات باقی‌مانده.
function computeDefaultMacroFloors({ target_calories, weight_kg }) {
  const proteinG = PROTEIN_FLOOR_G_PER_KG * weight_kg;
  const fatG = computeGenericFatFloorG({ target_calories, weight_kg });
  const carbG = (target_calories - proteinG * 4 - fatG * 9) / 4;

  const warnings = [];
  // طبق اصلاح صریح تاییدشده: کربوهیدرات منفی یعنی کالری هدف حتی کف
  // پروتئین+چربی را هم پوشش نمی‌دهد — این «کالری هدف غیرواقعی» است، نه صرفاً
  // «کمی زیر کف کربوهیدرات»، پس کد و پیام هشدار متفاوت است. عدد واقعی
  // (حتی منفی) در خروجی نگه داشته می‌شود، پنهان نمی‌شود — طبق فلسفه‌ی
  // شفافیت بخش ۱.۱/۱.۴: هرگز عدد واقعی جایگزین با یک فرض نمی‌شود.
  if (carbG < 0) {
    warnings.push({ code: "target_calories_unrealistic", severity: "caution", coach_note: null });
  } else if (carbG / weight_kg < CARB_FLOOR_G_PER_KG) {
    warnings.push({ code: "carb_below_floor", severity: "caution", coach_note: null });
  }

  return { protein_g: proteinG, fat_g: fatG, carb_g: carbG, warnings };
}

function processEnergyTargets(intake) {
  const { bmr, formula_used, ffm_kg } = computeBmr(intake);
  const tdee = computeTdee(bmr, intake.activity_level);
  const targetCalories = computeTargetCalories({
    tdee,
    main_goal: intake.main_goal,
    weight_kg: intake.weight_kg,
    muscle_gain_surplus_kcal: intake.muscle_gain_surplus_kcal,
  });

  const eaResult = computeEnergyAvailability({
    target_calories: targetCalories,
    training_calories_burned: intake.training_calories_burned,
    ffm_kg,
  });

  const macroFloors = computeDefaultMacroFloors({ target_calories: targetCalories, weight_kg: intake.weight_kg });

  return {
    bmr,
    bmr_formula_used: formula_used,
    ffm_kg,
    tdee,
    target_calories: targetCalories,
    energy_availability_kcal_per_kg_ffm: eaResult.ea_kcal_per_kg_ffm,
    ea_status: eaResult.ea_status,
    default_macros: {
      protein_g: macroFloors.protein_g,
      fat_g: macroFloors.fat_g,
      carb_g: macroFloors.carb_g,
    },
    warnings: [...eaResult.warnings, ...macroFloors.warnings],
  };
}

export {
  processEnergyTargets,
  computeBmr,
  computeTdee,
  computeTargetCalories,
  computeEnergyAvailability,
  computeDefaultMacroFloors,
  computeGenericFatFloorG,
  ACTIVITY_MULTIPLIERS,
  DEFAULT_FAT_LOSS_RATE_PERCENT,
  KCAL_PER_KG_BODYWEIGHT,
  EA_OPTIMAL_THRESHOLD_KCAL_PER_KG_FFM,
  EA_SUBOPTIMAL_THRESHOLD_KCAL_PER_KG_FFM,
  PROTEIN_FLOOR_G_PER_KG,
  FAT_FLOOR_G_PER_KG,
  FAT_FLOOR_PERCENT_OF_CALORIES,
  CARB_FLOOR_G_PER_KG,
};
