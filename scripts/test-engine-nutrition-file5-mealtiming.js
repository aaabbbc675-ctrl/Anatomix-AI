// اسکریپت تست مستقل برای فایل ۵ موتور تغذیه (processMealTiming و توابع
// زیرمجموعه‌اش). اجرا: node scripts/test-engine-nutrition-file5-mealtiming.js
//
// همه‌ی اعداد انتظار با دست (خارج از کد موتور) محاسبه و با node -e جداگانه
// صحت‌سنجی شده‌اند، دقیقاً هم‌الگوی batch ۲/۳/۴ — از جمله یک باگ واقعی
// (گم‌شدن باقی‌مانده در حالت «هیچ وعده‌ی معمولی باقی نمانده») که همین
// صحت‌سنجی مستقل پیش از نوشتن تست پیدا و رفع کرد.

let passCount = 0;
let failCount = 0;

function check(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${description}`);
    console.log(`     ${err.message}`);
    failCount++;
  }
}

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || "mismatch"} — actual: ${actual}, expected: ${expected} (±${tolerance})`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

function findMeal(meals, index) {
  return meals.find((m) => m.meal_index === index);
}

(async () => {
  const {
    processMealTiming,
    determinePostWorkoutUrgency,
    computeIncompleteProteinAdjustment,
    PRE_WORKOUT_CARB_PERCENT,
    PRE_WORKOUT_PROTEIN_PERCENT,
    POST_WORKOUT_CARB_PERCENT,
    POST_WORKOUT_PROTEIN_PERCENT,
    PRE_SLEEP_PROTEIN_G,
    MEAL_PROTEIN_MIN_G_PER_KG,
    MEAL_PROTEIN_MAX_G_PER_KG,
    HIGH_INTENSITY_RPE_THRESHOLD,
    URGENT_NEXT_SESSION_HOURS_THRESHOLD,
    INCOMPLETE_PROTEIN_ADJUSTMENT_PERCENT,
  } = await import("../engine/nutrition/file5_mealTiming.js");

  console.log("\n[ثابت‌ها — طبق سند و تصمیمات تاییدشده]");
  check("درصدهای MEV دقیقاً طبق بازه‌ی سند هستند", () => {
    assert(PRE_WORKOUT_CARB_PERCENT === 20);
    assert(PRE_WORKOUT_PROTEIN_PERCENT === 10);
    assert(POST_WORKOUT_CARB_PERCENT === 20);
    assert(POST_WORKOUT_PROTEIN_PERCENT === 15);
    assert(PRE_SLEEP_PROTEIN_G === 30);
    assert(MEAL_PROTEIN_MIN_G_PER_KG === 0.25);
    assert(MEAL_PROTEIN_MAX_G_PER_KG === 0.4);
  });
  check("آستانه‌های urgency دقیقاً RPE≥7 و <۸ ساعت هستند", () => {
    assert(HIGH_INTENSITY_RPE_THRESHOLD === 7);
    assert(URGENT_NEXT_SESSION_HOURS_THRESHOLD === 8);
  });
  check("درصد تعدیل پروتئین ناقص دقیقاً ۱۰٪ (MEV) است", () => {
    assert(INCOMPLETE_PROTEIN_ADJUSTMENT_PERCENT === 10);
  });

  console.log("\n[determinePostWorkoutUrgency — شاخه‌ی دوعاملی، مرزهای دقیق]");
  check("RPE=8, hours=24 → immediate (فقط به‌خاطر شدت بالا)", () => {
    assert(determinePostWorkoutUrgency({ session_intensity: 8, time_until_next_session_hours: 24 }) === "immediate");
  });
  check("RPE=3, hours=5 → immediate (فقط به‌خاطر فاصله‌ی کم)", () => {
    assert(determinePostWorkoutUrgency({ session_intensity: 3, time_until_next_session_hours: 5 }) === "immediate");
  });
  check("RPE=3, hours=24 → relaxed (هیچ‌کدام شرط را برآورده نمی‌کند)", () => {
    assert(determinePostWorkoutUrgency({ session_intensity: 3, time_until_next_session_hours: 24 }) === "relaxed");
  });
  check("RPE=7 دقیقاً (مرز) → immediate", () => {
    assert(determinePostWorkoutUrgency({ session_intensity: 7, time_until_next_session_hours: 24 }) === "immediate");
  });
  check("hours=8 دقیقاً (مرز، نه کمتر از ۸) → relaxed", () => {
    assert(determinePostWorkoutUrgency({ session_intensity: 6, time_until_next_session_hours: 8 }) === "relaxed");
  });

  console.log("\n[computeIncompleteProteinAdjustment — بخش ۲.۶، ساخته‌شده اما در processMealTiming مصرف‌نشده]");
  check("protein_g=150 → 165 (دقیقاً +۱۰٪)", () => {
    assertClose(computeIncompleteProteinAdjustment({ protein_g: 150 }), 165, 0.001);
  });

  console.log("\n[processMealTiming — سناریوی تمیز، بدون هشدار]");
  check("weight=80, protein=140, carb=500, fat=90, meals=6, pre=3, post=4 (نه merge) — همه‌ی اعداد دقیق", () => {
    // preWorkoutProtein=14, preWorkoutCarb=100; postWorkoutProtein=21, postWorkoutCarb=100
    // presleep(meal6)=30 پروتئین ثابت
    // proteinClaimed=14+21+30=65 → remainder=75 → روی ۳ وعده‌ی معمولی(1,2,5)=25 هرکدام (25/80=0.3125 داخل بازه)
    // carbClaimed=100+100=200 → remainder=300 → روی ۴ وعده‌ی غیرویژه(1,2,5,6)=75 هرکدام
    // fat=90 → روی همان ۴ وعده=22.5 هرکدام
    const result = processMealTiming({
      protein_g: 140,
      carb_g: 500,
      fat_g: 90,
      weight_kg: 80,
      meals_count_requested: 6,
      pre_workout_meal_index: 3,
      post_workout_meal_index: 4,
      session_intensity: 5,
      time_until_next_session_hours: 24,
    });
    assert(result.meals.length === 6);
    assert(result.post_workout_urgency === "relaxed");
    assert(result.warnings.length === 0, `انتظار بدون هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);

    const m1 = findMeal(result.meals, 1);
    const m3 = findMeal(result.meals, 3);
    const m4 = findMeal(result.meals, 4);
    const m6 = findMeal(result.meals, 6);
    assert(m1.role === "regular");
    assertClose(m1.protein_g, 25, 0.001);
    assertClose(m1.carb_g, 75, 0.001);
    assertClose(m1.fat_g, 22.5, 0.001);
    assert(m3.role === "pre_workout");
    assertClose(m3.protein_g, 14, 0.001);
    assertClose(m3.carb_g, 100, 0.001);
    assertClose(m3.fat_g, 0, 0.001);
    assert(m4.role === "post_workout");
    assertClose(m4.protein_g, 21, 0.001);
    assertClose(m4.carb_g, 100, 0.001);
    assert(m6.role === "pre_sleep");
    assertClose(m6.protein_g, 30, 0.001);
    assertClose(m6.carb_g, 75, 0.001);
    assertClose(m6.fat_g, 22.5, 0.001);

    const totalProtein = result.meals.reduce((s, m) => s + m.protein_g, 0);
    const totalCarb = result.meals.reduce((s, m) => s + m.carb_g, 0);
    const totalFat = result.meals.reduce((s, m) => s + m.fat_g, 0);
    assertClose(totalProtein, 140, 0.001, "مجموع پروتئین همه‌ی وعده‌ها باید دقیقاً برابر کل روز باشد");
    assertClose(totalCarb, 500, 0.001);
    assertClose(totalFat, 90, 0.001);
  });

  console.log("\n[processMealTiming — بعد‌تمرین = آخرین وعده (merge با قبل‌خواب)]");
  check("weight=70, protein=126, carb=350, fat=60, meals=4, pre=2, post=4 (=meals_count → merge)", () => {
    // postWorkoutProtein در حالت merge = 30 (قاعده‌ی قبل‌خواب برنده می‌شود)، نه 15%×126=18.9
    // proteinClaimed=12.6+30=42.6 → remainder=83.4 → روی ۲ وعده‌ی معمولی(1,3)=41.7 هرکدام
    // 41.7/70=0.595>0.40 → عمداً خارج از بازه، برای پوشش جهت «بالاتر از سقف»
    const result = processMealTiming({
      protein_g: 126,
      carb_g: 350,
      fat_g: 60,
      weight_kg: 70,
      meals_count_requested: 4,
      pre_workout_meal_index: 2,
      post_workout_meal_index: 4,
      session_intensity: 5,
      time_until_next_session_hours: 24,
    });
    assert(result.post_workout_urgency === null, "در حالت merge، urgency معنا ندارد");
    const m4 = findMeal(result.meals, 4);
    assert(m4.role === "post_workout_pre_sleep");
    assertClose(m4.protein_g, 30, 0.001, "پروتئین باید ۳۰ ثابت (قاعده‌ی قبل‌خواب) باشد، نه ۱۵٪×۱۲۶=۱۸.۹");
    assertClose(m4.carb_g, 70, 0.001, "کربوی بعد‌تمرین صرف‌نظر از merge همچنان اعمال می‌شود");

    assert(
      result.warnings.some((w) => w.code === "post_workout_pre_sleep_meal_merged" && w.severity === "info"),
      `انتظار post_workout_pre_sleep_meal_merged داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`
    );
    const saneWarnings = result.warnings.filter((w) => w.code === "meal_protein_outside_sane_range");
    assert(saneWarnings.length === 2, `انتظار ۲ هشدار sane-range (وعده‌های ۱ و ۳) داشتیم، گرفتیم: ${JSON.stringify(saneWarnings)}`);

    const totalProtein = result.meals.reduce((s, m) => s + m.protein_g, 0);
    const totalCarb = result.meals.reduce((s, m) => s + m.carb_g, 0);
    const totalFat = result.meals.reduce((s, m) => s + m.fat_g, 0);
    assertClose(totalProtein, 126, 0.001);
    assertClose(totalCarb, 350, 0.001);
    assertClose(totalFat, 60, 0.001);
  });

  console.log("\n[processMealTiming — شبکه‌ی ایمنی: هیچ وعده‌ی معمولی باقی نمی‌ماند]");
  check("meals=3, pre=1, post=2 (presleep=3) — هر سه وعده ویژه‌اند، اما هیچ گرمی گم نمی‌شود", () => {
    // proteinSpecial={1,2,3}=همه → fallback فعال؛ carbFatSpecial={1,2} → regular=[3] (presleep) → بدون fallback برای کربو/چربی
    // این دقیقاً همان باگی بود که پیش از تست پیدا و رفع شد: بدون رفع، ۴۵ گرم
    // پروتئین این‌جا بی‌صدا گم می‌شد.
    const result = processMealTiming({
      protein_g: 100,
      carb_g: 300,
      fat_g: 50,
      weight_kg: 70,
      meals_count_requested: 3,
      pre_workout_meal_index: 1,
      post_workout_meal_index: 2,
      session_intensity: 3,
      time_until_next_session_hours: 20,
    });
    assert(
      result.warnings.some((w) => w.code === "no_regular_meal_slot_available" && w.severity === "info"),
      `انتظار no_regular_meal_slot_available داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`
    );
    const m1 = findMeal(result.meals, 1);
    const m2 = findMeal(result.meals, 2);
    const m3 = findMeal(result.meals, 3);
    assertClose(m1.protein_g, 25, 0.001, "پیش‌تمرین: پایه ۱۰ + سهم فال‌بک ۱۵");
    assertClose(m2.protein_g, 30, 0.001, "بعد‌تمرین: پایه ۱۵ + سهم فال‌بک ۱۵");
    assertClose(m3.protein_g, 45, 0.001, "قبل‌خواب: پایه ۳۰ + سهم فال‌بک ۱۵");
    assertClose(m3.carb_g, 180, 0.001, "قبل‌خواب تنها وعده‌ی غیرویژه برای کربو/چربی است، کل باقی‌مانده را می‌گیرد");
    assertClose(m3.fat_g, 50, 0.001);

    const totalProtein = result.meals.reduce((s, m) => s + m.protein_g, 0);
    const totalCarb = result.meals.reduce((s, m) => s + m.carb_g, 0);
    const totalFat = result.meals.reduce((s, m) => s + m.fat_g, 0);
    assertClose(totalProtein, 100, 0.001, "با وجود شبکه‌ی ایمنی، مجموع باید دقیقاً همان کل روز بماند — نه گم، نه اضافه");
    assertClose(totalCarb, 300, 0.001);
    assertClose(totalFat, 50, 0.001);
  });

  console.log("\n[processMealTiming — هشدارهای سرریز]");
  check("protein_g خیلی کم نسبت به سهم‌های ثابت (پیش+بعد+قبل‌خواب) → meal_timing_protein_exceeds_total", () => {
    // claimed=0.10×30+0.15×30+30=37.5 > protein_g=30 → remainder=-7.5
    const result = processMealTiming({
      protein_g: 30,
      carb_g: 300,
      fat_g: 50,
      weight_kg: 70,
      meals_count_requested: 4,
      pre_workout_meal_index: 1,
      post_workout_meal_index: 2,
      session_intensity: 3,
      time_until_next_session_hours: 20,
    });
    assert(
      result.warnings.some((w) => w.code === "meal_timing_protein_exceeds_total" && w.severity === "caution"),
      `انتظار meal_timing_protein_exceeds_total داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`
    );
  });
  check("carb_g منفی (ورودی خراب از بالادست — دفاع داخلی) → meal_timing_carb_exceeds_total", () => {
    // این حالت با carb_g مثبت هرگز رخ نمی‌دهد (۴۰٪<۱۰۰٪ همیشه)؛ فقط دفاع
    // داخلی در برابر یک carb_g منفیِ از قبل خراب از بالادست (فایل ۲/۳/۴).
    const result = processMealTiming({
      protein_g: 140,
      carb_g: -40,
      fat_g: 90,
      weight_kg: 80,
      meals_count_requested: 6,
      pre_workout_meal_index: 3,
      post_workout_meal_index: 4,
      session_intensity: 5,
      time_until_next_session_hours: 24,
    });
    assert(
      result.warnings.some((w) => w.code === "meal_timing_carb_exceeds_total" && w.severity === "caution"),
      `انتظار meal_timing_carb_exceeds_total داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`
    );
  });

  console.log("\n[processMealTiming — meal_protein_outside_sane_range (جهت پایین‌تر از کف)]");
  check("weight=100, protein=100 (کم نسبت به وزن)، meals=8, pre=2, post=3 → وعده‌های معمولی زیر کف ۰.۲۵", () => {
    // claimed=10+15+30=55 → remainder=45 روی ۵ وعده‌ی معمولی(1,4,5,6,7)=9 هرکدام
    // 9/100=0.09 < 0.25 → زیر کف، برای هر ۵ وعده
    const result = processMealTiming({
      protein_g: 100,
      carb_g: 400,
      fat_g: 60,
      weight_kg: 100,
      meals_count_requested: 8,
      pre_workout_meal_index: 2,
      post_workout_meal_index: 3,
      session_intensity: 3,
      time_until_next_session_hours: 20,
    });
    const saneWarnings = result.warnings.filter((w) => w.code === "meal_protein_outside_sane_range");
    assert(saneWarnings.length === 5, `انتظار ۵ هشدار (وعده‌های معمولی ۱،۴،۵،۶،۷) داشتیم، گرفتیم: ${JSON.stringify(saneWarnings)}`);
    const m1 = findMeal(result.meals, 1);
    assertClose(m1.protein_g, 9, 0.001);
    assertClose(m1.protein_g / 100, 0.09, 0.001, "باید زیر کف ۰.۲۵ باشد");
  });

  console.log(`\n[test-engine-nutrition-file5-mealtiming] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
