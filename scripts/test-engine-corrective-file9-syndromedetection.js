// اسکریپت تست مستقل برای فایل ۹ موتور اصلاحی (تشخیص سندروم + قیف تمرینی +
// اولویت‌دهی حرکات چندمنظوره).
// اجرا: node scripts/test-engine-corrective-file9-syndromedetection.js

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
    detectCompoundSyndromes,
    DEFORMITY_PRIORITY_TIERS,
    applyDeformityFunnel,
    scoreMultiPurposeExercises,
  } = await import("../engine/corrective/file9_syndromeDetection.js");

  console.log("\n[تشخیص سندروم ترکیبی — تطابق کامل هرکدام]");
  check("متقاطع فوقانی: forward_head+rounded_shoulders+kyphosis → تشخیص داده می‌شود", () => {
    const result = detectCompoundSyndromes(["forward_head", "rounded_shoulders", "kyphosis"]);
    assertDeepEqual(result, ["upper_crossed_syndrome"]);
  });

  check("متقاطع تحتانی: lordosis+anterior_pelvic_tilt → تشخیص داده می‌شود", () => {
    const result = detectCompoundSyndromes(["lordosis", "anterior_pelvic_tilt"]);
    assertDeepEqual(result, ["lower_crossed_syndrome"]);
  });

  check("اعوجاج پرونیشن: flat_foot+genu_valgum → تشخیص داده می‌شود", () => {
    const result = detectCompoundSyndromes(["flat_foot", "genu_valgum"]);
    assertDeepEqual(result, ["pronation_distortion_syndrome"]);
  });

  console.log("\n[تشخیص سندروم — تطابق ناقص رد می‌شود]");
  check("فقط ۲ از ۳ عضو متقاطع فوقانی → هیچ سندرمی تشخیص داده نمی‌شود", () => {
    const result = detectCompoundSyndromes(["forward_head", "rounded_shoulders"]);
    assertDeepEqual(result, []);
  });

  console.log("\n[تشخیص سندروم — چند سندرم هم‌زمان + ناهنجاری‌های اضافه]");
  check("هر ۷ ناهنجاری هم‌زمان → هر سه سندرم تشخیص داده می‌شوند", () => {
    const result = detectCompoundSyndromes([
      "forward_head",
      "rounded_shoulders",
      "kyphosis",
      "lordosis",
      "anterior_pelvic_tilt",
      "flat_foot",
      "genu_valgum",
    ]);
    assertDeepEqual(result.sort(), ["lower_crossed_syndrome", "pronation_distortion_syndrome", "upper_crossed_syndrome"]);
  });

  check("ناهنجاری‌های نامرتبط اضافه، سندرم کامل هم حاضر → همچنان تشخیص داده می‌شود", () => {
    const result = detectCompoundSyndromes(["forward_head", "rounded_shoulders", "kyphosis", "some_unrelated_deformity"]);
    assertDeepEqual(result, ["upper_crossed_syndrome"]);
  });

  check("بدون هیچ ناهنجاری → آرایه‌ی خالی", () => {
    assertDeepEqual(detectCompoundSyndromes([]), []);
  });

  check("ورودی نامعتبر (غیرآرایه) رد می‌شود", () => {
    assertThrows(() => detectCompoundSyndromes("forward_head"), "userDeformities باید آرایه");
  });

  console.log("\n[قیف تمرینی — دسته‌ها واقعاً از file2 مشتق شده‌اند]");
  check("DEFORMITY_PRIORITY_TIERS دقیقاً [spine_pelvis, big_joints, chain_end] است (از SLOT_PRIORITY_ORDER فایل۲)", () => {
    assertDeepEqual(DEFORMITY_PRIORITY_TIERS, ["spine_pelvis", "big_joints", "chain_end"]);
  });

  console.log("\n[قیف تمرینی — مرز دقیق ۴]");
  check("دقیقاً ۴ ناهنجاری → قیف فعال نمی‌شود (سند >۴ گفته)", () => {
    const deformities = [
      { id: "d1", priorityCategory: "spine_pelvis" },
      { id: "d2", priorityCategory: "spine_pelvis" },
      { id: "d3", priorityCategory: "big_joints" },
      { id: "d4", priorityCategory: "chain_end" },
    ];
    const result = applyDeformityFunnel(deformities);
    assert(result.funnelActive === false);
    assertDeepEqual(result.slotDeformities, deformities);
    assertDeepEqual(result.homeworkOnlyDeformities, []);
  });

  console.log("\n[قیف تمرینی — ۵ ناهنجاری، قیف واقعاً فعال می‌شود]");
  check("اولویت ۱ و ۲ در اسلات می‌مانند، اولویت ۳ (مچ/کف‌پا) Drop و فقط تکلیف خانگی می‌شود", () => {
    const deformities = [
      { id: "spine1", priorityCategory: "spine_pelvis" },
      { id: "joint1", priorityCategory: "big_joints" },
      { id: "spine2", priorityCategory: "spine_pelvis" },
      { id: "chain1", priorityCategory: "chain_end" },
      { id: "joint2", priorityCategory: "big_joints" },
    ];
    const result = applyDeformityFunnel(deformities);
    assert(result.funnelActive === true);
    assertDeepEqual(
      result.slotDeformities.map((d) => d.id),
      ["spine1", "spine2", "joint1", "joint2"]
    );
    assertDeepEqual(
      result.homeworkOnlyDeformities.map((d) => d.id),
      ["chain1"]
    );
  });

  check("۵ ناهنجاری بدون هیچ عضو chain_end → homeworkOnlyDeformities خالی می‌ماند", () => {
    const deformities = [
      { id: "spine1", priorityCategory: "spine_pelvis" },
      { id: "spine2", priorityCategory: "spine_pelvis" },
      { id: "spine3", priorityCategory: "spine_pelvis" },
      { id: "joint1", priorityCategory: "big_joints" },
      { id: "joint2", priorityCategory: "big_joints" },
    ];
    const result = applyDeformityFunnel(deformities);
    assert(result.funnelActive === true);
    assert(result.slotDeformities.length === 5);
    assertDeepEqual(result.homeworkOnlyDeformities, []);
  });

  check("priorityCategory نامعتبر رد می‌شود", () => {
    assertThrows(
      () => applyDeformityFunnel([{ id: "x", priorityCategory: "unknown_tier" }]),
      "priorityCategory نامعتبر"
    );
  });

  console.log("\n[اولویت‌دهی حرکات چندمنظوره]");
  check("حرکت با دقیقاً ۲ تطابق → priority=true", () => {
    const result = scoreMultiPurposeExercises(
      [{ id: "EX-1", target_posture_correction: ["forward_head", "kyphosis"] }],
      ["forward_head", "kyphosis", "flat_foot"]
    );
    assert(result[0].multiPurposeMatchCount === 2);
    assert(result[0].isMultiPurposePriority === true);
  });

  check("حرکت با فقط ۱ تطابق → priority=false", () => {
    const result = scoreMultiPurposeExercises(
      [{ id: "EX-2", target_posture_correction: ["forward_head"] }],
      ["forward_head", "kyphosis"]
    );
    assert(result[0].multiPurposeMatchCount === 1);
    assert(result[0].isMultiPurposePriority === false);
  });

  check("حرکت بدون فیلد target_posture_correction اصلاً → matchCount=0، priority=false، بدون کرش", () => {
    const result = scoreMultiPurposeExercises([{ id: "EX-3" }], ["forward_head", "kyphosis"]);
    assert(result[0].multiPurposeMatchCount === 0);
    assert(result[0].isMultiPurposePriority === false);
  });

  check("حرکت با ۳ تطابق (بیشتر از حداقل) → همچنان priority=true", () => {
    const result = scoreMultiPurposeExercises(
      [{ id: "EX-4", target_posture_correction: ["forward_head", "kyphosis", "lordosis"] }],
      ["forward_head", "kyphosis", "lordosis"]
    );
    assert(result[0].isMultiPurposePriority === true);
  });

  check("چند حرکت مخلوط در یک فراخوانی — هرکدام مستقل امتیازدهی می‌شوند", () => {
    const result = scoreMultiPurposeExercises(
      [
        { id: "A", target_posture_correction: ["forward_head", "kyphosis"] },
        { id: "B", target_posture_correction: ["flat_foot"] },
        { id: "C" },
      ],
      ["forward_head", "kyphosis"]
    );
    assert(result.find((e) => e.id === "A").isMultiPurposePriority === true);
    assert(result.find((e) => e.id === "B").isMultiPurposePriority === false);
    assert(result.find((e) => e.id === "C").isMultiPurposePriority === false);
  });

  check("userDeformities نامعتبر رد می‌شود", () => {
    assertThrows(() => scoreMultiPurposeExercises([{ id: "X" }], "forward_head"), "userDeformities باید آرایه");
  });

  console.log(`\n[test-engine-corrective-file9-syndromedetection] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
