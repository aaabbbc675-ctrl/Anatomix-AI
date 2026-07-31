// اسکریپت تست مستقل برای engine/talentId/file9_psychMatchCalculator.js.
// اجرا: node scripts/test-engine-talentid-file9-psychmatch.js
// کاملاً pure — بدون نیاز به mock، بدون وابستگی به API.
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

(async () => {
  const { computePsychMatch, applyInterestBonus, calculatePsychScores, getPsychTrainability } = await import(
    "../engine/talentId/file9_psychMatchCalculator.js"
  );
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  const wrestling = sportRequirementMatrix.wrestling_freestyle;
  // psych_requirements: teamwork:1, aggression:5, focus:4, pressure:5, dynamic:5, chaos:4, resilience:5
  // trait_importance: teamwork:0.5, aggression:2, focus:1, pressure:1.5, dynamic:1, chaos:1, resilience:2

  console.log("\n[computePsychMatch — تطابق کامل]");
  check("پروفایل کاملاً برابر با psych_requirements → psych_score=۱۰۰، ۶ match driver (بدون teamwork چون importance<1)", () => {
    const userProfile = { ...wrestling.psych_requirements };
    const result = computePsychMatch(userProfile, wrestling);
    assertClose(result.psych_score, 100, 0.001, "psych_score نادرست");
    assert(result.drivers.length === 6, `انتظار ۶ driver، گرفتیم ${result.drivers.length}`);
    assert(!result.drivers.find((d) => d.trait === "teamwork_score"), "teamwork_score نباید driver داشته باشد (importance<1)");
    assert(result.drivers.every((d) => d.driver_id.endsWith(".match")), "همه باید match باشند");
  });

  console.log("\n[computePsychMatch — عدم تطابق شدید، محاسبه‌ی دستی]");
  check("پروفایل کاملاً مخالف → psych_score≈۵.۵۵۶٪ (محاسبه‌ی دستی وزن‌دار)، ۷ mismatch driver", () => {
    const userProfile = {
      teamwork_score: 5,
      aggression_contact: 1,
      focus_patience: 1,
      pressure_tolerance: 1,
      dynamic_activity: 1,
      chaos_decision: 1,
      resilience: 1,
    };
    const result = computePsychMatch(userProfile, wrestling);
    assertClose(result.psych_score, 5.556, 0.01, "psych_score نادرست");
    assert(result.drivers.length === 7, `انتظار ۷ driver، گرفتیم ${result.drivers.length}`);
    assert(result.drivers.every((d) => d.driver_id.endsWith(".mismatch")), "همه باید mismatch باشند");
  });

  console.log("\n[trainability — تفکیک pressure_tolerance]");
  check("pressure_tolerance → partial، بقیه‌ی traitها → trainable", () => {
    assert(getPsychTrainability("pressure_tolerance") === "partial", "pressure_tolerance باید partial باشد");
    assert(getPsychTrainability("aggression_contact") === "trainable", "aggression_contact باید trainable باشد");
    assert(getPsychTrainability("resilience") === "trainable", "resilience باید trainable باشد");
  });

  console.log("\n[applyInterestBonus — بخش ۱۰.۳ سند]");
  check("رتبه ۱ (index=0) → ×۱.۱۰", () => {
    const { psych_score } = applyInterestBonus(80, ["swimming", "basketball", "tennis"], "swimming");
    assertClose(psych_score, 88, 0.001, "psych_score نادرست");
  });
  check("رتبه ۲ (index=1) → ×۱.۰۷", () => {
    const { psych_score } = applyInterestBonus(80, ["swimming", "basketball", "tennis"], "basketball");
    assertClose(psych_score, 85.6, 0.001, "psych_score نادرست");
  });
  check("رتبه ۳ (index=2) → ×۱.۰۵", () => {
    const { psych_score } = applyInterestBonus(80, ["swimming", "basketball", "tennis"], "tennis");
    assertClose(psych_score, 84, 0.001, "psych_score نادرست");
  });
  check("رشته در explicit_interests نیست → بدون تغییر، driver=null", () => {
    const { psych_score, driver } = applyInterestBonus(80, ["swimming"], "golf");
    assert(psych_score === 80, "psych_score نباید تغییر کند");
    assert(driver === null, "driver باید null باشد");
  });
  check("clamp در سقف ۱۰۰ کار می‌کند", () => {
    const { psych_score } = applyInterestBonus(98, ["swimming"], "swimming");
    assert(psych_score === 100, `انتظار ۱۰۰، گرفتیم ${psych_score}`);
  });

  console.log("\n[calculatePsychScores — orchestrator]");
  check("همیشه به‌تعداد کل sportRequirementMatrix در خروجی", () => {
    const psychProfile = {
      teamwork_score: 3,
      aggression_contact: 3,
      focus_patience: 3,
      pressure_tolerance: 3,
      dynamic_activity: 3,
      chaos_decision: 3,
      resilience: 3,
      explicit_interests: ["wrestling_freestyle"],
    };
    const scores = calculatePsychScores(sportRequirementMatrix, psychProfile);
    const expectedCount = Object.keys(sportRequirementMatrix).length;
    assert(Object.keys(scores).length === expectedCount, `انتظار ${expectedCount} رشته، گرفتیم ${Object.keys(scores).length}`);
    const wrestlingResult = scores.wrestling_freestyle;
    assert(
      wrestlingResult.drivers.find((d) => d.driver_id === "interest.explicit_bonus"),
      "wrestling_freestyle باید interest bonus driver داشته باشد (رتبه ۱)"
    );
  });

  console.log(`\n[test-engine-talentid-file9-psychmatch] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
