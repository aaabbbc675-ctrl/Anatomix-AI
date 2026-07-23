// اسکریپت تست مستقل برای فایل ۱ موتور اصلاحی (processIntakeInputs).
// اجرا: node scripts/test-engine-corrective-file1-systeminputs.js

// engine/ اکنون ESM است (engine/package.json)؛ این اسکریپت CommonJS می‌ماند،
// پس باید ماژول موتور را با dynamic import() بارگذاری کند (پایین، داخل IIFE).
const fs = require("fs");
const path = require("path");

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
  const { processIntakeInputs, VALID_USER_LEVELS } = await import("../engine/corrective/file1_systemInputs.js");

  console.log("\n[ورودی معتبر کامل]");
  check("خروجی درست شکل می‌گیرد", () => {
    const input = {
      assessmentData: { hr_rest: 58, marker: "trace-me" },
      userLevel: "Intermediate",
      bodybuildingRequest: true,
      workoutDaysPerWeek: 4,
      coachPrioritizedDeformities: ["forward_head", "kyphosis"],
      manualBlacklistExercises: [{ exerciseId: "SQ-BB", reasonNote: "درد زانو" }],
      generalNotes: "یادداشت آزاد",
    };
    const result = processIntakeInputs(input);

    assert(result.userLevel === "Intermediate");
    assert(result.bodybuildingRequest === true);
    assert(result.workoutDaysPerWeek === 4);
    assertDeepEqual(result.coachPrioritizedDeformities, ["forward_head", "kyphosis"]);
    assertDeepEqual(result.manualBlacklistExercises, [{ exerciseId: "SQ-BB", reasonNote: "درد زانو" }]);
    assert(result.generalNotes === "یادداشت آزاد");
  });

  console.log("\n[اثبات عبور واقعی assessmentData از adaptDeviceJson]");
  check("رفتاری: خروجی assessmentData دقیقاً همان چیزی است که adaptDeviceJson (pass-through) برمی‌گرداند", () => {
    // این چک به‌تنهایی کافی نیست: چون adaptDeviceJson فعلاً خودش identity
    // است، این تست حتی اگر processIntakeInputs اصلاً آداپتور را صدا نزند و
    // input.assessmentData را مستقیم کپی کند هم پاس می‌شود. برای همین چک
    // دوم (ایستا، پایین) هم لازم است تا واقعاً وجود import/فراخوانی را
    // اثبات کند، نه فقط تطابق تصادفی خروجی.
    const traceableInput = { marker: "trace-me", nested: { x: 1 } };
    const result = processIntakeInputs({
      assessmentData: traceableInput,
      userLevel: "Beginner",
      bodybuildingRequest: false,
      workoutDaysPerWeek: 3,
    });
    assertDeepEqual(result.assessmentData, traceableInput, "assessmentData باید بدون تغییر (pass-through) برگردد");
  });

  check("ایستا: سورس فایل واقعاً adaptDeviceJson را از مسیر درست import و صدا می‌زند", () => {
    const sourcePath = path.join(__dirname, "..", "engine", "corrective", "file1_systemInputs.js");
    const source = fs.readFileSync(sourcePath, "utf8");
    assert(
      source.includes('import { adaptDeviceJson } from "../shared/deviceJsonAdapter.js"'),
      "فایل باید adaptDeviceJson را از engine/shared/deviceJsonAdapter.js import کند"
    );
    assert(source.includes("adaptDeviceJson(input.assessmentData"), "فایل باید واقعاً adaptDeviceJson(...) را روی assessmentData صدا بزند");
  });

  console.log("\n[اعتبارسنجی userLevel]");
  check("userLevel نامعتبر رد می‌شود", () => {
    assertThrows(
      () =>
        processIntakeInputs({
          userLevel: "Expert",
          bodybuildingRequest: true,
          workoutDaysPerWeek: 3,
        }),
      "userLevel نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check(`مقادیر مجاز دقیقاً ${VALID_USER_LEVELS.join("/")} است`, () => {
    assertDeepEqual(VALID_USER_LEVELS, ["Beginner", "Intermediate", "Advanced"]);
  });

  console.log("\n[اعتبارسنجی workoutDaysPerWeek]");
  check("عدد منفی رد می‌شود", () => {
    assertThrows(
      () =>
        processIntakeInputs({
          userLevel: "Beginner",
          bodybuildingRequest: false,
          workoutDaysPerWeek: -2,
        }),
      "workoutDaysPerWeek نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("مقدار غیرعددی رد می‌شود", () => {
    assertThrows(
      () =>
        processIntakeInputs({
          userLevel: "Beginner",
          bodybuildingRequest: false,
          workoutDaysPerWeek: "سه",
        }),
      "workoutDaysPerWeek نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("خارج از بازه‌ی ۱ تا ۷ رد می‌شود (۸ روز)", () => {
    assertThrows(
      () =>
        processIntakeInputs({
          userLevel: "Beginner",
          bodybuildingRequest: false,
          workoutDaysPerWeek: 8,
        }),
      "workoutDaysPerWeek نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  console.log("\n[اعتبارسنجی bodybuildingRequest]");
  check("مقدار غیر Boolean رد می‌شود", () => {
    assertThrows(
      () =>
        processIntakeInputs({
          userLevel: "Beginner",
          bodybuildingRequest: "بله",
          workoutDaysPerWeek: 3,
        }),
      "bodybuildingRequest نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  console.log("\n[رفتار پیش‌فرض coachPrioritizedDeformities / manualBlacklistExercises وقتی خالی یا نبود]");
  check("نبودن هر دو فیلد کرش نمی‌کند و آرایه‌ی خالی پیش‌فرض می‌گیرد", () => {
    const result = processIntakeInputs({
      userLevel: "Advanced",
      bodybuildingRequest: true,
      workoutDaysPerWeek: 5,
    });
    assertDeepEqual(result.coachPrioritizedDeformities, []);
    assertDeepEqual(result.manualBlacklistExercises, []);
    assert(result.assessmentData === null, "assessmentData باید پیش‌فرض null (از adaptDeviceJson عبورکرده) باشد");
    assert(result.generalNotes === "", "generalNotes باید پیش‌فرض رشته‌ی خالی باشد");
  });

  check("آرایه‌ی خالی صریح هم بدون کرش می‌ماند", () => {
    const result = processIntakeInputs({
      userLevel: "Advanced",
      bodybuildingRequest: true,
      workoutDaysPerWeek: 5,
      coachPrioritizedDeformities: [],
      manualBlacklistExercises: [],
    });
    assertDeepEqual(result.coachPrioritizedDeformities, []);
    assertDeepEqual(result.manualBlacklistExercises, []);
  });

  console.log("\n[اعتبارسنجی شکل coachPrioritizedDeformities / manualBlacklistExercises]");
  check("عضو غیررشته‌ای در coachPrioritizedDeformities رد می‌شود", () => {
    assertThrows(
      () =>
        processIntakeInputs({
          userLevel: "Beginner",
          bodybuildingRequest: false,
          workoutDaysPerWeek: 3,
          coachPrioritizedDeformities: ["forward_head", 123],
        }),
      "coachPrioritizedDeformities",
      "باید با خطای صریح رد شود"
    );
  });

  check("رکورد manualBlacklistExercises بدون exerciseId رد می‌شود", () => {
    assertThrows(
      () =>
        processIntakeInputs({
          userLevel: "Beginner",
          bodybuildingRequest: false,
          workoutDaysPerWeek: 3,
          manualBlacklistExercises: [{ reasonNote: "بدون شناسه" }],
        }),
      "manualBlacklistExercises[0] نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("reasonNote اختیاری است — نبودش به null می‌افتد", () => {
    const result = processIntakeInputs({
      userLevel: "Beginner",
      bodybuildingRequest: false,
      workoutDaysPerWeek: 3,
      manualBlacklistExercises: [{ exerciseId: "DL-CV" }],
    });
    assertDeepEqual(result.manualBlacklistExercises, [{ exerciseId: "DL-CV", reasonNote: null }]);
  });

  console.log(`\n[test-engine-corrective-file1-systeminputs] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
