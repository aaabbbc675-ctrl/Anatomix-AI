// اسکریپت تست مستقل برای engine/talentId/file1_intakeInputs.js.
// اجرا: node scripts/test-engine-talentid-file1-intake.js
//
// engine/ ماژول ESM است (engine/package.json)؛ این اسکریپت CommonJS می‌ماند،
// پس باید ماژول موتور را با dynamic import() بارگذاری کند.
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

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || "مقدار نزدیک نیست"} — انتظار ≈${expected}, گرفتیم ${actual}`);
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

function assertThrowsWithCode(fn, expectedCode, description) {
  try {
    fn();
    throw new Error(`${description || "انتظار throw داشتیم"} — اما throw نشد`);
  } catch (err) {
    if (err.code !== expectedCode) {
      throw new Error(`${description || "code نامنتظره"} — انتظار "${expectedCode}", گرفتیم "${err.code}"`);
    }
  }
}

// دقیقاً نمونه‌ی بخش ۲.۱ سند معماری.
function baseRawDevice() {
  return {
    scan_id: "SCAN-2025-08-31-A147",
    anthropometrics: {
      standing_height_cm: 168.4,
      sitting_height_cm: 86.2,
      weight_kg: 58.7,
      arm_span_cm: 173.1,
      wrist_circumference_cm: 15.2,
      shoulder_width_cm: 42.1,
      hip_width_cm: 32.8,
      leg_length_cm: null,
    },
    body_composition_bia: {
      body_fat_percent: 14.2,
      skeletal_muscle_mass_kg: 27.3,
      smm_percent_of_body_weight: 46.5,
      total_body_water_percent: 62.1,
      fat_free_mass_kg: 50.4,
      visceral_fat_level: 3,
    },
    biometric: {
      resting_heart_rate_bpm: 62,
      balance_score_0_to_10: 8.4,
      bilateral_weight_asymmetry_percent: 4.2,
    },
    posture: { kyphosis: { severity: 2, cobb_estimate_degrees: 48 } },
    rom_deficits: { achilles_flexibility: "moderate_short" },
    hypermobility_detected: false,
  };
}

function baseRawCoach() {
  return {
    athlete_id: "USR-98311",
    date_of_birth: "2013-04-15",
    biological_sex: "male",
    assessment_date: "2025-08-31",
    performance_tests: {
      vertical_jump_cm: [42, 45, 44],
      broad_jump_cm: [175, 178, 176],
      sprint_10m_sec: [1.94, 1.88, 1.9],
      sprint_30m_sec: [4.72, 4.65, 4.68],
      agility_5_10_5_sec: [5.31, 5.18, 5.24],
      beep_test: { level: 9, shuttle: 6 },
      handgrip_dynamometer_kg: { dominant: [32, 34, 33], non_dominant: [29, 30, 30] },
      pushups_60sec_count: 34,
      sit_and_reach_cm: -3,
      wall_toss_30sec_count: 22,
    },
    medical_history: {
      active_injuries: [],
      chronic_conditions: [],
      physician_clearance_status: null,
      pain_scale_current_max_0_to_10: 0,
      pain_locations: [],
    },
    family_sport_history: { parent_athletes: true, elite_relatives: false },
  };
}

function baseRawChatbot() {
  return {
    session_id: "PSY-2025-08-31-A147",
    answers: [],
    explicit_sport_interest: [
      { sport: "football", rank: 1 },
      { sport: "basketball", rank: 2 },
      { sport: "swimming", rank: 3 },
    ],
  };
}

(async () => {
  const {
    normalizeIntake,
    decimalAge,
    bestOfThree,
    computeAnthropometricRatios,
    normalizeComposition,
    estimateVO2max,
    computeHandgripAsymmetry,
    computeFrameSize,
  } = await import("../engine/talentId/file1_intakeInputs.js");

  console.log("\n[قوانین Reject]");
  check("height خارج از رنج (زیر ۸۰) رد می‌شود با code=INVALID_HEIGHT", () => {
    const device = baseRawDevice();
    device.anthropometrics.standing_height_cm = 50;
    assertThrowsWithCode(() => normalizeIntake(device, baseRawCoach(), null), "INVALID_HEIGHT");
  });

  check("height خارج از رنج (بالای ۲۲۰) رد می‌شود", () => {
    const device = baseRawDevice();
    device.anthropometrics.standing_height_cm = 250;
    assertThrows(() => normalizeIntake(device, baseRawCoach(), null), "height_cm نامعتبر");
  });

  check("weight خارج از رنج رد می‌شود", () => {
    const device = baseRawDevice();
    device.anthropometrics.weight_kg = 300;
    assertThrows(() => normalizeIntake(device, baseRawCoach(), null), "weight_kg نامعتبر");
  });

  check("سن دهدهی خارج از رنج (زیر ۸) رد می‌شود با code=INVALID_AGE", () => {
    const coach = baseRawCoach();
    coach.date_of_birth = "2023-04-15";
    assertThrowsWithCode(() => normalizeIntake(baseRawDevice(), coach, null), "INVALID_AGE");
  });

  check("سن دهدهی خارج از رنج (بالای ۲۵) رد می‌شود", () => {
    const coach = baseRawCoach();
    coach.date_of_birth = "1995-04-15";
    assertThrows(() => normalizeIntake(baseRawDevice(), coach, null), "سن دهدهی نامعتبر");
  });

  check("body_fat_percent خارج از رنج رد می‌شود", () => {
    const device = baseRawDevice();
    device.body_composition_bia.body_fat_percent = 1;
    assertThrows(() => normalizeIntake(device, baseRawCoach(), null), "body_fat_percent نامعتبر");
  });

  check("biological_sex نامعتبر رد می‌شود", () => {
    const coach = baseRawCoach();
    coach.biological_sex = "unknown";
    assertThrows(() => normalizeIntake(baseRawDevice(), coach, null), "biological_sex نامعتبر");
  });

  console.log("\n[decimalAge]");
  check("decimalAge('2013-04-15','2025-08-31') ≈ ۱۲.۳۷۶", () => {
    assertClose(decimalAge("2013-04-15", "2025-08-31"), 12.376, 0.01, "سن دهدهی نادرست");
  });

  console.log("\n[bestOfThree]");
  check("بهترین (max) از ۳ تلاش پرش انتخاب می‌شود", () => {
    assert(bestOfThree([42, 45, 44], true) === 45, "باید ۴۵ باشد");
  });

  check("بهترین (min) از ۳ تلاش دو انتخاب می‌شود", () => {
    assert(bestOfThree([1.94, 1.88, 1.9], false) === 1.88, "باید ۱.۸۸ باشد");
  });

  check("مقادیر null در تلاش‌ها فیلتر می‌شوند", () => {
    assert(bestOfThree([null, 45, undefined], true) === 45, "باید ۴۵ باشد");
  });

  check("آرایه‌ی کاملاً خالی/null → null برمی‌گرداند", () => {
    assert(bestOfThree([null, null], true) === null, "باید null باشد");
  });

  console.log("\n[computeAnthropometricRatios]");
  check("ape_index/cormic_index/skeliac_index/bmi روی مقادیر مرجع درست محاسبه می‌شوند", () => {
    const ratios = computeAnthropometricRatios(baseRawDevice().anthropometrics, "male");
    assertClose(ratios.ape_index, 173.1 / 168.4, 0.0001, "ape_index نادرست");
    assertClose(ratios.cormic_index, 86.2 / 168.4, 0.0001, "cormic_index نادرست");
    assertClose(ratios.skeliac_index, 82.2 / 86.2, 0.0001, "skeliac_index نادرست");
    assertClose(ratios.bmi, 58.7 / (1.684 * 1.684), 0.001, "bmi نادرست");
    assert(ratios.leg_length_cm === 168.4 - 86.2, "leg_length_cm باید H-SH باشد");
  });

  check("frame_size برای این نمونه‌ی مرد → small (r=height/wrist=۱۱.۰۸>۱۰.۴)", () => {
    const ratios = computeAnthropometricRatios(baseRawDevice().anthropometrics, "male");
    assert(ratios.frame_size === "small", `انتظار small, گرفتیم ${ratios.frame_size}`);
  });

  check("computeFrameSize مستقیم: مرد با نسبت متوسط → medium", () => {
    // r = 170/17 ≈ 10.0 → بین ۹.۶ و ۱۰.۴ → medium
    assert(computeFrameSize(170, 17, "male") === "medium", "باید medium باشد");
  });

  check("arm_span خالی → از روی قد تخمین زده می‌شود و warning ثبت می‌شود", () => {
    const device = baseRawDevice();
    device.anthropometrics.arm_span_cm = null;
    const result = normalizeIntake(device, baseRawCoach(), null);
    assert(result.anthropometrics.arm_span_cm === device.anthropometrics.standing_height_cm, "arm_span باید = height باشد");
    assert(
      result.meta.data_quality.warnings.includes("arm_span estimated from height"),
      "warning باید دقیقاً این متن را داشته باشد"
    );
  });

  console.log("\n[normalizeComposition / FFMI]");
  check("ffm_index = ffm_kg / height_m² درست محاسبه می‌شود", () => {
    const composition = normalizeComposition(baseRawDevice().body_composition_bia, 168.4);
    assertClose(composition.ffm_index, 50.4 / (1.684 * 1.684), 0.001, "ffm_index نادرست");
  });

  console.log("\n[estimateVO2max]");
  check("VO2max روی beep_level=9, age=12.376 مطابق فرمول Léger&Gadoury است", () => {
    assertClose(estimateVO2max(9, 12.376), 55.064672, 0.001, "vo2max نادرست");
  });

  console.log("\n[computeHandgripAsymmetry]");
  check("درصد ناهم‌ترازی دست غالب/غیرغالب درست محاسبه می‌شود", () => {
    assertClose(computeHandgripAsymmetry(34, 30), (4 / 34) * 100, 0.001, "handgrip asymmetry نادرست");
  });

  console.log("\n[warnings]");
  check("resting_hr خارج از رنج → warning recheck cardio", () => {
    const device = baseRawDevice();
    device.biometric.resting_heart_rate_bpm = 120;
    const result = normalizeIntake(device, baseRawCoach(), null);
    assert(
      result.meta.data_quality.warnings.some((w) => w.includes("recheck cardio")),
      "باید warning recheck cardio داشته باشد"
    );
  });

  check("sit_and_reach غیرعادی → warning protocol error", () => {
    const coach = baseRawCoach();
    coach.performance_tests.sit_and_reach_cm = 60;
    const result = normalizeIntake(baseRawDevice(), coach, null);
    assert(
      result.meta.data_quality.warnings.some((w) => w.includes("protocol error")),
      "باید warning protocol error داشته باشد"
    );
  });

  check("یک ورودی کامل معتبر بدون هیچ warning ای عبور می‌کند", () => {
    const result = normalizeIntake(baseRawDevice(), baseRawCoach(), baseRawChatbot());
    assert(result.meta.data_quality.warnings.length === 0, `انتظار ۰ warning، گرفتیم: ${JSON.stringify(result.meta.data_quality.warnings)}`);
  });

  console.log("\n[غیاب چت‌بات / psych / interests / birth_month]");
  check("غیاب کامل چت‌بات (null) → بدون throw، psych=null، interests=[]", () => {
    const result = normalizeIntake(baseRawDevice(), baseRawCoach(), null);
    assert(result.psych === null, "psych باید null باشد");
    assert(Array.isArray(result.interests) && result.interests.length === 0, "interests باید [] باشد");
  });

  check("وجود چت‌بات → interests از explicit_sport_interest پر می‌شود، psych هنوز null", () => {
    const result = normalizeIntake(baseRawDevice(), baseRawCoach(), baseRawChatbot());
    assert(result.psych === null, "psych باید null بماند (file8 هنوز نیست)");
    assert(result.interests.length === 3, "interests باید ۳ آیتم داشته باشد");
    assert(result.interests[0].sport === "football", "اولین علاقه باید football باشد");
  });

  check("birth_month از date_of_birth درست استخراج می‌شود (۲۰۱۳-۰۴-۱۵ → ماه ۴)", () => {
    const result = normalizeIntake(baseRawDevice(), baseRawCoach(), null);
    assert(result.demographics.birth_month === 4, `انتظار ۴، گرفتیم ${result.demographics.birth_month}`);
  });

  check("birth_month_shamsi از date_of_birth میلادی درست محاسبه می‌شود (۲۰۱۳-۰۴-۱۵ میلادی → ۲۶ فروردین ۱۳۹۲ → ماه شمسی ۱)", () => {
    const result = normalizeIntake(baseRawDevice(), baseRawCoach(), null);
    assert(
      result.demographics.birth_month_shamsi === 1,
      `انتظار ۱ (فروردین)، گرفتیم ${result.demographics.birth_month_shamsi}`
    );
  });

  check("birth_month_shamsi روی مرز سال نو (۲۰۱۳-۰۳-۲۰ میلادی → ۳۰ اسفند ۱۳۹۱ → ماه شمسی ۱۲) درست است", () => {
    const coach = baseRawCoach();
    coach.date_of_birth = "2013-03-20";
    const result = normalizeIntake(baseRawDevice(), coach, null);
    assert(
      result.demographics.birth_month_shamsi === 12,
      `انتظار ۱۲ (اسفند)، گرفتیم ${result.demographics.birth_month_shamsi}`
    );
    assert(result.demographics.birth_month === 3, "birth_month میلادی نباید تحت تأثیر قرار گیرد");
  });

  console.log(`\n[test-engine-talentid-file1-intake] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
