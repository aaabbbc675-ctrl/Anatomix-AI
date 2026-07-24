// اسکریپت تست مستقل برای engine/shared/bodybuildingReadinessGate.js.
// اجرا: node scripts/test-engine-shared-bodybuildingreadinessgate.js

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
  const { resolveBodybuildingReadiness } = await import("../engine/shared/bodybuildingReadinessGate.js");

  console.log("\n[سه حالت اصلی]");
  check("آسیب فعال > ۰ → force_corrective_warmup_injection، قفل واقعی", () => {
    const result = resolveBodybuildingReadiness({ activeInjuriesCount: 1, deformitiesCount: 0, hardVetoMedical: false });
    assertDeepEqual(result, { decision: "force_corrective_warmup_injection", locked: true });
  });

  check("Hard Veto پزشکی مطلق (بدون آسیب فعال) → همان force_corrective_warmup_injection", () => {
    const result = resolveBodybuildingReadiness({ activeInjuriesCount: 0, deformitiesCount: 0, hardVetoMedical: true });
    assertDeepEqual(result, { decision: "force_corrective_warmup_injection", locked: true });
  });

  check("ناهنجاری > ۴ (بدون آسیب فعال/Hard Veto) → suggest_corrective_warmup، Advisory نه قفل", () => {
    const result = resolveBodybuildingReadiness({ activeInjuriesCount: 0, deformitiesCount: 5, hardVetoMedical: false });
    assertDeepEqual(result, { decision: "suggest_corrective_warmup", locked: false, suggestedBodybuildingShareMax: 0.3 });
  });

  check("سالم کامل (بدون آسیب، ناهنجاری کم، بدون Hard Veto) → proceed", () => {
    const result = resolveBodybuildingReadiness({ activeInjuriesCount: 0, deformitiesCount: 2, hardVetoMedical: false });
    assertDeepEqual(result, { decision: "proceed", locked: false });
  });

  console.log("\n[مرز دقیق ناهنجاری]");
  check("ناهنجاری دقیقاً =۴ → هنوز proceed است، نه Advisory (سند صریح >۴ گفته)", () => {
    const result = resolveBodybuildingReadiness({ activeInjuriesCount: 0, deformitiesCount: 4, hardVetoMedical: false });
    assertDeepEqual(result, { decision: "proceed", locked: false });
  });

  check("ناهنجاری =۵ (یک واحد بالاتر از مرز) → suggest_corrective_warmup", () => {
    const result = resolveBodybuildingReadiness({ activeInjuriesCount: 0, deformitiesCount: 5, hardVetoMedical: false });
    assertDeepEqual(result, { decision: "suggest_corrective_warmup", locked: false, suggestedBodybuildingShareMax: 0.3 });
  });

  console.log("\n[هم‌زمانی آسیب فعال و ناهنجاری زیاد — اولویت با قفل]");
  check("activeInjuriesCount>0 هم‌زمان با deformitiesCount>4 → همچنان force_corrective_warmup_injection (نه Advisory)", () => {
    const result = resolveBodybuildingReadiness({ activeInjuriesCount: 2, deformitiesCount: 8, hardVetoMedical: false });
    assertDeepEqual(result, { decision: "force_corrective_warmup_injection", locked: true });
  });

  check("hardVetoMedical=true هم‌زمان با deformitiesCount>4 → همچنان force_corrective_warmup_injection", () => {
    const result = resolveBodybuildingReadiness({ activeInjuriesCount: 0, deformitiesCount: 10, hardVetoMedical: true });
    assertDeepEqual(result, { decision: "force_corrective_warmup_injection", locked: true });
  });

  console.log("\n[اعتبارسنجی ورودی نامعتبر]");
  check("activeInjuriesCount منفی رد می‌شود", () => {
    assertThrows(
      () => resolveBodybuildingReadiness({ activeInjuriesCount: -1, deformitiesCount: 0, hardVetoMedical: false }),
      "activeInjuriesCount نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("activeInjuriesCount غیرعددی رد می‌شود", () => {
    assertThrows(
      () => resolveBodybuildingReadiness({ activeInjuriesCount: "یک", deformitiesCount: 0, hardVetoMedical: false }),
      "activeInjuriesCount نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("deformitiesCount منفی رد می‌شود", () => {
    assertThrows(
      () => resolveBodybuildingReadiness({ activeInjuriesCount: 0, deformitiesCount: -3, hardVetoMedical: false }),
      "deformitiesCount نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("deformitiesCount غیرعددی رد می‌شود", () => {
    assertThrows(
      () => resolveBodybuildingReadiness({ activeInjuriesCount: 0, deformitiesCount: null, hardVetoMedical: false }),
      "deformitiesCount نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("hardVetoMedical غیر Boolean رد می‌شود", () => {
    assertThrows(
      () => resolveBodybuildingReadiness({ activeInjuriesCount: 0, deformitiesCount: 0, hardVetoMedical: "بله" }),
      "hardVetoMedical نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  console.log(`\n[test-engine-shared-bodybuildingreadinessgate] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
