// اسکریپت تست مستقل برای engine/talentId/file3_normativeDataLookup.js.
// اجرا: node scripts/test-engine-talentid-file3-normative.js
//
// ⚠️ این تست‌ها روی داده‌ی placeholder_unverified اجرا می‌شوند (رجوع کنید
// به docs/TODO-normative-data.md) — فقط منطق lookup را تأیید می‌کنند، نه
// درستی علمی خودِ اعداد.
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

function assertThrowsWithCode(fn, expectedCode, description) {
  try {
    fn();
    throw new Error(`${description || "انتظار throw داشتیم"} — اما throw نشد`);
  } catch (err) {
    if (err.code !== expectedCode) {
      throw new Error(`${description || "code نامنتظره"} — انتظار "${expectedCode}", گرفتیم "${err.code}"`);
    }
  }
}

(async () => {
  const { lookupTier, lookupPercentile, _selectBand } = await import(
    "../engine/talentId/file3_normativeDataLookup.js"
  );
  const normativeDataModule = await import("../engine/talentId/shared/normativeData.json", {
    with: { type: "json" },
  });
  const normativeData = normativeDataModule.default;

  console.log("\n[data_status — یادآوری صریح placeholder بودن]");
  check('normativeData.data_status باید دقیقاً "placeholder_unverified" باشد', () => {
    assert(normativeData.data_status === "placeholder_unverified", `گرفتیم: "${normativeData.data_status}"`);
  });

  console.log("\n[_selectBand — مرزهای دقیق ۵ بازه]");
  check("۹.۹ → bio_age_8_9", () => assert(_selectBand(9.9) === "bio_age_8_9"));
  check("۱۰.۰ → bio_age_10_11", () => assert(_selectBand(10.0) === "bio_age_10_11"));
  check("۱۱.۹ → bio_age_10_11", () => assert(_selectBand(11.9) === "bio_age_10_11"));
  check("۱۲.۰ → bio_age_12_13", () => assert(_selectBand(12.0) === "bio_age_12_13"));
  check("۱۳.۹ → bio_age_12_13", () => assert(_selectBand(13.9) === "bio_age_12_13"));
  check("۱۴.۰ → bio_age_14_15", () => assert(_selectBand(14.0) === "bio_age_14_15"));
  check("۱۵.۹ → bio_age_14_15", () => assert(_selectBand(15.9) === "bio_age_14_15"));
  check("۱۶.۰ → bio_age_16_17", () => assert(_selectBand(16.0) === "bio_age_16_17"));

  console.log("\n[lookupTier — پایه]");
  check("پسر ۱۰.۵ ساله، پرش ۴۵ سانتی‌متر → excellent_top_20، بدون fallback", () => {
    const result = lookupTier("vertical_jump", 45, 10.5, "male");
    assert(result.tier === "excellent_top_20", `تیر نادرست: ${result.tier}`);
    assert(result.higher_is_better === true, "higher_is_better باید true باشد");
    assert(result.band_used === "bio_age_10_11", "band_used نادرست");
    assert(result.fallback_applied === false, "fallback_applied باید false باشد");
  });

  console.log("\n[higher_is_better inversion برای sprint]");
  check("پسر ۱۰.۵ ساله، دوی ۱۰ متر ۲.۳ ثانیه (زمان بیشتر=بدتر) → average_mid_60", () => {
    const result = lookupTier("sprint_10m", 2.3, 10.5, "male");
    assert(result.tier === "average_mid_60", `تیر نادرست: ${result.tier}`);
    assert(result.higher_is_better === false, "higher_is_better باید false باشد");
  });
  check("پسر ۱۰.۵ ساله، دوی ۱۰ متر ۲.۰ ثانیه (سریع‌تر) → excellent_top_20", () => {
    const result = lookupTier("sprint_10m", 2.0, 10.5, "male");
    assert(result.tier === "excellent_top_20", `تیر نادرست: ${result.tier}`);
  });

  console.log("\n[TalentIdError — تست کلاً بدون داده]");
  check('تستی که در هیچ بازه‌ای seed نشده (مثلاً "handgrip") → TalentIdError با code=NORMATIVE_MISSING', () => {
    assertThrowsWithCode(() => lookupTier("handgrip", 30, 12, "male"), "NORMATIVE_MISSING");
  });

  console.log("\n[Fallback به بازه‌ی مجاور]");
  check("پسر ۸.۵ ساله (بازه bio_age_8_9 بدون داده) → fallback به bio_age_10_11", () => {
    const result = lookupTier("vertical_jump", 45, 8.5, "male");
    assert(result.band_used === "bio_age_10_11", `band_used نادرست: ${result.band_used}`);
    assert(result.fallback_applied === true, "fallback_applied باید true باشد");
  });

  check("پسر ۱۳ ساله (بازه bio_age_12_13 بدون داده) → fallback به bio_age_10_11 (نزدیک‌تر از دو طرف)", () => {
    const result = lookupTier("vertical_jump", 45, 13, "male");
    assert(result.band_used === "bio_age_10_11", `band_used نادرست: ${result.band_used}`);
    assert(result.fallback_applied === true, "fallback_applied باید true باشد");
  });

  check("پسر ۱۷ ساله (بازه bio_age_16_17 بدون داده) → fallback به bio_age_14_15", () => {
    const result = lookupTier("vertical_jump", 45, 17, "male");
    assert(result.band_used === "bio_age_14_15", `band_used نادرست: ${result.band_used}`);
    assert(result.fallback_applied === true, "fallback_applied باید true باشد");
  });

  console.log("\n[lookupPercentile — monotonic بودن]");
  check("excellent > average > poor به ترتیب percentile نزولی دارند", () => {
    const excellentPercentile = lookupPercentile("vertical_jump", 45, 10.5, "male"); // excellent
    const averagePercentile = lookupPercentile("vertical_jump", 30, 10.5, "male"); // average
    const poorPercentile = lookupPercentile("vertical_jump", 10, 10.5, "male"); // poor
    assert(excellentPercentile > averagePercentile, "excellent باید از average بیشتر باشد");
    assert(averagePercentile > poorPercentile, "average باید از poor بیشتر باشد");
    assert(excellentPercentile === 85 && averagePercentile === 50 && poorPercentile === 10, "مقادیر دقیق نادرست");
  });

  console.log("\n[out_of_range — مقدار خارج از همه‌ی بازه‌ها]");
  check("مقدار منفی برای sprint_10m (خارج از ۰-۹۹۹) → out_of_range=true", () => {
    const result = lookupTier("sprint_10m", -5, 10.5, "male");
    assert(result.out_of_range === true, "باید out_of_range=true باشد");
  });

  console.log(`\n[test-engine-talentid-file3-normative] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
