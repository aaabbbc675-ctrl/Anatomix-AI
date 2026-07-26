// اسکریپت تست مستقل برای فایل ۳ موتور تغذیه (computeSportMacros/selectSportRowKey).
// اجرا: node scripts/test-engine-nutrition-file3-macromatrix.js
//
// همه‌ی اعداد انتظار با دست (خارج از کد موتور) محاسبه و با node -e جداگانه
// صحت‌سنجی شده‌اند، دقیقاً هم‌الگوی batch ۲ — نه از خروجی خودِ تابع کپی شده.

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

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || "mismatch"} — actual: ${actual}, expected: ${expected} (±${tolerance})`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

(async () => {
  const { computeSportMacros, selectSportRowKey, SPORT_ROWS, PROTEIN_FLOOR_G_PER_KG } = await import(
    "../engine/nutrition/file3_macroMatrix.js"
  );

  console.log("\n[کف پروتئین عمومی هرگز نباید فعال شود — طبق درخواست صریح، تست شود نه فرض]");
  check("پایین‌ترین MEV پروتئین بین هر ۸ ردیف (endurance=1.2) هرگز کمتر از کف عمومی بخش ۱.۲ (1.2 g/kg) نیست", () => {
    assert(PROTEIN_FLOOR_G_PER_KG === 1.2, "کف عمومی وارداتی از فایل ۲ باید 1.2 باشد");
    for (const [key, row] of Object.entries(SPORT_ROWS)) {
      assert(
        row.protein_mev_g_per_kg >= PROTEIN_FLOOR_G_PER_KG,
        `${key}: MEV پروتئین (${row.protein_mev_g_per_kg}) نباید کمتر از کف عمومی (${PROTEIN_FLOOR_G_PER_KG}) باشد`
      );
    }
    // endurance دقیقاً مرز است (1.2=1.2) — صریح جداگانه هم چک می‌شود.
    assertClose(SPORT_ROWS.ENDURANCE.protein_mev_g_per_kg, 1.2, 0.0001, "استقامتی باید دقیقاً 1.2 باشد، نه کمتر");
  });

  console.log("\n[selectSportRowKey — مسیریابی، شاخه‌ی sport_type+main_goal برای بادی‌بیلدینگ در کات]");
  check("fitness_bodybuilding + fat_loss → BODYBUILDING_CUT", () => {
    assert(selectSportRowKey({ sport_type: "fitness_bodybuilding", main_goal: "fat_loss" }) === "BODYBUILDING_CUT");
  });
  check("fitness_bodybuilding + muscle_gain → FITNESS_BODYBUILDING (نه کات)", () => {
    assert(
      selectSportRowKey({ sport_type: "fitness_bodybuilding", main_goal: "muscle_gain" }) === "FITNESS_BODYBUILDING"
    );
  });
  check("fitness_bodybuilding + maintenance → FITNESS_BODYBUILDING (نه کات)", () => {
    assert(
      selectSportRowKey({ sport_type: "fitness_bodybuilding", main_goal: "maintenance" }) === "FITNESS_BODYBUILDING"
    );
  });
  check("رشته‌ی دیگر + fat_loss هرگز به کات نمی‌رود (شرط مختص fitness_bodybuilding است)", () => {
    assert(
      selectSportRowKey({ sport_type: "powerlifting_weightlifting", main_goal: "fat_loss" }) ===
        "POWERLIFTING_WEIGHTLIFTING"
    );
  });
  check("sport_type نامعتبر throw می‌کند", () => {
    let threw = false;
    try {
      selectSportRowKey({ sport_type: "chess", main_goal: "maintenance" });
    } catch {
      threw = true;
    }
    assert(threw, "انتظار throw داشتیم");
  });

  console.log("\n[هر ۸ ردیف — سناریوی واقعی دستی‌حساب‌شده، بدون هشدار (fat/carb هر دو داخل بازه)]");

  check("FITNESS_BODYBUILDING — این هم سناریوی fat_raised_to_generic_floor واقعی است (weight=70, target=1700)", () => {
    // proteinG=1.6×70=112؛ sportFatG=0.5×70=35؛ کف عمومی=max(35,0.2×1700/9=37.78)=37.78 (کف غالب)
    // carbG=(1700-448-340)/4=228 → 228/70=3.257 (داخل بازه‌ی منطقی ۳-۵، بدون هشدار کربوهیدرات)
    const result = computeSportMacros({
      sport_type: "fitness_bodybuilding",
      main_goal: "muscle_gain",
      weight_kg: 70,
      target_calories: 1700,
    });
    assert(result.sport_row_used === "FITNESS_BODYBUILDING");
    assertClose(result.protein_g, 112, 0.001);
    assertClose(result.fat_g, 37.7778, 0.001, "چربی باید کف عمومی (37.78) باشد، نه MEV رشته‌ای (35)");
    assertClose(result.carb_g, 228, 0.001);
    assert(result.warnings.length === 1, `انتظار دقیقاً ۱ هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
    assert(result.warnings[0].code === "fat_raised_to_generic_floor");
    assert(result.warnings[0].severity === "info");
  });

  check("BODYBUILDING_CUT — بدون g/kg چربی، همیشه دقیقاً کف عمومی (weight=70, target=2000)", () => {
    // proteinG=2.3×70=161؛ fatG=کف عمومی=max(35,0.2×2000/9=44.44)=44.44
    // carbG=(2000-644-400)/4=239 → 239/70=3.414 (داخل بازه‌ی منطقی ۲-۵)
    const result = computeSportMacros({
      sport_type: "fitness_bodybuilding",
      main_goal: "fat_loss",
      weight_kg: 70,
      target_calories: 2000,
    });
    assert(result.sport_row_used === "BODYBUILDING_CUT");
    assertClose(result.protein_g, 161, 0.001);
    assertClose(result.fat_g, 44.4444, 0.001);
    assertClose(result.carb_g, 239, 0.001);
    assert(result.warnings.length === 0, `انتظار بدون هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
  });

  check("POWERLIFTING_WEIGHTLIFTING — بدون هشدار (weight=80, target=2700)", () => {
    // proteinG=1.5×80=120؛ sportFatG=1.0×80=80؛ کف عمومی=max(80,0.2×2700/9=60)=80 (رشته‌ای غالب)
    // carbG=(2700-480-720)/4=375 → 375/80=4.6875 (داخل بازه‌ی منطقی ۴-۶)
    const result = computeSportMacros({
      sport_type: "powerlifting_weightlifting",
      main_goal: "maintenance",
      weight_kg: 80,
      target_calories: 2700,
    });
    assert(result.sport_row_used === "POWERLIFTING_WEIGHTLIFTING");
    assertClose(result.protein_g, 120, 0.001);
    assertClose(result.fat_g, 80, 0.001);
    assertClose(result.carb_g, 375, 0.001);
    assert(result.warnings.length === 0, `انتظار بدون هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
  });

  check("TEAM_SPORTS — بدون هشدار (weight=75, target=3000)", () => {
    // proteinG=1.4×75=105؛ sportFatG=1.0×75=75؛ کف عمومی=max(75,0.2×3000/9=66.67)=75
    // carbG=(3000-420-675)/4=476.25 → /75=6.35 (داخل بازه‌ی منطقی ۵-۸)
    const result = computeSportMacros({
      sport_type: "team_sports",
      main_goal: "maintenance",
      weight_kg: 75,
      target_calories: 3000,
    });
    assert(result.sport_row_used === "TEAM_SPORTS");
    assertClose(result.protein_g, 105, 0.001);
    assertClose(result.fat_g, 75, 0.001);
    assertClose(result.carb_g, 476.25, 0.001);
    assert(result.warnings.length === 0, `انتظار بدون هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
  });

  check("COMBAT_SPORTS — بدون هشدار (weight=90, target=3000)", () => {
    // proteinG=1.8×90=162؛ sportFatG=0.8×90=72؛ کف عمومی=max(72,0.2×3000/9=66.67)=72
    // carbG=(3000-648-648)/4=426 → /90=4.733 (داخل بازه‌ی منطقی ۴-۶)
    const result = computeSportMacros({
      sport_type: "combat_sports",
      main_goal: "maintenance",
      weight_kg: 90,
      target_calories: 3000,
    });
    assert(result.sport_row_used === "COMBAT_SPORTS");
    assertClose(result.protein_g, 162, 0.001);
    assertClose(result.fat_g, 72, 0.001);
    assertClose(result.carb_g, 426, 0.001);
    assert(result.warnings.length === 0, `انتظار بدون هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
  });

  check("ENDURANCE — بدون هشدار (weight=100, target=4300)", () => {
    // proteinG=1.2×100=120؛ sportFatG=1.0×100=100؛ کف عمومی=max(100,0.2×4300/9=95.56)=100
    // carbG=(4300-480-900)/4=730 → /100=7.3 (داخل بازه‌ی منطقی ۷-۱۰ پایه)
    const result = computeSportMacros({
      sport_type: "endurance",
      main_goal: "maintenance",
      weight_kg: 100,
      target_calories: 4300,
    });
    assert(result.sport_row_used === "ENDURANCE");
    assertClose(result.protein_g, 120, 0.001);
    assertClose(result.fat_g, 100, 0.001);
    assertClose(result.carb_g, 730, 0.001);
    assert(result.warnings.length === 0, `انتظار بدون هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
  });

  check("SPRINT — بدون هشدار (weight=70, target=2700)", () => {
    // proteinG=1.5×70=105؛ sportFatG=1.0×70=70؛ کف عمومی=max(70,0.2×2700/9=60)=70
    // carbG=(2700-420-630)/4=412.5 → /70=5.893 (داخل بازه‌ی منطقی ۵-۷)
    const result = computeSportMacros({
      sport_type: "sprint",
      main_goal: "maintenance",
      weight_kg: 70,
      target_calories: 2700,
    });
    assert(result.sport_row_used === "SPRINT");
    assertClose(result.protein_g, 105, 0.001);
    assertClose(result.fat_g, 70, 0.001);
    assertClose(result.carb_g, 412.5, 0.001);
    assert(result.warnings.length === 0, `انتظار بدون هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
  });

  check("SKILL_SPORTS — بدون هشدار (weight=65, target=2500)", () => {
    // proteinG=1.3×65=84.5؛ sportFatG=1.0×65=65؛ کف عمومی=max(65,0.2×2500/9=55.56)=65
    // carbG=(2500-338-585)/4=394.25 → /65=6.065 (داخل بازه‌ی منطقی ۵-۷)
    const result = computeSportMacros({
      sport_type: "skill_sports",
      main_goal: "maintenance",
      weight_kg: 65,
      target_calories: 2500,
    });
    assert(result.sport_row_used === "SKILL_SPORTS");
    assertClose(result.protein_g, 84.5, 0.001);
    assertClose(result.fat_g, 65, 0.001);
    assertClose(result.carb_g, 394.25, 0.001);
    assert(result.warnings.length === 0, `انتظار بدون هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
  });

  console.log("\n[هشدارهای خاص — سناریوهای جداگانه]");

  check("carb_g منفی → target_calories_unrealistic (بازاستفاده از کد فایل ۲) — combat_sports weight=100,target=1000", () => {
    // proteinG=1.8×100=180؛ sportFatG=0.8×100=80؛ کف عمومی=max(80,0.2×1000/9=22.22)=80
    // carbG=(1000-720-720)/4=-110 → منفی
    const result = computeSportMacros({
      sport_type: "combat_sports",
      main_goal: "maintenance",
      weight_kg: 100,
      target_calories: 1000,
    });
    assertClose(result.carb_g, -110, 0.001);
    assert(result.warnings.length === 1);
    assert(result.warnings[0].code === "target_calories_unrealistic");
    assert(result.warnings[0].severity === "caution");
  });

  check("carb_g مثبت اما خارج از بازه‌ی منطقی رشته → carb_outside_sport_range — powerlifting weight=80,target=2000", () => {
    // proteinG=1.5×80=120؛ sportFatG=1.0×80=80؛ کف عمومی=max(80,0.2×2000/9=44.44)=80
    // carbG=(2000-480-720)/4=200 → /80=2.5 (زیر کف منطقی ۴-۶ پاورلیفتینگ، اما مثبت)
    const result = computeSportMacros({
      sport_type: "powerlifting_weightlifting",
      main_goal: "maintenance",
      weight_kg: 80,
      target_calories: 2000,
    });
    assertClose(result.carb_g, 200, 0.001);
    assert(result.carb_g >= 0, "این سناریو باید کربوهیدرات مثبت داشته باشد");
    assert(result.warnings.length === 1);
    assert(result.warnings[0].code === "carb_outside_sport_range");
    assert(result.warnings[0].severity === "info");
  });

  console.log(`\n[test-engine-nutrition-file3-macromatrix] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
