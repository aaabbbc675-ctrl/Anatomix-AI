// اسکریپت تست مستقل برای engine/talentId/shared/sportRequirementMatrix.js
// (skeleton ۵ رشته‌ی Commit 1).
// اجرا: node scripts/test-engine-talentid-sportmatrix-seed.js
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

const EXPECTED_IDS = [
  "soccer_striker",
  "wrestling_freestyle",
  "volleyball_middle_blocker",
  "swimming_general",
  "weightlifting_olympic",
];

(async () => {
  const { sportRequirementMatrix, getSportEntry } = await import(
    "../engine/talentId/shared/sportRequirementMatrix.js"
  );
  const { validateSportEntry } = await import("../engine/talentId/shared/sportRequirementSchema.js");

  console.log("\n[۵ رشته‌ی Wave 1 اولیه]");
  check(`دقیقاً ۵ رشته seed شده (${EXPECTED_IDS.join(", ")})`, () => {
    const keys = Object.keys(sportRequirementMatrix).sort();
    assert(
      JSON.stringify(keys) === JSON.stringify([...EXPECTED_IDS].sort()),
      `کلیدهای فعلی: ${keys.join(", ")}`
    );
  });

  for (const sportId of EXPECTED_IDS) {
    check(`رشته "${sportId}" از validateSportEntry پاس می‌کند`, () => {
      const entry = getSportEntry(sportId);
      assert(entry.id === sportId, `id باید "${sportId}" باشد`);
      assert(validateSportEntry(entry) === true, "باید true برگرداند");
    });
  }

  console.log("\n[getSportEntry]");
  check("getSportEntry برای رشته‌ی ناموجود throw می‌کند", () => {
    assertThrows(() => getSportEntry("not_a_real_sport"), "پیدا نشد", "باید رد شود");
  });

  console.log(`\n[test-engine-talentid-sportmatrix-seed] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
