// اسکریپت تست مستقل برای engine/talentId/file13_explainabilityEngine.js.
// اجرا: node scripts/test-engine-talentid-file13-explainability.js
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

function containsPersian(text) {
  return /[؀-ۿ]/.test(text ?? "");
}

(async () => {
  const { generateMatchReports, generateMatchReport, classifyTier, TIER_A_MIN, TIER_B_MIN } = await import(
    "../engine/talentId/file13_explainabilityEngine.js"
  );
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  const SPORT_IDS = Object.keys(sportRequirementMatrix);

  // ─── Fixture helpers ─────────────────────────────────────────────────
  function emptyKeyedBySport(fn) {
    const result = {};
    for (const sportId of SPORT_IDS) result[sportId] = fn(sportId);
    return result;
  }

  function neutralSources(overrides = {}) {
    return {
      bioScores: emptyKeyedBySport(() => ({ final_bio_score: 100, drivers: [] })),
      posturalResult: { adjustments_by_sport: {}, active_postures: [] },
      romResult: { adjustments_by_sport: {} },
      perfScores: emptyKeyedBySport(() => ({ final_perf_score: 100, drivers: [] })),
      psychScores: emptyKeyedBySport(() => ({ final_psych_score: 100, drivers: [] })),
      psychProfile: { extracted_confidence: 0.9 },
      medicalHolds: emptyKeyedBySport(() => ({ status: "clear" })),
      maturityProfile: { formula_used: "mirwald", maturity_type: "on_time_maturer" },
      bioBanded: emptyKeyedBySport(() => ({
        adjusted_bio_score: 140,
        adjusted_perf_score: 130,
        adjusted_psych_score: 95,
        maturity_adjustment_factor: 1.0,
      })),
      ...overrides,
    };
  }

  console.log("\n[classifyTier — آستانه‌های بخش ۱۴.۳ سند]");
  check("final_score=85 → A (مرز)", () => assert(classifyTier(85, "clear") === "A", "باید A باشد"));
  check("final_score=84.99 → B", () => assert(classifyTier(84.99, "clear") === "B", "باید B باشد"));
  check("final_score=70 → B (مرز)", () => assert(classifyTier(70, "clear") === "B", "باید B باشد"));
  check("final_score=69.99 → C", () => assert(classifyTier(69.99, "clear") === "C", "باید C باشد"));
  check("medical_hold → M، صرف‌نظر از عدد امتیاز (حتی امتیاز بالا)", () => {
    assert(classifyTier(95, "medical_hold") === "M", "باید M باشد حتی با امتیاز ۹۵");
  });

  console.log("\n[نرمال‌سازی درایور bio — magnitude/narrative مستقیم]");
  check("bio driver با magnitude=+15 در top_positive_drivers ظاهر می‌شود", () => {
    const sources = neutralSources({
      bioScores: {
        ...neutralSources().bioScores,
        wrestling_freestyle: {
          final_bio_score: 155,
          drivers: [
            {
              driver_id: "anthropometric.cormic_high",
              category: "anthropometric",
              direction: "positive",
              magnitude: 15,
              trainability: "trainable",
              narrative_short: "بالاتنه بلند نسبی",
            },
          ],
        },
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const driver = reports.wrestling_freestyle.top_positive_drivers.find(
      (d) => d.driver_id === "anthropometric.cormic_high"
    );
    assert(driver !== undefined, "driver باید در top_positive_drivers باشد");
    assert(driver.magnitude === 15, "magnitude نادرست");
    assert(driver.narrative === "بالاتنه بلند نسبی", "narrative نادرست");
  });

  console.log("\n[نرمال‌سازی درایور postural — applied_penalty→magnitude، biomechanical_reason→narrative]");
  check("postural driver با applied_penalty=-25 در top_negative_drivers با category='postural' ظاهر می‌شود", () => {
    const sources = neutralSources({
      posturalResult: {
        adjustments_by_sport: {
          wrestling_freestyle: [
            {
              driver_id: "postural.kyphosis.severity_3",
              posture_type: "kyphosis",
              severity: 3,
              applied_penalty: -25,
              biomechanical_reason: "کایفوز شدید — ناتوانی در اکستنشن کامل تنه",
              beneficial: null,
              is_correctable: true,
              typical_correction_time_weeks: 12,
              suggested_corrective_module_id: null,
              corrective_module_status: "not_yet_linked",
              trainability: "trainable",
            },
          ],
        },
        active_postures: [],
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const driver = reports.wrestling_freestyle.top_negative_drivers.find(
      (d) => d.driver_id === "postural.kyphosis.severity_3"
    );
    assert(driver !== undefined, "driver باید در top_negative_drivers باشد");
    assert(driver.magnitude === -25, "magnitude نادرست (باید از applied_penalty بیاید)");
    assert(driver.category === "postural", "category نادرست");
    assert(driver.narrative === "کایفوز شدید — ناتوانی در اکستنشن کامل تنه", "narrative نادرست (باید از biomechanical_reason بیاید)");
    assert(driver.is_correctable === true, "is_correctable نادرست");
    // ⚠️ یافته‌ی حیاتی Commit 13: این پنالتی باید واقعاً روی امتیاز اثر بگذارد.
    assertClose(
      reports.wrestling_freestyle.score_breakdown.postural_rom_penalty_applied.postural,
      -25,
      0.0001,
      "پنالتی پوسچرال باید در score_breakdown منعکس شود"
    );
    // bio component باید (140-25)/2=57.5 باشد (رجوع به fixture: adjusted_bio_score=140)
    assertClose(reports.wrestling_freestyle.score_breakdown.bio_component.value, 57.5, 0.0001, "bio_component.value نادرست");
  });

  console.log("\n[نرمال‌سازی درایور ROM — category='flexibility'، duration_weeks=null (طبق تصمیم Commit 7)]");
  check("rom driver با applied_penalty=-10 → category='flexibility'، correction_info.duration_weeks=null", () => {
    const sources = neutralSources({
      romResult: {
        adjustments_by_sport: {
          wrestling_freestyle: [
            {
              driver_id: "rom.shoulder_flexor_short",
              deficit_type: "shoulder_flexor_short",
              severity_level: 2,
              applied_penalty: -10,
              biomechanical_reason: "کوتاهی فلکسور شانه",
              is_correctable: true,
              trainability: "trainable",
            },
          ],
        },
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const driver = reports.wrestling_freestyle.top_negative_drivers.find(
      (d) => d.driver_id === "rom.shoulder_flexor_short"
    );
    assert(driver !== undefined, "driver باید در top_negative_drivers باشد");
    assert(driver.category === "flexibility", "category نادرست (باید 'flexibility' باشد، طبق مثال بخش ۱۴.۵ سند)");
    assertClose(
      reports.wrestling_freestyle.score_breakdown.postural_rom_penalty_applied.rom,
      -10,
      0.0001,
      "پنالتی ROM باید در score_breakdown منعکس شود"
    );
  });

  console.log("\n[نرمال‌سازی درایور perf — نوع عادی و critical_fail]");
  check("perf driver عادی: magnitude=applied_bonus، narrative از test/tier ساخته می‌شود", () => {
    const sources = neutralSources({
      perfScores: {
        ...neutralSources().perfScores,
        wrestling_freestyle: {
          final_perf_score: 115,
          drivers: [
            {
              driver_id: "perf.handgrip.excellent_top_20",
              test: "handgrip",
              tier: "excellent_top_20",
              raw_value: 45,
              applied_bonus: 15,
              weight_in_sport: 0.25,
              normalized_weight: 0.5,
              trainability: "trainable",
              fallback_applied: false,
            },
          ],
        },
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const driver = reports.wrestling_freestyle.top_positive_drivers.find(
      (d) => d.driver_id === "perf.handgrip.excellent_top_20"
    );
    assert(driver !== undefined, "driver باید در top_positive_drivers باشد");
    assert(driver.magnitude === 15, "magnitude نادرست");
    assert(driver.narrative.includes("handgrip"), "narrative باید شامل نام تست باشد");
  });

  check("perf critical_fail driver: magnitude=null → در رتبه‌بندی ظاهر نمی‌شود (نه crash)", () => {
    const sources = neutralSources({
      perfScores: {
        ...neutralSources().perfScores,
        wrestling_freestyle: {
          final_perf_score: 60,
          drivers: [
            {
              driver_id: "perf.critical_fail.beep_test",
              test: "beep_test",
              criticality: "critical_failure",
              note: "رکورد ضعیف در تست حیاتی این رشته",
            },
          ],
        },
      },
    });
    // نباید throw کند
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const inPositive = reports.wrestling_freestyle.top_positive_drivers.find(
      (d) => d.driver_id === "perf.critical_fail.beep_test"
    );
    const inNegative = reports.wrestling_freestyle.top_negative_drivers.find(
      (d) => d.driver_id === "perf.critical_fail.beep_test"
    );
    assert(inPositive === undefined && inNegative === undefined, "نباید در رتبه‌بندی ظاهر شود (magnitude=null)");
  });

  console.log("\n[نرمال‌سازی درایور psych — مشتق دقیق magnitude از فرمول بخش ۱۰.۱ سند]");
  check("psych trait driver: magnitude = -(delta×importance/totalWeight)×100 — محاسبه‌ی دستی تأیید می‌شود", () => {
    // wrestling_freestyle.trait_importance: teamwork=0.5, aggression=2, resilience=2,
    // pressure=1.5, focus=1, dynamic=1, chaos=1 → totalWeight = 4×(0.5+2+2+1.5+1+1+1) = 4×9 = 36
    const sources = neutralSources({
      psychScores: {
        ...neutralSources().psychScores,
        wrestling_freestyle: {
          final_psych_score: 78,
          drivers: [
            {
              driver_id: "psych.aggression_contact.mismatch",
              trait: "aggression_contact",
              category: "psychological",
              user_value: 1,
              target_value: 5,
              delta: 4,
              importance: 2,
              trainability: "trainable",
              narrative_short: "میل به برخورد پایین، رشته پرتماس است",
            },
          ],
        },
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const driver = reports.wrestling_freestyle.top_negative_drivers.find(
      (d) => d.driver_id === "psych.aggression_contact.mismatch"
    );
    assert(driver !== undefined, "driver باید در top_negative_drivers باشد");
    // magnitude = -(4×2/36)×100 = -22.222
    assertClose(driver.magnitude, -22.2222, 0.001, "magnitude محاسبه‌شده نادرست است");
    assert(driver.narrative === "میل به برخورد پایین، رشته پرتماس است", "narrative نادرست");
  });

  check("psych interest-bonus driver: magnitude=null → در رتبه‌بندی ظاهر نمی‌شود", () => {
    const sources = neutralSources({
      psychScores: {
        ...neutralSources().psychScores,
        wrestling_freestyle: {
          final_psych_score: 99,
          drivers: [
            {
              driver_id: "interest.explicit_bonus",
              rank_by_user: 1,
              applied_bonus: "10%",
              narrative: "کاربر این رشته را در اولویت ۱ علاقه‌ی شخصی قرار داده",
            },
          ],
        },
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const inPositive = reports.wrestling_freestyle.top_positive_drivers.find(
      (d) => d.driver_id === "interest.explicit_bonus"
    );
    assert(inPositive === undefined, "نباید در رتبه‌بندی عددی ظاهر شود (magnitude=null، applied_bonus رشته‌ای است نه عدد)");
  });

  console.log("\n[primary_exclusion_cause — طبق بخش ۱۴.۳ سند]");
  check("tier=A یا B → primary_exclusion_cause تعریف‌نشده است", () => {
    const sources = neutralSources(); // bioBanded پیش‌فرض → final_score بالا (tier A/B)
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    for (const sportId of SPORT_IDS) {
      if (reports[sportId].final_tier === "A" || reports[sportId].final_tier === "B") {
        assert(
          reports[sportId].primary_exclusion_cause === undefined,
          `${sportId}: primary_exclusion_cause نباید برای tier ${reports[sportId].final_tier} تعریف شود`
        );
      }
    }
  });

  check("tier=C → primary_exclusion_cause بزرگ‌ترین driver منفی را نشان می‌دهد", () => {
    const sources = neutralSources({
      bioBanded: {
        ...neutralSources().bioBanded,
        wrestling_freestyle: {
          adjusted_bio_score: 50,
          adjusted_perf_score: 50,
          adjusted_psych_score: 50,
          maturity_adjustment_factor: 1.0,
        },
      },
      posturalResult: {
        adjustments_by_sport: {
          wrestling_freestyle: [
            {
              driver_id: "postural.kyphosis.severity_3",
              applied_penalty: -25,
              biomechanical_reason: "کایفوز شدید",
              is_correctable: true,
              typical_correction_time_weeks: 12,
              trainability: "trainable",
            },
          ],
        },
        active_postures: [],
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    assert(reports.wrestling_freestyle.final_tier === "C", "باید tier C باشد");
    assert(reports.wrestling_freestyle.primary_exclusion_cause !== undefined, "باید primary_exclusion_cause داشته باشد");
    assert(
      reports.wrestling_freestyle.primary_exclusion_cause.single_driver === "postural.kyphosis.severity_3",
      "باید بزرگ‌ترین driver منفی را نشان دهد"
    );
    assert(
      reports.wrestling_freestyle.primary_exclusion_cause.category === "postural",
      "category نادرست"
    );
  });

  console.log("\n[medical_hold — tier=M، نه C؛ narrative از reason_narrative]");
  check("رشته با medicalHolds.status='medical_hold' → final_tier='M'، primary_exclusion_cause از reason_narrative", () => {
    const sources = neutralSources({
      medicalHolds: {
        ...neutralSources().medicalHolds,
        wrestling_freestyle: {
          status: "medical_hold",
          pathology: "chronic_kidney_disease",
          risk_level: "critical_risk",
          required_specialist: "nephrologist",
          reason_narrative: "ضربه به ناحیه‌ی کلیه = ریسک آسیب حاد",
          is_temporary: false,
          coach_can_override: false,
          clearance_requirements: ["nephrologist signature"],
        },
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const report = reports.wrestling_freestyle;
    assert(report.final_tier === "M", `باید M باشد، گرفتیم ${report.final_tier}`);
    assert(report.medical_hold !== null, "medical_hold باید attach شود");
    assert(report.primary_exclusion_cause.category === "medical", "category باید medical باشد");
    assert(
      report.primary_exclusion_cause.cause_narrative === "ضربه به ناحیه‌ی کلیه = ریسک آسیب حاد",
      "cause_narrative باید دقیقاً از reason_narrative بیاید"
    );
    assert(
      report.coach_narrative.includes("ضربه به ناحیه‌ی کلیه"),
      "coach_narrative باید شامل دلیل پزشکی باشد، نه یک متن عمومی C-tier"
    );
  });

  console.log("\n[what_if_analysis — اجرای کامل فرمول file12، نه جمع دستی]");
  check("بدون هیچ driver قابل‌اصلاح منفی → what_if_analysis تعریف‌نشده است", () => {
    const sources = neutralSources();
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    for (const sportId of SPORT_IDS) {
      assert(reports[sportId].what_if_analysis === undefined, `${sportId}: نباید what_if_analysis داشته باشد`);
    }
  });

  check("بهبود کوچک (≤۱۰ امتیاز) → what_if_analysis تعریف‌نشده است (طبق آستانه‌ی سند)", () => {
    const sources = neutralSources({
      posturalResult: {
        adjustments_by_sport: {
          soccer_striker: [
            {
              driver_id: "postural.genu_valgum.severity_1",
              applied_penalty: -3,
              biomechanical_reason: "زانوی ضربدری خفیف",
              is_correctable: true,
              typical_correction_time_weeks: 4,
              trainability: "trainable",
            },
          ],
        },
        active_postures: [],
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    // پنالتی -۳ روی مقیاس ۰-۲۰۰، پس از rescale÷۲×وزن۰.۴ فقط ~۰.۶ امتیاز روی final_score اثر دارد — زیر آستانه‌ی ۱۰.
    assert(reports.soccer_striker.what_if_analysis === undefined, "نباید what_if_analysis داشته باشد (بهبود خیلی کوچک)");
  });

  check("driver بزرگ قابل‌اصلاح → what_if_analysis با فرمول کامل file12 محاسبه می‌شود، نه جمع ساده", () => {
    const sources = neutralSources({
      bioBanded: {
        ...neutralSources().bioBanded,
        volleyball_middle_blocker: {
          adjusted_bio_score: 88,
          adjusted_perf_score: 82,
          adjusted_psych_score: 91,
          maturity_adjustment_factor: 1.0,
        },
      },
      posturalResult: {
        adjustments_by_sport: {
          volleyball_middle_blocker: [
            {
              driver_id: "postural.kyphosis.severity_3",
              applied_penalty: -60,
              biomechanical_reason: "کایفوز شدید — ناتوانی در اکستنشن کامل تنه در اسپک",
              is_correctable: true,
              typical_correction_time_weeks: 12,
              trainability: "trainable",
            },
          ],
        },
        active_postures: [],
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const report = reports.volleyball_middle_blocker;
    // baseline: bioRaw=clamp(88-60,0,200)=28→bio=14×0.4=5.6, perf=82/2=41×0.4=16.4, psych=91×0.2=18.2 → final=40.2
    assertClose(report.final_score, 40.2, 0.01, "final_score پایه نادرست");
    assert(report.what_if_analysis !== undefined, "باید what_if_analysis داشته باشد (gain=12 > آستانه‌ی ۱۰)");
    // اصلاح‌شده: bioRaw=88→bio=44×0.4=17.6, perf=16.4, psych=18.2 → final=52.2
    assertClose(report.what_if_analysis.estimated_score_if_corrected, 52.2, 0.01, "estimated_score_if_corrected نادرست");
    assert(report.what_if_analysis.correction_path.length === 1, "باید ۱ گام اصلاح داشته باشد");
    assertClose(report.what_if_analysis.correction_path[0].expected_score_gain, 12, 0.01, "expected_score_gain نادرست");
    assert(report.what_if_analysis.total_estimated_weeks_to_A_tier === 12, "weeks نادرست");
    assert(report.what_if_analysis.duration_warning === null, "همه‌ی weeks معلوم بودند، نباید warning باشد");
    assert(report.what_if_analysis.highlight_message.includes("52"), "highlight_message باید شامل عدد امتیاز باشد");
  });

  check("ترکیب postural (weeks معلوم) + rom (weeks نامعلوم) → duration_warning صریح، total از max فقط روی معلوم‌ها", () => {
    const sources = neutralSources({
      bioBanded: {
        ...neutralSources().bioBanded,
        weightlifting_olympic: {
          adjusted_bio_score: 150,
          adjusted_perf_score: 40,
          adjusted_psych_score: 40,
          maturity_adjustment_factor: 1.0,
        },
      },
      posturalResult: {
        adjustments_by_sport: {
          weightlifting_olympic: [
            {
              driver_id: "postural.kyphosis.severity_3",
              applied_penalty: -40,
              biomechanical_reason: "کایفوز شدید",
              is_correctable: true,
              typical_correction_time_weeks: 12,
              trainability: "trainable",
            },
          ],
        },
        active_postures: [],
      },
      romResult: {
        adjustments_by_sport: {
          weightlifting_olympic: [
            {
              driver_id: "rom.achilles_short",
              applied_penalty: -30,
              biomechanical_reason: "کوتاهی آشیل",
              is_correctable: true,
              trainability: "trainable",
            },
          ],
        },
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    // baseline: bioRaw=clamp(150-40-30,0,200)=80→bio=40×0.4=16, perf=(40/2)×0.4=8, psych=40×0.2=8 → final=32
    assertClose(reports.weightlifting_olympic.final_score, 32, 0.01, "final_score پایه نادرست");
    const whatIf = reports.weightlifting_olympic.what_if_analysis;
    assert(whatIf !== undefined, "باید what_if_analysis داشته باشد (gain=14 > آستانه‌ی ۱۰)");
    // اصلاح‌شده کامل: bioRaw=150→bio=75×0.4=30, perf=8, psych=8 → final=46 → gain=14
    assertClose(whatIf.estimated_score_if_corrected, 46, 0.01, "estimated_score_if_corrected نادرست");
    assert(whatIf.correction_path.length === 2, "باید ۲ گام اصلاح داشته باشد");
    assert(whatIf.total_estimated_weeks_to_A_tier === 12, "باید فقط از weeks معلوم (postural) استفاده کند");
    assert(whatIf.partial_duration_estimate === true, "partial_duration_estimate باید true باشد");
    assert(whatIf.duration_warning !== null && whatIf.duration_warning.includes("1"), "duration_warning باید تعداد موارد نامعلوم را بگوید");
  });

  check("estimated_score_if_corrected هرگز از ۱۰۰ رد نمی‌شود (طبق سند)", () => {
    const sources = neutralSources({
      bioBanded: {
        ...neutralSources().bioBanded,
        swimming_general: {
          adjusted_bio_score: 200,
          adjusted_perf_score: 200,
          adjusted_psych_score: 100,
          maturity_adjustment_factor: 1.0,
        },
      },
      posturalResult: {
        adjustments_by_sport: {
          swimming_general: [
            {
              driver_id: "postural.kyphosis.severity_3",
              applied_penalty: -60,
              biomechanical_reason: "کایفوز شدید",
              is_correctable: true,
              typical_correction_time_weeks: 12,
              trainability: "trainable",
            },
          ],
        },
        active_postures: [],
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    if (reports.swimming_general.what_if_analysis) {
      assert(
        reports.swimming_general.what_if_analysis.estimated_score_if_corrected <= 100,
        "نباید از ۱۰۰ رد شود"
      );
    }
  });

  console.log("\n[Narrativeها — متن فارسی و هشدار early/late maturer]");
  check("coach_narrative و client_narrative همیشه متن فارسی غیرخالی دارند", () => {
    const sources = neutralSources();
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    for (const sportId of SPORT_IDS) {
      assert(containsPersian(reports[sportId].coach_narrative), `${sportId}: coach_narrative باید فارسی باشد`);
      assert(containsPersian(reports[sportId].client_narrative), `${sportId}: client_narrative باید فارسی باشد`);
    }
  });

  check("maturity_type='early_maturer' → coach_narrative شامل هشدار صریح است", () => {
    const sources = neutralSources({ maturityProfile: { formula_used: "mirwald", maturity_type: "early_maturer" } });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    assert(reports.soccer_striker.coach_narrative.includes("Early Maturer"), "باید شامل هشدار Early Maturer باشد");
  });

  check("maturity_type='late_maturer' → coach_narrative شامل هشدار صریح است", () => {
    const sources = neutralSources({ maturityProfile: { formula_used: "mirwald", maturity_type: "late_maturer" } });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    assert(reports.soccer_striker.coach_narrative.includes("Late Maturer"), "باید شامل هشدار Late Maturer باشد");
  });

  console.log("\n[top_positive/negative_drivers — رتبه‌بندی صحیح بر اساس magnitude]");
  check("۳ driver مثبت با magnitude متفاوت → به ترتیب نزولی رتبه‌بندی می‌شوند، فقط top 3", () => {
    const sources = neutralSources({
      bioScores: {
        ...neutralSources().bioScores,
        soccer_striker: {
          final_bio_score: 150,
          drivers: [
            { driver_id: "d1", category: "anthropometric", magnitude: 5, trainability: "trainable", narrative_short: "d1" },
            { driver_id: "d2", category: "anthropometric", magnitude: 20, trainability: "trainable", narrative_short: "d2" },
            { driver_id: "d3", category: "anthropometric", magnitude: 10, trainability: "trainable", narrative_short: "d3" },
            { driver_id: "d4", category: "anthropometric", magnitude: 15, trainability: "trainable", narrative_short: "d4" },
          ],
        },
      },
    });
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const ids = reports.soccer_striker.top_positive_drivers.map((d) => d.driver_id);
    assert(ids.length === 3, "فقط top 3 باید نمایش داده شود");
    assert(ids[0] === "d2" && ids[1] === "d4" && ids[2] === "d3", `ترتیب نادرست: ${ids.join(",")}`);
  });

  console.log("\n[═══ REGRESSION GUARD: هرگز حذف نشو — این بخش را حذف نکنید ═══]");
  check("برای چند سناریوی متفاوت، generateMatchReports همیشه دقیقاً ۵ رشته با final_score/final_tier معتبر برمی‌گرداند", () => {
    const scenarios = [
      neutralSources(),
      neutralSources({ maturityProfile: { formula_used: "chronological_fallback", maturity_type: "early_maturer" } }),
      neutralSources({
        medicalHolds: {
          ...neutralSources().medicalHolds,
          soccer_striker: { status: "medical_hold", pathology: "x", reason_narrative: "test", required_specialist: "x", coach_can_override: true },
        },
      }),
      neutralSources({
        bioBanded: emptyKeyedBySport(() => ({
          adjusted_bio_score: 0,
          adjusted_perf_score: 0,
          adjusted_psych_score: 0,
          maturity_adjustment_factor: 0.9,
        })),
      }),
    ];
    const validTiers = new Set(["A", "B", "C", "M"]);
    let checkedCount = 0;
    for (const sources of scenarios) {
      const reports = generateMatchReports(sportRequirementMatrix, sources);
      assert(Object.keys(reports).length === SPORT_IDS.length, "تعداد رشته نادرست");
      for (const sportId of SPORT_IDS) {
        checkedCount++;
        assert(reports[sportId] !== undefined, `${sportId}: نباید غایب باشد`);
        assert(
          Number.isFinite(reports[sportId].final_score) &&
            reports[sportId].final_score >= 0 &&
            reports[sportId].final_score <= 100,
          `${sportId}: final_score نامعتبر`
        );
        assert(validTiers.has(reports[sportId].final_tier), `${sportId}: final_tier نامعتبر`);
      }
    }
    assert(checkedCount === scenarios.length * SPORT_IDS.length, "تعداد چک‌ها نادرست است");
    console.log(`     (${checkedCount} ترکیب scenario×sport چک شد)`);
  });

  console.log(`\n[test-engine-talentid-file13-explainability] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
