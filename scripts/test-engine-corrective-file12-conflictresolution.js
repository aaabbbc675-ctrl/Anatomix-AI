// اسکریپت تست مستقل برای فایل ۱۲ موتور اصلاحی (حل تعارض / Chain of
// Responsibility).
// اجرا: node scripts/test-engine-corrective-file12-conflictresolution.js

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
  const { unionContraindicationSources, filterExercisesByBannedTags, runFilterChain } = await import(
    "../engine/corrective/file12_conflictResolution.js"
  );
  // زنجیره‌ی مرجع برای تست runFilterChain: applyContraindicationFilterWithFallback
  // (فایل۳، واقعی) → filterExercisesByBannedTags (این فایل) →
  // filterExercisesByAvailableEquipment (فایل۸، واقعی) — بدون فیلتر ساختگی.
  const { applyContraindicationFilterWithFallback } = await import("../engine/corrective/file3_triageFallback.js");
  const { filterExercisesByAvailableEquipment } = await import("../engine/corrective/file8_capacityEngine.js");

  console.log("\n[unionContraindicationSources — یونیون واقعی چند منبع، با تکرار]");
  check("سه منبع با تداخل/تکرار → نتیجه یکتا و بدون تکرار", () => {
    const result = unionContraindicationSources([
      ["knee_pain", "shoulder_pain"],
      ["shoulder_pain", "hip_pain"],
      ["knee_pain"],
    ]);
    assertDeepEqual(result, ["knee_pain", "shoulder_pain", "hip_pain"]);
  });

  check("منبع خالی در میان بقیه → نادیده گرفته می‌شود، بقیه یکتا می‌مانند", () => {
    const result = unionContraindicationSources([["a"], [], ["a", "b"]]);
    assertDeepEqual(result, ["a", "b"]);
  });

  check("همه‌ی منابع خالی → آرایه‌ی خالی", () => {
    assertDeepEqual(unionContraindicationSources([[], [], []]), []);
  });

  check("sources غیرآرایه رد می‌شود", () => {
    assertThrows(() => unionContraindicationSources("not-an-array"), "sources باید آرایه");
  });

  check("عضوی از sources که خودش آرایه نیست رد می‌شود", () => {
    assertThrows(() => unionContraindicationSources([["a"], "b"]), "sources باید آرایه");
  });

  console.log("\n[filterExercisesByBannedTags — بیش از یک تگ ممنوع هم‌زمان]");
  check("حرکت با تگ منفرد ممنوع، حرکت با هر دو تگ ممنوع، حرکت بدون تگ ممنوع → فقط بدون‌تداخل می‌ماند", () => {
    const result = filterExercisesByBannedTags(
      [
        { id: "A", tags: ["Valsalva"] },
        { id: "B", tags: ["Jumping"] },
        { id: "C", tags: ["Valsalva", "Jumping"] },
        { id: "D", tags: ["Isometric"] },
      ],
      ["Valsalva", "Jumping"]
    );
    assertDeepEqual(result.map((e) => e.id), ["D"]);
  });

  check("حرکت بدون فیلد tags اصلاً → دست‌نخورده می‌ماند، بدون کرش", () => {
    const result = filterExercisesByBannedTags([{ id: "E" }], ["Valsalva"]);
    assertDeepEqual(result.map((e) => e.id), ["E"]);
  });

  check("bannedTags خالی → هیچ حرکتی حذف نمی‌شود", () => {
    const result = filterExercisesByBannedTags([{ id: "F", tags: ["Valsalva"] }], []);
    assertDeepEqual(result.map((e) => e.id), ["F"]);
  });

  check("exercises غیرآرایه رد می‌شود", () => {
    assertThrows(() => filterExercisesByBannedTags("x", ["Valsalva"]), "exercises باید آرایه");
  });

  check("bannedTags غیرآرایه‌ی-رشته رد می‌شود", () => {
    assertThrows(() => filterExercisesByBannedTags([], [1, 2]), "bannedTags باید آرایه‌ای از رشته");
  });

  console.log("\n[runFilterChain — سه فیلتر واقعی پشت‌سرهم، ترتیب و ترکیب]");
  check("ActiveInjuryFilter(فایل۳) → MedicalConditionFilter(این فایل) → EquipmentFilter(فایل۸) — هرکدام دقیقاً یکی حذف می‌کند", () => {
    const pool = [
      { id: "EX-1", contraindications: ["knee_pain"], tags: ["Dynamic"], equipment: "Barbell" },
      { id: "EX-2", contraindications: [], tags: ["Valsalva"], equipment: "Barbell" },
      { id: "EX-3", contraindications: [], tags: ["Dynamic"], equipment: "Bodyweight" },
      { id: "EX-4", contraindications: [], tags: ["Dynamic"], equipment: "Barbell" },
    ];

    const filters = [
      (exs) => applyContraindicationFilterWithFallback(exs, ["knee_pain"], {}).exercises, // حذف EX-1
      (exs) => filterExercisesByBannedTags(exs, ["Valsalva"]), // حذف EX-2
      (exs) => filterExercisesByAvailableEquipment(exs, ["Barbell"]), // حذف EX-3
    ];

    const result = runFilterChain(pool, filters);
    assertDeepEqual(result.map((e) => e.id), ["EX-4"]);
  });

  console.log("\n[runFilterChain — یک فیلتر همه‌چیز را حذف می‌کند، فیلتر بعدی روی خالی کرش نمی‌کند]");
  check("فیلتر اول همه را حذف می‌کند → فیلتر دوم روی [] اجرا می‌شود و نتیجه [] است، بدون throw", () => {
    const pool = [{ id: "X", contraindications: ["knee_pain"] }];
    const filters = [
      (exs) => applyContraindicationFilterWithFallback(exs, ["knee_pain"], {}).exercises, // حذف X → []
      (exs) => filterExercisesByBannedTags(exs, ["Valsalva"]), // روی [] اجرا می‌شود
    ];
    const result = runFilterChain(pool, filters);
    assertDeepEqual(result, []);
  });

  check("زنجیره‌ی خالی از فیلترها → لیست ورودی دست‌نخورده برمی‌گردد", () => {
    const result = runFilterChain([{ id: "Y" }], []);
    assertDeepEqual(result.map((e) => e.id), ["Y"]);
  });

  check("exercises غیرآرایه رد می‌شود", () => {
    assertThrows(() => runFilterChain("x", []), "exercises باید آرایه");
  });

  check("filters غیرآرایه یا شامل غیرتابع رد می‌شود", () => {
    assertThrows(() => runFilterChain([], "x"), "filters باید آرایه‌ای از تابع");
    assertThrows(() => runFilterChain([], [1]), "filters باید آرایه‌ای از تابع");
  });

  console.log(`\n[test-engine-corrective-file12-conflictresolution] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
