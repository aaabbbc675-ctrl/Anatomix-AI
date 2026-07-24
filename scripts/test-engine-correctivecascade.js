// اسکریپت تست مستقل برای src/engine/correctiveCascade.js (پل renderer برای
// Stage1 اصلاحی — هم‌الگوی محل تست bodybuildingCascade.js نبودنش: این پل
// چون فقط توابع خالص موتور را پشت‌سرهم صدا می‌زند، مستقیماً با Node قابل‌تست
// است، بدون نیاز به Electron/DOM).
// اجرا: node scripts/test-engine-correctivecascade.js

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

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message || "deep-equal mismatch"} — actual: ${a}, expected: ${e}`);
  }
}

// شکل خروجی دقیقاً همان buildCorrectiveAssessment در CorrectiveAssessmentForm.jsx.
function baseAssessment(overrides = {}) {
  return {
    assessmentData: null,
    userLevel: "Beginner",
    bodybuildingRequest: false,
    workoutDaysPerWeek: 3,
    coachPrioritizedDeformities: [],
    deformitiesForFunnel: [],
    manualBlacklistExercises: [],
    generalNotes: "",

    diseases: [],
    onDialysis: false,
    hasFistula: false,
    isDialysisDayToday: false,
    hasCardiacCondition: false,

    age: 25,

    restingHr: null,
    bmi: null,

    hasSShapeDeformity: false,
    affectedSide: "Unknown",
    coreStabilizationExerciseIds: [],

    availableEquipment: [],
    totalAllowedMinutes: 60,
    setsPerExercise: 3,
    executionSecPerSet: 40,
    restSecPerSet: 90,

    userContraindications: [],
    activeInjuriesCount: 0,
    deformitiesCount: 0,

    ...overrides,
  };
}

(async () => {
  const { computeCorrectivePrescription } = await import("../src/engine/correctiveCascade.js");

  console.log("\n[معماری پایه — بدون بیماری/آسیب/سالمندی]");
  check("بدون آسیب فعال → architectureType=cex_4_phase، بدون حالت پزشکی", () => {
    const result = computeCorrectivePrescription(baseAssessment());
    assert(result.architectureType === "cex_4_phase");
    assert(result.sessionArchitecture.medicalModeActive === false);
    assert(result.ageAdjustment.ageGroup === "adult");
    assert(result.diseaseManagement.hard_stop === false);
  });

  check("با آسیب فعال (activeInjuriesCount>0) → architectureType=injured_4_block", () => {
    const result = computeCorrectivePrescription(baseAssessment({ activeInjuriesCount: 1 }));
    assert(result.architectureType === "injured_4_block");
  });

  console.log("\n[بیماری واقعی — حالت پزشکی و patch واقعی از file4]");
  check("دیابت → medicalModeActive=true، banned_tags شامل unilateral_balance، هشدار کربوهیدرات", () => {
    const result = computeCorrectivePrescription(baseAssessment({ diseases: ["diabetes"], hasCardiacCondition: false }));
    assert(result.sessionArchitecture.medicalModeActive === true);
    assert(result.diseaseManagement.banned_tags.includes("unilateral_balance"));
    assert(result.diseaseManagement.warnings.some((w) => w.includes("کربوهیدرات")));
    assert(result.sessionArchitecture.warmupMinutes === 10, "بدون قلبی → گرم‌کردن ۱۰ دقیقه");
  });

  check("بیماری قلبی/فشارخون → warmupMinutes=12 (قلبی)، isometricPauseMustBeZero=true", () => {
    const result = computeCorrectivePrescription(
      baseAssessment({ diseases: ["heartOrHypertension"], hasCardiacCondition: true })
    );
    assert(result.sessionArchitecture.warmupMinutes === 12);
    assert(result.diseaseManagement.isometricPauseMustBeZero === true);
    assert(result.tempoVeto.allIsometricPausesZero === true, "applyTempoVeto باید از diseasePatch واقعی این را ببیند");
  });

  console.log("\n[hard_stop واقعی — روز دیالیز]");
  check("kidneyDisease + onDialysis + isDialysisDayToday → hard_stop=true با دلیل واقعی", () => {
    const result = computeCorrectivePrescription(
      baseAssessment({ diseases: ["kidneyDisease"], onDialysis: true, isDialysisDayToday: true })
    );
    assert(result.diseaseManagement.hard_stop === true);
    assert(result.diseaseManagement.hard_stop_reasons.some((r) => r.includes("دیالیز")));
  });

  console.log("\n[سالمندی — تنظیمات سنی واقعی از file5]");
  check("سن ۶۵ + پارامترهای سالمند → ageGroup=elderly، isometricPauseMustBeZero از سن (نه بیماری)", () => {
    const result = computeCorrectivePrescription(
      baseAssessment({
        age: 65,
        elderlyExperienceLevel: "beginner",
        elderlyTrainingFocus: "endurance",
        elderlyMovementType: "isolated",
      })
    );
    assert(result.ageAdjustment.ageGroup === "elderly");
    assert(result.diseaseManagement.isometricPauseMustBeZero === false, "بدون بیماری، این فیلد از بیماری نباید true باشد");
    assert(result.tempoVeto.allIsometricPausesZero === true, "اما از ageAdjustment باید true بیاید");
  });

  console.log("\n[هوازی — اختیاری‌بودن واقعی restingHr/bmi]");
  check("restingHr=null (وارد نشده) → aerobicFitnessDrop=null، بدون throw", () => {
    const result = computeCorrectivePrescription(baseAssessment({ restingHr: null }));
    assert(result.aerobicFitnessDrop === null);
    assert(result.obesityHighHeartRate === null);
  });

  check("restingHr=90 (>۸۰) → aerobicFitnessDrop.restricted=true با اعداد واقعی file6", () => {
    const result = computeCorrectivePrescription(baseAssessment({ restingHr: 90 }));
    assert(result.aerobicFitnessDrop.restricted === true);
    assert(result.aerobicFitnessDrop.startingDurationMinutes === 10);
    assert(result.aerobicFitnessDrop.durationCapMinutes === 20);
  });

  check("bmi=27 و restingHr=85 (هر دو هم‌زمان) → obesityHighHeartRate.triggered=true", () => {
    const result = computeCorrectivePrescription(baseAssessment({ bmi: 27, restingHr: 85 }));
    assert(result.obesityHighHeartRate.triggered === true);
    assertDeepEqual(result.obesityHighHeartRate.banned_tags, ["High_Impact", "Jumping"]);
  });

  console.log("\n[سندرم ترکیبی — detectCompoundSyndromes واقعی روی coachPrioritizedDeformities]");
  check("forward_head+rounded_shoulders+kyphosis → سندرم متقاطع فوقانی تشخیص داده می‌شود", () => {
    const result = computeCorrectivePrescription(
      baseAssessment({
        coachPrioritizedDeformities: ["forward_head", "rounded_shoulders", "kyphosis"],
        deformitiesForFunnel: [
          { id: "forward_head", priorityCategory: "spine_pelvis" },
          { id: "rounded_shoulders", priorityCategory: "big_joints" },
          { id: "kyphosis", priorityCategory: "spine_pelvis" },
        ],
      })
    );
    assertDeepEqual(result.detectedSyndromes, ["upper_crossed_syndrome"]);
  });

  console.log("\n[✗ حذف ناهنجاری — همان چیزی که دکمه‌ی UI باید واقعاً تغییر بدهد]");
  check("۵ ناهنجاری (قیف فعال) → حذف واقعی یکی قبل از فراخوانی applyDeformityFunnel → قیف غیرفعال می‌شود", () => {
    const fiveDeformities = [
      { id: "d1", priorityCategory: "spine_pelvis" },
      { id: "d2", priorityCategory: "spine_pelvis" },
      { id: "d3", priorityCategory: "big_joints" },
      { id: "d4", priorityCategory: "big_joints" },
      { id: "d5", priorityCategory: "chain_end" },
    ];

    const before = computeCorrectivePrescription(
      baseAssessment({
        coachPrioritizedDeformities: fiveDeformities.map((d) => d.id),
        deformitiesForFunnel: fiveDeformities,
      })
    );
    assert(before.deformityFunnel.funnelActive === true, "با ۵ ناهنجاری قیف باید فعال باشد");
    assertDeepEqual(
      before.deformityFunnel.homeworkOnlyDeformities.map((d) => d.id),
      ["d5"]
    );

    // دقیقاً همان کاری که removeDeformity در CorrectiveStageOneGate.jsx انجام
    // می‌دهد: حذف از هر دو فیلد، قبل از فراخوانی مجدد computeCorrectivePrescription.
    const remainingIds = fiveDeformities.map((d) => d.id).filter((id) => id !== "d5");
    const after = computeCorrectivePrescription(
      baseAssessment({
        coachPrioritizedDeformities: remainingIds,
        deformitiesForFunnel: fiveDeformities.filter((d) => d.id !== "d5"),
      })
    );
    assert(after.deformityFunnel.funnelActive === false, "بعد از حذف یکی (۴ باقی‌مانده) قیف باید غیرفعال شود");
    assertDeepEqual(
      after.deformityFunnel.slotDeformities.map((d) => d.id).sort(),
      ["d1", "d2", "d3", "d4"]
    );
    assertDeepEqual(after.deformityFunnel.homeworkOnlyDeformities, []);
  });

  console.log("\n[ظرفیت جلسه — computeSessionCapacity واقعی]");
  check("بدون بیماری/هوازی → warmup=aerobic=cooldown=0 (تصمیم مستند)، اعداد واقعی محاسبه می‌شوند", () => {
    const result = computeCorrectivePrescription(baseAssessment({ totalAllowedMinutes: 60 }));
    assert(result.sessionCapacity.mainWorkoutMinutes === 60);
    // 60 دقیقه = 3600 ثانیه؛ هر حرکت = 3*40 + 3*90 = 390 ثانیه → floor(3600/390) = 9
    assert(result.sessionCapacity.maxExerciseCount === 9);
  });

  console.log(`\n[test-engine-correctivecascade] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
