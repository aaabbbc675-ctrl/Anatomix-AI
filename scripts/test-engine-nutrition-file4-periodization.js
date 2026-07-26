// اسکریپت تست مستقل برای فایل ۴ موتور تغذیه (دوره‌بندی بلوکی + چرخه‌ی
// کربوهیدرات). اجرا: node scripts/test-engine-nutrition-file4-periodization.js
//
// همه‌ی اعداد انتظار با دست (خارج از کد موتور) محاسبه و با node -e جداگانه
// صحت‌سنجی شده‌اند، دقیقاً هم‌الگوی batch ۲/۳.

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
  const {
    processPeriodizationAndCarbCycle,
    computeBlockReduction,
    blockEaWarnings,
    computeBaselineHighLowCarbSplit,
    computeReducedHighLowCarbSplit,
    deriveHighLowFatFromCarbSplit,
  } = await import("../engine/nutrition/file4_periodizationAndCarbCycle.js");
  const { computeEnergyAvailability } = await import("../engine/nutrition/file2_energyTargets.js");

  console.log("\n[computeBlockReduction — لایه‌ی ۱: دوره‌بندی بلوکی]");
  check("چربی کل کاهش را جذب می‌کند وقتی به کفش نمی‌رسد (کربو دست‌نخورده می‌ماند) — reduction=150", () => {
    // newT=2550، کف=max(40,0.2×2550/9=56.67)=56.67، تلاش=80-150/9=63.33>56.67
    // (کف نمی‌زند) → carb=(2550-480-63.33×9)/4=375 (دقیقاً همان قبل)
    const result = computeBlockReduction({
      prevProtein_g: 120,
      prevFat_g: 80,
      prevTarget_calories: 2700,
      reduction_kcal: 150,
      weight_kg: 80,
    });
    assert(result.target_calories === 2550);
    assert(result.protein_g === 120, "پروتئین هرگز دست نمی‌خورد");
    assertClose(result.fat_g, 63.3333, 0.001);
    assertClose(result.carb_g, 375, 0.001, "وقتی چربی همه‌ی کاهش را جذب می‌کند، کربو نباید تغییر کند");
    assert(result.warnings.length === 0);
  });

  check("چربی به کفش می‌رسد، باقی‌مانده از کربو کم می‌شود — reduction=300", () => {
    // newT=2400، کف=max(40,0.2×2400/9=53.33)=53.33، تلاش=80-300/9=46.67<53.33
    // (کف می‌زند) → fat=53.33 → carb=(2400-480-53.33×9)/4=360
    const result = computeBlockReduction({
      prevProtein_g: 120,
      prevFat_g: 80,
      prevTarget_calories: 2700,
      reduction_kcal: 300,
      weight_kg: 80,
    });
    assertClose(result.fat_g, 53.3333, 0.001, "چربی باید دقیقاً کف دینامیک باشد، نه تلاش اولیه (46.67)");
    assertClose(result.carb_g, 360, 0.001);
    assert(result.warnings.length === 0);
  });

  check("کاهش خیلی بزرگ → کربو منفی → target_calories_unrealistic — reduction=2000", () => {
    // newT=700، کف=40، fat=40 (کف)، carb=(700-480-360)/4=-35
    const result = computeBlockReduction({
      prevProtein_g: 120,
      prevFat_g: 80,
      prevTarget_calories: 2700,
      reduction_kcal: 2000,
      weight_kg: 80,
    });
    assertClose(result.carb_g, -35, 0.001);
    assert(result.warnings.length === 1);
    assert(result.warnings[0].code === "target_calories_unrealistic");
    assert(result.warnings[0].severity === "caution");
  });

  console.log("\n[blockEaWarnings — هشدار قرمز اختصاصی بخش ۲.۴ برای EA پایین]");
  check("ea_status=low → فقط block_reduction_dropped_ea (نه ea_low عمومی هم)", () => {
    // (2102.88-300)/64=28.17 → low، دقیقاً همان سناریوی batch ۲
    const eaResult = computeEnergyAvailability({ target_calories: 2102.88, training_calories_burned: 300, ffm_kg: 64 });
    assert(eaResult.ea_status === "low");
    const warnings = blockEaWarnings(eaResult);
    assert(warnings.length === 1, `انتظار دقیقاً ۱ هشدار داشتیم، گرفتیم: ${JSON.stringify(warnings)}`);
    assert(warnings[0].code === "block_reduction_dropped_ea");
    assert(warnings[0].severity === "caution");
  });
  check("ea_status=suboptimal → همان هشدار عمومی فایل ۲ (ea_suboptimal) بازاستفاده می‌شود", () => {
    // (2102.88-100)/64=31.295 → suboptimal، دقیقاً همان سناریوی batch ۲
    const eaResult = computeEnergyAvailability({ target_calories: 2102.88, training_calories_burned: 100, ffm_kg: 64 });
    assert(eaResult.ea_status === "suboptimal");
    const warnings = blockEaWarnings(eaResult);
    assert(warnings.length === 1);
    assert(warnings[0].code === "ea_suboptimal");
    assert(warnings[0].severity === "info");
  });
  check("ea_status=optimal → بدون هشدار", () => {
    const eaResult = computeEnergyAvailability({ target_calories: 3329.56, training_calories_burned: 200, ffm_kg: 64 });
    assert(eaResult.ea_status === "optimal");
    assert(blockEaWarnings(eaResult).length === 0);
  });

  console.log("\n[computeBaselineHighLowCarbSplit — لایه‌ی ۲، بلوک ۱]");
  check("تقسیم درصدی ساده: carb=100, percent=10 → high=110, low=90", () => {
    const result = computeBaselineHighLowCarbSplit({ carb_g: 100, carb_cycling_percent: 10 });
    assertClose(result.high_carb_g, 110, 0.001);
    assertClose(result.low_carb_g, 90, 0.001);
  });
  check("سناریوی تاییدشده در گفتگو: carb=375, percent=20 → high=450, low=300", () => {
    const result = computeBaselineHighLowCarbSplit({ carb_g: 375, carb_cycling_percent: 20 });
    assertClose(result.high_carb_g, 450, 0.001);
    assertClose(result.low_carb_g, 300, 0.001);
  });

  console.log("\n[computeReducedHighLowCarbSplit — لایه‌ی ۲، بلوک ۲/۳]");
  check("Low-Day به‌تنهایی کل کاهش را جذب می‌کند (کاهش=۱۰۰ < ظرفیت جذب=۱۴۰)", () => {
    // weight=80 → کف=160، ظرفیت جذب Low=300-160=140؛ کاهش=100≤140
    const result = computeReducedHighLowCarbSplit({
      prev_high_carb_g: 450,
      prev_low_carb_g: 300,
      carb_reduction_g: 100,
      weight_kg: 80,
    });
    assertClose(result.high_carb_g, 450, 0.001, "High-Day نباید دست بخورد");
    assertClose(result.low_carb_g, 200, 0.001);
  });
  check("Low-Day به کفش می‌رسد، باقی‌مانده تماماً از High-Day کم می‌شود (کاهش=۲۰۰ > ظرفیت=۱۴۰)", () => {
    // ظرفیت جذب=140؛ باقی‌مانده=200-140=60 → از High-Day کم می‌شود، Low=کف=160
    const result = computeReducedHighLowCarbSplit({
      prev_high_carb_g: 450,
      prev_low_carb_g: 300,
      carb_reduction_g: 200,
      weight_kg: 80,
    });
    assertClose(result.low_carb_g, 160, 0.001, "Low-Day باید دقیقاً پین‌شده روی کف باشد");
    assertClose(result.high_carb_g, 390, 0.001, "باقی‌مانده باید تماماً از High-Day کم شده باشد");
  });

  console.log("\n[deriveHighLowFatFromCarbSplit — لایه‌ی ۲، مشترک]");
  check("سناریوی تاییدشده در گفتگو: lowFatG=100 > highFatG=60 (جهت سند تایید می‌شود)", () => {
    const result = deriveHighLowFatFromCarbSplit({
      protein_g: 120,
      high_carb_g: 450,
      low_carb_g: 300,
      target_calories: 2700,
      weight_kg: 80,
    });
    assertClose(result.high_fat_g, 60, 0.001);
    assertClose(result.low_fat_g, 100, 0.001);
    assert(result.low_fat_g > result.high_fat_g, "جهت سند: Low-Day باید چربی بیشتری داشته باشد");
    assert(result.warnings.length === 0);
  });
  check("چربی خام Low-Day منفی می‌شود → کلامپ فعال + target_calories_unrealistic + average_calories_deviated_from_target (هر دو، سناریوی مصنوعی حدی)", () => {
    // خام: rawLowFatG=-33.33 (منفی). کلامپ: lowFatG=60.1 (highFatG+0.1).
    // انحراف میانگین واقعی از هدف: ۴۲۰.۴۵ کالری — عمداً خیلی بزرگ‌تر از
    // سناریوی واقعی بلوک ۳ (۷۰.۴۵)، تا نشان دهد اندازه‌ی انحراف نامحدود
    // است و باید عدد واقعی همیشه دیده شود، نه فقط یک پرچم بدون بزرگی.
    const result = deriveHighLowFatFromCarbSplit({
      protein_g: 120,
      high_carb_g: 1000,
      low_carb_g: 50,
      target_calories: 2700,
      weight_kg: 80,
    });
    assertClose(result.high_fat_g, 60, 0.001);
    assertClose(result.low_fat_g, 60.1, 0.001, "چربی خام منفی بود، باید به highFatG+0.1 کلامپ شده باشد");
    assert(result.low_fat_g > result.high_fat_g, "جهت هرگز نباید نقض شود، حتی در حالت حدی");
    assert(result.warnings.length === 2, `انتظار دو هشدار داشتیم (منفی بودن + انحراف کلامپ)، گرفتیم: ${JSON.stringify(result.warnings)}`);
    assert(result.warnings.some((w) => w.code === "target_calories_unrealistic"));
    const deviationWarning = result.warnings.find((w) => w.code === "average_calories_deviated_from_target");
    assert(deviationWarning, "باید average_calories_deviated_from_target هم صادر شده باشد");
    assert(deviationWarning.severity === "caution");
    assertClose(deviationWarning.deviation_kcal, 420.45, 0.01, "انحراف واقعی باید عدد صریح داشته باشد، نه پنهان بماند");
  });
  check("چربی خام Low-Day مثبت اما زیر کف‌فاصله از High-Day → فقط کلامپ + average_calories_deviated_from_target (بدون target_calories_unrealistic)", () => {
    // خام: rawLowFatG=33.33 (مثبت، اما ≤ highFatG+0.1=60.1). کلامپ فعال
    // می‌شود اما چون خام منفی نبود، target_calories_unrealistic نباید بیاید.
    const result = deriveHighLowFatFromCarbSplit({
      protein_g: 120,
      high_carb_g: 600,
      low_carb_g: 300,
      target_calories: 2700,
      weight_kg: 80,
    });
    assertClose(result.high_fat_g, 60, 0.001);
    assertClose(result.low_fat_g, 60.1, 0.001);
    assert(result.low_fat_g > result.high_fat_g);
    assert(result.warnings.length === 1, `انتظار فقط یک هشدار داشتیم، گرفتیم: ${JSON.stringify(result.warnings)}`);
    assert(result.warnings[0].code === "average_calories_deviated_from_target");
    assert(result.warnings[0].severity === "caution");
    assertClose(result.warnings[0].deviation_kcal, 120.45, 0.01);
  });

  console.log("\n[processPeriodizationAndCarbCycle — یکپارچه، سه بلوک]");
  check("سناریوی کامل: weight=80, target1=2700, training=600, ffm=64, block2/3_reduction=200, percent=20", () => {
    // همه‌ی اعداد این سناریو با node -e جداگانه محاسبه و صحت‌سنجی شده‌اند
    // (نه از خروجی خودِ تابع کپی شده):
    //
    // بلوک ۱: target=2700 (بدون تغییر)، EA=(2700-600)/64=32.8125 → suboptimal
    //   carb split: high=450, low=300 (percent=20 روی carb=375)
    //   fat split: high=60, low=100 (بدون هشدار روز)
    //
    // بلوک ۲: reduction=200 → target=2500، کف چربی دینامیک=max(40,0.2×2500/9=55.56)=55.56
    //   تلاش=80-200/9=57.78>55.56 (کف نمی‌زند) → fat=57.78، carb=(2500-480-520)/4=375 (دست‌نخورده)
    //   EA=(2500-600)/64=29.6875 → low → block_reduction_dropped_ea
    //   کاهش کربو این بلوک=375-375=0 → carb split دست‌نخورده می‌ماند: high=450, low=300
    //   fat split: high=55.56, low=60 (بدون هشدار روز، چون 60>55.56)
    //
    // بلوک ۳: reduction=200 → target=2300، کف چربی دینامیک=max(40,0.2×2300/9=51.11)=51.11
    //   تلاش=57.78-200/9=35.56<51.11 (کف می‌زند) → fat=51.11، carb=(2300-480-460)/4=340
    //   کاهش کربو این بلوک=375-340=35 → ظرفیت جذب Low (weight=80→کف=160)=300-160=140≥35
    //   → کل از Low جذب می‌شود: high=450 (دست‌نخورده)، low=300-35=265
    //   EA=(2300-600)/64=26.5625 → low → block_reduction_dropped_ea
    //   fat split خام: high=51.11، low خام=35.56 (زیر highFatG+0.1=51.21)
    //   → کلامپ فعال می‌شود: low نهایی=51.21، میانگین واقعی از هدف ۷۰.۴۵
    //   کالری منحرف می‌شود → average_calories_deviated_from_target
    //   (این یافته‌ی واقعیِ بازبینیِ batch ۴ است — قبلاً low_day_fat_below_high_day
    //   بدون اصلاح گزارش می‌شد؛ طبق تصمیم صریح تاییدشده، حالا جهت کلامپ
    //   می‌شود و به‌جایش همین انحراف با عدد دقیق گزارش می‌شود)
    const result = processPeriodizationAndCarbCycle({
      weight_kg: 80,
      training_calories_burned: 600,
      ffm_kg: 64,
      target_calories: 2700,
      protein_g: 120,
      fat_g: 80,
      carb_g: 375,
      block2_reduction_kcal: 200,
      block3_reduction_kcal: 200,
      carb_cycling_percent: 20,
    });

    assert(result.blocks.length === 3);
    const [b1, b2, b3] = result.blocks;

    // بلوک ۱
    assert(b1.target_calories === 2700);
    assert(b1.protein_g === 120);
    assertClose(b1.energy_availability_kcal_per_kg_ffm, 32.8125, 0.001);
    assert(b1.ea_status === "suboptimal");
    assert(b1.warnings.some((w) => w.code === "ea_suboptimal"), "بلوک ۱ باید هشدار عمومی suboptimal داشته باشد");
    assertClose(b1.high_day.carb_g, 450, 0.001);
    assertClose(b1.low_day.carb_g, 300, 0.001);
    assertClose(b1.high_day.fat_g, 60, 0.001);
    assertClose(b1.low_day.fat_g, 100, 0.001);
    assert(b1.day_warnings.length === 0);

    // بلوک ۲
    assert(b2.target_calories === 2500);
    assertClose(b2.carb_g, 375, 0.001, "چربی همه‌ی کاهش بلوک ۲ را جذب می‌کند، کربو نباید تغییر کند");
    assert(b2.ea_status === "low");
    assert(b2.warnings.length === 1 && b2.warnings[0].code === "block_reduction_dropped_ea");
    assertClose(b2.high_day.carb_g, 450, 0.001, "کاهش کربوی بلوک ۲ صفر است، پس تقسیم دست‌نخورده می‌ماند");
    assertClose(b2.low_day.carb_g, 300, 0.001);
    assert(b2.day_warnings.length === 0, "بلوک ۲ نباید هشدار جهت چربی داشته باشد (60>55.56)");

    // بلوک ۳
    assert(b3.target_calories === 2300);
    assertClose(b3.carb_g, 340, 0.001);
    assert(b3.ea_status === "low");
    assert(b3.warnings.length === 1 && b3.warnings[0].code === "block_reduction_dropped_ea");
    assertClose(b3.high_day.carb_g, 450, 0.001, "High-Day بلوک ۳ نباید دست بخورد (Low-Day کل کاهش را جذب کرد)");
    assertClose(b3.low_day.carb_g, 265, 0.001);
    assertClose(b3.high_day.fat_g, 51.1111, 0.001);
    assertClose(b3.low_day.fat_g, 51.2111, 0.001, "چربی Low-Day باید کلامپ‌شده روی highFatG+0.1 باشد");
    assert(b3.low_day.fat_g > b3.high_day.fat_g, "جهت سند هرگز نباید نقض شود، حتی بعد از دو بلوک کاهش پیاپی");
    assert(
      b3.day_warnings.length === 1 && b3.day_warnings[0].code === "average_calories_deviated_from_target",
      `بلوک ۳ باید average_calories_deviated_from_target داشته باشد، گرفتیم: ${JSON.stringify(b3.day_warnings)}`
    );
    assertClose(b3.day_warnings[0].deviation_kcal, 70.45, 0.01, "انحراف واقعی بلوک ۳ باید عدد صریح داشته باشد");
  });

  console.log(`\n[test-engine-nutrition-file4-periodization] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
