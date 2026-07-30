// اسکریپت تست مستقل برای engine/talentId/file2_maturityCalculator.js.
// اجرا: node scripts/test-engine-talentid-file2-maturity.js
//
// نکته‌ی مهم: مقدار انتظاری تست mirwaldBoys پایین از خودِ سند معماری
// (بخش ۳.۸: «MO مورد انتظار -1.63») کپی نشده — آن عدد در Commit 3 با
// محاسبه‌ی دستی مستقل رد شد (نتیجه‌ی واقعی فرمول با همان ورودی‌ها
// -1.509193 است، نه -1.63). این تست از عدد وریفای‌شده استفاده می‌کند.
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

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || "مقدار نزدیک نیست"} — انتظار ≈${expected}, گرفتیم ${actual}`);
  }
}

(async () => {
  const {
    mirwaldBoys,
    mirwaldGirls,
    selectMaturityFormula,
    computeBioAge,
    determineMaturityType,
    computePhvZone,
    calculateMaturityProfile,
  } = await import("../engine/talentId/file2_maturityCalculator.js");

  console.log("\n[mirwaldBoys — وریفای مستقل، نه عدد سند]");
  check("مقدار سند (-1.63) رد شده؛ مقدار وریفای‌شده‌ی خودمان (-1.509193) تأیید می‌شود", () => {
    const mo = mirwaldBoys(12.5, 155, 78, 77, 45);
    assertClose(mo, -1.509193, 0.001, "MO پسر ۱۲.۵ ساله نادرست");
  });

  console.log("\n[mirwaldGirls — self-check دستی روی اعداد گرد]");
  check("MO دختر روی مقادیر ساده‌ی گرد (CA=11,H=150,SH=75,LL=75,W=40) ≈ -0.801603", () => {
    const mo = mirwaldGirls(11, 150, 75, 75, 40);
    assertClose(mo, -0.801603, 0.001, "MO دختر نادرست");
  });

  console.log("\n[selectMaturityFormula]");
  check("پسر ۱۲.۵ ساله (داخل بازه ۱۲-۱۶) → mirwald", () => {
    assert(selectMaturityFormula(12.5, "male") === "mirwald", "باید mirwald باشد");
  });
  check("پسر ۱۷ ساله (خارج بازه) → chronological_fallback", () => {
    assert(selectMaturityFormula(17, "male") === "chronological_fallback", "باید fallback باشد");
  });
  check("دختر ۹ ساله (خارج بازه ۱۰-۱۴) → chronological_fallback", () => {
    assert(selectMaturityFormula(9, "female") === "chronological_fallback", "باید fallback باشد");
  });
  check("دختر ۱۱ ساله (داخل بازه) → mirwald", () => {
    assert(selectMaturityFormula(11, "female") === "mirwald", "باید mirwald باشد");
  });

  console.log("\n[computeBioAge]");
  check("bio_age = age_at_phv_average + MO (پسر)", () => {
    assertClose(computeBioAge(-1.5, "male"), 12.5, 0.0001, "bio_age پسر نادرست");
  });
  check("bio_age = age_at_phv_average + MO (دختر)", () => {
    assertClose(computeBioAge(-0.8, "female"), 11.2, 0.0001, "bio_age دختر نادرست");
  });

  console.log("\n[determineMaturityType]");
  check("bio_age - chrono_age > 1 → early_maturer", () => {
    assert(determineMaturityType(14, 12) === "early_maturer", "باید early_maturer باشد");
  });
  check("bio_age - chrono_age < -1 → late_maturer", () => {
    assert(determineMaturityType(11, 13) === "late_maturer", "باید late_maturer باشد");
  });
  check("اختلاف داخل ±۱ → on_time_maturer", () => {
    assert(determineMaturityType(12.4, 12.5) === "on_time_maturer", "باید on_time_maturer باشد");
  });

  console.log("\n[computePhvZone — قرارداد MO-محور، جایگزین %PAH]");
  check("MO < -1 → pre_phv", () => {
    assert(computePhvZone(-1.5) === "pre_phv", "باید pre_phv باشد");
  });
  check("MO بین -۱ و ۱ → circa_phv", () => {
    assert(computePhvZone(0) === "circa_phv", "باید circa_phv باشد");
  });
  check("MO > 1 → post_phv", () => {
    assert(computePhvZone(1.5) === "post_phv", "باید post_phv باشد");
  });

  console.log("\n[calculateMaturityProfile — مسیر کامل]");
  check("پسر ۱۲.۵ ساله با نمونه‌ی سند → formula=mirwald, confidence=high, phv_zone=pre_phv", () => {
    const profile = calculateMaturityProfile({
      chronological_age_decimal: 12.5,
      biological_sex: "male",
      standing_height_cm: 155,
      sitting_height_cm: 78,
      leg_length_cm: 77,
      weight_kg: 45,
    });
    assertClose(profile.maturity_offset, -1.509193, 0.001, "maturity_offset نادرست");
    assert(profile.formula_used === "mirwald", "formula_used باید mirwald باشد");
    assert(profile.confidence === "high", "confidence باید high باشد");
    assert(profile.phv_zone === "pre_phv", "phv_zone باید pre_phv باشد (MO<-1)");
    assert(profile.ci_bio_age_years === 0.6, "ci باید ۰.۶ باشد");
  });

  check("پسر ۱۷ ساله (خارج بازه Mirwald) → chronological_fallback با warning دقیق سند", () => {
    const profile = calculateMaturityProfile({
      chronological_age_decimal: 17,
      biological_sex: "male",
      standing_height_cm: 175,
      sitting_height_cm: 90,
      leg_length_cm: 85,
      weight_kg: 65,
    });
    assert(profile.formula_used === "chronological_fallback", "formula_used باید fallback باشد");
    assert(profile.biological_age === 17, "biological_age باید = سن تقویمی باشد");
    assert(profile.maturity_offset === null, "maturity_offset باید null باشد");
    assert(profile.confidence === "low", "confidence باید low باشد");
    assert(profile.ci_bio_age_years === 3.0, "ci باید ۳.۰ باشد");
    assert(
      profile.warnings.includes("Age outside Mirwald validity; using chronological age as fallback"),
      "باید متن دقیق warning سند را داشته باشد"
    );
  });

  check("دختر ۱۱ ساله با اعداد گرد → formula=mirwald, phv_zone=circa_phv", () => {
    const profile = calculateMaturityProfile({
      chronological_age_decimal: 11,
      biological_sex: "female",
      standing_height_cm: 150,
      sitting_height_cm: 75,
      leg_length_cm: 75,
      weight_kg: 40,
    });
    assertClose(profile.maturity_offset, -0.801603, 0.001, "maturity_offset دختر نادرست");
    assert(profile.formula_used === "mirwald", "formula_used باید mirwald باشد");
    assert(profile.phv_zone === "circa_phv", "phv_zone باید circa_phv باشد");
  });

  console.log("\n[MO Outlier — flag نه throw]");
  check("MO خارج از ±۳ فقط warning می‌گیرد، throw نمی‌کند (ورودی‌های غیرواقعیِ عمدی)", () => {
    const profile = calculateMaturityProfile({
      chronological_age_decimal: 14,
      biological_sex: "male",
      standing_height_cm: 220,
      sitting_height_cm: 60,
      leg_length_cm: 160,
      weight_kg: 45,
    });
    assert(Math.abs(profile.maturity_offset) > 3, `انتظار |MO|>3، گرفتیم ${profile.maturity_offset}`);
    assert(
      profile.warnings.includes("outlier — recheck sitting_height measurement"),
      "باید warning outlier داشته باشد"
    );
  });

  console.log(`\n[test-engine-talentid-file2-maturity] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
