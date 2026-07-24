// اسکریپت تست مستقل برای فایل ۴ موتور اصلاحی (مدیریت بیماری‌ها + معماری
// اجباری جلسه).
// اجرا: node scripts/test-engine-corrective-file4-diseasemanagement.js

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
  const { evaluateDiseaseManagement, resolveMedicalModeSessionArchitecture } = await import(
    "../engine/corrective/file4_diseaseManagement.js"
  );

  console.log("\n[هر بیماری جدا]");
  check("دیابت: حذف تعادل یک‌طرفه بی‌قیدوشرط + هشدار کربوهیدرات", () => {
    const result = evaluateDiseaseManagement({ diseases: ["diabetes"] });
    assert(result.banned_tags.includes("unilateral_balance"));
    assert(result.equipment_priority.includes("seated_supported"));
    assert(result.warnings.some((w) => w.includes("کربوهیدرات")));
  });

  check("آرتروز: تکرار ۱۵-۲۰، تمپو ۳-۰-۳-۰، ممنوعیت High_Impact/Jumping/Plyometric", () => {
    const result = evaluateDiseaseManagement({ diseases: ["arthritis"] });
    assertDeepEqual(result.rep_range, [15, 20]);
    assertDeepEqual(result.tempo_overrides, ["3-0-3-0"]);
    ["High_Impact", "Jumping", "Plyometric"].forEach((tag) => assert(result.banned_tags.includes(tag)));
    assert(result.equipment_priority.includes("closed_kinetic_chain"));
  });

  check("قلبی/فشارخون: سقف RPE=۵، استراحت حداقل ۹۰، تمپو ۲-۰-۲-۰، Valsalva/Isometric ممنوع", () => {
    const result = evaluateDiseaseManagement({ diseases: ["heartOrHypertension"] });
    assertDeepEqual(result.rpe_range, [null, 5]);
    assert(result.rest_sec_min === 90);
    assertDeepEqual(result.tempo_overrides, ["2-0-2-0"]);
    ["Valsalva", "Isometric"].forEach((tag) => assert(result.banned_tags.includes(tag)));
  });

  check("فلج مغزی: استراحت حداقل ۹۰، تمپو ۴-۰-۲-۰، انفجاری ممنوع، اولویت کشش ایستا", () => {
    const result = evaluateDiseaseManagement({ diseases: ["cerebralPalsy"] });
    assert(result.rest_sec_min === 90);
    assertDeepEqual(result.tempo_overrides, ["4-0-2-0"]);
    assert(result.banned_tags.includes("Explosive"));
    assert(result.equipment_priority.includes("static_stretching_priority"));
  });

  check("بیماری کلیوی بدون فیستول/روز دیالیز: هیچ محدودیتی فعال نیست", () => {
    const result = evaluateDiseaseManagement({ diseases: ["kidneyDisease"] });
    assert(result.hard_stop === false);
    assertDeepEqual(result.banned_tags, []);
  });

  check("بیماری کلیوی با فیستول: حذف فشار مستقیم مچ + بارفیکس ممنوع + دستگاه فشاری", () => {
    const result = evaluateDiseaseManagement({ diseases: ["kidneyDisease"], hasFistula: true });
    assert(result.banned_tags.includes("direct_wrist_load"));
    assert(result.equipment_priority.includes("pressure_machine"));
    assert(result.specific_exercise_overrides.some((o) => o.matches === "pull_up" && o.action === "ban"));
  });

  check("بیماری کلیوی روز دیالیز واقعی: hard_stop مطلق با پیام صریح", () => {
    const result = evaluateDiseaseManagement({ diseases: ["kidneyDisease"], onDialysis: true, isDialysisDayToday: true });
    assert(result.hard_stop === true);
    assert(result.hard_stop_reasons.includes("روز دیالیز — تمرین سنگین کاملاً ممنوع"));
  });

  check("بیماری کلیوی: onDialysis=true ولی امروز روز دیالیز نیست → hard_stop نمی‌شود", () => {
    const result = evaluateDiseaseManagement({ diseases: ["kidneyDisease"], onDialysis: true, isDialysisDayToday: false });
    assert(result.hard_stop === false);
  });

  console.log("\n[MS — ساختار اینتروالی، نه عدد ثابت]");
  check("MS: RPE=۵، تگ نشسته، هشدار محیط خنک + ساختار اینتروالی، بدون هیچ عدد ثانیه/زمان ثابت در محدودیت‌های عددی", () => {
    const result = evaluateDiseaseManagement({ diseases: ["multipleSclerosis"] });
    assertDeepEqual(result.rpe_range, [null, 5]);
    assert(result.equipment_priority.includes("seated_balance_core_stability"));
    assert(result.warnings.some((w) => w.includes("محیط خنک")));
    assert(result.warnings.some((w) => w.includes("اینتروالی")));
    // برخلاف بیماری‌های دیگر، MS نباید هیچ rest_sec_min عددی ثابتی داشته
    // باشد — دقیقاً چون سند خودش گفته منبع علمی برای یک عدد ثابت نیست.
    assert(result.rest_sec_min === null, "MS نباید rest_sec_min عددی هاردکد داشته باشد");
  });

  console.log("\n[هم‌زمانی چند بیماری — سخت‌گیرترین/ترکیب برنده است]");
  check("دیابت + آرتروز هم‌زمان: banned_tags/equipment_priority/warnings همه‌ی دو بیماری را ترکیب می‌کند", () => {
    const result = evaluateDiseaseManagement({ diseases: ["diabetes", "arthritis"] });
    ["unilateral_balance", "High_Impact", "Jumping", "Plyometric"].forEach((tag) => assert(result.banned_tags.includes(tag)));
    ["seated_supported", "closed_kinetic_chain"].forEach((tag) => assert(result.equipment_priority.includes(tag)));
    assert(result.warnings.some((w) => w.includes("کربوهیدرات")));
    assertDeepEqual(result.rep_range, [15, 20], "rep_range فقط از آرتروز می‌آید چون دیابت رپ‌رنج ندارد");
  });

  check("قلبی + فلج‌مغزی هم‌زمان: rest_sec_min با mergeMax ترکیب می‌شود و تمپوهای هر دو باقی می‌مانند", () => {
    const result = evaluateDiseaseManagement({ diseases: ["heartOrHypertension", "cerebralPalsy"] });
    assert(result.rest_sec_min === 90);
    assertDeepEqual([...result.tempo_overrides].sort(), ["2-0-2-0", "4-0-2-0"].sort());
    ["Valsalva", "Isometric", "Explosive"].forEach((tag) => assert(result.banned_tags.includes(tag)));
  });

  console.log("\n[معماری اجباری جلسه — تریگر + مرزهای دقیق]");
  check("بدون هیچ بیماری‌ای: Medical_Mode غیرفعال است", () => {
    const result = resolveMedicalModeSessionArchitecture({ diseases: [], monthNumber: 1 });
    assertDeepEqual(result, { medicalModeActive: false });
  });

  check("ماه ۱ با بیماری: بازه‌ی جلسه دقیقاً ۳۰-۴۵ دقیقه", () => {
    const result = resolveMedicalModeSessionArchitecture({ diseases: ["diabetes"], monthNumber: 1 });
    assert(result.medicalModeActive === true);
    assertDeepEqual(result.sessionMinutesRange, [30, 45]);
    assert(result.rpeCap === 6);
    assertDeepEqual(result.restSecRange, [60, 120]);
    assert(result.monthlyProgressionCapPercent === 5);
  });

  check("ماه ۲ به بعد: بازه‌ی جلسه فقط سقف ۶۰ (بدون کف مستند)", () => {
    const result = resolveMedicalModeSessionArchitecture({ diseases: ["diabetes"], monthNumber: 2 });
    assertDeepEqual(result.sessionMinutesRange, [null, 60]);
  });

  check("گرم‌کردن ۱۰ دقیقه پیش‌فرض، ۱۲ دقیقه اگر شرط قلبی باشد", () => {
    const normal = resolveMedicalModeSessionArchitecture({ diseases: ["diabetes"], monthNumber: 1 });
    const cardiac = resolveMedicalModeSessionArchitecture({ diseases: ["heartOrHypertension"], monthNumber: 1, hasCardiacCondition: true });
    assert(normal.warmupMinutes === 10);
    assert(cardiac.warmupMinutes === 12);
  });

  check("LISS و سردکردن طبق سند: از دقیقه‌ی ۱۰، ماهانه +۲۰٪، سقف جلسه ۶۰ دقیقه، سردکردن ۵ دقیقه ثابت", () => {
    const result = resolveMedicalModeSessionArchitecture({ diseases: ["diabetes"], monthNumber: 1 });
    assert(result.lissForcedFromMinute === 10);
    assert(result.lissMonthlyIncreasePercent === 20);
    assert(result.lissSessionCapMinutes === 60);
    assert(result.cooldownMinutes === 5);
  });

  check("requiresIntervalStructure فقط وقتی MS در لیست بیماری‌هاست true می‌شود", () => {
    const withoutMs = resolveMedicalModeSessionArchitecture({ diseases: ["diabetes"], monthNumber: 1 });
    const withMs = resolveMedicalModeSessionArchitecture({ diseases: ["diabetes", "multipleSclerosis"], monthNumber: 1 });
    assert(withoutMs.requiresIntervalStructure === false);
    assert(withMs.requiresIntervalStructure === true);
  });

  check("هشدار سربرگ اجباری همیشه حاضر است", () => {
    const result = resolveMedicalModeSessionArchitecture({ diseases: ["diabetes"], monthNumber: 1 });
    assert(result.mandatoryHeaderWarning === "در صورت تنگی نفس/سرگیجه فوراً متوقف کنید.");
  });

  console.log("\n[اعتبارسنجی ورودی نامعتبر]");
  check("بیماری ناشناخته در evaluateDiseaseManagement رد می‌شود", () => {
    assertThrows(
      () => evaluateDiseaseManagement({ diseases: ["flu"] }),
      "diseases نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  check("monthNumber نامعتبر در resolveMedicalModeSessionArchitecture رد می‌شود", () => {
    assertThrows(
      () => resolveMedicalModeSessionArchitecture({ diseases: ["diabetes"], monthNumber: 0 }),
      "monthNumber نامعتبر",
      "باید با خطای صریح رد شود"
    );
  });

  console.log(`\n[test-engine-corrective-file4-diseasemanagement] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
