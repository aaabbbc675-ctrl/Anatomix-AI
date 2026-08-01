// اسکریپت تست مستقل برای Commit 20 (بخش ۱۹ سند معماری): پنجره‌های حساس LTAD.
// پوشش می‌دهد: engine/talentId/shared/sensitivePeriodsLTAD.js +
// computeSensitivePeriodNotes/attachSensitivePeriodNotesToReports در file13.
// اجرا: node scripts/test-engine-talentid-ltad-sensitiveperiods.js
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

(async () => {
  const { computeSensitivePeriodNotes, attachSensitivePeriodNotesToReports, generateMatchReports } = await import(
    "../engine/talentId/file13_explainabilityEngine.js"
  );
  const { sensitivePeriodsLTAD } = await import("../engine/talentId/shared/sensitivePeriodsLTAD.js");
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  const SPORT_IDS = Object.keys(sportRequirementMatrix);

  function abilitiesOf(notes) {
    return notes.map((n) => n.ability).sort();
  }

  // ─── داده‌ی خام: شکل و کامل‌بودن ────────────────────────────────────────
  console.log("\n[sensitivePeriodsLTAD — شکل داده]");
  check("دقیقاً ۶ توانایی طبق بخش ۱۹.۲ سند", () => {
    assert(Object.keys(sensitivePeriodsLTAD).length === 6, "باید ۶ توانایی باشد");
  });
  check("هر ۶ رکورد confidence='level_ii_consensus' دارند (طبق بخش ۲۳.۴ سند)", () => {
    for (const [ability, config] of Object.entries(sensitivePeriodsLTAD)) {
      assert(config.confidence === "level_ii_consensus", `${ability} باید level_ii_consensus باشد`);
    }
  });
  check("فقط flexibility پنجره‌ی universal دارد، بقیه male/female مجزا", () => {
    assert(sensitivePeriodsLTAD.flexibility.windows.universal, "flexibility باید universal داشته باشد");
    for (const ability of ["speed_1", "speed_2", "strength", "aerobic_capacity", "skill_acquisition"]) {
      assert(sensitivePeriodsLTAD[ability].windows.male, `${ability}.male باید موجود باشد`);
      assert(sensitivePeriodsLTAD[ability].windows.female, `${ability}.female باید موجود باشد`);
      assert(!sensitivePeriodsLTAD[ability].windows.universal, `${ability} نباید universal داشته باشد`);
    }
  });
  check("بازه‌ی قدرت پسران دقیقاً ۱۲-۱۸ ماه پس از PHV طبق کامنت سند (۱۴-۱۷ سالگی)", () => {
    assert(sensitivePeriodsLTAD.strength.windows.male.start_bio_age === 14);
    assert(sensitivePeriodsLTAD.strength.windows.male.end_bio_age === 17);
  });

  // ─── computeSensitivePeriodNotes — مرزها ───────────────────────────────
  console.log("\n[computeSensitivePeriodNotes — مرزهای بازه]");
  check("bioAge=7 پسر → داخل speed_1 (مرز پایین، شامل)", () => {
    assert(abilitiesOf(computeSensitivePeriodNotes(7, "male")).includes("speed_1"));
  });
  check("bioAge=9 پسر → هنوز داخل speed_1 (مرز بالا، شامل)", () => {
    assert(abilitiesOf(computeSensitivePeriodNotes(9, "male")).includes("speed_1"));
  });
  check("bioAge=9.01 پسر → دیگر داخل speed_1 نیست", () => {
    assert(!abilitiesOf(computeSensitivePeriodNotes(9.01, "male")).includes("speed_1"));
  });
  check("bioAge=6.99 پسر → هنوز داخل speed_1 نیست", () => {
    assert(!abilitiesOf(computeSensitivePeriodNotes(6.99, "male")).includes("speed_1"));
  });
  check("bioAge=20 (هر دو جنس) → هیچ پنجره‌ای فعال نیست، آرایه‌ی خالی", () => {
    assert(computeSensitivePeriodNotes(20, "male").length === 0, "پسر ۲۰ ساله نباید پنجره‌ای داشته باشد");
    assert(computeSensitivePeriodNotes(20, "female").length === 0, "دختر ۲۰ ساله نباید پنجره‌ای داشته باشد");
  });
  check("bioAge=4 (هر دو جنس) → هیچ پنجره‌ای فعال نیست", () => {
    assert(computeSensitivePeriodNotes(4, "male").length === 0);
    assert(computeSensitivePeriodNotes(4, "female").length === 0);
  });

  // ─── تفاوت جنسیتی ───────────────────────────────────────────────────────
  console.log("\n[تفاوت male/female]");
  check("bioAge=13 پسر → داخل speed_2 (۱۳-۱۶)، دختر همان سن دیگر داخل speed_2 نیست (۱۱-۱۳ برای دختر شامل ۱۳ است، پس چک با ۱۴)", () => {
    assert(abilitiesOf(computeSensitivePeriodNotes(13, "male")).includes("speed_2"));
    assert(abilitiesOf(computeSensitivePeriodNotes(13, "female")).includes("speed_2")); // مرز بالای دختر هم ۱۳ است
    assert(!abilitiesOf(computeSensitivePeriodNotes(14, "female")).includes("speed_2"), "دختر ۱۴ ساله دیگر در speed_2 نیست");
  });
  check("bioAge=12 دختر → داخل strength (۱۲-۱۵ دختر)، پسر همان سن هنوز داخل strength نیست (۱۴-۱۷ پسر)", () => {
    assert(abilitiesOf(computeSensitivePeriodNotes(12, "female")).includes("strength"));
    assert(!abilitiesOf(computeSensitivePeriodNotes(12, "male")).includes("strength"));
  });

  // ─── پنجره‌ی universal مستقل از جنسیت ───────────────────────────────────
  console.log("\n[پنجره‌ی universal — flexibility]");
  check("bioAge=8 → flexibility برای هر دو جنس یکسان فعال است", () => {
    assert(abilitiesOf(computeSensitivePeriodNotes(8, "male")).includes("flexibility"));
    assert(abilitiesOf(computeSensitivePeriodNotes(8, "female")).includes("flexibility"));
  });

  // ─── هم‌پوشانی چند پنجره‌ی هم‌زمان ───────────────────────────────────────
  console.log("\n[هم‌پوشانی چند پنجره]");
  check("bioAge=9 پسر → دقیقاً هم‌زمان در speed_1(7-9)، flexibility(6-12)، skill_acquisition(9-12)", () => {
    const abilities = abilitiesOf(computeSensitivePeriodNotes(9, "male"));
    assert(abilities.length === 3, `انتظار ۳ پنجره‌ی هم‌زمان بود، گرفتیم ${abilities.length}: ${abilities}`);
    assert(abilities.includes("speed_1") && abilities.includes("flexibility") && abilities.includes("skill_acquisition"));
  });

  // ─── شکل ساختاریافته‌ی هر note ───────────────────────────────────────────
  console.log("\n[شکل ساختاریافته‌ی هر note — طبق تصمیم تاییدشده‌ی Commit 20]");
  check("هر note شامل ability/ability_label_fa/description_fa/confidence است، نه رشته‌ی خام", () => {
    const notes = computeSensitivePeriodNotes(8, "male");
    assert(notes.length > 0, "باید حداقل یک note داشته باشیم");
    for (const note of notes) {
      assert(typeof note.ability === "string");
      assert(typeof note.ability_label_fa === "string" && note.ability_label_fa.length > 0);
      assert(typeof note.description_fa === "string" && note.description_fa.length > 0);
      assert(note.confidence === "level_ii_consensus");
      assert(!note.description_fa.includes("✨"), "description_fa نباید ایموجی از پیش‌چسبیده داشته باشد");
    }
  });

  // ─── دفاعی: bioAge نامعتبر ───────────────────────────────────────────────
  console.log("\n[دفاعی — bioAge نامعتبر]");
  check("bioAge=null → آرایه‌ی خالی، بدون throw", () => {
    assert(computeSensitivePeriodNotes(null, "male").length === 0);
  });
  check("bioAge=undefined → آرایه‌ی خالی، بدون throw", () => {
    assert(computeSensitivePeriodNotes(undefined, "male").length === 0);
  });
  check("bioAge=NaN → آرایه‌ی خالی، بدون throw", () => {
    assert(computeSensitivePeriodNotes(NaN, "male").length === 0);
  });

  // ─── رفع باگ pseudocode سند: sex نامعتبر نباید throw کند ─────────────────
  console.log("\n[رفع باگ سند — sex نامعتبر روی توانایی بدون universal]");
  check("sex نامعتبر (نه male/female) → بدون throw، فقط پنجره‌های universal (flexibility) در نظر گرفته می‌شوند", () => {
    let notes;
    assert(
      (() => {
        try {
          notes = computeSensitivePeriodNotes(8, "unknown_sex");
          return true;
        } catch {
          return false;
        }
      })(),
      "نباید throw کند"
    );
    const abilities = abilitiesOf(notes);
    assert(abilities.length === 1 && abilities[0] === "flexibility", `فقط flexibility انتظار می‌رفت، گرفتیم: ${abilities}`);
  });

  // ─── purity — بدون mutation، انحراف عمدی از pseudocode سند ──────────────
  console.log("\n[Purity — بدون mutation]");
  check("computeSensitivePeriodNotes هیچ ورودی خارجی‌ای ندارد که mutate کند (فقط اعداد ساده می‌گیرد)", () => {
    const before = JSON.stringify(sensitivePeriodsLTAD);
    computeSensitivePeriodNotes(9, "male");
    assert(JSON.stringify(sensitivePeriodsLTAD) === before, "sensitivePeriodsLTAD نباید تغییر کند");
  });

  // ─── attachSensitivePeriodNotesToReports — سطح یکپارچه‌سازی ─────────────
  console.log("\n[attachSensitivePeriodNotesToReports — یکپارچه‌سازی]");
  function neutralSources(overrides = {}) {
    function emptyKeyedBySport(fn) {
      const result = {};
      for (const sportId of SPORT_IDS) result[sportId] = fn(sportId);
      return result;
    }
    return {
      bioScores: emptyKeyedBySport(() => ({ final_bio_score: 100, drivers: [] })),
      posturalResult: { adjustments_by_sport: {}, active_postures: [] },
      romResult: { adjustments_by_sport: {} },
      perfScores: emptyKeyedBySport(() => ({ final_perf_score: 100, drivers: [] })),
      psychScores: emptyKeyedBySport(() => ({ final_psych_score: 100, drivers: [] })),
      psychProfile: { extracted_confidence: 0.9 },
      medicalHolds: emptyKeyedBySport(() => ({ status: "clear" })),
      maturityProfile: { formula_used: "mirwald", maturity_type: "on_time_maturer" },
      bioBanded: emptyKeyedBySport(() => ({
        adjusted_bio_score: 140,
        adjusted_perf_score: 130,
        adjusted_psych_score: 95,
        maturity_adjustment_factor: 1.0,
      })),
      ...overrides,
    };
  }

  check("ورودی reports (خروجی generateMatchReports) mutate نمی‌شود", () => {
    const sources = neutralSources();
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const beforeSnapshot = JSON.stringify(reports);
    attachSensitivePeriodNotesToReports(reports, 9, "male");
    assert(JSON.stringify(reports) === beforeSnapshot, "reports ورودی نباید تغییر کند");
  });

  check("هر ۵۲ رشته دقیقاً همان ltad_notes یکسان می‌گیرند — universal، نه per-sport", () => {
    const sources = neutralSources();
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const withNotes = attachSensitivePeriodNotesToReports(reports, 9, "male");
    const idsCount = Object.keys(withNotes).length;
    assert(idsCount === SPORT_IDS.length, `انتظار ${SPORT_IDS.length} رشته بود، گرفتیم ${idsCount}`);
    const referenceNotes = JSON.stringify(withNotes[SPORT_IDS[0]].ltad_notes);
    for (const sportId of SPORT_IDS) {
      assert(
        JSON.stringify(withNotes[sportId].ltad_notes) === referenceNotes,
        `ltad_notes باید برای ${sportId} با بقیه یکسان باشد`
      );
    }
    assert(withNotes[SPORT_IDS[0]].ltad_notes.length === 3, "bioAge=9 پسر باید ۳ پنجره‌ی هم‌زمان داشته باشد");
  });

  check("خروجی همچنان تمام فیلدهای اصلی MatchReport (final_score و غیره) را حفظ می‌کند", () => {
    const sources = neutralSources();
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const withNotes = attachSensitivePeriodNotesToReports(reports, 9, "male");
    for (const sportId of SPORT_IDS) {
      assert(typeof withNotes[sportId].final_score === "number", `${sportId} باید final_score داشته باشد`);
      assert(typeof withNotes[sportId].final_tier === "string", `${sportId} باید final_tier داشته باشد`);
      assert(Array.isArray(withNotes[sportId].ltad_notes), `${sportId} باید ltad_notes داشته باشد`);
    }
  });

  check("bioAge=20 (خارج از همه‌ی پنجره‌ها) → ltad_notes آرایه‌ی خالی برای همه، نه غایب", () => {
    const sources = neutralSources();
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    const withNotes = attachSensitivePeriodNotesToReports(reports, 20, "male");
    for (const sportId of SPORT_IDS) {
      assert(Array.isArray(withNotes[sportId].ltad_notes) && withNotes[sportId].ltad_notes.length === 0);
    }
  });

  // ─── رگرسیون: generateMatchReports خودش دست‌نخورده مانده ────────────────
  console.log("\n[رگرسیون — generateMatchReports بدون ltad_notes]");
  check("generateMatchReports خام (بدون attach) هیچ فیلد ltad_notes ندارد — صفر تغییر در تابع موجود", () => {
    const sources = neutralSources();
    const reports = generateMatchReports(sportRequirementMatrix, sources);
    assert(reports[SPORT_IDS[0]].ltad_notes === undefined, "generateMatchReports نباید خودش ltad_notes اضافه کند");
  });

  console.log(`\n${"─".repeat(60)}`);
  console.log(`نتیجه: ${passCount} PASS, ${failCount} FAIL`);
  if (failCount > 0) process.exit(1);
})();
