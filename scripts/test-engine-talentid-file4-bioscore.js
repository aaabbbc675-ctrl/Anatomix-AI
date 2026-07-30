// اسکریپت تست مستقل برای engine/talentId/file4_bioScoreCalculator.js.
// اجرا: node scripts/test-engine-talentid-file4-bioscore.js
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

// پروفایل خنثی: هیچ‌کدام از شرط‌های بخش ۵.۳ سند فعال نیستند.
function baseIntake(overrides = {}) {
  return {
    demographics: { biological_sex: "male", ...overrides.demographics },
    anthropometrics: {
      standing_height_cm: 170,
      ape_index: 1.0,
      cormic_index: 0.52,
      ...overrides.anthropometrics,
    },
    body_composition: {
      body_fat_percent: 15,
      smm_percent: 40,
      tbw_percent: 55,
      ffm_index: 20,
      ...overrides.body_composition,
    },
    biometric: {
      resting_hr: 70,
      balance: 6,
      bilateral_asymmetry_percent: 5,
      ...overrides.biometric,
    },
    performance: {
      handgrip_asymmetry_percent: 10,
      ...overrides.performance,
    },
  };
}

function findDriver(drivers, driverId) {
  return drivers.find((d) => d.driver_id === driverId);
}

(async () => {
  const { calculateBioScores, computeBioScoreForSport, computeActiveConditions } = await import(
    "../engine/talentId/file4_bioScoreCalculator.js"
  );
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  console.log("\n[soccer_striker — bonus/penalty مشخص]");
  check("soccer_striker با شرایط trigger‌شده: bf_very_low, smm_high, balance_score_high, bilateral_asymmetry_high, cormic_high", () => {
    const intake = baseIntake({
      anthropometrics: { standing_height_cm: 170, ape_index: 1.0, cormic_index: 0.6 },
      body_composition: { body_fat_percent: 8, smm_percent: 50, tbw_percent: 55, ffm_index: 20 },
      biometric: { resting_hr: 70, balance: 9, bilateral_asymmetry_percent: 15 },
    });
    const scores = calculateBioScores(sportRequirementMatrix, intake);
    const result = scores.soccer_striker;
    assert(findDriver(result.drivers, "anthropometric.cormic_high").magnitude === 10, "cormic_high باید +10 باشد");
    assert(findDriver(result.drivers, "composition.bf_very_low").magnitude === 10, "bf_very_low باید +10 باشد");
    assert(findDriver(result.drivers, "composition.smm_high").magnitude === 10, "smm_high باید +10 باشد");
    assert(findDriver(result.drivers, "biometric.balance_score_high").magnitude === 10, "balance_score_high باید +10 باشد");
    assert(
      findDriver(result.drivers, "biometric.bilateral_asymmetry_high").magnitude === -15,
      "bilateral_asymmetry_high باید -15 باشد"
    );
    assert(result.total_bonus === 40, `total_bonus نادرست: ${result.total_bonus}`);
    assert(result.total_penalty === -15, `total_penalty نادرست: ${result.total_penalty}`);
    assert(result.final_bio_score === 125, `final_bio_score نادرست: ${result.final_bio_score}`);
  });

  check("strong_upper_body_frame هرگز driver تولید نمی‌کند و throw نمی‌کند", () => {
    const scores = calculateBioScores(sportRequirementMatrix, baseIntake());
    const hasSkippedDriver = scores.soccer_striker.drivers.some((d) => d.driver_id.includes("strong_upper_body_frame"));
    assert(!hasSkippedDriver, "نباید driver برای strong_upper_body_frame وجود داشته باشد");
  });

  console.log("\n[wrestling_freestyle]");
  check("cormic_high, ape_index_low, smm_high, ffmi_athletic → مجموع +55", () => {
    const intake = baseIntake({
      anthropometrics: { standing_height_cm: 170, ape_index: 0.95, cormic_index: 0.6 },
      body_composition: { body_fat_percent: 15, smm_percent: 50, tbw_percent: 55, ffm_index: 25 },
    });
    const result = computeBioScoreForSport(sportRequirementMatrix.wrestling_freestyle, computeActiveConditions(intake), intake);
    assert(result.total_bonus === 55, `total_bonus نادرست: ${result.total_bonus}`);
    assert(result.final_bio_score === 155, `final_bio_score نادرست: ${result.final_bio_score}`);
  });

  console.log("\n[volleyball_middle_blocker]");
  check("ape_index_high + tall_stature(male>=195) + bilateral_asymmetry_high → +35-15", () => {
    const intake = baseIntake({
      anthropometrics: { standing_height_cm: 198, ape_index: 1.1, cormic_index: 0.52 },
      biometric: { resting_hr: 70, balance: 6, bilateral_asymmetry_percent: 12 },
    });
    const result = computeBioScoreForSport(
      sportRequirementMatrix.volleyball_middle_blocker,
      computeActiveConditions(intake),
      intake
    );
    assert(findDriver(result.drivers, "anthropometric.tall_stature").magnitude === 20, "tall_stature باید +20 باشد");
    assert(result.total_bonus === 35, `total_bonus نادرست: ${result.total_bonus}`);
    assert(result.final_bio_score === 120, `final_bio_score نادرست: ${result.final_bio_score}`);
  });

  check("قد زیر آستانه → driver تولید نمی‌شود", () => {
    const intake = baseIntake({ anthropometrics: { standing_height_cm: 170, ape_index: 1.0, cormic_index: 0.52 } });
    const result = computeBioScoreForSport(
      sportRequirementMatrix.volleyball_middle_blocker,
      computeActiveConditions(intake),
      intake
    );
    assert(!findDriver(result.drivers, "anthropometric.tall_stature"), "نباید tall_stature driver داشته باشد");
  });

  console.log("\n[swimming_general]");
  check("ape_index_high + cormic_high + tbw_high + resting_hr_low → +60", () => {
    const intake = baseIntake({
      anthropometrics: { standing_height_cm: 170, ape_index: 1.1, cormic_index: 0.6 },
      body_composition: { body_fat_percent: 15, smm_percent: 40, tbw_percent: 65, ffm_index: 20 },
      biometric: { resting_hr: 55, balance: 6, bilateral_asymmetry_percent: 5 },
    });
    const result = computeBioScoreForSport(sportRequirementMatrix.swimming_general, computeActiveConditions(intake), intake);
    assert(result.total_bonus === 60, `total_bonus نادرست: ${result.total_bonus}`);
    assert(result.final_bio_score === 160, `final_bio_score نادرست: ${result.final_bio_score}`);
  });

  console.log("\n[weightlifting_olympic]");
  check("ape_index_low + smm_high + handgrip_asymmetry_high → +35-10", () => {
    const intake = baseIntake({
      anthropometrics: { standing_height_cm: 170, ape_index: 0.9, cormic_index: 0.52 },
      body_composition: { body_fat_percent: 15, smm_percent: 50, tbw_percent: 55, ffm_index: 20 },
      performance: { handgrip_asymmetry_percent: 25 },
    });
    const result = computeBioScoreForSport(sportRequirementMatrix.weightlifting_olympic, computeActiveConditions(intake), intake);
    assert(result.total_bonus === 35, `total_bonus نادرست: ${result.total_bonus}`);
    assert(result.total_penalty === -10, `total_penalty نادرست: ${result.total_penalty}`);
    assert(result.final_bio_score === 125, `final_bio_score نادرست: ${result.final_bio_score}`);
  });

  console.log("\n[پروفایل خنثی — هیچ شرطی فعال نیست]");
  check("پروفایل کاملاً خنثی → هیچ driver ای برای هیچ رشته‌ای تولید نمی‌شود", () => {
    const scores = calculateBioScores(sportRequirementMatrix, baseIntake());
    for (const [sportId, result] of Object.entries(scores)) {
      assert(result.drivers.length === 0, `${sportId} نباید driver داشته باشد، ${result.drivers.length} دارد`);
      assert(result.final_bio_score === 100, `${sportId}: final_bio_score باید ۱۰۰ باشد`);
    }
  });

  console.log("\n[trainability و narrative برای همه‌ی driverها]");
  check("همه‌ی driverهای همه‌ی رشته‌ها trainability معتبر و narrative غیرخالی دارند", () => {
    const intake = baseIntake({
      anthropometrics: { standing_height_cm: 200, ape_index: 1.1, cormic_index: 0.6 },
      body_composition: { body_fat_percent: 8, smm_percent: 50, tbw_percent: 65, ffm_index: 25 },
      biometric: { resting_hr: 55, balance: 9, bilateral_asymmetry_percent: 15 },
      performance: { handgrip_asymmetry_percent: 25 },
    });
    const scores = calculateBioScores(sportRequirementMatrix, intake);
    const validTrainability = ["innate", "partial", "trainable"];
    let totalDrivers = 0;
    for (const [sportId, result] of Object.entries(scores)) {
      for (const driver of result.drivers) {
        totalDrivers++;
        assert(
          validTrainability.includes(driver.trainability),
          `${sportId}/${driver.driver_id}: trainability نامعتبر "${driver.trainability}"`
        );
        assert(
          typeof driver.narrative_short === "string" && driver.narrative_short.length > 0,
          `${sportId}/${driver.driver_id}: narrative_short خالی است`
        );
      }
    }
    assert(totalDrivers > 0, "باید حداقل چند driver تولید شده باشد تا تست معنی‌دار باشد");
  });

  console.log("\n[Clamp نهایی]");
  check("clamp در سقف ۲۰۰ کار می‌کند", () => {
    const fakeSportEntry = {
      anthropometric_bonuses: { ape_index_high: 80 },
      composition_bonuses: { bf_very_low: 80 },
      biometric_bonuses: { resting_hr_low: 80 },
    };
    const intake = baseIntake({
      anthropometrics: { standing_height_cm: 170, ape_index: 1.1, cormic_index: 0.52 },
      body_composition: { body_fat_percent: 8, smm_percent: 40, tbw_percent: 55, ffm_index: 20 },
      biometric: { resting_hr: 55, balance: 6, bilateral_asymmetry_percent: 5 },
    });
    const result = computeBioScoreForSport(fakeSportEntry, computeActiveConditions(intake), intake);
    assert(result.total_bonus === 240, `total_bonus نادرست: ${result.total_bonus}`);
    assert(result.final_bio_score === 200, `final_bio_score باید در ۲۰۰ clamp شود، گرفتیم ${result.final_bio_score}`);
  });

  check("clamp در کف ۰ کار می‌کند", () => {
    const fakeSportEntry = {
      anthropometric_bonuses: {},
      composition_bonuses: {},
      biometric_bonuses: { bilateral_asymmetry_high: -80, handgrip_asymmetry_high: -80 },
    };
    const intake = baseIntake({
      biometric: { resting_hr: 70, balance: 6, bilateral_asymmetry_percent: 15 },
      performance: { handgrip_asymmetry_percent: 25 },
    });
    const result = computeBioScoreForSport(fakeSportEntry, computeActiveConditions(intake), intake);
    assert(result.total_penalty === -160, `total_penalty نادرست: ${result.total_penalty}`);
    assert(result.final_bio_score === 0, `final_bio_score باید در ۰ clamp شود، گرفتیم ${result.final_bio_score}`);
  });

  console.log("\n[کلید ناشناخته در ماتریس → throw]");
  check('کلید بدون شرط فعال‌سازی متناظر → TalentIdError با code=BIO_SCORE_UNKNOWN_DRIVER_KEY', () => {
    const fakeSportEntry = {
      anthropometric_bonuses: { totally_unknown_key: 10 },
      composition_bonuses: {},
      biometric_bonuses: {},
    };
    const intake = baseIntake();
    assertThrowsWithCode(
      () => computeBioScoreForSport(fakeSportEntry, computeActiveConditions(intake), intake),
      "BIO_SCORE_UNKNOWN_DRIVER_KEY"
    );
  });

  console.log(`\n[test-engine-talentid-file4-bioscore] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
