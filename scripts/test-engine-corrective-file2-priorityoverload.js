// اسکریپت تست مستقل برای فایل ۲ موتور اصلاحی (اولویت‌بندی + اضافه‌بار ماهانه
// + آزادسازی سختی).
// اجرا: node scripts/test-engine-corrective-file2-priorityoverload.js

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
  const { assignSlotPriority, applyMonthlyOverloadStep, resolveDifficultyUnlock } = await import(
    "../engine/corrective/file2_priorityAndOverload.js"
  );

  console.log("\n[اولویت تخصیص اسلات — چند اسلات هم‌زمان رقیب]");
  check("ترتیب دقیق سند رعایت می‌شود، صرف‌نظر از ترتیب ورودی", () => {
    const shuffled = [
      { id: "a", category: "chain_end" },
      { id: "b", category: "big_joints" },
      { id: "c", category: "active_injury" },
      { id: "d", category: "spine_pelvis" },
      { id: "e", category: "coach_override" },
    ];
    const sorted = assignSlotPriority(shuffled);
    assertDeepEqual(
      sorted.map((x) => x.id),
      ["c", "e", "d", "b", "a"],
      "ترتیب باید active_injury > coach_override > spine_pelvis > big_joints > chain_end باشد"
    );
  });

  check("چند آیتم در یک دسته: ترتیب داخلی‌شان (stable sort) حفظ می‌شود", () => {
    const items = [
      { id: "x1", category: "big_joints" },
      { id: "y1", category: "active_injury" },
      { id: "x2", category: "big_joints" },
    ];
    const sorted = assignSlotPriority(items);
    assertDeepEqual(
      sorted.map((x) => x.id),
      ["y1", "x1", "x2"]
    );
  });

  check("دسته‌ی ناشناخته رد می‌شود", () => {
    assertThrows(
      () => assignSlotPriority([{ id: "z", category: "unknown_category" }]),
      "دسته‌ی ناشناخته",
      "باید با خطای صریح رد شود"
    );
  });

  console.log("\n[موتور اضافه‌بار ماهانه — ۴ گام به ترتیب]");
  check("گام ۱: وقتی تکرار زیر سقف است، فقط تکرار زیاد می‌شود", () => {
    const result = applyMonthlyOverloadStep({
      currentReps: 10,
      currentSets: 2,
      currentTempo: "2-0-2-0",
      currentRestSec: 90,
      repIncrement: 2,
      setIncrement: 1,
      restDecrementSec: 5,
    });
    assertDeepEqual(result, { step: "increase_reps", reps: 12, sets: 2, tempo: "2-0-2-0", restSec: 90 });
  });

  check("گام ۱ به سقف محدود می‌شود (نه فراتر از repCap)", () => {
    const result = applyMonthlyOverloadStep({
      currentReps: 14,
      currentSets: 2,
      currentTempo: "2-0-2-0",
      currentRestSec: 90,
      repIncrement: 5,
      setIncrement: 1,
      restDecrementSec: 5,
    });
    assert(result.step === "increase_reps");
    assert(result.reps === 15, `انتظار سقف ۱۵ داشتیم، گرفتیم ${result.reps}`);
  });

  check("گام ۲: وقتی تکرار به سقف رسیده، ست زیاد می‌شود", () => {
    const result = applyMonthlyOverloadStep({
      currentReps: 15,
      currentSets: 2,
      currentTempo: "2-0-2-0",
      currentRestSec: 90,
      repIncrement: 2,
      setIncrement: 1,
      restDecrementSec: 5,
    });
    assertDeepEqual(result, { step: "increase_sets", reps: 15, sets: 3, tempo: "2-0-2-0", restSec: 90 });
  });

  check("گام ۳: وقتی تکرار و ست هر دو به سقف رسیده، تمپو طبق نگاشت مستند تغییر می‌کند", () => {
    const result = applyMonthlyOverloadStep({
      currentReps: 15,
      currentSets: 4,
      currentTempo: "2-0-2-0",
      currentRestSec: 90,
      repIncrement: 2,
      setIncrement: 1,
      restDecrementSec: 5,
    });
    assertDeepEqual(result, { step: "increase_tempo", reps: 15, sets: 4, tempo: "4-2-1-0", restSec: 90 });
  });

  check("گام ۴: وقتی تمپوی فعلی در نگاشت نیست، استراحت کم می‌شود (تا کف)", () => {
    const result = applyMonthlyOverloadStep({
      currentReps: 15,
      currentSets: 4,
      currentTempo: "4-2-1-0", // دیگر در نگاشت پیش‌فرض کلیدی ندارد
      currentRestSec: 90,
      repIncrement: 2,
      setIncrement: 1,
      restDecrementSec: 10,
      isElderlyOrPatient: true,
    });
    assertDeepEqual(result, { step: "decrease_rest", reps: 15, sets: 4, tempo: "4-2-1-0", restSec: 80 });
  });

  check("گام ۴ هرگز برای سالمند/بیمار زیر کف ۶۰ ثانیه نمی‌رود", () => {
    const result = applyMonthlyOverloadStep({
      currentReps: 15,
      currentSets: 4,
      currentTempo: "4-2-1-0",
      currentRestSec: 65,
      repIncrement: 2,
      setIncrement: 1,
      restDecrementSec: 10,
      isElderlyOrPatient: true,
    });
    assert(result.step === "decrease_rest");
    assert(result.restSec === 60, `انتظار کف ۶۰ داشتیم، گرفتیم ${result.restSec}`);
  });

  check("همه‌ی ۴ گام اشباع شده → step='none'", () => {
    const result = applyMonthlyOverloadStep({
      currentReps: 15,
      currentSets: 4,
      currentTempo: "4-2-1-0",
      currentRestSec: 60,
      repIncrement: 2,
      setIncrement: 1,
      restDecrementSec: 10,
      isElderlyOrPatient: true,
    });
    assertDeepEqual(result, { step: "none", reps: 15, sets: 4, tempo: "4-2-1-0", restSec: 60 });
  });

  check("repIncrement نامعتبر وقتی گام ۱ فعال است رد می‌شود", () => {
    assertThrows(
      () =>
        applyMonthlyOverloadStep({
          currentReps: 10,
          currentSets: 2,
          currentTempo: "2-0-2-0",
          currentRestSec: 90,
          repIncrement: 0,
          setIncrement: 1,
          restDecrementSec: 5,
        }),
      "repIncrement نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  console.log("\n[آزادسازی سختی]");
  check("ماه ۱: فقط Easy/Medium، حتی اگر بدون درد بوده", () => {
    assertDeepEqual(resolveDifficultyUnlock({ monthNumber: 1, painFreeSoFar: true }), ["Easy", "Medium"]);
  });

  check("ماه ۲: هنوز فقط Easy/Medium", () => {
    assertDeepEqual(resolveDifficultyUnlock({ monthNumber: 2, painFreeSoFar: true }), ["Easy", "Medium"]);
  });

  check("ماه ۳ + بدون درد: Hard هم باز می‌شود", () => {
    assertDeepEqual(resolveDifficultyUnlock({ monthNumber: 3, painFreeSoFar: true }), ["Easy", "Medium", "Hard"]);
  });

  check("ماه ۳ + با درد: Hard باز نمی‌شود", () => {
    assertDeepEqual(resolveDifficultyUnlock({ monthNumber: 3, painFreeSoFar: false }), ["Easy", "Medium"]);
  });

  check("ماه نامعتبر (۰) رد می‌شود", () => {
    assertThrows(
      () => resolveDifficultyUnlock({ monthNumber: 0, painFreeSoFar: true }),
      "monthNumber نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("painFreeSoFar غیر Boolean رد می‌شود", () => {
    assertThrows(
      () => resolveDifficultyUnlock({ monthNumber: 3, painFreeSoFar: "بله" }),
      "painFreeSoFar نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  console.log(`\n[test-engine-corrective-file2-priorityoverload] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
