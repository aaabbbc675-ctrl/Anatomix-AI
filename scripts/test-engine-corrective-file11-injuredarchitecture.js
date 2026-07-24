// اسکریپت تست مستقل برای فایل ۱۱ موتور اصلاحی (معماری ۴بلوکی آسیب‌دیدگان).
// اجرا: node scripts/test-engine-corrective-file11-injuredarchitecture.js

// engine/ اکنون ESM است (engine/package.json)؛ این اسکریپت CommonJS می‌ماند،
// پس باید ماژول موتور را با dynamic import() بارگذاری کند (پایین، داخل IIFE).
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

function assertThrows(fn, messageIncludes, description) {
  try {
    fn();
    throw new Error(`${description || "انتظار throw داشتیم"} — اما throw نشد`);
  } catch (err) {
    if (messageIncludes && !err.message.includes(messageIncludes)) {
      throw new Error(`${description || "پیام خطا نامنتظره"} — گرفتیم: "${err.message}"`);
    }
  }
}

(async () => {
  const {
    JOINT_PAIN_STOP_THRESHOLD,
    buildWarmupBlock,
    buildRehabilitationBlock,
    buildStrengthAndCorrectionBlock,
    buildCooldownBlock,
  } = await import("../engine/corrective/file11_injuredArchitecture.js");

  console.log("\n[بلوک ۱: گرم‌کردن]");
  check("قلبی + موبیلیتی ترکیب می‌شوند", () => {
    const result = buildWarmupBlock({
      cardioExercises: [{ id: "CARDIO-1" }],
      mobilityExercises: [{ id: "MOB-1" }, { id: "MOB-2" }],
    });
    assertDeepEqual(
      result.exercises.map((e) => e.id),
      ["CARDIO-1", "MOB-1", "MOB-2"]
    );
  });
  check("ورودی نامعتبر رد می‌شود", () => {
    assertThrows(() => buildWarmupBlock({ cardioExercises: "x", mobilityExercises: [] }), "باید آرایه باشند");
  });

  console.log("\n[بلوک ۲: توانبخشی — فیلتر تگ Isometric/Stabilization]");
  check("فقط حرکات با تگ Isometric یا Stabilization باقی می‌مانند", () => {
    const result = buildRehabilitationBlock({
      candidateExercises: [
        { id: "REHAB-1", tags: ["Isometric"] },
        { id: "REHAB-2", tags: ["Stabilization"] },
        { id: "OTHER-1", tags: ["Dynamic"] },
        { id: "NOTAG-1" },
      ],
      minMaxParams: { defaultSets: 3, defaultRest: 60 },
    });
    assertDeepEqual(
      result.exercises.map((e) => e.id),
      ["REHAB-1", "REHAB-2"]
    );
  });

  console.log("\n[بلوک ۲: عبور واقعی از resolveFinalSetsAndRest — چند مقدار واقعاً متفاوت]");
  check("Final_Sets = MIN با ۴ مقدار متفاوت واقعاً از file8 محاسبه می‌شود (نه بازسازی)", () => {
    const result = buildRehabilitationBlock({
      candidateExercises: [],
      minMaxParams: { defaultSets: 6, systemicMaxSets: 5, injuryMaxSets: 2, ageMaxSets: 4, defaultRest: 60 },
    });
    assert(result.finalSets === 2, `انتظار کمترین (۲) داشتیم، گرفتیم ${result.finalSets}`);
  });

  check("Final_Rest = MAX با ۴ مقدار متفاوت واقعاً از file8 محاسبه می‌شود", () => {
    const result = buildRehabilitationBlock({
      candidateExercises: [],
      minMaxParams: { defaultSets: 3, defaultRest: 60, systemicMinRest: 90, injuryMinRest: 180, ageMinRest: 75 },
    });
    assert(result.finalRest === 180, `انتظار بیشترین (۱۸۰) داشتیم، گرفتیم ${result.finalRest}`);
  });

  check("خطای ورودی نامعتبر واقعاً از خودِ file8 عبور می‌کند (پیام مشترک)", () => {
    assertThrows(
      () => buildRehabilitationBlock({ candidateExercises: [], minMaxParams: { defaultRest: 60 } }),
      "defaultSets نامعتبر",
      "پیام خطا باید دقیقاً همان پیام اعتبارسنجی file8 باشد"
    );
  });

  console.log("\n[بلوک ۳: قدرت و اصلاح — حرکات مضر Drop و جایگزینی از Safe Zone]");
  check("حرکت contraindicated با جایگزین موجود در Safe Zone → جایگزین می‌شود", () => {
    const result = buildStrengthAndCorrectionBlock({
      candidateExercises: [
        { id: "COMPOUND-1", contraindications: ["knee_pain"] },
        { id: "COMPOUND-2" },
      ],
      userContraindications: ["knee_pain"],
      safeZoneExerciseIds: ["SAFE-1"],
      safeZoneExerciseBankById: { "SAFE-1": { id: "SAFE-1" } },
    });
    assertDeepEqual(
      result.exercises.map((e) => e.id),
      ["COMPOUND-2", "SAFE-1"]
    );
    assert(result.droppedCount === 1);
    assert(result.replacedFromSafeZoneCount === 1);
  });

  check("حرکت contraindicated بدون هیچ حرکتی در Safe Zone → فقط Drop می‌شود، جایگزین نمی‌شود", () => {
    const result = buildStrengthAndCorrectionBlock({
      candidateExercises: [{ id: "COMPOUND-1", contraindications: ["knee_pain"] }],
      userContraindications: ["knee_pain"],
      safeZoneExerciseIds: [],
    });
    assertDeepEqual(result.exercises, []);
    assert(result.droppedCount === 1);
    assert(result.replacedFromSafeZoneCount === 0);
    assert(result.warnings.length === 1);
  });

  check("alternative_corrective_exercise روی خودِ حرکت (اگر باشد) در این بلوک هرگز موفق نمی‌شود (bank عمداً خالی است)", () => {
    const result = buildStrengthAndCorrectionBlock({
      candidateExercises: [{ id: "COMPOUND-1", contraindications: ["knee_pain"], alternative_corrective_exercise: "SOME-ALT" }],
      userContraindications: ["knee_pain"],
      safeZoneExerciseIds: ["SAFE-1"],
      safeZoneExerciseBankById: { "SAFE-1": { id: "SAFE-1" } },
    });
    // اگر فایل۳ اجازه می‌داد alternative_corrective_exercise کار کند، اینجا
    // "SOME-ALT" ظاهر می‌شد که در safeZoneExerciseBankById هم نیست — پس
    // باید حتماً از Safe Zone (SAFE-1) پر شده باشد، نه از فایل۳.
    assertDeepEqual(
      result.exercises.map((e) => e.id),
      ["SAFE-1"]
    );
  });

  check("حرکت بدون تداخل دست‌نخورده باقی می‌ماند", () => {
    const result = buildStrengthAndCorrectionBlock({
      candidateExercises: [{ id: "SAFE-COMPOUND", contraindications: [] }],
      userContraindications: ["knee_pain"],
    });
    assertDeepEqual(
      result.exercises.map((e) => e.id),
      ["SAFE-COMPOUND"]
    );
    assert(result.droppedCount === 0);
  });

  console.log("\n[بلوک ۴: سردکردن — هشدار چسبان درد مفصلی]");
  check(`مرز دقیق: درد=${JOINT_PAIN_STOP_THRESHOLD} → توقف نمی‌شود (سند >۳ گفته)`, () => {
    const result = buildCooldownBlock({ staticStretchExercises: [{ id: "STRETCH-1" }], currentJointPainLevel: 3 });
    assert(result.shouldStop === false);
  });

  check("درد=۴ (یک واحد بالاتر از مرز) → توقف باید انجام شود", () => {
    const result = buildCooldownBlock({ staticStretchExercises: [{ id: "STRETCH-1" }], currentJointPainLevel: 4 });
    assert(result.shouldStop === true);
  });

  check("هشدار همیشه حاضر است (چسبان)، صرف‌نظر از سطح درد", () => {
    const low = buildCooldownBlock({ staticStretchExercises: [], currentJointPainLevel: 0 });
    const high = buildCooldownBlock({ staticStretchExercises: [], currentJointPainLevel: 9 });
    assert(typeof low.warning === "string" && low.warning.length > 0);
    assert(low.warning === high.warning);
  });

  check("سطح درد خارج از بازه‌ی ۰ تا ۱۰ رد می‌شود", () => {
    assertThrows(
      () => buildCooldownBlock({ staticStretchExercises: [], currentJointPainLevel: 11 }),
      "currentJointPainLevel نامعتبر"
    );
  });

  console.log(`\n[test-engine-corrective-file11-injuredarchitecture] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
