// اسکریپت تست مستقل برای engine/talentId/file16_reportRenderer.js.
// اجرا: node scripts/test-engine-talentid-file16-reportrenderer.js
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
  const { renderCoachDashboard, renderClientReport } = await import("../engine/talentId/file16_reportRenderer.js");

  function makeReport(sportId, overrides = {}) {
    return {
      sport_id: sportId,
      sport_name_fa: `رشته-${sportId}`,
      sport_name_en: sportId,
      final_score: 50,
      ci: 3,
      confidence_tier: "high",
      final_tier: "C",
      score_breakdown: {},
      top_positive_drivers: [],
      top_negative_drivers: [],
      primary_exclusion_cause: undefined,
      what_if_analysis: undefined,
      medical_hold: null,
      coach_narrative: "متن مربی",
      client_narrative: "متن کاربر",
      ...overrides,
    };
  }

  function emptyTierClassification() {
    return {
      tier_A_golden: [],
      tier_B_development: [],
      tier_C_correctable: [],
      tier_C_low_potential: [],
      tier_M_medical_hold: [],
      hidden_from_default: [],
    };
  }

  function baseNormalizedIntake(overrides = {}) {
    return {
      meta: {
        athlete_id: "USR-1",
        assessment_date: "2025-08-31",
        scan_id: "SCAN-1",
        data_quality: { completeness_percent: 0.92, device_confidence: null, warnings: [] },
      },
      demographics: {
        chronological_age_decimal: 12.4,
        biological_sex: "male",
        date_of_birth: "2013-04-15",
        birth_month: 4,
        birth_month_shamsi: 1,
      },
      anthropometrics: { ape_index: 1.06, cormic_index: 0.52, skeliac_index: 1.0, bmi: 18, frame_size: "medium" },
      body_composition: { body_fat_percent: 14, smm_percent: 45, tbw_percent: 58, ffm_kg: 32, ffm_index: 19.5 },
      medical: { physician_clearance: null, active_pathologies: [], chronic_conditions: [], pain_max: 0 },
      ...overrides,
    };
  }

  function baseMaturityProfile(overrides = {}) {
    return { biological_age: 13.1, maturity_type: "on_time_maturer", chronological_age: 12.4, ...overrides };
  }

  function baseRaeAlert(overrides = {}) {
    return { alert: false, birth_month_shamsi: 4, month_name_fa: "تیر", narrative: null, ...overrides };
  }

  function basePsychProfile(overrides = {}) {
    return {
      teamwork_score: 3,
      aggression_contact: 4,
      focus_patience: 4,
      pressure_tolerance: 5,
      dynamic_activity: 4,
      chaos_decision: 3,
      resilience: 5,
      ...overrides,
    };
  }

  console.log("\n[header — تبدیل rae_alert، مقیاس data_quality_score، عبور physician_clearance]");
  check("rae_alert=false → header.rae_alert باید دقیقاً null باشد (نه آبجکت با alert:false)", () => {
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1") },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert({ alert: false }),
      baseNormalizedIntake(),
      basePsychProfile(),
      "علی رضایی"
    );
    assert(dashboard.header.rae_alert === null, "باید null باشد");
  });

  check("rae_alert=true → header.rae_alert همان آبجکت کامل است", () => {
    const raeResult = baseRaeAlert({ alert: true, birth_month_shamsi: 1, month_name_fa: "فروردین", narrative: "متن هشدار RAE" });
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1") },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      raeResult,
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    assert(dashboard.header.rae_alert !== null, "نباید null باشد");
    assert(dashboard.header.rae_alert.narrative === "متن هشدار RAE", "narrative نادرست");
  });

  check("data_quality_score = completeness_percent×100 (۰.۹۲ → ۹۲)", () => {
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1") },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    assert(dashboard.header.data_quality_score === 92, `انتظار ۹۲، گرفتیم ${dashboard.header.data_quality_score}`);
  });

  check("physician_clearance مستقیماً از normalizedIntake.medical عبور می‌کند", () => {
    const clearance = { specialist_signed_id: "DR-1", date: "2026-01-01", cleared_sports: ["s1"], notes: "" };
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1") },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake({ medical: { physician_clearance: clearance } }),
      basePsychProfile(),
      null
    );
    assert(dashboard.header.physician_clearance === clearance, "باید همان آبجکت باشد");
  });

  check("athlete_name از پارامتر مستقیم می‌آید (نه از normalizedIntake)", () => {
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1") },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      "سارا احمدی"
    );
    assert(dashboard.header.athlete_name === "سارا احمدی", "athlete_name نادرست");
  });

  console.log("\n[executive_summary]");
  check("top_3_recommended بر اساس final_score نزولی مرتب می‌شود", () => {
    const reports = {
      s1: makeReport("s1", { final_score: 60 }),
      s2: makeReport("s2", { final_score: 90 }),
      s3: makeReport("s3", { final_score: 75 }),
    };
    const dashboard = renderCoachDashboard(
      reports,
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    const ids = dashboard.executive_summary.top_3_recommended.map((r) => r.sport_id);
    assert(ids.join(",") === "s2,s3,s1", `ترتیب نادرست: ${ids.join(",")}`);
  });

  check("total_correctable_sports/total_medical_holds از tierClassification می‌آیند", () => {
    const tierClassification = emptyTierClassification();
    tierClassification.tier_C_correctable = [makeReport("s1"), makeReport("s2")];
    tierClassification.tier_M_medical_hold = [makeReport("s3")];
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1"), s2: makeReport("s2"), s3: makeReport("s3") },
      tierClassification,
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    assert(dashboard.executive_summary.total_correctable_sports === 2, "total_correctable_sports نادرست");
    assert(dashboard.executive_summary.total_medical_holds === 1, "total_medical_holds نادرست");
    assert(containsPersian(dashboard.executive_summary.overall_narrative), "overall_narrative باید فارسی باشد");
  });

  console.log("\n[drivers_summary — نگاشت TopDriver + de-duplication + فیلتر innate]");
  check("نگاشت: magnitude→contribution_magnitude، narrative→short_narrative", () => {
    const reports = {
      s1: makeReport("s1", {
        top_positive_drivers: [
          { driver_id: "d1", category: "anthropometric", magnitude: 15, trainability: "trainable", narrative: "متن د۱", is_correctable: false, correction_info: null, source: "bio" },
        ],
      }),
    };
    const dashboard = renderCoachDashboard(
      reports,
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    const d = dashboard.drivers_summary.top_5_athlete_strengths[0];
    assert(d.contribution_magnitude === 15, "contribution_magnitude نادرست");
    assert(d.short_narrative === "متن د۱", "short_narrative نادرست");
    assert(d.magnitude === undefined && d.narrative === undefined, "فیلدهای داخلی نباید در خروجی باقی بمانند");
  });

  check("همان driver_id در ۲ رشته → فقط یک‌بار در top strengths ظاهر می‌شود (de-dup)", () => {
    const sharedDriver = { driver_id: "shared1", category: "anthropometric", magnitude: 20, trainability: "trainable", narrative: "مشترک", is_correctable: false, correction_info: null, source: "bio" };
    const reports = {
      s1: makeReport("s1", { top_positive_drivers: [sharedDriver] }),
      s2: makeReport("s2", { top_positive_drivers: [sharedDriver] }),
    };
    const dashboard = renderCoachDashboard(
      reports,
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    const matches = dashboard.drivers_summary.top_5_athlete_strengths.filter((d) => d.driver_id === "shared1");
    assert(matches.length === 1, `انتظار ۱ نمونه، گرفتیم ${matches.length}`);
  });

  check("driver منفی با trainability='innate' در areas_to_improve ظاهر نمی‌شود", () => {
    const reports = {
      s1: makeReport("s1", {
        top_negative_drivers: [
          { driver_id: "innate1", category: "anthropometric", magnitude: -30, trainability: "innate", narrative: "ذاتی", is_correctable: false, correction_info: null, source: "bio" },
        ],
      }),
    };
    const dashboard = renderCoachDashboard(
      reports,
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    assert(dashboard.drivers_summary.top_5_athlete_areas_to_improve.length === 0, "نباید driver innate در areas_to_improve باشد");
  });

  check("improvement_potential فقط برای منفی‌های correctable با duration_weeks معلوم ساخته می‌شود", () => {
    const reports = {
      s1: makeReport("s1", {
        top_negative_drivers: [
          {
            driver_id: "postural1",
            category: "postural",
            magnitude: -25,
            trainability: "trainable",
            narrative: "کایفوز",
            is_correctable: true,
            correction_info: { duration_weeks: 12, module_id: null, module_status: "not_yet_linked" },
            source: "postural",
          },
        ],
      }),
    };
    const dashboard = renderCoachDashboard(
      reports,
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    const d = dashboard.drivers_summary.top_5_athlete_areas_to_improve[0];
    assert(d.improvement_potential !== undefined, "باید improvement_potential داشته باشد");
    assert(d.improvement_potential.estimated_time_weeks === 12, "estimated_time_weeks نادرست");
    assert(d.improvement_potential.is_improvable === true, "is_improvable نادرست");
  });

  console.log("\n[corrective_action_plan — تصمیم مهندسی جدید Commit 16: مجموع gain بین رشته‌ها]");
  check("اصلاح مشترک در ۲ رشته → مجموع gain، بالاتر از اصلاح تک‌رشته‌ای بزرگ‌تر رتبه می‌گیرد", () => {
    const sharedStep = { step_id: "fix_shared", driver_id: "shared_fix", description: "اصلاح مشترک", duration_weeks: 8, expected_score_gain: 6, linked_module: null };
    const bigSingleStep = { step_id: "fix_big", driver_id: "big_fix", description: "اصلاح تک‌رشته‌ای بزرگ", duration_weeks: 10, expected_score_gain: 11, linked_module: null };
    const reports = {
      s1: makeReport("s1", { what_if_analysis: { correction_path: [sharedStep] } }),
      s2: makeReport("s2", { what_if_analysis: { correction_path: [sharedStep, bigSingleStep] } }),
    };
    const dashboard = renderCoachDashboard(
      reports,
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    const order = dashboard.corrective_action_plan.priority_order;
    // shared_fix: 6+6=12 (دو رشته)، big_fix: فقط ۱۱ (یک رشته) → shared_fix باید اول باشد
    assert(order[0].step_id === "fix_shared", `انتظار fix_shared اول، گرفتیم ${order[0].step_id}`);
    assertClose(order[0].expected_score_gain, 12, 0.001, "expected_score_gain جمع‌شده نادرست");
    assert(order[1].step_id === "fix_big", "دومی باید fix_big باشد");
  });

  check("action_title از description ساخته می‌شود (چون Commit 13 آن را جداگانه ندارد)", () => {
    const step = { step_id: "fix_x", driver_id: "x", description: "توضیح x", duration_weeks: 5, expected_score_gain: 3, linked_module: null };
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1", { what_if_analysis: { correction_path: [step] } }) },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    assert(dashboard.corrective_action_plan.priority_order[0].action_title === "توضیح x", "action_title نادرست");
  });

  check("linked_engine_sessions همیشه خالی است (هیچ CORR-* واقعی وجود ندارد — Commit 6/7)", () => {
    const step = { step_id: "fix_x", driver_id: "x", description: "x", duration_weeks: 5, expected_score_gain: 3, linked_module: null };
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1", { what_if_analysis: { correction_path: [step] } }) },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    assert(dashboard.corrective_action_plan.linked_engine_sessions.length === 0, "باید خالی باشد");
  });

  check("total_estimated_time_weeks = max(duration های معلوم)، نه sum", () => {
    const step1 = { step_id: "fix_a", driver_id: "a", description: "a", duration_weeks: 8, expected_score_gain: 3, linked_module: null };
    const step2 = { step_id: "fix_b", driver_id: "b", description: "b", duration_weeks: 12, expected_score_gain: 5, linked_module: null };
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1", { what_if_analysis: { correction_path: [step1, step2] } }) },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    assert(dashboard.corrective_action_plan.total_estimated_time_weeks === 12, `انتظار ۱۲ (max)، گرفتیم ${dashboard.corrective_action_plan.total_estimated_time_weeks}`);
  });

  console.log("\n[radar_charts — شکل {labels,values} با اعداد واقعی]");
  check("physical_profile/psychological_profile/top_sport_comparison هر سه شکل {labels,values} دارند با طول برابر", () => {
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1", { final_score: 80 }) },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      basePsychProfile(),
      null
    );
    for (const key of ["physical_profile", "psychological_profile", "top_sport_comparison"]) {
      const chart = dashboard.radar_charts[key];
      assert(Array.isArray(chart.labels) && Array.isArray(chart.values), `${key}: باید labels/values آرایه باشند`);
      assert(chart.labels.length === chart.values.length, `${key}: طول labels/values باید برابر باشد`);
    }
  });

  check("psychological_profile.values دقیقاً از psychProfile ورودی می‌آید", () => {
    const psychProfile = basePsychProfile({ resilience: 5, pressure_tolerance: 5 });
    const dashboard = renderCoachDashboard(
      { s1: makeReport("s1") },
      emptyTierClassification(),
      [],
      baseMaturityProfile(),
      baseRaeAlert(),
      baseNormalizedIntake(),
      psychProfile,
      null
    );
    const idx = dashboard.radar_charts.psychological_profile.labels.indexOf("resilience");
    assert(dashboard.radar_charts.psychological_profile.values[idx] === 5, "مقدار resilience نادرست");
  });

  console.log("\n[renderClientReport — فقط داده، بدون HTML/PDF]");
  check("ساختار کامل client report، medical_notes از medical_hold.reason_narrative", () => {
    const tierClassification = emptyTierClassification();
    tierClassification.tier_M_medical_hold = [
      makeReport("m1", { medical_hold: { reason_narrative: "دلیل پزشکی نمونه" } }),
    ];
    tierClassification.tier_C_correctable = [
      makeReport("c1", { sport_name_fa: "والیبال", what_if_analysis: { estimated_score_if_corrected: 92 } }),
    ];
    const matchReports = { s1: makeReport("s1", { final_score: 85 }), m1: makeReport("m1"), c1: makeReport("c1") };
    const driversSummary = {
      top_5_athlete_strengths: [{ driver_id: "d1", short_narrative: "نقطه‌قوت ۱" }],
      top_5_athlete_areas_to_improve: [],
    };
    const clientReport = renderClientReport(matchReports, tierClassification, baseNormalizedIntake(), driversSummary, "رضا");

    assert(clientReport.athlete_name === "رضا", "athlete_name نادرست");
    assert(typeof clientReport.age === "number", "age باید عدد باشد");
    assert(Array.isArray(clientReport.top_3_ideal_sports), "top_3_ideal_sports باید آرایه باشد");
    assert(clientReport.strengths.includes("نقطه‌قوت ۱"), "strengths نادرست");
    assert(clientReport.correctable_potential_sports[0].sport_name_fa === "والیبال", "correctable_potential_sports نادرست");
    assert(clientReport.correctable_potential_sports[0].estimated_score_if_corrected === 92, "estimated_score_if_corrected نادرست");
    assert(clientReport.medical_notes.includes("دلیل پزشکی نمونه"), "medical_notes نادرست");
    // نباید هیچ رشته‌ی HTML/تگ در خروجی باشد — فقط داده‌ی خام
    assert(!JSON.stringify(clientReport).includes("<"), "نباید هیچ HTML ای در خروجی باشد");
  });

  console.log("\n[═══ REGRESSION GUARD: اجرای کامل بدون throw با چند سناریو ═══]");
  check("چند سناریوی متفاوت (خالی، پر، با medical_hold و whatIf) بدون خطا اجرا می‌شوند و ساختار کامل دارند", () => {
    const scenarios = [
      { reports: { s1: makeReport("s1") }, tier: emptyTierClassification() },
      {
        reports: { s1: makeReport("s1", { final_tier: "A", final_score: 90 }), s2: makeReport("s2", { final_tier: "M", medical_hold: { reason_narrative: "x" } }) },
        tier: (() => {
          const t = emptyTierClassification();
          t.tier_A_golden = [makeReport("s1", { final_tier: "A", final_score: 90 })];
          t.tier_M_medical_hold = [makeReport("s2", { final_tier: "M" })];
          return t;
        })(),
      },
    ];
    let checkedCount = 0;
    for (const scenario of scenarios) {
      checkedCount++;
      const dashboard = renderCoachDashboard(
        scenario.reports,
        scenario.tier,
        [],
        baseMaturityProfile(),
        baseRaeAlert(),
        baseNormalizedIntake(),
        basePsychProfile(),
        null
      );
      for (const key of ["header", "executive_summary", "tiers", "radar_charts", "drivers_summary", "corrective_action_plan", "talent_transfer_summary", "metadata"]) {
        assert(dashboard[key] !== undefined, `کلید "${key}" باید موجود باشد`);
      }
      const clientReport = renderClientReport(scenario.reports, scenario.tier, baseNormalizedIntake(), dashboard.drivers_summary, null);
      assert(clientReport.top_3_ideal_sports !== undefined, "clientReport باید ساختار معتبر داشته باشد");
    }
    assert(checkedCount === scenarios.length, "تعداد سناریوها نادرست است");
    console.log(`     (${checkedCount} سناریو چک شد)`);
  });

  console.log(`\n[test-engine-talentid-file16-reportrenderer] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
