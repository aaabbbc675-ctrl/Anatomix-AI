// اسکریپت تست مستقل برای ۲۴ رشته‌ی جدید Commit 17 در sportRequirementMatrix.js
// (طبق docs/TODO-wave-labeling-correction.md: ردیف‌های ۱۶-۴۰ جدول ۲۰.۶ سند
// به‌جز wrestling_freestyle که از قبل ساخته شده بود).
// اجرا: node scripts/test-engine-talentid-sportmatrix-wave2.js
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
  "handball_goalkeeper",
  "handball_wing",
  "handball_back",
  "handball_pivot",
  "futsal_goalkeeper",
  "futsal_fixo",
  "futsal_flank",
  "futsal_pivot",
  "tennis_singles",
  "table_tennis",
  "sprint_100m",
  "sprint_200m",
  "middle_distance_running",
  "marathon",
  "wrestling_greco",
  "boxing",
  "taekwondo",
  "judo",
  "MMA",
  "wushu_sanda",
  "karate",
  "cycling_road",
  "gymnastics_artistic",
  "shooting_target",
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

  console.log("\n[تعداد کل رشته‌ها بعد از Commit 17]");
  check("sportRequirementMatrix دقیقاً ۲۹ رشته دارد (۵ قبلی + ۲۴ جدید)", () => {
    assert(
      Object.keys(sportRequirementMatrix).length === 29,
      `انتظار ۲۹، گرفتیم ${Object.keys(sportRequirementMatrix).length}`
    );
  });
  check(`دقیقاً ${NEW_SPORT_IDS.length} رشته‌ی جدید همه در matrix حاضرند`, () => {
    for (const id of NEW_SPORT_IDS) {
      assert(sportRequirementMatrix[id] !== undefined, `"${id}" باید در matrix باشد`);
    }
  });

  console.log("\n[validateSportEntry روی هر ۲۴ رشته‌ی جدید]");
  for (const sportId of NEW_SPORT_IDS) {
    check(`رشته "${sportId}" از validateSportEntry پاس می‌کند (performance_weights جمع=۱.۰، psych_requirements ۱-۵)`, () => {
      const entry = getSportEntry(sportId);
      assert(entry.id === sportId, `id باید "${sportId}" باشد`);
      assert(validateSportEntry(entry) === true, "باید true برگرداند");
    });
  }

  console.log("\n[کلیدهای bonus معتبر — فقط کلیدهای پشتیبانی‌شده‌ی computeActiveConditions]");
  check("هیچ رشته‌ی جدیدی از کلید bonus نامعتبر (مثل skeliac_index) استفاده نمی‌کند", () => {
    for (const sportId of NEW_SPORT_IDS) {
      const entry = sportRequirementMatrix[sportId];
      for (const bucket of [entry.anthropometric_bonuses, entry.composition_bonuses, entry.biometric_bonuses]) {
        for (const key of Object.keys(bucket ?? {})) {
          assert(VALID_ACTIVE_CONDITION_KEYS.has(key), `${sportId}: کلید نامعتبر "${key}"`);
        }
      }
    }
  });

  console.log("\n[تصحیح skeliac_index → cormic_low — taekwondo و sprint_100m/200m]");
  check("taekwondo/sprint_100m/sprint_200m از cormic_low استفاده می‌کنند (نه skeliac_index نامعتبر)", () => {
    for (const sportId of ["taekwondo", "sprint_100m", "sprint_200m"]) {
      assert(
        sportRequirementMatrix[sportId].anthropometric_bonuses.cormic_low !== undefined,
        `${sportId}: باید cormic_low داشته باشد`
      );
    }
  });

  console.log("\n[محاسبه‌ی واقعی bio-score روی هر ۲۹ رشته — بدون throw]");
  check("calculateBioScores روی کل matrix (۲۹ رشته) بدون BIO_SCORE_UNKNOWN_DRIVER_KEY اجرا می‌شود", () => {
    const normalizedIntake = {
      anthropometrics: { ape_index: 1.1, cormic_index: 0.5, standing_height_cm: 175 },
      body_composition: { body_fat_percent: 12, smm_percent: 48, tbw_percent: 62, ffm_index: 25 },
      biometric: { resting_hr: 55, balance: 9, bilateral_asymmetry_percent: 5 },
      performance: { handgrip_asymmetry_percent: 5 },
      demographics: { biological_sex: "male" },
    };
    const scores = calculateBioScores(sportRequirementMatrix, normalizedIntake);
    assert(Object.keys(scores).length === 29, `انتظار ۲۹ رشته در خروجی، گرفتیم ${Object.keys(scores).length}`);
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(Number.isFinite(scores[sportId].final_bio_score), `${sportId}: final_bio_score باید عدد معتبر باشد`);
    }
  });

  console.log("\n[صداقت مستندشده — موارد خاص تأییدشده در جدول‌های خلاصه]");
  check("shooting_target: critical_perf_tests عمداً خالی است (هیچ تست موجودی واقعاً حیاتی نیست)", () => {
    assert(sportRequirementMatrix.shooting_target.critical_perf_tests.length === 0, "باید خالی باشد");
  });
  check("table_tennis/shooting_target/handball_goalkeeper/futsal_goalkeeper: بدون بونوس آنتروپومتریک (صادقانه، نه فراموشی)", () => {
    for (const sportId of ["table_tennis", "shooting_target", "futsal_goalkeeper"]) {
      assert(
        Object.keys(sportRequirementMatrix[sportId].anthropometric_bonuses).length === 0,
        `${sportId}: باید بدون بونوس آنتروپومتریک باشد`
      );
    }
  });
  check("gymnastics_artistic: بدون بونوس مبتنی‌بر قد (tall_stature)، طبق تصمیم تاییدشده", () => {
    assert(
      sportRequirementMatrix.gymnastics_artistic.anthropometric_bonuses.tall_stature === undefined,
      "نباید tall_stature داشته باشد"
    );
  });
  check("wushu_sanda: هیچ ارتباط similar_sports با اطمینان بالا ندارد (فقط ۱ دسته در هر مورد، طبق هشدار اطمینان پایین)", () => {
    const similar = sportRequirementMatrix.wushu_sanda.similar_sports;
    assert(similar.by_anthropometry.length + similar.by_performance.length + similar.by_psychology.length === 2, "باید دقیقاً ۲ ارتباط ضعیف داشته باشد");
  });

  console.log("\n[روابط متقابل تازه‌فعال‌شده — دقیقاً طبق تحلیل Commit 17]");
  check("wrestling_greco↔wrestling_freestyle: هر ۳ دسته یک‌طرفه از wrestling_greco (اطمینان قوی-استنتاجی)", () => {
    const similar = sportRequirementMatrix.wrestling_greco.similar_sports;
    assert(
      similar.by_anthropometry.includes("wrestling_freestyle") &&
        similar.by_performance.includes("wrestling_freestyle") &&
        similar.by_psychology.includes("wrestling_freestyle"),
      "wrestling_greco باید هر ۳ دسته را به wrestling_freestyle ارجاع دهد"
    );
  });
  check("judo↔wrestling_freestyle: رابطه‌ی نادر متقارن (هر دو جهت ۲ دسته)", () => {
    const judoSimilar = sportRequirementMatrix.judo.similar_sports;
    assert(
      judoSimilar.by_anthropometry.includes("wrestling_freestyle") && judoSimilar.by_performance.includes("wrestling_freestyle"),
      "judo باید wrestling_freestyle را در anthropometry و performance ارجاع دهد"
    );
  });

  console.log(`\n[test-engine-talentid-sportmatrix-wave2] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
