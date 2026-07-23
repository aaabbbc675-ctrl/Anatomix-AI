// اسکریپت تست مستقل برای engine/shared/deviceJsonAdapter.js.
// اجرا: node scripts/test-engine-shared-devicejsonadapter.js

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

(async () => {
  const { adaptDeviceJson } = await import("../engine/shared/deviceJsonAdapter.js");

  console.log("\n[قرارداد فعلی: pass-through خالص]");
  check("آبجکت دلخواه بدون هیچ تغییری (deep-equal) عبور می‌کند", () => {
    const input = { hr_rest: 62, nested: { a: [1, 2, 3], b: "x" } };
    const output = adaptDeviceJson(input);
    assertDeepEqual(output, input, "خروجی باید دقیقاً همان ورودی باشد");
  });

  check("ورودی null کرش نمی‌کند و null برمی‌گرداند", () => {
    const output = adaptDeviceJson(null);
    assert(output === null, `انتظار null داشتیم، گرفتیم ${JSON.stringify(output)}`);
  });

  check("ورودی undefined کرش نمی‌کند و undefined برمی‌گرداند", () => {
    const output = adaptDeviceJson(undefined);
    assert(output === undefined, `انتظار undefined داشتیم، گرفتیم ${JSON.stringify(output)}`);
  });

  console.log(`\n[test-engine-shared-devicejsonadapter] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
