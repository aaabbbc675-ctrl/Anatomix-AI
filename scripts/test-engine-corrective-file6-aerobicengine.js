// اسکریپت تست مستقل برای فایل ۶ موتور اصلاحی (موتور تنظیم هوازی، بدون SpO2).
// اجرا: node scripts/test-engine-corrective-file6-aerobicengine.js

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
  const { evaluateAerobicFitnessDrop, evaluateObesityHighHeartRateRule } = await import(
    "../engine/corrective/file6_aerobicEngine.js"
  );

  console.log("\n[شاخص افت آمادگی — Resting_HR دقیقاً روی مرز ۸۰]");
  check("HR=80 دقیقاً روی مرز → محدود نمی‌شود (سند >۸۰ گفته، نه ≥۸۰)", () => {
    const result = evaluateAerobicFitnessDrop({ restingHr: 80 });
    assertDeepEqual(result, { restricted: false });
  });

  check("HR=81 (یک واحد بالاتر از مرز) → محدود به LISS با جزئیات کامل", () => {
    const result = evaluateAerobicFitnessDrop({ restingHr: 81 });
    assertDeepEqual(result, {
      restricted: true,
      maxHrPercentRange: [60, 70],
      placement: "end_of_session",
      startingDurationMinutes: 10,
      monthlyIncreasePercent: 20,
      durationCapMinutes: 20,
      resistanceRestSecRange: [60, 120],
      sessionCapMinutes: 60,
    });
  });

  check("HR=110 (بسیار بالا) → همان محدودیت LISS اعمال می‌شود", () => {
    const result = evaluateAerobicFitnessDrop({ restingHr: 110 });
    assert(result.restricted === true);
  });

  check("HR نامعتبر (منفی) رد می‌شود", () => {
    assertThrows(() => evaluateAerobicFitnessDrop({ restingHr: -5 }), "restingHr نامعتبر", "باید با خطای صریح رد شود");
  });

  check("HR نامعتبر (صفر) رد می‌شود", () => {
    assertThrows(() => evaluateAerobicFitnessDrop({ restingHr: 0 }), "restingHr نامعتبر", "باید با خطای صریح رد شود");
  });

  check("HR غیرعددی رد می‌شود", () => {
    assertThrows(() => evaluateAerobicFitnessDrop({ restingHr: "زیاد" }), "restingHr نامعتبر", "باید با خطای صریح رد شود");
  });

  console.log("\n[قانون چاقی+ضربان بالا — هم‌زمانی BMI≥25 و HR>80]");
  check("BMI=25 دقیقاً + HR=81 → تریگر می‌شود (سند BMI≥25 گفته، یعنی ۲۵ خودش کافی است)", () => {
    const result = evaluateObesityHighHeartRateRule({ bmi: 25, restingHr: 81 });
    assert(result.triggered === true);
    assertDeepEqual(result.banned_tags, ["High_Impact", "Jumping"]);
    assertDeepEqual(result.warnings, ["۳۰ دقیقه هوازی بدون برخورد، روزانه، مجزا"]);
    assert(result.aerobicRemovedFromSession === true);
  });

  check("BMI=24.9 (زیر مرز) + HR=90 → تریگر نمی‌شود", () => {
    const result = evaluateObesityHighHeartRateRule({ bmi: 24.9, restingHr: 90 });
    assert(result.triggered === false);
    assertDeepEqual(result.banned_tags, []);
    assert(result.aerobicRemovedFromSession === false);
  });

  check("BMI=30 + HR=80 دقیقاً (نه بالاتر) → تریگر نمی‌شود، چون HR باید واقعاً >۸۰ باشد", () => {
    const result = evaluateObesityHighHeartRateRule({ bmi: 30, restingHr: 80 });
    assert(result.triggered === false);
  });

  check("هر دو شرط به‌وضوح برقرار (BMI=32, HR=95) → تریگر کامل", () => {
    const result = evaluateObesityHighHeartRateRule({ bmi: 32, restingHr: 95 });
    assert(result.triggered === true);
    assert(result.aerobicRemovedFromSession === true);
  });

  check("فقط BMI بالا بدون HR بالا → تریگر نمی‌شود (دو شرط باید هم‌زمان باشند)", () => {
    const result = evaluateObesityHighHeartRateRule({ bmi: 35, restingHr: 65 });
    assert(result.triggered === false);
  });

  check("فقط HR بالا بدون BMI بالا → تریگر نمی‌شود", () => {
    const result = evaluateObesityHighHeartRateRule({ bmi: 22, restingHr: 100 });
    assert(result.triggered === false);
  });

  check("bmi نامعتبر رد می‌شود", () => {
    assertThrows(
      () => evaluateObesityHighHeartRateRule({ bmi: -1, restingHr: 90 }),
      "bmi نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  console.log(`\n[test-engine-corrective-file6-aerobicengine] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
