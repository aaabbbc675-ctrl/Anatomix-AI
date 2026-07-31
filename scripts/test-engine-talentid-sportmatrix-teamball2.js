// اسکریپت تست مستقل برای ۱۱ رشته‌ی جدید Commit 18 در sportRequirementMatrix.js
// (۵ پست جامانده‌ی فوتبال + ۳ پست بسکتبال + ۳ پست والیبال، طبق
// docs/TODO-wave-labeling-correction.md — بخشی از ۱۱ رشته‌ی «Wave 1 واقعی»
// جامانده).
// اجرا: node scripts/test-engine-talentid-sportmatrix-teamball2.js
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

const NEW_SPORT_IDS = [
  "soccer_goalkeeper",
  "soccer_center_back",
  "soccer_full_back",
  "soccer_defensive_mid",
  "soccer_winger",
  "basketball_playmaker",
  "basketball_shooter",
  "basketball_center",
  "volleyball_setter",
  "volleyball_libero",
  "volleyball_outside",
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
  const { validateSportEntry } = await import("../engine/talentId/shared/sportRequirementSchema.js");
  const { calculateBioScores } = await import("../engine/talentId/file4_bioScoreCalculator.js");
  const { posturalSportImpactMap } = await import("../engine/talentId/shared/posturalSportImpactMap.js");
  const { romSportImpactMap, hypermobilityImpact } = await import("../engine/talentId/shared/romSportImpactMap.js");
  const { activePathologyMap } = await import("../engine/talentId/shared/activePathologyMap.js");

  console.log("\n[تعداد کل رشته‌ها بعد از Commit 18]");
  check("sportRequirementMatrix حداقل ۴۰ رشته دارد (۲۹ قبلی + ۱۱ جدید)", () => {
    assert(
      Object.keys(sportRequirementMatrix).length >= 40,
      `انتظار حداقل ۴۰، گرفتیم ${Object.keys(sportRequirementMatrix).length}`
    );
  });
  check(`دقیقاً ${NEW_SPORT_IDS.length} رشته‌ی جدید همه در matrix حاضرند`, () => {
    for (const id of NEW_SPORT_IDS) {
      assert(sportRequirementMatrix[id] !== undefined, `"${id}" باید در matrix باشد`);
    }
  });

  console.log("\n[validateSportEntry روی هر ۱۱ رشته‌ی جدید]");
  for (const sportId of NEW_SPORT_IDS) {
    check(`رشته "${sportId}" از validateSportEntry پاس می‌کند (performance_weights جمع=۱.۰، psych_requirements ۱-۵)`, () => {
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

  console.log("\n[محاسبه‌ی واقعی bio-score روی کل matrix (۴۰+ رشته) — بدون throw]");
  check("calculateBioScores روی کل matrix بدون BIO_SCORE_UNKNOWN_DRIVER_KEY اجرا می‌شود", () => {
    const normalizedIntake = {
      anthropometrics: { ape_index: 1.1, cormic_index: 0.5, standing_height_cm: 195 },
      body_composition: { body_fat_percent: 12, smm_percent: 48, tbw_percent: 62, ffm_index: 25 },
      biometric: { resting_hr: 55, balance: 9, bilateral_asymmetry_percent: 5 },
      performance: { handgrip_asymmetry_percent: 5 },
      demographics: { biological_sex: "male" },
    };
    const scores = calculateBioScores(sportRequirementMatrix, normalizedIntake);
    assert(
      Object.keys(scores).length >= 40,
      `انتظار حداقل ۴۰ رشته در خروجی، گرفتیم ${Object.keys(scores).length}`
    );
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(Number.isFinite(scores[sportId].final_bio_score), `${sportId}: final_bio_score باید عدد معتبر باشد`);
    }
  });

  console.log("\n[استثنای FIVB — volleyball_libero — قوی‌ترین استدلال این Commit]");
  check("volleyball_libero: بدون kyphosis/rounded_shoulder (پنالتی‌های حمله‌محور)، طبق قانون رسمی FIVB", () => {
    const contraindications = sportRequirementMatrix.volleyball_libero.postural_contraindications;
    assert(contraindications.length === 0, "باید کاملاً خالی باشد");
  });
  check("volleyball_libero: بدون shoulder_impingement/disc_herniation (پاتولوژی‌های حمله‌محور)", () => {
    const med = sportRequirementMatrix.volleyball_libero.medical_contraindications;
    assert(!med.includes("active_shoulder_impingement"), "نباید shoulder_impingement داشته باشد");
    assert(!med.includes("active_disc_herniation"), "نباید disc_herniation داشته باشد");
  });
  check("volleyball_libero: همچنان meniscus/ankle_sprain دارد (ریسک اسکرمبل دفاعی واقعی است، نه حمله‌ای)", () => {
    const med = sportRequirementMatrix.volleyball_libero.medical_contraindications;
    assert(med.includes("active_meniscus_tear"), "باید meniscus_tear داشته باشد");
    assert(med.includes("active_ankle_sprain_grade_2_or_3"), "باید ankle_sprain داشته باشد");
  });
  check("volleyball_libero: بدون vertical_jump در performance_weights (قانون FIVB، نه فراموشی)", () => {
    assert(
      sportRequirementMatrix.volleyball_libero.performance_weights.vertical_jump === undefined,
      "نباید vertical_jump داشته باشد"
    );
  });
  check("activePathologyMap.active_shoulder_impingement/disc_herniation: هیچ کلید volleyball_libero ندارند", () => {
    assert(
      activePathologyMap.active_shoulder_impingement.affects_sports.volleyball_libero === undefined,
      "نباید کلید volleyball_libero داشته باشد"
    );
    assert(
      activePathologyMap.active_disc_herniation.affects_sports.volleyball_libero === undefined,
      "نباید کلید volleyball_libero داشته باشد"
    );
  });

  console.log("\n[استثنای Di Salvo et al. 2007 — flat_foot فقط برای پست‌های پرشدت]");
  check("soccer_full_back/defensive_mid/winger: flat_foot دارند", () => {
    for (const sportId of ["soccer_full_back", "soccer_defensive_mid", "soccer_winger"]) {
      assert(
        sportRequirementMatrix[sportId].postural_contraindications.includes("flat_foot"),
        `${sportId}: باید flat_foot داشته باشد`
      );
    }
  });
  check("soccer_center_back/goalkeeper: عمداً بدون flat_foot (مستند به Di Salvo et al. 2007)", () => {
    for (const sportId of ["soccer_center_back", "soccer_goalkeeper"]) {
      assert(
        !sportRequirementMatrix[sportId].postural_contraindications.includes("flat_foot"),
        `${sportId}: نباید flat_foot داشته باشد`
      );
    }
  });
  check("posturalSportImpactMap.flat_foot: هیچ کلید soccer_center_back/soccer_goalkeeper ندارد", () => {
    assert(posturalSportImpactMap.flat_foot.soccer_center_back === undefined, "نباید کلید داشته باشد");
    assert(posturalSportImpactMap.flat_foot.soccer_goalkeeper === undefined, "نباید کلید داشته باشد");
  });

  console.log("\n[hip_flexor_short فقط winger — تصمیم تاییدشده‌ی Commit 18]");
  check("فقط soccer_winger از ۵ پست جدید فوتبال hip_flexor_short دارد", () => {
    assert(romSportImpactMap.hip_flexor_short.soccer_winger !== undefined, "soccer_winger باید داشته باشد");
    for (const sportId of ["soccer_goalkeeper", "soccer_center_back", "soccer_full_back", "soccer_defensive_mid"]) {
      assert(romSportImpactMap.hip_flexor_short[sportId] === undefined, `${sportId}: نباید hip_flexor_short داشته باشد`);
    }
  });

  console.log("\n[انحراف مستند GK — active_shoulder_impingement moderate_risk، نه safe عمومی]");
  check("soccer_goalkeeper: moderate_risk (انحراف افشاشده از soccer عمومی 'safe')", () => {
    assert(
      activePathologyMap.active_shoulder_impingement.affects_sports.soccer_goalkeeper === "moderate_risk",
      "باید moderate_risk باشد"
    );
    assert(
      activePathologyMap.active_shoulder_impingement.affects_sports.soccer === "safe",
      "soccer عمومی باید safe بماند (بدون تغییر)"
    );
  });

  console.log("\n[dual-key بسکتبال/والیبال در romSportImpactMap.hypermobilityImpact]");
  check("basketball_center و volleyball_outside به negative اضافه شدند", () => {
    assert(hypermobilityImpact.negative.includes("basketball_center"), "باید شامل basketball_center باشد");
    assert(hypermobilityImpact.negative.includes("volleyball_outside"), "باید شامل volleyball_outside باشد");
  });

  console.log("\n[روابط متقابل تازه‌فعال‌شده — دقیقاً طبق تحلیل تأییدشده‌ی Commit 18]");
  check("basketball_center↔volleyball_middle_blocker: ارجاع متقابلِ ارتباط خفته‌ی Commit 1", () => {
    assert(
      sportRequirementMatrix.volleyball_middle_blocker.similar_sports.by_anthropometry.includes("basketball_center"),
      "volleyball_middle_blocker باید از قبل به basketball_center ارجاع بدهد (Commit 1، خفته تا حالا)"
    );
    assert(
      sportRequirementMatrix.basketball_center.similar_sports.by_anthropometry.includes("volleyball_middle_blocker"),
      "basketball_center باید به volleyball_middle_blocker ارجاع بدهد"
    );
  });
  check("volleyball_outside↔volleyball_middle_blocker: ارجاع متقابلِ ارتباط خفته‌ی Commit 1", () => {
    assert(
      sportRequirementMatrix.volleyball_middle_blocker.similar_sports.by_psychology.includes("volleyball_outside"),
      "volleyball_middle_blocker باید از قبل به volleyball_outside ارجاع بدهد (Commit 1، خفته تا حالا)"
    );
  });

  console.log(`\n[test-engine-talentid-sportmatrix-teamball2] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
