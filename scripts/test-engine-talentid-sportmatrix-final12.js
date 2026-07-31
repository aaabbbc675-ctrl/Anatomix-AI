// اسکریپت تست مستقل برای ۱۲ رشته‌ی نهایی Commit 19 در sportRequirementMatrix.js
// (قدرتی/پرتابی + پرشی/آبی/فنی + دقتی/ذهنی/رزمی-تجهیزاتی، طبق
// docs/TODO-wave-labeling-correction.md — ردیف‌های ۴۱-۵۲ جدول ۲۰.۶ سند).
// بعد از این Commit، sportRequirementMatrix دقیقاً ۵۲ رشته دارد.
// اجرا: node scripts/test-engine-talentid-sportmatrix-final12.js
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

const NEW_SPORT_IDS = [
  "powerlifting",
  "bodybuilding",
  "shot_put",
  "discus",
  "long_jump",
  "high_jump",
  "climbing",
  "rowing",
  "diving",
  "chess",
  "archery",
  "fencing",
];

// طبق computeActiveConditions در file4_bioScoreCalculator.js (Commit 5) —
// تنها کلیدهای معتبر برای anthropometric/composition/biometric_bonuses.
const VALID_ACTIVE_CONDITION_KEYS = new Set([
  "ape_index_high",
  "ape_index_low",
  "cormic_high",
  "cormic_low",
  "bf_very_low",
  "bf_high",
  "smm_high",
  "tbw_high",
  "resting_hr_low",
  "balance_score_high",
  "bilateral_asymmetry_high",
  "handgrip_asymmetry_high",
  "ffmi_athletic",
  "tall_stature", // مورد خاص، جدا مدیریت می‌شود
]);

(async () => {
  const { sportRequirementMatrix, getSportEntry } = await import(
    "../engine/talentId/shared/sportRequirementMatrix.js"
  );
  const { validateSportEntry, EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST } = await import(
    "../engine/talentId/shared/sportRequirementSchema.js"
  );
  const { calculateBioScores } = await import("../engine/talentId/file4_bioScoreCalculator.js");
  const { calculatePerfScores } = await import("../engine/talentId/file7_perfScoreCalculator.js");
  const { posturalSportImpactMap } = await import("../engine/talentId/shared/posturalSportImpactMap.js");
  const { activePathologyMap } = await import("../engine/talentId/shared/activePathologyMap.js");

  console.log("\n[تعداد کل رشته‌ها بعد از Commit 19 — باید دقیقاً ۵۲ باشد]");
  check("sportRequirementMatrix دقیقاً ۵۲ رشته دارد (۴۰ قبلی + ۱۲ جدید)", () => {
    assert(
      Object.keys(sportRequirementMatrix).length === 52,
      `انتظار دقیقاً ۵۲، گرفتیم ${Object.keys(sportRequirementMatrix).length}`
    );
  });
  check(`دقیقاً ${NEW_SPORT_IDS.length} رشته‌ی جدید همه در matrix حاضرند`, () => {
    for (const id of NEW_SPORT_IDS) {
      assert(sportRequirementMatrix[id] !== undefined, `"${id}" باید در matrix باشد`);
    }
  });

  console.log("\n[validateSportEntry روی هر ۱۲ رشته‌ی جدید]");
  for (const sportId of NEW_SPORT_IDS) {
    check(`رشته "${sportId}" از validateSportEntry پاس می‌کند`, () => {
      const entry = getSportEntry(sportId);
      assert(entry.id === sportId, `id باید "${sportId}" باشد`);
      assert(validateSportEntry(entry) === true, "باید true برگرداند");
    });
  }

  console.log("\n[کلیدهای bonus معتبر — فقط کلیدهای پشتیبانی‌شده‌ی computeActiveConditions]");
  check("هیچ رشته‌ی جدیدی از کلید bonus نامعتبر استفاده نمی‌کند", () => {
    for (const sportId of NEW_SPORT_IDS) {
      const entry = sportRequirementMatrix[sportId];
      for (const bucket of [entry.anthropometric_bonuses, entry.composition_bonuses, entry.biometric_bonuses]) {
        for (const key of Object.keys(bucket ?? {})) {
          assert(VALID_ACTIVE_CONDITION_KEYS.has(key), `${sportId}: کلید نامعتبر "${key}"`);
        }
      }
    }
  });

  console.log("\n[استثنای schema: EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST — فقط chess]");
  check("EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST دقیقاً یک عضو دارد: chess", () => {
    assert(EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST.size === 1, "باید دقیقاً ۱ عضو داشته باشد");
    assert(EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST.has("chess"), "باید شامل chess باشد");
  });
  check("chess.performance_weights کاملاً خالی است و validateSportEntry پاس می‌کند", () => {
    assert(Object.keys(sportRequirementMatrix.chess.performance_weights).length === 0, "باید خالی باشد");
  });
  check("رشته‌ی جعلی با performance_weights خالی و id خارج از allowlist → throw SPORT_ENTRY_WEIGHT_SUM", () => {
    assertThrowsWithCode(
      () =>
        validateSportEntry({
          id: "fake_sport_not_in_allowlist",
          name_fa: "x",
          name_en: "x",
          category: "strength",
          subcategory: "x",
          is_position_specific: false,
          performance_weights: {},
          psych_requirements: {
            teamwork_score: 1,
            aggression_contact: 1,
            focus_patience: 1,
            pressure_tolerance: 1,
            dynamic_activity: 1,
            chaos_decision: 1,
            resilience: 1,
          },
        }),
      "SPORT_ENTRY_WEIGHT_SUM",
      "باید محافظت کند تا performance_weights خالی فقط برای رشته‌های آگاهانه‌ی allowlist مجاز باشد"
    );
  });

  console.log("\n[محاسبه‌ی واقعی bio-score و perf-score روی کل matrix (۵۲ رشته) — بدون throw]");
  check("calculateBioScores روی کل matrix بدون BIO_SCORE_UNKNOWN_DRIVER_KEY اجرا می‌شود", () => {
    const normalizedIntake = {
      anthropometrics: { ape_index: 1.1, cormic_index: 0.5, standing_height_cm: 195 },
      body_composition: { body_fat_percent: 12, smm_percent: 48, tbw_percent: 62, ffm_index: 25 },
      biometric: { resting_hr: 55, balance: 9, bilateral_asymmetry_percent: 5 },
      performance: { handgrip_asymmetry_percent: 5 },
      demographics: { biological_sex: "male" },
    };
    const scores = calculateBioScores(sportRequirementMatrix, normalizedIntake);
    assert(Object.keys(scores).length === 52, `انتظار دقیقاً ۵۲ رشته، گرفتیم ${Object.keys(scores).length}`);
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(Number.isFinite(scores[sportId].final_bio_score), `${sportId}: final_bio_score باید عدد معتبر باشد`);
    }
  });
  check("calculatePerfScores روی کل matrix اجرا می‌شود؛ chess همیشه final_perf_score=100 (خنثی) دارد", () => {
    const normalizedIntake = {
      performance: {
        vertical_jump_cm: 45,
        sprint_10m_sec: 1.9,
      },
      demographics: { biological_sex: "male" },
    };
    const scores = calculatePerfScores(sportRequirementMatrix, normalizedIntake, 12.5);
    assert(Object.keys(scores).length === 52, `انتظار دقیقاً ۵۲ رشته، گرفتیم ${Object.keys(scores).length}`);
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(Number.isFinite(scores[sportId].final_perf_score), `${sportId}: final_perf_score باید عدد معتبر باشد`);
    }
    assert(
      scores.chess.final_perf_score === 100,
      `chess باید همیشه final_perf_score=100 (خنثی) داشته باشد، گرفتیم ${scores.chess.final_perf_score}`
    );
    assert(
      scores.chess.data_coverage.evaluated_weight_sum === 0,
      "chess: evaluated_weight_sum باید ۰ باشد (هیچ تستی ارزیابی نمی‌شود)"
    );
  });

  console.log("\n[دسته‌ی الف — قدرتی/پرتابی: تمایز powerlifting/bodybuilding]");
  check("powerlifting: disc_herniation + severe_scoliosis دارد (خفته‌ی Commit 1، فعال‌شده)", () => {
    assert(activePathologyMap.active_disc_herniation.affects_sports.powerlifting === "high_risk", "باید high_risk باشد");
    assert(
      activePathologyMap.active_severe_scoliosis_cobb_over_40.affects_sports.powerlifting === "high_risk",
      "باید high_risk باشد"
    );
  });
  check("bodybuilding: عمداً بدون disc_herniation (زیربیشینه، نه ۱RM مثل powerlifting)", () => {
    assert(
      activePathologyMap.active_disc_herniation.affects_sports.bodybuilding === undefined,
      "نباید کلید bodybuilding داشته باشد"
    );
  });
  check("bodybuilding: critical_perf_tests خالی، فقط ۲ تست (pushups/handgrip) در performance_weights", () => {
    assert(sportRequirementMatrix.bodybuilding.critical_perf_tests.length === 0, "باید خالی باشد");
    assert(
      Object.keys(sportRequirementMatrix.bodybuilding.performance_weights).length === 2,
      "باید دقیقاً ۲ تست داشته باشد"
    );
  });

  console.log("\n[دسته‌ی ب — پرشی/آبی/فنی: تمایز high_jump/diving]");
  check("high_jump: عمداً بدون ankle_sprain (فرود فسبوری فلاپ روی پشت/شانه، نه پا)", () => {
    assert(sportRequirementMatrix.high_jump.medical_contraindications.length === 0, "باید کاملاً خالی باشد");
    assert(
      activePathologyMap.active_ankle_sprain_grade_2_or_3.affects_sports.high_jump === undefined,
      "نباید کلید high_jump داشته باشد"
    );
  });
  check("long_jump: برخلاف high_jump، ankle_sprain دارد (فرود واقعی روی پا)", () => {
    assert(
      activePathologyMap.active_ankle_sprain_grade_2_or_3.affects_sports.long_jump === "high_risk",
      "باید high_risk باشد"
    );
  });
  check("diving: بدون tall_stature (عیناً هم‌الگوی gymnastics_artistic Commit 17)", () => {
    assert(
      sportRequirementMatrix.diving.anthropometric_bonuses.tall_stature === undefined,
      "نباید tall_stature داشته باشد"
    );
  });
  check("diving: hyperlordosis (خفته‌ی Commit 1) + epilepsy_uncontrolled (خفته‌ی Commit 1) هر دو فعال شدند", () => {
    assert(posturalSportImpactMap.hyperlordosis.diving?.penalty === -25, "باید -25 باشد");
    assert(
      activePathologyMap.epilepsy_uncontrolled.affects_sports.diving === "critical_risk",
      "باید critical_risk باشد"
    );
  });

  console.log("\n[دسته‌ی ج — دقتی/ذهنی: تمایز chaos_decision chess در برابر archery/shooting]");
  check("chess.chaos_decision=5 (بالاترین)، archery.chaos_decision=1 (پایین‌ترین) — تمایز عمدی", () => {
    assert(sportRequirementMatrix.chess.psych_requirements.chaos_decision === 5, "chess باید ۵ باشد");
    assert(sportRequirementMatrix.archery.psych_requirements.chaos_decision === 1, "archery باید ۱ باشد");
  });
  check("chess.similar_sports کاملاً خالی است (عمدی، حتی نزدیک‌ترین رشته هم گمراه‌کننده بود)", () => {
    const similar = sportRequirementMatrix.chess.similar_sports;
    assert(
      similar.by_anthropometry.length === 0 && similar.by_performance.length === 0 && similar.by_psychology.length === 0,
      "باید کاملاً خالی باشد"
    );
  });
  check("chess: هیچ ارجاعی در فهرست‌های safe موجود به medical_contraindications ترجمه نشده (درست، نه گپ)", () => {
    assert(sportRequirementMatrix.chess.medical_contraindications.length === 0, "باید خالی باشد");
    assert(activePathologyMap.active_disc_herniation.affects_sports.chess === "safe", "باید safe باشد");
    assert(activePathologyMap.active_meniscus_tear.affects_sports.chess === "safe", "باید safe باشد");
    assert(activePathologyMap.cardiovascular_disease.always_safe.includes("chess"), "باید در always_safe باشد");
  });
  check("fencing: aggression_contact=3 پایین‌تر از boxing=5 (بدون تماس بدنی، فقط تماس سلاح)", () => {
    assert(sportRequirementMatrix.fencing.psych_requirements.aggression_contact === 3, "باید ۳ باشد");
    assert(sportRequirementMatrix.boxing.psych_requirements.aggression_contact === 5, "boxing باید ۵ بماند");
  });
  check("fencing: عمداً بدون bilateral_asymmetry_high (نامتقارنی ذاتی رشته، نه ریسک قابل‌سنجش با کلید مشترک)", () => {
    assert(
      sportRequirementMatrix.fencing.biometric_bonuses.bilateral_asymmetry_high === undefined,
      "نباید bilateral_asymmetry_high داشته باشد"
    );
  });

  console.log("\n[روابط متقابل تازه‌فعال‌شده — اطمینان قوی-مستند، دقیقاً طبق تحلیل تأییدشده‌ی Commit 19]");
  check("weightlifting_olympic↔powerlifting: خفته‌ی Commit 1، هر دو جهت هر ۳ دسته", () => {
    assert(
      sportRequirementMatrix.weightlifting_olympic.similar_sports.by_anthropometry.includes("powerlifting") &&
        sportRequirementMatrix.weightlifting_olympic.similar_sports.by_performance.includes("powerlifting") &&
        sportRequirementMatrix.weightlifting_olympic.similar_sports.by_psychology.includes("powerlifting"),
      "weightlifting_olympic باید هر ۳ دسته را به powerlifting ارجاع دهد (از Commit 1)"
    );
  });
  check("swimming_general↔rowing: خفته‌ی Commit 1، هر دو جهت هر ۳ دسته — قوی‌ترین رابطه‌ی کل ماتریس", () => {
    assert(
      sportRequirementMatrix.swimming_general.similar_sports.by_anthropometry.includes("rowing") &&
        sportRequirementMatrix.swimming_general.similar_sports.by_performance.includes("rowing") &&
        sportRequirementMatrix.swimming_general.similar_sports.by_psychology.includes("rowing"),
      "swimming_general باید هر ۳ دسته را به rowing ارجاع دهد (از Commit 1)"
    );
    assert(
      sportRequirementMatrix.rowing.similar_sports.by_anthropometry.includes("swimming_general") &&
        sportRequirementMatrix.rowing.similar_sports.by_performance.includes("swimming_general") &&
        sportRequirementMatrix.rowing.similar_sports.by_psychology.includes("swimming_general"),
      "rowing باید هر ۳ دسته را متقابلاً به swimming_general ارجاع دهد"
    );
  });
  check("volleyball_middle_blocker↔high_jump: خفته‌ی Commit 1 (۲ دسته)", () => {
    assert(
      sportRequirementMatrix.volleyball_middle_blocker.similar_sports.by_anthropometry.includes("high_jump") &&
        sportRequirementMatrix.volleyball_middle_blocker.similar_sports.by_performance.includes("high_jump"),
      "volleyball_middle_blocker باید ۲ دسته را به high_jump ارجاع دهد (از Commit 1)"
    );
  });

  console.log(`\n[test-engine-talentid-sportmatrix-final12] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
