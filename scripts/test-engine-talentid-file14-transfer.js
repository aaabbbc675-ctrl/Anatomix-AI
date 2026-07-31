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

  console.log("\n[پوشش صادقانه‌ی sportSimilarityGraph — فقط ۲ رابطه‌ی واقعی بین ۵ رشته]");
  check("wrestling_freestyle.transfer_potential = فقط weightlifting_olympic با ۰.۶ (۱ دسته از دید wrestling)", () => {
    const tp = sportSimilarityGraph.wrestling_freestyle.transfer_potential;
    assert(Object.keys(tp).length === 1, "باید دقیقاً ۱ مورد داشته باشد");
    assert(tp.weightlifting_olympic === 0.6, `انتظار ۰.۶، گرفتیم ${tp.weightlifting_olympic}`);
  });
  check("weightlifting_olympic.transfer_potential = فقط wrestling_freestyle با ۰.۷۵ (۲ دسته از دید weightlifting، نامتقارن)", () => {
    const tp = sportSimilarityGraph.weightlifting_olympic.transfer_potential;
    assert(Object.keys(tp).length === 1, "باید دقیقاً ۱ مورد داشته باشد");
    assert(tp.wrestling_freestyle === 0.75, `انتظار ۰.۷۵، گرفتیم ${tp.wrestling_freestyle}`);
  });
  check("volleyball_middle_blocker.transfer_potential = فقط swimming_general با ۰.۶ (یک‌طرفه)", () => {
    const tp = sportSimilarityGraph.volleyball_middle_blocker.transfer_potential;
    assert(Object.keys(tp).length === 1, "باید دقیقاً ۱ مورد داشته باشد");
    assert(tp.swimming_general === 0.6, `انتظار ۰.۶، گرفتیم ${tp.swimming_general}`);
  });
  check("swimming_general.transfer_potential کاملاً خالی است (بدون رابطه‌ی معکوس به والیبال)", () => {
    assert(Object.keys(sportSimilarityGraph.swimming_general.transfer_potential).length === 0, "باید خالی باشد");
  });
  check("soccer_striker.transfer_potential کاملاً خالی است (هیچ رابطه‌ای با ۴ رشته‌ی دیگر ندارد)", () => {
    assert(Object.keys(sportSimilarityGraph.soccer_striker.transfer_potential).length === 0, "باید خالی باشد");
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
