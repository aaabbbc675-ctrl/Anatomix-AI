// اسکریپت End-to-End Integration Tests — Commit 22 (بخش ۱.۱ سند معماری،
// نه بخش ۲۴.۱ که با ۱.۱ ناسازگار بود — رجوع کنید به تحلیل تأییدشده‌ی
// Commit 22). یک فایل با ۵ بخش [caseA] تا [caseE]، هم‌الگوی عادت واقعی این
// پروژه (هر Commit یک اسکریپت، نه چند فایل .test.js پراکنده).
//
// ⚠️ تفاوت این فایل با test-engine-talentid-ui-cascade.js (Commit 21):
// آن فایل فقط شکل خروجی/عدم-throw را چک می‌کند؛ اینجا برای هر سناریو
// محاسبات دستیِ کامل (bio bonus → rescale → weight → tier → whatIf) دنبال
// و با عدد خروجی واقعی pipeline مقایسه می‌شود — با استفاده از توابع
// pure هر فایل به‌عنوان oracle (هم‌الگوی Commit 12/13)، نه بازتولید فرمول
// Mirwald از صفر.
//
// ⚠️ سه باگ end-to-end واقعی حین ساخت همین فایل پیدا و رفع شدند (قبل از
// commit این فایل)، هر سه به این دلیل که یونیت‌تست‌های قبلی همیشه
// normalizedIntake را دستی می‌ساختند، نه از مسیر واقعی rawDevice/rawCoach:
//   ۱) DEVICE_FIELD_PATHS در file1: کلید غلط "skeletal_muscle_mass_kg"
//      به‌جای "smm_percent_of_body_weight" — smm_high هرگز trigger نمی‌شد.
//   ۲) UI فرم (StepPosturalRom.jsx/formShape.js): posture[type] عدد خام
//      بود، نه {severity:N} — هیچ پنالتی پوسچرالی هرگز واقعاً اعمال نمی‌شد.
//   ۳) normalizeMedical در file1: physician_clearance از یک رشته‌ی
//      وضعیت ساده می‌آمد، نه آبجکت ساختاریافته‌ی {cleared_sports,date,notes}
//      که file10 واقعاً نیاز دارد — جریان clearance از هیچ ورودی خامی
//      قابل‌دسترسی نبود.
// هر سه رفع شدند (engine/talentId/file1_intakeInputs.js +
// src/pages/TalentIdAssessment/*) و تست رگرسیون اختصاصی در
// test-engine-talentid-ui-cascade.js اضافه شد.
//
// ⚠️ کلاس A: طبق docs/TODO-tier-a-unreachable.md، با normativeData.json
// فعلی (placeholder، فقط excellent_top_20، بدون elite_top_5) کلاس A با هیچ
// ترکیب واقعی قابل‌دسترسی نیست — سقف ریاضی واقعی ~۸۳.۲۵ است. caseA و caseB
// هر دو صراحتاً «نزدیک‌ترین ممکن به A» (کلاس B) را هدف گرفته‌اند، نه A
// واقعی؛ این یک محدودیت داده است، نه اشتباه در طراحی سناریو.
//
// اجرا: node scripts/test-engine-talentid-e2e-scenarios.js

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
    throw new Error(`${message || "مقدار"}: انتظار ≈${expected} (±${tolerance})، گرفتیم ${actual}`);
  }
}

(async () => {
  const { normalizeIntake } = await import("../engine/talentId/file1_intakeInputs.js");
  const { calculateMaturityProfile } = await import("../engine/talentId/file2_maturityCalculator.js");
  const { calculateBioScores } = await import("../engine/talentId/file4_bioScoreCalculator.js");
  const { computePosturalAdjustments } = await import("../engine/talentId/file5_posturalAdvisoryLayer.js");
  const { computeRomAdjustments } = await import("../engine/talentId/file6_flexibilityROMAdjustments.js");
  const { calculatePerfScores } = await import("../engine/talentId/file7_perfScoreCalculator.js");
  const { defaultNeutralProfile } = await import("../engine/talentId/file8_psychProfileExtractor.js");
  const { calculatePsychScores } = await import("../engine/talentId/file9_psychMatchCalculator.js");
  const { calculateMedicalHolds } = await import("../engine/talentId/file10_medicalConditionalGate.js");
  const { calculateBioBanding, computeRaeAlert } = await import("../engine/talentId/file11_bioBandingAdjuster.js");
  const { generateMatchReports, attachSensitivePeriodNotesToReports } = await import(
    "../engine/talentId/file13_explainabilityEngine.js"
  );
  const { suggestTalentTransfers } = await import("../engine/talentId/file14_talentTransferSuggester.js");
  const { classifyTiers } = await import("../engine/talentId/file15_tierClassifier.js");
  const { renderCoachDashboard, renderClientReport } = await import("../engine/talentId/file16_reportRenderer.js");
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  // طبق کامنت بالای فایل: زنجیره‌ی کامل ۱۶ فایل، دقیقاً هم‌الگوی
  // src/engine/talentIdCascade.js — با این تفاوت که psychProfile را
  // می‌توان تزریق کرد (معادل یک مصاحبه‌ی موفق چت‌بات، نه فقط پروفایل خنثی
  // که cascade واقعی امروز همیشه استفاده می‌کند — رجوع کنید به caseE).
  function runFullPipeline(rawDevice, rawCoach, rawChatbot, psychProfileOverride, athleteName) {
    const normalizedIntake = normalizeIntake(rawDevice, rawCoach, rawChatbot);
    const maturityProfile = calculateMaturityProfile({
      chronological_age_decimal: normalizedIntake.demographics.chronological_age_decimal,
      biological_sex: normalizedIntake.demographics.biological_sex,
      standing_height_cm: normalizedIntake.anthropometrics.standing_height_cm,
      sitting_height_cm: normalizedIntake.anthropometrics.sitting_height_cm,
      leg_length_cm: normalizedIntake.anthropometrics.leg_length_cm,
      weight_kg: normalizedIntake.anthropometrics.weight_kg,
    });
    const psychProfile = psychProfileOverride ?? { ...defaultNeutralProfile(), explicit_interests: normalizedIntake.interests };

    const bioScores = calculateBioScores(sportRequirementMatrix, normalizedIntake);
    const posturalResult = computePosturalAdjustments(normalizedIntake.posture, sportRequirementMatrix);
    const romResult = computeRomAdjustments(normalizedIntake.rom, normalizedIntake.hypermobility, sportRequirementMatrix);
    const perfScores = calculatePerfScores(sportRequirementMatrix, normalizedIntake, maturityProfile.biological_age);
    const psychScores = calculatePsychScores(sportRequirementMatrix, psychProfile);
    const medicalHolds = calculateMedicalHolds(sportRequirementMatrix, normalizedIntake.medical);
    const bioBanded = calculateBioBanding(sportRequirementMatrix, bioScores, perfScores, psychScores, maturityProfile);
    const raeAlertResult = computeRaeAlert(normalizedIntake.demographics.birth_month_shamsi);

    const rawReports = generateMatchReports(sportRequirementMatrix, {
      bioScores,
      posturalResult,
      romResult,
      perfScores,
      psychScores,
      psychProfile,
      medicalHolds,
      maturityProfile,
      bioBanded,
    });
    const matchReports = attachSensitivePeriodNotesToReports(
      rawReports,
      maturityProfile.biological_age,
      normalizedIntake.demographics.biological_sex
    );
    const tierClassification = classifyTiers(matchReports);
    const talentTransferSuggestions = suggestTalentTransfers(matchReports, sportRequirementMatrix);
    const coachDashboard = renderCoachDashboard(
      matchReports,
      tierClassification,
      talentTransferSuggestions,
      maturityProfile,
      raeAlertResult,
      normalizedIntake,
      psychProfile,
      athleteName
    );
    const clientReport = renderClientReport(matchReports, tierClassification, normalizedIntake, coachDashboard.drivers_summary, athleteName);

    return { normalizedIntake, maturityProfile, matchReports, tierClassification, coachDashboard, clientReport };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // [caseA] perfectMatch — سقف واقعی سیستم (کلاس B، نه A — رجوع کنید به
  // docs/TODO-tier-a-unreachable.md). پسر ۱۵ ساله‌ی late_maturer،
  // swimming_general (بیشترین bonus قابل‌stack بدون نیاز به قد)، پروفایل
  // روانی تزریق‌شده دقیقاً منطبق با psych_requirements (معادل مصاحبه‌ی
  // موفق چت‌بات).
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n[caseA_perfectMatch — نزدیک‌ترین ممکن به کلاس A، طبق سقف واقعی داده]");
  {
    const rawDevice = {
      anthropometrics: { standing_height_cm: 150, sitting_height_cm: 80, weight_kg: 40, arm_span_cm: 160, wrist_circumference_cm: 14, shoulder_width_cm: 34, hip_width_cm: 26 },
      // bio bonus دستی: ape_index_high(۱۶۰/۱۵۰=۱.۰۶۷>۱.۰۵)+cormic_high(۸۰/۱۵۰=۰.۵۳۳>۰.۵۳)+tbw_high(۶۲>۶۰)+resting_hr_low(۵۵<۶۵) = ۱۵+۱۵+۱۰+۲۰=۶۰
      body_composition_bia: { body_fat_percent: 12, smm_percent_of_body_weight: 40, total_body_water_percent: 62, fat_free_mass_kg: 30 },
      biometric: { resting_heart_rate_bpm: 55, balance_score_0_to_10: 6, bilateral_weight_asymmetry_percent: 5 },
      posture: {},
      rom_deficits: {},
      hypermobility_detected: false,
    };
    const rawCoach = {
      athlete_id: "caseA",
      date_of_birth: "2010-08-31",
      assessment_date: "2025-08-31",
      biological_sex: "male",
      performance_tests: {
        vertical_jump_cm: [52, 54, 53], // بهترین=۵۴، excellent_top_20 در bio_age_14_15 (آستانه≥۵۲)
        broad_jump_cm: [], sprint_10m_sec: [], sprint_30m_sec: [], agility_5_10_5_sec: [],
        beep_test: { level: null, shuttle: null },
        handgrip_dynamometer_kg: { dominant: [], non_dominant: [] },
        pushups_60sec_count: null, sit_and_reach_cm: null, wall_toss_30sec_count: null,
      },
      medical_history: { active_injuries: [], chronic_conditions: [], pain_scale_current_max_0_to_10: 0, physician_clearance: null },
      family_sport_history: { parent_athletes: false, elite_relatives: false },
    };
    // معادل مصاحبه‌ی موفق چت‌بات: دقیقاً منطبق با swimming_general.psych_requirements.
    const psychProfile = {
      teamwork_score: 1, aggression_contact: 1, focus_patience: 5, pressure_tolerance: 3,
      dynamic_activity: 3, chaos_decision: 2, resilience: 4,
      explicit_interests: ["swimming_general"], extracted_confidence: 0.9,
    };

    const result = runFullPipeline(rawDevice, rawCoach, { explicit_sport_interest: ["swimming_general"] }, psychProfile, "caseA");
    const report = result.matchReports.swimming_general;

    check("maturity_type=late_maturer با فرمول mirwald (نه fallback)", () => {
      assert(result.maturityProfile.maturity_type === "late_maturer");
      assert(result.maturityProfile.formula_used === "mirwald");
    });
    check("bio bonus دستی (ape_index_high+cormic_high+tbw_high+resting_hr_low=۶۰ → final_bio_score=۱۶۰) → پس از late_maturer(×۱.۱۵) و rescale(÷۲): bio_component=۱۶۰×۱.۱۵/۲=۹۲", () => {
      assertClose(report.score_breakdown.bio_component.value, 92, 0.01);
    });
    check("perf سقف ساختاری (excellent_top_20 تنها tier موجود) → final_perf_score رسکیل‌شده منطبق با ۱۱۵×۱.۱۵/۲", () => {
      assertClose(report.score_breakdown.perf_component.value, 66.125, 0.01);
    });
    check("psych_score دقیقاً ۱۰۰ (تطابق کامل تزریق‌شده)", () => {
      assertClose(report.score_breakdown.psych_component.value, 100, 0.01);
    });
    check("bio-banding: late_maturer → factor=۱.۱۵ اعمال شده (بدون نیاز به قد، چون swimming_general تال-استیچر ندارد)", () => {
      assertClose(report.score_breakdown.maturity_adjustment_factor, 1.15, 0.001);
    });
    check("وزن‌ها ۴۰/۴۰/۲۰ (psych confidence≥0.5 + mirwald)", () => {
      assertClose(report.score_breakdown.bio_component.weight, 0.4, 0.001);
      assertClose(report.score_breakdown.perf_component.weight, 0.4, 0.001);
      assertClose(report.score_breakdown.psych_component.weight, 0.2, 0.001);
    });
    check("final_score دقیقاً ۸۳.۲۵ (سقف واقعی سیستم، طبق docs/TODO-tier-a-unreachable.md) → کلاس B", () => {
      assertClose(report.final_score, 83.25, 0.01);
      assert(report.final_tier === "B", `انتظار B بود، گرفتیم ${report.final_tier}`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // [caseB] kyphosisExcluded — قلب اصلی این پروژه: پوسچرال واقعاً امتیاز را
  // کم می‌کند و اصلاحش واقعاً بهبود می‌دهد. weightlifting_olympic، پسر
  // ۱۲.۵ ساله‌ی مرجع Commit 3 (on_time_maturer)، ۳ ناهنجاری پوسچرال شدید
  // هم‌زمان (کایفوز+هایپرلوردوز+اسکولیوز — هر سه از contraindications
  // خودِ weightlifting_olympic) تا گِین اصلاح از آستانه‌ی WHATIF_MIN_GAIN_THRESHOLD=10
  // عبور کند (طبق تصمیم تاییدشده‌ی این Commit).
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n[caseB_kyphosisExcluded — پوسچرال شدید: C، اصلاح → نزدیک‌ترین ممکن به A (B)]");
  {
    const rawDeviceBase = {
      anthropometrics: { standing_height_cm: 155, sitting_height_cm: 78, weight_kg: 45, arm_span_cm: 148, wrist_circumference_cm: 15, shoulder_width_cm: 38, hip_width_cm: 26 },
      body_composition_bia: { body_fat_percent: 14, smm_percent_of_body_weight: 50, total_body_water_percent: 58, fat_free_mass_kg: 32 },
      biometric: { resting_heart_rate_bpm: 70, balance_score_0_to_10: 6, bilateral_weight_asymmetry_percent: 4 },
      rom_deficits: {},
      hypermobility_detected: false,
    };
    const rawCoach = {
      athlete_id: "caseB", date_of_birth: "2013-04-15", assessment_date: "2025-08-31", biological_sex: "male",
      performance_tests: {
        vertical_jump_cm: [40, 42, 41], broad_jump_cm: [], sprint_10m_sec: [], sprint_30m_sec: [], agility_5_10_5_sec: [],
        beep_test: { level: null, shuttle: null },
        handgrip_dynamometer_kg: { dominant: [30, 32, 31], non_dominant: [28, 29, 29] }, // عدم‌تقارن <۲۰٪، handgrip_asymmetry_high عمداً trigger نمی‌شود
        pushups_60sec_count: null, sit_and_reach_cm: null, wall_toss_30sec_count: null,
      },
      medical_history: { active_injuries: [], chronic_conditions: [], pain_scale_current_max_0_to_10: 0, physician_clearance: null },
      family_sport_history: { parent_athletes: false, elite_relatives: false },
    };
    const psychProfile = {
      teamwork_score: 1, aggression_contact: 2, focus_patience: 5, pressure_tolerance: 5,
      dynamic_activity: 2, chaos_decision: 2, resilience: 4,
      explicit_interests: ["weightlifting_olympic"], extracted_confidence: 0.9,
    };

    const baseline = runFullPipeline(
      { ...rawDeviceBase, posture: {} },
      rawCoach,
      { explicit_sport_interest: ["weightlifting_olympic"] },
      psychProfile,
      "caseB"
    );
    const withPostural = runFullPipeline(
      { ...rawDeviceBase, posture: { kyphosis: { severity: 3 }, hyperlordosis: { severity: 3 }, scoliosis: { severity: 3 } } },
      rawCoach,
      { explicit_sport_interest: ["weightlifting_olympic"] },
      psychProfile,
      "caseB"
    );

    const baseReport = baseline.matchReports.weightlifting_olympic;
    const injReport = withPostural.matchReports.weightlifting_olympic;

    check("baseline (بدون مشکل پوسچرال) دقیقاً ۷۰.۰ (کلاس B، مرز)", () => {
      assertClose(baseReport.final_score, 70.0, 0.01);
      assert(baseReport.final_tier === "B");
    });
    check("پنالتی پوسچرال دستی: ۳ ناهنجاری severity=۳ → -۲۵-۲۰-۲۵=-۷۰ (کایفوز-۲۵، هایپرلوردوز-۲۰، اسکولیوز-۲۵)", () => {
      assert(injReport.score_breakdown.postural_rom_penalty_applied.postural === -70);
    });
    check("امتیاز نهایی با پوسچرال دستی: bio_component=(۱۳۵-۷۰)/۲×۰.۴=۱۳، +perf(۲۳)+psych(۲۰)=۵۶.۰ → کلاس C صریح", () => {
      assertClose(injReport.final_score, 56.0, 0.01);
      assert(injReport.final_tier === "C", `انتظار C بود، گرفتیم ${injReport.final_tier}`);
    });
    check("افت امتیاز به‌خاطر پوسچرال دقیقاً ۱۴.۰ است (۷۰.۰ → ۵۶.۰)", () => {
      assertClose(baseReport.final_score - injReport.final_score, 14.0, 0.01);
    });
    check("what_if_analysis موجود است و جهش معنادار (>۱۰، طبق WHATIF_MIN_GAIN_THRESHOLD) به سمت B نشان می‌دهد", () => {
      assert(injReport.what_if_analysis !== undefined, "what_if_analysis نباید undefined باشد");
      assertClose(injReport.what_if_analysis.estimated_score_if_corrected, 70.0, 0.01);
      assert(injReport.what_if_analysis.estimated_tier_if_corrected === "B", "طبق docs/TODO-tier-a-unreachable.md سقف واقعی B است، نه A");
    });
    check("corrective_action_plan.priority_order صراحتاً شامل اصلاح کایفوز (driver_id مشخص) است", () => {
      const stepIds = withPostural.coachDashboard.corrective_action_plan.priority_order.map((s) => s.step_id);
      assert(stepIds.includes("fix_postural.kyphosis.severity_3"), `انتظار fix_postural.kyphosis.severity_3 در ${JSON.stringify(stepIds)}`);
    });
    check("top_negative_drivers شامل هر ۳ driver پوسچرال با magnitude دقیق است", () => {
      const kyphosisDriver = injReport.top_negative_drivers.find((d) => d.driver_id === "postural.kyphosis.severity_3");
      assert(kyphosisDriver && kyphosisDriver.magnitude === -25, "کایفوز باید magnitude=-25 داشته باشد");
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // [caseC] medicalHold — M → clearance → برگشت به تیر واقعی. wrestling_freestyle،
  // active_disc_herniation (high_risk)، سپس physician_clearance برای همین
  // رشته (نه weightlifting_olympic که هم‌زمان high_risk است، برای اثبات
  // اینکه clearance واقعاً per-sport است).
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n[caseC_medicalHold — M → clearance → بازگشت به تیر واقعی (per-sport)]");
  {
    const rawDevice = {
      anthropometrics: { standing_height_cm: 155, sitting_height_cm: 78, weight_kg: 45, arm_span_cm: 152, wrist_circumference_cm: 15, shoulder_width_cm: 38, hip_width_cm: 26 },
      body_composition_bia: { body_fat_percent: 14, smm_percent_of_body_weight: 40, total_body_water_percent: 58, fat_free_mass_kg: 32 },
      biometric: { resting_heart_rate_bpm: 70, balance_score_0_to_10: 6, bilateral_weight_asymmetry_percent: 4 },
      posture: {}, rom_deficits: {}, hypermobility_detected: false,
    };
    function coachWithMedical(medHistory) {
      return {
        athlete_id: "caseC", date_of_birth: "2013-04-15", assessment_date: "2025-08-31", biological_sex: "male",
        performance_tests: {
          vertical_jump_cm: [40, 42, 41], broad_jump_cm: [], sprint_10m_sec: [], sprint_30m_sec: [], agility_5_10_5_sec: [],
          beep_test: { level: null, shuttle: null }, handgrip_dynamometer_kg: { dominant: [], non_dominant: [] },
          pushups_60sec_count: null, sit_and_reach_cm: null, wall_toss_30sec_count: null,
        },
        medical_history: medHistory,
        family_sport_history: { parent_athletes: false, elite_relatives: false },
      };
    }

    const noInjury = runFullPipeline(rawDevice, coachWithMedical({ active_injuries: [], chronic_conditions: [], pain_scale_current_max_0_to_10: 0, physician_clearance: null }), { explicit_sport_interest: [] }, null, "caseC");
    const injuryNoClearance = runFullPipeline(
      rawDevice,
      coachWithMedical({ active_injuries: ["active_disc_herniation"], chronic_conditions: [], pain_scale_current_max_0_to_10: 6, physician_clearance: null }),
      { explicit_sport_interest: [] },
      null,
      "caseC"
    );
    const injuryWithClearance = runFullPipeline(
      rawDevice,
      coachWithMedical({
        active_injuries: ["active_disc_herniation"],
        chronic_conditions: [],
        pain_scale_current_max_0_to_10: 6,
        physician_clearance: { specialist_signed_id: "DR-9", date: "2026-01-15", cleared_sports: ["wrestling_freestyle"], notes: "بازگشت تدریجی مجاز" },
      }),
      { explicit_sport_interest: [] },
      null,
      "caseC"
    );

    check("بدون آسیب: final_tier بر اساس امتیاز واقعی (C) است، medical_hold=null", () => {
      const r = noInjury.matchReports.wrestling_freestyle;
      assert(r.final_tier === "C");
      assert(r.medical_hold === null);
    });
    check("با آسیب (بدون clearance): final_tier='M' صرف‌نظر از امتیاز خام، final_score همان مقدار خام (۵۳.۹۳) باقی می‌ماند", () => {
      const r = injuryNoClearance.matchReports.wrestling_freestyle;
      assert(r.final_tier === "M", `انتظار M بود، گرفتیم ${r.final_tier}`);
      assertClose(r.final_score, 53.93, 0.05);
      assert(r.medical_hold.status === "medical_hold");
    });
    check("با clearance مخصوص wrestling_freestyle: status='clearance_obtained'، final_tier به تیر واقعی (C) برمی‌گردد", () => {
      const r = injuryWithClearance.matchReports.wrestling_freestyle;
      assert(r.medical_hold.status === "clearance_obtained", `انتظار clearance_obtained بود، گرفتیم ${r.medical_hold.status}`);
      assert(r.final_tier === "C", `انتظار C (تیر واقعی بازگشته) بود، گرفتیم ${r.final_tier}`);
      assert(r.medical_hold.clearance_date === "2026-01-15");
      assert(r.medical_hold.clearance_notes === "بازگشت تدریجی مجاز");
    });
    check("clearance فقط per-sport است: weightlifting_olympic (هم‌زمان high_risk برای همین پاتولوژی، ولی cleared نشده) همچنان M می‌ماند", () => {
      const r = injuryWithClearance.matchReports.weightlifting_olympic;
      assert(r.final_tier === "M", `انتظار M بود (چون clear نشده)، گرفتیم ${r.final_tier}`);
      assert(r.medical_hold.status === "medical_hold");
    });
    check("tierClassification.tier_M_medical_hold فقط شامل رشته‌های واقعاً هنوز hold‌شده است (wrestling_freestyle که clear شده نباید باشد)", () => {
      const mIds = injuryWithClearance.tierClassification.tier_M_medical_hold.map((r) => r.sport_id);
      assert(!mIds.includes("wrestling_freestyle"), "wrestling_freestyle نباید در M باشد (clear شده)");
      assert(mIds.includes("weightlifting_olympic"), "weightlifting_olympic باید در M باشد");
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // [caseD] biobandingCorrection — پسر ۱۴.۴ ساله‌ی early_maturer (Mirwald،
  // MO=+۲.۰۴، تولد فروردین → هم RAE alert). مقایسه‌ی همان پروفایل بدنی روی
  // یک رشته‌ی قدرتی (soccer_striker، عضو POWER_SPORTS) در برابر یک رشته‌ی
  // غیرقدرتی (swimming_general) — دقیقاً نشان می‌دهد تعدیل بیوبندینگ فقط
  // برای رشته‌های قدرتی منفی است.
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n[caseD_biobandingCorrection — early_maturer: تعدیل منفی فقط روی رشته‌ی قدرتی]");
  {
    const rawDevice = {
      anthropometrics: { standing_height_cm: 192, sitting_height_cm: 98, weight_kg: 70, arm_span_cm: 195, wrist_circumference_cm: 17, shoulder_width_cm: 44, hip_width_cm: 28 },
      body_composition_bia: { body_fat_percent: 10, smm_percent_of_body_weight: 48, total_body_water_percent: 60, fat_free_mass_kg: 55 },
      biometric: { resting_heart_rate_bpm: 60, balance_score_0_to_10: 8, bilateral_weight_asymmetry_percent: 3 },
      posture: {}, rom_deficits: {}, hypermobility_detected: false,
    };
    const rawCoach = {
      athlete_id: "caseD", date_of_birth: "2011-04-01", assessment_date: "2025-08-31", biological_sex: "male",
      performance_tests: {
        vertical_jump_cm: [40, 42, 41], broad_jump_cm: [], sprint_10m_sec: [], sprint_30m_sec: [], agility_5_10_5_sec: [],
        beep_test: { level: null, shuttle: null }, handgrip_dynamometer_kg: { dominant: [], non_dominant: [] },
        pushups_60sec_count: null, sit_and_reach_cm: null, wall_toss_30sec_count: null,
      },
      medical_history: { active_injuries: [], chronic_conditions: [], pain_scale_current_max_0_to_10: 0, physician_clearance: null },
      family_sport_history: { parent_athletes: false, elite_relatives: false },
    };

    const result = runFullPipeline(rawDevice, rawCoach, { explicit_sport_interest: [] }, null, "caseD");

    check("maturity_type=early_maturer با فرمول mirwald، MO≈+۲.۰۴", () => {
      assert(result.maturityProfile.maturity_type === "early_maturer");
      assert(result.maturityProfile.formula_used === "mirwald");
      assertClose(result.maturityProfile.maturity_offset, 2.0363, 0.01);
    });
    check("RAE alert فعال است (تولد فروردین، سه‌ماهه‌ی اول)", () => {
      assert(result.coachDashboard.header.rae_alert !== null);
      assert(result.coachDashboard.header.rae_alert.month_name_fa === "فروردین");
    });
    check("soccer_striker (POWER_SPORTS): factor=۰.۹ (-۱۰٪) اعمال شده", () => {
      const r = result.matchReports.soccer_striker;
      assertClose(r.score_breakdown.maturity_adjustment_factor, 0.9, 0.001);
    });
    check("swimming_general (غیرقدرتی): factor=۱.۰ (بدون تعدیل) با همان پروفایل بدنیِ ورزشکار", () => {
      const r = result.matchReports.swimming_general;
      assertClose(r.score_breakdown.maturity_adjustment_factor, 1.0, 0.001);
    });
    check("coach_narrative برای soccer_striker (بلوغ زودرس) شامل هشدار صریح maturity_type است", () => {
      // یافته‌ی جانبی: bio_banding.drivers (شامل driver_id="bio_banding.early_maturer")
      // جزو ۵ منبع normalizedDrivers در file13 نیست (فقط bio/postural/rom/perf/psych) —
      // پس در top_negative_drivers ظاهر نمی‌شود؛ اثرش فقط از طریق factor عددی
      // (چک بالا) و narrative منتقل می‌شود، نه یک driver مجزا.
      const r = result.matchReports.soccer_striker;
      assert(r.coach_narrative.includes("زودرس") || r.coach_narrative.includes("early"), "coach_narrative باید هشدار early_maturer داشته باشد");
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // [caseE] lowDataQuality — پروفایل روانی خنثی (defaultNeutralProfile،
  // extracted_confidence=۰) باید وزن‌ها را به ۴۵/۴۵/۱۰ تغییر دهد (نه
  // ۴۰/۴۰/۲۰ پیش‌فرض) — طبق منبع سند بخش ۲۴.۱ (caseD_lowDataQuality)،
  // اضافه‌شده به لیست ۴تایی بخش ۱.۱ چون سناریوی واقعاً جدیدی است.
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n[caseE_lowDataQuality — پروفایل روانی خنثی → وزن ۴۵/۴۵/۱۰ به‌جای ۴۰/۴۰/۲۰]");
  {
    const rawDevice = {
      anthropometrics: { standing_height_cm: 155, sitting_height_cm: 78, weight_kg: 45, arm_span_cm: 148, wrist_circumference_cm: 15, shoulder_width_cm: 38, hip_width_cm: 26 },
      body_composition_bia: { body_fat_percent: 14, smm_percent_of_body_weight: 50, total_body_water_percent: 58, fat_free_mass_kg: 32 },
      biometric: { resting_heart_rate_bpm: 70, balance_score_0_to_10: 6, bilateral_weight_asymmetry_percent: 4 },
      posture: {}, rom_deficits: {}, hypermobility_detected: false,
    };
    const rawCoach = {
      athlete_id: "caseE", date_of_birth: "2013-04-15", assessment_date: "2025-08-31", biological_sex: "male",
      performance_tests: {
        vertical_jump_cm: [40, 42, 41], broad_jump_cm: [], sprint_10m_sec: [], sprint_30m_sec: [], agility_5_10_5_sec: [],
        beep_test: { level: null, shuttle: null }, handgrip_dynamometer_kg: { dominant: [], non_dominant: [] },
        pushups_60sec_count: null, sit_and_reach_cm: null, wall_toss_30sec_count: null,
      },
      medical_history: { active_injuries: [], chronic_conditions: [], pain_scale_current_max_0_to_10: 0, physician_clearance: null },
      family_sport_history: { parent_athletes: false, elite_relatives: false },
    };
    const highConfidencePsych = {
      teamwork_score: 1, aggression_contact: 2, focus_patience: 5, pressure_tolerance: 5,
      dynamic_activity: 2, chaos_decision: 2, resilience: 4,
      explicit_interests: [], extracted_confidence: 0.9,
    };

    const highConf = runFullPipeline(rawDevice, rawCoach, { explicit_sport_interest: [] }, highConfidencePsych, "caseE");
    // psychProfileOverride=null → runFullPipeline خودش defaultNeutralProfile می‌سازد
    // (دقیقاً هم‌الگوی src/engine/talentIdCascade.js واقعی — این تنها caseی است که
    // مسیر واقعی امروزِ UI را عیناً بازتولید می‌کند، نه یک پروفایل تزریق‌شده‌ی فرضی).
    const lowConf = runFullPipeline(rawDevice, rawCoach, { explicit_sport_interest: [] }, null, "caseE");

    const highReport = highConf.matchReports.weightlifting_olympic;
    const lowReport = lowConf.matchReports.weightlifting_olympic;

    check("پروفایل با اطمینان بالا (۰.۹): وزن‌ها ۴۰/۴۰/۲۰", () => {
      assertClose(highReport.score_breakdown.bio_component.weight, 0.4, 0.001);
      assertClose(highReport.score_breakdown.psych_component.weight, 0.2, 0.001);
    });
    check("پروفایل خنثی (defaultNeutralProfile، اطمینان=۰): وزن‌ها ۴۵/۴۵/۱۰", () => {
      assertClose(lowReport.score_breakdown.bio_component.weight, 0.45, 0.001);
      assertClose(lowReport.score_breakdown.perf_component.weight, 0.45, 0.001);
      assertClose(lowReport.score_breakdown.psych_component.weight, 0.1, 0.001);
    });
    check("همان bio/perf خام، وزن متفاوت → final_score متفاوت (۷۰.۰ در برابر ۶۲.۳۴۳۷۵)", () => {
      assertClose(highReport.final_score, 70.0, 0.01);
      assertClose(lowReport.final_score, 62.34375, 0.01);
    });
    check("علت دقیق تفاوت: psych_component خنثی (۶۰.۹۳۷۵، delta واقعی) در برابر تزریق‌شده (۱۰۰)، به‌علاوه‌ی وزن کمتر (۰.۱ در برابر ۰.۲)", () => {
      assertClose(lowReport.score_breakdown.psych_component.value, 60.9375, 0.01);
      assertClose(highReport.score_breakdown.psych_component.value, 100, 0.01);
    });
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`نتیجه: ${passCount} PASS, ${failCount} FAIL`);
  if (failCount > 0) process.exit(1);
})();
