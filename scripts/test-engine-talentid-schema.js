// اسکریپت تست مستقل برای engine/talentId/shared/sportRequirementSchema.js و
// engine/talentId/shared/traitTrainabilityRegistry.js.
// اجرا: node scripts/test-engine-talentid-schema.js
//
// engine/ ماژول ESM است (engine/package.json)؛ این اسکریپت CommonJS می‌ماند،
// پس باید ماژول موتور را با dynamic import() بارگذاری کند (هم‌الگوی
// scripts/test-engine-shared-bodybuildingreadinessgate.js).
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

function baseValidEntry() {
  return {
    id: "test_sport",
    name_fa: "رشته آزمایشی",
    name_en: "Test Sport",
    category: "team_ball",
    subcategory: "test",
    is_position_specific: false,
    performance_weights: { vertical_jump: 0.5, sprint_10m: 0.5 },
    psych_requirements: {
      teamwork_score: 3,
      aggression_contact: 3,
      focus_patience: 3,
      pressure_tolerance: 3,
      dynamic_activity: 3,
      chaos_decision: 3,
      resilience: 3,
    },
    postural_contraindications: [],
    medical_contraindications: [],
    critical_perf_tests: [],
  };
}

(async () => {
  const { validateSportEntry } = await import("../engine/talentId/shared/sportRequirementSchema.js");
  const { getTrainability, TRAINABILITY } = await import(
    "../engine/talentId/shared/traitTrainabilityRegistry.js"
  );

  console.log("\n[فیلدهای اجباری]");
  check("id خالی رد می‌شود", () => {
    const entry = baseValidEntry();
    entry.id = "";
    assertThrows(() => validateSportEntry(entry), 'فیلد "id"', "باید با خطای فیلد اجباری رد شود");
  });

  check("name_fa غایب رد می‌شود", () => {
    const entry = baseValidEntry();
    delete entry.name_fa;
    assertThrows(() => validateSportEntry(entry), 'فیلد "name_fa"', "باید با خطای فیلد اجباری رد شود");
  });

  check("is_position_specific غیر Boolean رد می‌شود", () => {
    const entry = baseValidEntry();
    entry.is_position_specific = "بله";
    assertThrows(() => validateSportEntry(entry), "is_position_specific", "باید رد شود");
  });

  console.log("\n[category]");
  check("category نامعتبر رد می‌شود", () => {
    const entry = baseValidEntry();
    entry.category = "not_a_real_category";
    assertThrows(() => validateSportEntry(entry), "category نامعتبر", "باید رد شود");
  });

  check("category معتبر (strength) قبول می‌شود", () => {
    const entry = baseValidEntry();
    entry.category = "strength";
    assert(validateSportEntry(entry) === true, "باید true برگرداند");
  });

  console.log("\n[performance_weights]");
  check("مجموع performance_weights ≠ ۱.۰ رد می‌شود (۰.۷)", () => {
    const entry = baseValidEntry();
    entry.performance_weights = { vertical_jump: 0.4, sprint_10m: 0.3 };
    assertThrows(() => validateSportEntry(entry), "مجموع performance_weights", "باید رد شود");
  });

  check("مجموع performance_weights در بازه‌ی tolerance (۰.۹۹۵) قبول می‌شود", () => {
    const entry = baseValidEntry();
    entry.performance_weights = { vertical_jump: 0.5, sprint_10m: 0.495 };
    assert(validateSportEntry(entry) === true, "باید true برگرداند");
  });

  console.log("\n[psych_requirements]");
  check("psych_requirements با یک trait غایب رد می‌شود", () => {
    const entry = baseValidEntry();
    delete entry.psych_requirements.resilience;
    assertThrows(() => validateSportEntry(entry), "psych_requirements.resilience", "باید رد شود");
  });

  check("psych_requirements با مقدار زیر ۱ رد می‌شود", () => {
    const entry = baseValidEntry();
    entry.psych_requirements.focus_patience = 0;
    assertThrows(() => validateSportEntry(entry), "psych_requirements.focus_patience", "باید رد شود");
  });

  check("psych_requirements با مقدار بالای ۵ رد می‌شود", () => {
    const entry = baseValidEntry();
    entry.psych_requirements.chaos_decision = 6;
    assertThrows(() => validateSportEntry(entry), "psych_requirements.chaos_decision", "باید رد شود");
  });

  console.log("\n[آرایه بودن لیست‌ها]");
  check("postural_contraindications غیرآرایه رد می‌شود", () => {
    const entry = baseValidEntry();
    entry.postural_contraindications = "kyphosis";
    assertThrows(() => validateSportEntry(entry), "postural_contraindications", "باید رد شود");
  });

  console.log("\n[ورودی کامل معتبر]");
  check("یک entry کامل و معتبر بدون خطا قبول می‌شود", () => {
    assert(validateSportEntry(baseValidEntry()) === true, "باید true برگرداند");
  });

  console.log("\n[traitTrainabilityRegistry]");
  check("ape_index_high → innate", () => {
    assert(getTrainability("ape_index_high") === TRAINABILITY.INNATE, "باید innate باشد");
  });

  check("bf_very_low → partial", () => {
    assert(getTrainability("bf_very_low") === TRAINABILITY.PARTIAL, "باید partial باشد");
  });

  check("smm_high → trainable", () => {
    assert(getTrainability("smm_high") === TRAINABILITY.TRAINABLE, "باید trainable باشد");
  });

  check("driver_id ناشناخته throw می‌کند", () => {
    assertThrows(() => getTrainability("not_a_real_driver"), "ناشناخته", "باید رد شود");
  });

  console.log(`\n[test-engine-talentid-schema] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
