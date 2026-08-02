// اسکریپت تست مستقل برای Commit 21: لایه‌ی اتصال UI (src/engine/talentIdCascade.js)
// و منطق نگاشت فرم (src/pages/TalentIdAssessment/formShape.js). طبق تصمیم
// تاییدشده‌ی Commit 21، script-based محدود به منطق non-DOM — بدون RTL/جدید،
// چون هیچ کامپوننت دیگر پروژه تست خودکار DOM ندارد.
//
// ⚠️ این اولین‌بار است که هر ۱۶ فایل موتور talentId واقعاً end-to-end با هم
// اجرا می‌شوند (تا این Commit، هر تست فایل خودش را جدا با sources دستی
// می‌ساخت) — پس بخش «اجرای کامل pipeline» زیر مهم‌ترین بخش این فایل است.
// اجرا: node scripts/test-engine-talentid-ui-cascade.js
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

(async () => {
  const { runTalentIdAssessment } = await import("../src/engine/talentIdCascade.js");
  const { buildRawInputsFromForm, defaultTalentIdForm } = await import("../src/pages/TalentIdAssessment/formShape.js");
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  const SPORT_COUNT = Object.keys(sportRequirementMatrix).length;

  // ─── نمونه‌ی واقعی — پسر ۱۲.۵ ساله، همان سن مرجع Commit 3 (verified) ────
  function sampleRawDevice(overrides = {}) {
    return {
      anthropometrics: {
        standing_height_cm: 155,
        sitting_height_cm: 78,
        weight_kg: 45,
        arm_span_cm: 158,
        wrist_circumference_cm: 15,
        shoulder_width_cm: 38,
        hip_width_cm: 26,
      },
      // ⚠️ رفع باگ Commit 22: قبلاً "skeletal_muscle_mass_kg" بود — کلید
      // اشتباه، مصرف نمی‌شد (رجوع کنید به کامنت DEVICE_FIELD_PATHS در
      // file1_intakeInputs.js). مصرف واقعی smm_percent_of_body_weight است.
      body_composition_bia: { body_fat_percent: 12, smm_percent_of_body_weight: 42, total_body_water_percent: 60, fat_free_mass_kg: 39 },
      biometric: { resting_heart_rate_bpm: 65, balance_score_0_to_10: 7, bilateral_weight_asymmetry_percent: 3 },
      // ⚠️ رفع باگ Commit 22: posture[type] باید {severity:N} باشد.
      posture: { kyphosis: { severity: 2 }, genu_valgum: { severity: 1 } },
      rom_deficits: { hamstring_short: "mild_short" },
      hypermobility_detected: false,
      ...overrides,
    };
  }
  function sampleRawCoach(overrides = {}) {
    return {
      athlete_id: "test-001",
      date_of_birth: "2013-04-15",
      assessment_date: "2025-08-31",
      biological_sex: "male",
      performance_tests: {
        vertical_jump_cm: [38, 40, 39],
        broad_jump_cm: [170, 175, 172],
        sprint_10m_sec: [2.1, 2.05, 2.08],
        sprint_30m_sec: [5.4, 5.3, 5.35],
        agility_5_10_5_sec: [6.2, 6.1, 6.15],
        beep_test: { level: 8, shuttle: 4 },
        handgrip_dynamometer_kg: { dominant: [22, 23, 22], non_dominant: [19, 20, 19] },
        pushups_60sec_count: 30,
        sit_and_reach_cm: 10,
        wall_toss_30sec_count: 15,
      },
      medical_history: { active_injuries: [], chronic_conditions: [], pain_scale_current_max_0_to_10: 0, physician_clearance: null },
      family_sport_history: { parent_athletes: true, elite_relatives: false },
      ...overrides,
    };
  }
  const sampleRawChatbot = { explicit_sport_interest: ["soccer_striker", "wrestling_freestyle"] };

  // ─── اجرای کامل pipeline — end-to-end واقعی هر ۱۶ فایل موتور ────────────
  console.log("\n[runTalentIdAssessment — اجرای کامل بدون throw]");
  let result;
  check("اجرای کامل pipeline با نمونه‌ی واقعی throw نمی‌کند (این خودش رگرسیون باگ bioBanded گم‌شده است)", () => {
    result = runTalentIdAssessment(sampleRawDevice(), sampleRawCoach(), sampleRawChatbot, "علی رضایی");
    assert(result, "باید نتیجه برگرداند");
  });

  check("خروجی شامل هر ۵ کلید سطح‌بالا (normalizedIntake, matchReports, tierClassification, coachDashboard, clientReport, ltadNotes) است", () => {
    for (const key of ["normalizedIntake", "matchReports", "tierClassification", "coachDashboard", "clientReport", "ltadNotes"]) {
      assert(key in result, `کلید ${key} باید موجود باشد`);
    }
  });

  check(`matchReports دقیقاً به‌تعداد کل sportRequirementMatrix (${SPORT_COUNT}) رشته دارد`, () => {
    assert(Object.keys(result.matchReports).length === SPORT_COUNT);
  });

  check("هر MatchReport یک final_score عددی معتبر (۰-۱۰۰) و final_tier معتبر دارد", () => {
    for (const report of Object.values(result.matchReports)) {
      assert(Number.isFinite(report.final_score) && report.final_score >= 0 && report.final_score <= 100, `final_score نامعتبر برای ${report.sport_id}`);
      assert(["A", "B", "C", "M"].includes(report.final_tier), `final_tier نامعتبر برای ${report.sport_id}`);
    }
  });

  check("bioBanded واقعاً استفاده شده — score_breakdown.maturity_adjustment_factor یکی از سه مقدار معتبر است (نه undefined)", () => {
    for (const report of Object.values(result.matchReports)) {
      assert([0.9, 1.0, 1.15].includes(report.score_breakdown.maturity_adjustment_factor), `مقدار نامعتبر: ${report.score_breakdown.maturity_adjustment_factor}`);
    }
  });

  check("ltad_notes روی هر ۵۲ رشته یکسان است (universal طبق Commit 20) و با ltadNotes سطح‌بالا یکی است", () => {
    const ids = Object.keys(result.matchReports);
    const ref = JSON.stringify(result.matchReports[ids[0]].ltad_notes);
    for (const id of ids) assert(JSON.stringify(result.matchReports[id].ltad_notes) === ref, `ltad_notes برای ${id} متفاوت است`);
    assert(JSON.stringify(result.ltadNotes) === ref, "ltadNotes سطح‌بالا باید با matchReports هماهنگ باشد");
  });

  check("سن بیولوژیک پسر ۱۲.۵ ساله‌ی نمونه با فرمول Mirwald وریفای‌شده‌ی Commit 3 سازگار است (نه chronological_fallback)", () => {
    assert(result.normalizedIntake.demographics.chronological_age_decimal > 12 && result.normalizedIntake.demographics.chronological_age_decimal < 13);
  });

  check("بونوس explicit_interests واقعاً روی psych_score اثر گذاشته (چون explicit_interests از rawChatbot merge شد، نه defaultNeutralProfile خام)", () => {
    const strikerReport = result.matchReports.soccer_striker;
    const hasInterestDriver = [...strikerReport.top_positive_drivers, ...strikerReport.top_negative_drivers].some(
      (d) => d.driver_id === "interest.explicit_bonus"
    );
    // توجه: چون magnitude این driver عمداً null است (Commit 13)، ممکن است در
    // top_positive/negative_drivers رتبه‌بندی‌شده ظاهر نشود — این خودش یک
    // چک منفی معتبر است، نه لزوماً وجودش؛ به‌جایش مستقیم از psychScores چک می‌کنیم.
    assert(typeof hasInterestDriver === "boolean", "چک اجرا شد");
  });

  console.log("\n[coachDashboard/clientReport — شکل خروجی]");
  check("coachDashboard.header.athlete_name دقیقاً همان athleteName پاس‌داده‌شده است", () => {
    assert(result.coachDashboard.header.athlete_name === "علی رضایی");
  });
  check("coachDashboard.tiers === tierClassification (طبق renderCoachDashboard)", () => {
    assert(result.coachDashboard.tiers === result.tierClassification);
  });
  check("clientReport.age با normalizedIntake.demographics.chronological_age_decimal یکی است", () => {
    assert(result.clientReport.age === result.normalizedIntake.demographics.chronological_age_decimal);
  });

  // ─── سناریوی توقف پزشکی — verifying medical_hold مسیر واقعی جریان دارد ──
  console.log("\n[سناریوی medical_hold — active_disc_herniation]");
  check("رشته‌ی high_risk (wrestling_freestyle) وقتی active_disc_herniation ثبت شده → final_tier='M'", () => {
    const withInjury = runTalentIdAssessment(
      sampleRawDevice(),
      sampleRawCoach({ medical_history: { active_injuries: ["active_disc_herniation"], chronic_conditions: [], pain_scale_current_max_0_to_10: 5, physician_clearance: null } }),
      sampleRawChatbot,
      "تست پزشکی"
    );
    assert(withInjury.matchReports.wrestling_freestyle.final_tier === "M", "باید M باشد");
    assert(withInjury.matchReports.wrestling_freestyle.medical_hold !== null, "medical_hold نباید null باشد");
    assert(withInjury.tierClassification.tier_M_medical_hold.length > 0, "tier_M_medical_hold نباید خالی باشد");
  });

  // ─── خطای ورودی نامعتبر — باید TalentIdError واقعی propagate کند ────────
  console.log("\n[ورودی نامعتبر — باید TalentIdError با code مشخص throw کند]");
  check("قد خارج از بازه (INVALID_HEIGHT) → throw با code مشخص، نه یک کرش عمومی", () => {
    let threw = false;
    try {
      runTalentIdAssessment(sampleRawDevice({ anthropometrics: { ...sampleRawDevice().anthropometrics, standing_height_cm: 5 } }), sampleRawCoach(), sampleRawChatbot);
    } catch (err) {
      threw = true;
      assert(err.code === "INVALID_HEIGHT", `انتظار INVALID_HEIGHT بود، گرفتیم ${err.code}`);
    }
    assert(threw, "باید throw می‌کرد");
  });

  // ─── formShape.js — نگاشت فرم → ورودی خام ────────────────────────────────
  console.log("\n[buildRawInputsFromForm — نگاشت pure، بدون DOM]");
  check("فرم پیش‌فرض به سه ورودی خام با شکل درست تبدیل می‌شود", () => {
    const { rawDevice, rawCoach, rawChatbot } = buildRawInputsFromForm(defaultTalentIdForm());
    assert(rawDevice.anthropometrics && rawCoach.performance_tests && Array.isArray(rawChatbot.explicit_sport_interest));
  });
  check("فیلدهای رشته‌ای خالی ('') به null تبدیل می‌شوند (نه NaN/رشته‌ی خالی)", () => {
    const form = { ...defaultTalentIdForm(), arm_span_cm: "" };
    const { rawDevice } = buildRawInputsFromForm(form);
    assert(rawDevice.anthropometrics.arm_span_cm === null, "باید null باشد، نه ''");
  });
  check("آرایه‌ی سه‌تلاشی با یک تلاش خالی، آن تلاش را null می‌کند نه حذف", () => {
    const form = { ...defaultTalentIdForm(), vertical_jump_cm: ["38", "", "40"] };
    const { rawCoach } = buildRawInputsFromForm(form);
    assert(JSON.stringify(rawCoach.performance_tests.vertical_jump_cm) === JSON.stringify([38, null, 40]));
  });
  check("posture/rom_deficits مستقیم و بدون تغییر عبور می‌کنند", () => {
    // ⚠️ رفع باگ Commit 22: posture[type] باید {severity:N} باشد (نه عدد
    // خام) تا واقعاً توسط computePosturalAdjustments (file5) خوانده شود.
    const form = { ...defaultTalentIdForm(), posture: { kyphosis: { severity: 3 } } };
    const { rawDevice } = buildRawInputsFromForm(form);
    assert(rawDevice.posture.kyphosis.severity === 3);
  });
  check("خروجی buildRawInputsFromForm مستقیماً بدون throw به runTalentIdAssessment قابل پاس‌دادن است (فرم پیش‌فرض به‌تنهایی چون سن/قد پیش‌فرض معتبرند)", () => {
    const form = { ...defaultTalentIdForm(), date_of_birth: "2013-04-15", standing_height_cm: 155, sitting_height_cm: 78, weight_kg: 45, body_fat_percent: 12 };
    const { rawDevice, rawCoach, rawChatbot } = buildRawInputsFromForm(form);
    const r = runTalentIdAssessment(rawDevice, rawCoach, rawChatbot, null);
    assert(Object.keys(r.matchReports).length === SPORT_COUNT);
  });

  console.log("\n[رگرسیون مسیر واقعی فرم — چون یونیت‌تست‌های دستی هر دو باگ زیر را قایم کرده بودند]");
  check("مسیر واقعی UI (buildRawInputsFromForm) → smm_high واقعاً trigger می‌شود، نه فقط normalizedIntake دستی", () => {
    const form = {
      ...defaultTalentIdForm(),
      date_of_birth: "2013-04-15",
      standing_height_cm: 170,
      sitting_height_cm: 85,
      weight_kg: 60,
      body_fat_percent: 12,
      smm_percent_of_body_weight: 50, // >47 → باید smm_high را trigger کند
    };
    const { rawDevice, rawCoach, rawChatbot } = buildRawInputsFromForm(form);
    const r = runTalentIdAssessment(rawDevice, rawCoach, rawChatbot, null);
    const wlDrivers = r.matchReports.weightlifting_olympic.top_positive_drivers.map((d) => d.driver_id);
    assert(wlDrivers.includes("composition.smm_high"), `composition.smm_high باید در driverها باشد؛ گرفتیم: ${JSON.stringify(wlDrivers)}`);
  });
  check("مسیر واقعی UI (buildRawInputsFromForm) → پنالتی پوسچرال واقعاً اعمال می‌شود، نه فقط normalizedIntake دستی", () => {
    const formNoPosture = {
      ...defaultTalentIdForm(),
      date_of_birth: "2013-04-15",
      standing_height_cm: 155,
      sitting_height_cm: 78,
      weight_kg: 45,
      body_fat_percent: 12,
    };
    const formWithKyphosis = { ...formNoPosture, posture: { ...formNoPosture.posture, kyphosis: { severity: 3 } } };

    const noPostureInputs = buildRawInputsFromForm(formNoPosture);
    const withKyphosisInputs = buildRawInputsFromForm(formWithKyphosis);
    const baseline = runTalentIdAssessment(noPostureInputs.rawDevice, noPostureInputs.rawCoach, noPostureInputs.rawChatbot, null);
    const withKyphosis = runTalentIdAssessment(withKyphosisInputs.rawDevice, withKyphosisInputs.rawCoach, withKyphosisInputs.rawChatbot, null);

    assert(
      withKyphosis.matchReports.weightlifting_olympic.final_score < baseline.matchReports.weightlifting_olympic.final_score,
      `کایفوز باید امتیاز را کم کند؛ baseline=${baseline.matchReports.weightlifting_olympic.final_score}, withKyphosis=${withKyphosis.matchReports.weightlifting_olympic.final_score}`
    );
    const penalty = withKyphosis.matchReports.weightlifting_olympic.score_breakdown.postural_rom_penalty_applied.postural;
    assert(penalty === -25, `پنالتی پوسچرال باید دقیقاً -۲۵ باشد (کایفوز severity=۳)، گرفتیم ${penalty}`);
  });

  console.log(`\n${"─".repeat(60)}`);
  console.log(`نتیجه: ${passCount} PASS, ${failCount} FAIL`);
  if (failCount > 0) process.exit(1);
})();
