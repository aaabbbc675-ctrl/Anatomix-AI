// اسکریپت تست مستقل برای فایل ۱ موتور تغذیه (processIntakeInputs).
// اجرا: node scripts/test-engine-nutrition-file1-intakeinputs.js
//
// engine/ ماژول ESM است (engine/package.json)؛ این اسکریپت CommonJS می‌ماند،
// پس باید ماژول موتور را با dynamic import() بارگذاری کند (هم‌الگوی
// scripts/test-engine-corrective-file1-systeminputs.js).

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

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message || "deep-equal mismatch"} — actual: ${a}, expected: ${e}`);
  }
}

function assertThrows(fn, messageIncludes, description) {
  try {
    fn();
    throw new Error(`${description || "انتظار throw داشتیم"} — اما throw نشد`);
  } catch (err) {
    if (messageIncludes && !err.message.includes(messageIncludes)) {
      throw new Error(`${description || "پیام خطا نامنتظره"} — گرفتیم: "${err.message}"`);
    }
  }
}

(async () => {
  const {
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
  } = await import("../engine/nutrition/file1_intakeInputs.js");

  const validInput = () => ({
    age: 28,
    weight_kg: 82,
    height_cm: 178,
    sex: "male",
    body_fat_percent: 15,
    activity_level: "moderate",
    sport_type: "fitness_bodybuilding",
    main_goal: "fat_loss",
    budget_tier: "medium",
    meals_count_requested: 5,
    pre_workout_meal_index: 2,
    post_workout_meal_index: 3,
    training_time: "18:00",
    training_calories_burned: 450,
    session_intensity: 8,
    time_until_next_session_hours: 24,
    allergies: ["nuts"],
    dietary_restrictions: ["lactose_free"],
    block2_reduction_kcal: 175,
    block3_reduction_kcal: 180,
    carb_cycling_percent: 20,
  });

  console.log("\n[ورودی معتبر کامل]");
  check("خروجی درست شکل می‌گیرد و همه‌ی فیلدها round-trip می‌کنند", () => {
    const result = processIntakeInputs(validInput());
    assert(result.age === 28);
    assert(result.weight_kg === 82);
    assert(result.height_cm === 178);
    assert(result.sex === "male");
    assert(result.body_fat_percent === 15);
    assert(result.activity_level === "moderate");
    assert(result.sport_type === "fitness_bodybuilding");
    assert(result.main_goal === "fat_loss");
    assert(result.budget_tier === "medium");
    assert(result.meals_count_requested === 5);
    assert(result.pre_workout_meal_index === 2);
    assert(result.post_workout_meal_index === 3);
    assert(result.block2_reduction_kcal === 175);
    assert(result.block3_reduction_kcal === 180);
    assert(result.carb_cycling_percent === 20);
    assert(result.training_time === "18:00");
    assert(result.training_calories_burned === 450);
    assert(result.session_intensity === 8);
    assert(result.time_until_next_session_hours === 24);
    assertDeepEqual(result.allergies, ["nuts"]);
    assertDeepEqual(result.dietary_restrictions, ["lactose_free"]);
  });

  console.log("\n[body_fat_percent — nullable عمدی طبق بخش ۱.۱ سند]");
  check("نبودن body_fat_percent کرش نمی‌کند، به null می‌افتد (EA بعداً «محاسبه نشد» می‌شود)", () => {
    const input = validInput();
    delete input.body_fat_percent;
    const result = processIntakeInputs(input);
    assert(result.body_fat_percent === null);
  });

  check("body_fat_percent صریحاً null هم پذیرفته می‌شود", () => {
    const result = processIntakeInputs({ ...validInput(), body_fat_percent: null });
    assert(result.body_fat_percent === null);
  });

  check("body_fat_percent خارج از بازه‌ی ۰-۱۰۰ رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), body_fat_percent: 140 }), "body_fat_percent نامعتبر");
  });

  console.log("\n[اعتبارسنجی age/weight_kg/height_cm]");
  check("age غیرصحیح رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), age: 28.5 }), "age نامعتبر");
  });
  check("age صفر یا منفی رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), age: 0 }), "age نامعتبر");
  });
  check("weight_kg منفی رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), weight_kg: -5 }), "weight_kg نامعتبر");
  });
  check("height_cm صفر رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), height_cm: 0 }), "height_cm نامعتبر");
  });

  console.log("\n[اعتبارسنجی enum‌ها]");
  check(`sex نامعتبر رد می‌شود (مقادیر مجاز: ${VALID_SEX.join("/")})`, () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), sex: "other" }), "sex نامعتبر");
  });
  check(`activity_level نامعتبر رد می‌شود (${VALID_ACTIVITY_LEVELS.length} سطح مجاز)`, () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), activity_level: "extreme" }), "activity_level نامعتبر");
  });
  check("مقادیر مجاز activity_level دقیقاً پنج‌تایی جدول بخش ۲.۱-ب است", () => {
    assertDeepEqual(VALID_ACTIVITY_LEVELS, ["sedentary", "light", "moderate", "heavy", "athlete"]);
  });
  check(`sport_type نامعتبر رد می‌شود (${VALID_SPORT_TYPES.length} رشته مجاز)`, () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), sport_type: "chess" }), "sport_type نامعتبر");
  });
  check("مقادیر مجاز sport_type دقیقاً هفت رشته‌ی جدول بخش ۲.۲ است", () => {
    assertDeepEqual(VALID_SPORT_TYPES, [
      "fitness_bodybuilding",
      "powerlifting_weightlifting",
      "team_sports",
      "combat_sports",
      "endurance",
      "sprint",
      "skill_sports",
    ]);
  });
  check(`main_goal نامعتبر رد می‌شود (مقادیر مجاز: ${VALID_MAIN_GOALS.join("/")})`, () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), main_goal: "recomposition" }), "main_goal نامعتبر");
  });
  check(`budget_tier نامعتبر رد می‌شود (مقادیر مجاز: ${VALID_BUDGET_TIERS.join("/")})`, () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), budget_tier: "luxury" }), "budget_tier نامعتبر");
  });

  console.log("\n[اعتبارسنجی meals_count_requested — بازه‌ی تاییدشده ۳ تا ۸]");
  check(`MIN/MAX دقیقاً ${MIN_MEALS_COUNT} و ${MAX_MEALS_COUNT} است`, () => {
    assert(MIN_MEALS_COUNT === 3);
    assert(MAX_MEALS_COUNT === 8);
  });
  check("۲ معده رد می‌شود (زیر کف)", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), meals_count_requested: 2 }), "meals_count_requested نامعتبر");
  });
  check("۹ معده رد می‌شود (بالای سقف)", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), meals_count_requested: 9 }), "meals_count_requested نامعتبر");
  });
  check("دقیقاً ۳ و ۸ (مرزهای بازه) پذیرفته می‌شوند", () => {
    assert(processIntakeInputs({ ...validInput(), meals_count_requested: 3 }).meals_count_requested === 3);
    assert(processIntakeInputs({ ...validInput(), meals_count_requested: 8 }).meals_count_requested === 8);
  });

  console.log("\n[اعتبارسنجی session_intensity — RPE عددی ۱ تا ۱۰، نه enum]");
  check("RPE=۰ رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), session_intensity: 0 }), "session_intensity نامعتبر");
  });
  check("RPE=۱۱ رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), session_intensity: 11 }), "session_intensity نامعتبر");
  });
  check("RPE غیرعددی (رشته‌ی enum قدیمی 'heavy') رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), session_intensity: "heavy" }), "session_intensity نامعتبر");
  });
  check("RPE اعشاری رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), session_intensity: 7.5 }), "session_intensity نامعتبر");
  });

  console.log("\n[اعتبارسنجی time_until_next_session_hours]");
  check("عدد منفی رد می‌شود", () => {
    assertThrows(
      () => processIntakeInputs({ ...validInput(), time_until_next_session_hours: -1 }),
      "time_until_next_session_hours نامعتبر"
    );
  });
  check("صفر پذیرفته می‌شود (یعنی همین الان جلسه‌ی بعدی است)", () => {
    assert(processIntakeInputs({ ...validInput(), time_until_next_session_hours: 0 }).time_until_next_session_hours === 0);
  });

  console.log("\n[training_calories_burned — nullable عمدی، هم‌الگوی body_fat_percent]");
  check("نبودن training_calories_burned کرش نمی‌کند، به null می‌افتد (EA بعداً «محاسبه نشد» می‌شود)", () => {
    const input = validInput();
    delete input.training_calories_burned;
    const result = processIntakeInputs(input);
    assert(result.training_calories_burned === null);
  });
  check("training_calories_burned صریحاً null هم پذیرفته می‌شود", () => {
    const result = processIntakeInputs({ ...validInput(), training_calories_burned: null });
    assert(result.training_calories_burned === null);
  });
  check("training_calories_burned منفی رد می‌شود", () => {
    assertThrows(
      () => processIntakeInputs({ ...validInput(), training_calories_burned: -10 }),
      "training_calories_burned نامعتبر"
    );
  });
  check("training_calories_burned صفر پذیرفته می‌شود", () => {
    assert(processIntakeInputs({ ...validInput(), training_calories_burned: 0 }).training_calories_burned === 0);
  });

  console.log("\n[muscle_gain_surplus_kcal — اجباری فقط برای muscle_gain، بدون پیش‌فرض حدسی]");
  check(`MIN/MAX دقیقاً ${MUSCLE_GAIN_SURPLUS_MIN_KCAL} و ${MUSCLE_GAIN_SURPLUS_MAX_KCAL} است`, () => {
    assert(MUSCLE_GAIN_SURPLUS_MIN_KCAL === 300);
    assert(MUSCLE_GAIN_SURPLUS_MAX_KCAL === 500);
  });
  check("برای fat_loss/maintenance اجباری نیست و به null می‌افتد", () => {
    const result = processIntakeInputs(validInput());
    assert(result.main_goal === "fat_loss");
    assert(result.muscle_gain_surplus_kcal === null);
  });
  check("برای muscle_gain نبودنش رد می‌شود (بدون پیش‌فرض حدسی وسط بازه)", () => {
    assertThrows(
      () => processIntakeInputs({ ...validInput(), main_goal: "muscle_gain" }),
      "muscle_gain_surplus_kcal نامعتبر"
    );
  });
  check("برای muscle_gain خارج از بازه‌ی ۳۰۰-۵۰۰ رد می‌شود", () => {
    assertThrows(
      () => processIntakeInputs({ ...validInput(), main_goal: "muscle_gain", muscle_gain_surplus_kcal: 600 }),
      "muscle_gain_surplus_kcal نامعتبر"
    );
    assertThrows(
      () => processIntakeInputs({ ...validInput(), main_goal: "muscle_gain", muscle_gain_surplus_kcal: 250 }),
      "muscle_gain_surplus_kcal نامعتبر"
    );
  });
  check("برای muscle_gain مقدار معتبر داخل بازه پذیرفته و round-trip می‌شود", () => {
    const result = processIntakeInputs({ ...validInput(), main_goal: "muscle_gain", muscle_gain_surplus_kcal: 350 });
    assert(result.muscle_gain_surplus_kcal === 350);
  });
  check("دقیقاً ۳۰۰ و ۵۰۰ (مرزهای بازه) برای muscle_gain پذیرفته می‌شوند", () => {
    assert(
      processIntakeInputs({ ...validInput(), main_goal: "muscle_gain", muscle_gain_surplus_kcal: 300 })
        .muscle_gain_surplus_kcal === 300
    );
    assert(
      processIntakeInputs({ ...validInput(), main_goal: "muscle_gain", muscle_gain_surplus_kcal: 500 })
        .muscle_gain_surplus_kcal === 500
    );
  });

  console.log("\n[block2_reduction_kcal/block3_reduction_kcal — اجباری، بازه‌ی ۱۵۰-۲۰۰، بدون پیش‌فرض حدسی]");
  check(`MIN/MAX دقیقاً ${BLOCK_REDUCTION_MIN_KCAL} و ${BLOCK_REDUCTION_MAX_KCAL} است`, () => {
    assert(BLOCK_REDUCTION_MIN_KCAL === 150);
    assert(BLOCK_REDUCTION_MAX_KCAL === 200);
  });
  check("نبودن block2_reduction_kcal رد می‌شود (اجباری، بدون پیش‌فرض)", () => {
    const input = validInput();
    delete input.block2_reduction_kcal;
    assertThrows(() => processIntakeInputs(input), "block2_reduction_kcal نامعتبر");
  });
  check("نبودن block3_reduction_kcal رد می‌شود (اجباری، بدون پیش‌فرض)", () => {
    const input = validInput();
    delete input.block3_reduction_kcal;
    assertThrows(() => processIntakeInputs(input), "block3_reduction_kcal نامعتبر");
  });
  check("خارج از بازه‌ی ۱۵۰-۲۰۰ رد می‌شود (هر دو فیلد)", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), block2_reduction_kcal: 149 }), "block2_reduction_kcal نامعتبر");
    assertThrows(() => processIntakeInputs({ ...validInput(), block2_reduction_kcal: 201 }), "block2_reduction_kcal نامعتبر");
    assertThrows(() => processIntakeInputs({ ...validInput(), block3_reduction_kcal: 149 }), "block3_reduction_kcal نامعتبر");
    assertThrows(() => processIntakeInputs({ ...validInput(), block3_reduction_kcal: 201 }), "block3_reduction_kcal نامعتبر");
  });
  check("دقیقاً ۱۵۰ و ۲۰۰ (مرزهای بازه) پذیرفته می‌شوند", () => {
    assert(processIntakeInputs({ ...validInput(), block2_reduction_kcal: 150 }).block2_reduction_kcal === 150);
    assert(processIntakeInputs({ ...validInput(), block2_reduction_kcal: 200 }).block2_reduction_kcal === 200);
    assert(processIntakeInputs({ ...validInput(), block3_reduction_kcal: 150 }).block3_reduction_kcal === 150);
    assert(processIntakeInputs({ ...validInput(), block3_reduction_kcal: 200 }).block3_reduction_kcal === 200);
  });

  console.log("\n[carb_cycling_percent — اجباری، بازه‌ی [0,100)، بدون پیش‌فرض حدسی]");
  check(`MIN دقیقاً ${CARB_CYCLING_PERCENT_MIN} و سقف نامساوی ${CARB_CYCLING_PERCENT_MAX_EXCLUSIVE} است`, () => {
    assert(CARB_CYCLING_PERCENT_MIN === 0);
    assert(CARB_CYCLING_PERCENT_MAX_EXCLUSIVE === 100);
  });
  check("نبودنش رد می‌شود (اجباری، بدون پیش‌فرض)", () => {
    const input = validInput();
    delete input.carb_cycling_percent;
    assertThrows(() => processIntakeInputs(input), "carb_cycling_percent نامعتبر");
  });
  check("۱۰۰ رد می‌شود (سقف نامساوی — در ۱۰۰٪ کربوی Low-Day صفر/منفی می‌شود)", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), carb_cycling_percent: 100 }), "carb_cycling_percent نامعتبر");
  });
  check("منفی رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), carb_cycling_percent: -5 }), "carb_cycling_percent نامعتبر");
  });
  check("صفر پذیرفته می‌شود (یعنی بدون چرخه، High=Low)", () => {
    assert(processIntakeInputs({ ...validInput(), carb_cycling_percent: 0 }).carb_cycling_percent === 0);
  });
  check("۹۹.۹ (نزدیک سقف اما داخل بازه) پذیرفته می‌شود", () => {
    assert(processIntakeInputs({ ...validInput(), carb_cycling_percent: 99.9 }).carb_cycling_percent === 99.9);
  });

  console.log("\n[pre_workout_meal_index/post_workout_meal_index — برچسب‌گذاری مربی، بدون محاسبه‌ی ساعت]");
  check("pre_workout_meal_index خارج از بازه‌ی ۱ تا meals_count_requested رد می‌شود", () => {
    assertThrows(
      () => processIntakeInputs({ ...validInput(), pre_workout_meal_index: 0 }),
      "pre_workout_meal_index نامعتبر"
    );
    assertThrows(
      () => processIntakeInputs({ ...validInput(), meals_count_requested: 5, pre_workout_meal_index: 6 }),
      "pre_workout_meal_index نامعتبر"
    );
  });
  check("post_workout_meal_index خارج از بازه‌ی ۱ تا meals_count_requested رد می‌شود", () => {
    assertThrows(
      () => processIntakeInputs({ ...validInput(), post_workout_meal_index: 0 }),
      "post_workout_meal_index نامعتبر"
    );
    assertThrows(
      () => processIntakeInputs({ ...validInput(), meals_count_requested: 5, post_workout_meal_index: 6 }),
      "post_workout_meal_index نامعتبر"
    );
  });
  check("post_workout_meal_index مساوی یا کوچک‌تر از pre_workout_meal_index رد می‌شود", () => {
    assertThrows(
      () => processIntakeInputs({ ...validInput(), pre_workout_meal_index: 3, post_workout_meal_index: 3 }),
      "باید بزرگ‌تر از pre_workout_meal_index"
    );
    assertThrows(
      () => processIntakeInputs({ ...validInput(), pre_workout_meal_index: 3, post_workout_meal_index: 2 }),
      "باید بزرگ‌تر از pre_workout_meal_index"
    );
  });
  check("post_workout_meal_index دقیقاً یکی بزرگ‌تر (مجاور) پذیرفته می‌شود", () => {
    const result = processIntakeInputs({ ...validInput(), pre_workout_meal_index: 2, post_workout_meal_index: 3 });
    assert(result.pre_workout_meal_index === 2 && result.post_workout_meal_index === 3);
  });
  check("post_workout_meal_index می‌تواند دقیقاً برابر meals_count_requested باشد (هم‌پوشانی با قبل‌خواب — مسئولیت file5)", () => {
    const result = processIntakeInputs({
      ...validInput(),
      meals_count_requested: 4,
      pre_workout_meal_index: 2,
      post_workout_meal_index: 4,
    });
    assert(result.post_workout_meal_index === 4);
  });

  console.log("\n[اعتبارسنجی training_time — بدون بازه‌ی عددی حدسی]");
  check("رشته‌ی خالی رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), training_time: "" }), "training_time نامعتبر");
  });
  check("مقدار غیررشته‌ای رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), training_time: 18 }), "training_time نامعتبر");
  });

  console.log("\n[allergies / dietary_restrictions]");
  check("نبودن هر دو فیلد کرش نمی‌کند و آرایه‌ی خالی پیش‌فرض می‌گیرد", () => {
    const input = validInput();
    delete input.allergies;
    delete input.dietary_restrictions;
    const result = processIntakeInputs(input);
    assertDeepEqual(result.allergies, []);
    assertDeepEqual(result.dietary_restrictions, []);
  });
  check("عضو غیررشته‌ای در allergies رد می‌شود", () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), allergies: ["nuts", 123] }), "allergies");
  });
  check(`dietary_restrictions خارج از فیلترهای واقعی بانک غذا رد می‌شود (مقادیر مجاز: ${VALID_DIETARY_RESTRICTIONS.join("/")})`, () => {
    assertThrows(() => processIntakeInputs({ ...validInput(), dietary_restrictions: ["keto"] }), "dietary_restrictions نامعتبر");
  });
  check("مقادیر مجاز dietary_restrictions دقیقاً منطبق فیلترهای Foods (بخش ۲.۸) است", () => {
    assertDeepEqual(VALID_DIETARY_RESTRICTIONS, ["vegan", "vegetarian", "gluten_free", "lactose_free", "diabetic_friendly"]);
  });

  console.log(`\n[test-engine-nutrition-file1-intakeinputs] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
