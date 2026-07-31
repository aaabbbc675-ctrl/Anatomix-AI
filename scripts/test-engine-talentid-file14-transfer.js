// اسکریپت تست مستقل برای engine/talentId/file14_talentTransferSuggester.js.
// اجرا: node scripts/test-engine-talentid-file14-transfer.js
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
  const { suggestTalentTransfers } = await import("../engine/talentId/file14_talentTransferSuggester.js");
  const { sportSimilarityGraph } = await import("../engine/talentId/shared/sportSimilarityGraph.js");
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  function report(overrides = {}) {
    return {
      final_score: 50,
      final_tier: "C",
      what_if_analysis: undefined,
      primary_exclusion_cause: undefined,
      ...overrides,
    };
  }

  function baseReports() {
    return {
      soccer_striker: report(),
      wrestling_freestyle: report(),
      volleyball_middle_blocker: report(),
      swimming_general: report(),
      weightlifting_olympic: report(),
    };
  }

  console.log("\n[پوشش sportSimilarityGraph — به‌روزشده پس از Commit 17 (۲۹ رشته)]");
  // ⚠️ به‌روزرسانی Commit 17: sportSimilarityGraph.js از حالت دستی‌نوشته
  // (۵ رشته) به محاسبه‌ی برنامه‌ای از similar_sports کل matrix تغییر کرد.
  // چند رابطه‌ی قبلاً dormant (چون رشته‌ی هدف ساخته نشده بود) حالا فعال
  // شده‌اند — این‌ها یافته‌ی مثبت‌اند، نه رگرسیون؛ رجوع کنید به تحلیل
  // Commit 17 در تاریخچه‌ی گفتگو.
  check("wrestling_freestyle.transfer_potential حالا شامل judo(۰.۷۵، ۲ دسته) هم هست، علاوه بر weightlifting_olympic(۰.۶) و boxing(۰.۶)", () => {
    const tp = sportSimilarityGraph.wrestling_freestyle.transfer_potential;
    assert(Object.keys(tp).length === 3, `انتظار ۳ مورد، گرفتیم ${Object.keys(tp).length}`);
    assert(tp.judo === 0.75, `judo: انتظار ۰.۷۵، گرفتیم ${tp.judo}`);
    assert(tp.weightlifting_olympic === 0.6, `weightlifting_olympic: انتظار ۰.۶، گرفتیم ${tp.weightlifting_olympic}`);
    assert(tp.boxing === 0.6, `boxing: انتظار ۰.۶، گرفتیم ${tp.boxing}`);
  });
  check("weightlifting_olympic.transfer_potential بدون تغییر: فقط wrestling_freestyle با ۰.۷۵ (هیچ‌کدام از ۲۴ رشته‌ی جدید به آن ارجاع نمی‌دهند)", () => {
    const tp = sportSimilarityGraph.weightlifting_olympic.transfer_potential;
    assert(Object.keys(tp).length === 1, "باید دقیقاً ۱ مورد داشته باشد");
    assert(tp.wrestling_freestyle === 0.75, `انتظار ۰.۷۵، گرفتیم ${tp.wrestling_freestyle}`);
  });
  check("volleyball_middle_blocker.transfer_potential بعد از Commit 18 حالا ۴ مورد دارد: basketball_center و volleyball_outside هم فعال شدند (ارجاعات خفته‌ی Commit 1)", () => {
    // ⚠️ به‌روزرسانی Commit 18: با ساخته‌شدن basketball_center (by_anthropometry)
    // و volleyball_outside (by_psychology)، دو ارجاع خفته‌ی دیگر از Commit 1
    // فعال شدند — یافته‌ی مثبت، نه رگرسیون (هم‌الگوی Commit 17).
    const tp = sportSimilarityGraph.volleyball_middle_blocker.transfer_potential;
    assert(Object.keys(tp).length === 4, `انتظار ۴ مورد، گرفتیم ${Object.keys(tp).length}`);
    assert(tp.swimming_general === 0.6, `انتظار ۰.۶، گرفتیم ${tp.swimming_general}`);
    assert(tp.gymnastics_artistic === 0.6, `انتظار ۰.۶، گرفتیم ${tp.gymnastics_artistic}`);
    assert(tp.basketball_center === 0.6, `basketball_center: انتظار ۰.۶، گرفتیم ${tp.basketball_center}`);
    assert(tp.volleyball_outside === 0.6, `volleyball_outside: انتظار ۰.۶، گرفتیم ${tp.volleyball_outside}`);
  });
  check("swimming_general.transfer_potential دیگر خالی نیست: حالا cycling_road(۰.۶) دارد (رابطه‌ی از قبل موجود، تازه‌فعال‌شده)", () => {
    const tp = sportSimilarityGraph.swimming_general.transfer_potential;
    assert(Object.keys(tp).length === 1, `انتظار ۱ مورد، گرفتیم ${Object.keys(tp).length}`);
    assert(tp.cycling_road === 0.6, `انتظار ۰.۶، گرفتیم ${tp.cycling_road}`);
  });
  check("soccer_striker.transfer_potential دیگر خالی نیست: حالا sprint_100m/boxing/handball_pivot دارد (روابط از قبل موجود در similar_sports خودش، تا Commit 17 dormant بودند)", () => {
    const tp = sportSimilarityGraph.soccer_striker.transfer_potential;
    assert(Object.keys(tp).length === 3, `انتظار ۳ مورد، گرفتیم ${Object.keys(tp).length}`);
    assert(tp.sprint_100m === 0.6, `sprint_100m: انتظار ۰.۶، گرفتیم ${tp.sprint_100m}`);
    assert(tp.boxing === 0.6, `boxing: انتظار ۰.۶، گرفتیم ${tp.boxing}`);
    assert(tp.handball_pivot === 0.6, `handball_pivot: انتظار ۰.۶، گرفتیم ${tp.handball_pivot}`);
  });

  console.log("\n[پوشش sportSimilarityGraph — رشته‌های تازه‌ساخته‌شده‌ی Commit 18]");
  check("soccer_goalkeeper.transfer_potential: handball_goalkeeper با ۰.۹ (هر ۳ دسته)، futsal_goalkeeper با ۰.۷۵ (۲ دسته)", () => {
    const tp = sportSimilarityGraph.soccer_goalkeeper.transfer_potential;
    assert(Object.keys(tp).length === 2, `انتظار ۲ مورد، گرفتیم ${Object.keys(tp).length}`);
    assert(tp.handball_goalkeeper === 0.9, `handball_goalkeeper: انتظار ۰.۹، گرفتیم ${tp.handball_goalkeeper}`);
    assert(tp.futsal_goalkeeper === 0.75, `futsal_goalkeeper: انتظار ۰.۷۵، گرفتیم ${tp.futsal_goalkeeper}`);
  });
  check("soccer_winger.transfer_potential: sprint_100m و soccer_striker هر دو ۰.۶ (۱ دسته هرکدام)", () => {
    const tp = sportSimilarityGraph.soccer_winger.transfer_potential;
    assert(Object.keys(tp).length === 2, `انتظار ۲ مورد، گرفتیم ${Object.keys(tp).length}`);
    assert(tp.sprint_100m === 0.6, `sprint_100m: انتظار ۰.۶، گرفتیم ${tp.sprint_100m}`);
    assert(tp.soccer_striker === 0.6, `soccer_striker: انتظار ۰.۶، گرفتیم ${tp.soccer_striker}`);
  });
  check("basketball_center.transfer_potential: فقط volleyball_middle_blocker (۰.۶، ۱ دسته)", () => {
    const tp = sportSimilarityGraph.basketball_center.transfer_potential;
    assert(Object.keys(tp).length === 1, "باید دقیقاً ۱ مورد داشته باشد");
    assert(tp.volleyball_middle_blocker === 0.6, `انتظار ۰.۶، گرفتیم ${tp.volleyball_middle_blocker}`);
  });
  check("basketball_playmaker.transfer_potential: خالی (صادقانه، بدون ارتباط حدسی)", () => {
    const tp = sportSimilarityGraph.basketball_playmaker.transfer_potential;
    assert(Object.keys(tp).length === 0, "باید کاملاً خالی باشد");
  });

  console.log("\n[suggestTalentTransfers — شرط‌های رد پیشنهاد]");
  check("final_tier !== 'C' → هیچ پیشنهادی صادر نمی‌شود (حتی اگر what_if داشته باشد)", () => {
    const reports = baseReports();
    reports.wrestling_freestyle = report({
      final_tier: "B",
      what_if_analysis: { estimated_tier_if_corrected: "A" },
    });
    reports.weightlifting_olympic = report({ final_tier: "A", final_score: 90 });
    const suggestions = suggestTalentTransfers(reports, sportRequirementMatrix);
    assert(suggestions.length === 0, "نباید هیچ پیشنهادی صادر شود");
  });

  check("tier=C ولی what_if_analysis.estimated_tier_if_corrected !== 'A' → هیچ پیشنهادی صادر نمی‌شود", () => {
    const reports = baseReports();
    reports.wrestling_freestyle = report({
      final_tier: "C",
      what_if_analysis: { estimated_tier_if_corrected: "B" },
    });
    reports.weightlifting_olympic = report({ final_tier: "A", final_score: 90 });
    const suggestions = suggestTalentTransfers(reports, sportRequirementMatrix);
    assert(suggestions.length === 0, "نباید هیچ پیشنهادی صادر شود");
  });

  check("target تیر A نیست → هیچ پیشنهادی صادر نمی‌شود", () => {
    const reports = baseReports();
    reports.wrestling_freestyle = report({
      final_tier: "C",
      what_if_analysis: { estimated_tier_if_corrected: "A" },
    });
    reports.weightlifting_olympic = report({ final_tier: "B", final_score: 82 });
    const suggestions = suggestTalentTransfers(reports, sportRequirementMatrix);
    assert(suggestions.length === 0, "نباید هیچ پیشنهادی صادر شود");
  });

  check("target تیر A است ولی final_score<80 (حالت دفاعی/فرضی) → هیچ پیشنهادی صادر نمی‌شود", () => {
    const reports = baseReports();
    reports.wrestling_freestyle = report({
      final_tier: "C",
      what_if_analysis: { estimated_tier_if_corrected: "A" },
    });
    reports.weightlifting_olympic = report({ final_tier: "A", final_score: 79 });
    const suggestions = suggestTalentTransfers(reports, sportRequirementMatrix);
    assert(suggestions.length === 0, "نباید هیچ پیشنهادی صادر شود (چک آستانه‌ی ۸۰ طبق سند)");
  });

  console.log("\n[suggestTalentTransfers — پیشنهاد واقعی]");
  check("wrestling_freestyle (C+potential A) با weightlifting_olympic (A) → یک پیشنهاد صحیح صادر می‌شود", () => {
    const reports = baseReports();
    reports.wrestling_freestyle = report({
      final_tier: "C",
      what_if_analysis: { estimated_tier_if_corrected: "A" },
      primary_exclusion_cause: { cause_narrative: "کایفوز شدید" },
    });
    reports.weightlifting_olympic = report({ final_tier: "A", final_score: 91 });
    const suggestions = suggestTalentTransfers(reports, sportRequirementMatrix);
    assert(suggestions.length === 1, `انتظار ۱ پیشنهاد، گرفتیم ${suggestions.length}`);
    const s = suggestions[0];
    assert(s.excluded_sport === "wrestling_freestyle", "excluded_sport نادرست");
    assert(s.transfer_target === "weightlifting_olympic", "transfer_target نادرست");
    assert(s.similarity_score === 0.6, "similarity_score نادرست");
    assert(s.transfer_target_score === 91, "transfer_target_score نادرست");
    assert(s.narrative.includes("کشتی") || s.narrative.includes("وزنه‌برداری"), "narrative باید نام رشته‌ها را داشته باشد");
    assert(s.narrative.includes("کایفوز شدید"), "narrative باید علت را از primary_exclusion_cause بگیرد");
  });

  console.log("\n[soccer_striker هرگز پیشنهاد تولید نمی‌کند — هم‌الگوی wrestling_freestyle/hamstring_short در Commit 7]");
  check("soccer_striker با C+potential A ولی گراف خالی → همیشه ۰ پیشنهاد", () => {
    const reports = baseReports();
    reports.soccer_striker = report({
      final_tier: "C",
      what_if_analysis: { estimated_tier_if_corrected: "A" },
    });
    // بقیه‌ی رشته‌ها را هم tier A می‌کنیم تا مطمئن شویم مشکل از گراف است، نه از شرایط دیگر
    reports.wrestling_freestyle = report({ final_tier: "A", final_score: 90 });
    reports.volleyball_middle_blocker = report({ final_tier: "A", final_score: 90 });
    reports.swimming_general = report({ final_tier: "A", final_score: 90 });
    reports.weightlifting_olympic = report({ final_tier: "A", final_score: 90 });
    const suggestions = suggestTalentTransfers(reports, sportRequirementMatrix);
    assert(suggestions.length === 0, "soccer_striker هرگز نباید پیشنهاد تولید کند");
  });

  console.log("\n[چند پیشنهاد هم‌زمان از رشته‌های مختلف]");
  check("wrestling_freestyle→weightlifting_olympic و volleyball_middle_blocker→swimming_general هر دو هم‌زمان صادر می‌شوند", () => {
    const reports = baseReports();
    reports.wrestling_freestyle = report({
      final_tier: "C",
      what_if_analysis: { estimated_tier_if_corrected: "A" },
    });
    reports.weightlifting_olympic = report({ final_tier: "A", final_score: 88 });
    reports.volleyball_middle_blocker = report({
      final_tier: "C",
      what_if_analysis: { estimated_tier_if_corrected: "A" },
    });
    reports.swimming_general = report({ final_tier: "A", final_score: 95 });
    const suggestions = suggestTalentTransfers(reports, sportRequirementMatrix);
    assert(suggestions.length === 2, `انتظار ۲ پیشنهاد، گرفتیم ${suggestions.length}`);
    const targets = suggestions.map((s) => s.transfer_target).sort();
    assert(targets[0] === "swimming_general" && targets[1] === "weightlifting_olympic", "targetها نادرست");
  });

  check("همه‌ی ۵ رشته C+potential A ولی هیچ target ای واقعاً A نیست → صفر پیشنهاد (نه throw)", () => {
    const reports = baseReports();
    for (const sportId of Object.keys(reports)) {
      reports[sportId] = report({
        final_tier: "C",
        what_if_analysis: { estimated_tier_if_corrected: "A" },
      });
    }
    const suggestions = suggestTalentTransfers(reports, sportRequirementMatrix);
    assert(suggestions.length === 0, "باید صفر پیشنهاد باشد چون هیچ رشته‌ای واقعاً A نیست");
  });

  console.log(`\n[test-engine-talentid-file14-transfer] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
