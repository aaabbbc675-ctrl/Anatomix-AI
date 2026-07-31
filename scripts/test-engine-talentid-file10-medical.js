// اسکریپت تست مستقل برای engine/talentId/file10_medicalConditionalGate.js.
// اجرا: node scripts/test-engine-talentid-file10-medical.js
//
// ⚠️ REGRESSION GUARD اصلی این فایل بخش «هرگز حذف نشو» پایین‌تر است — حذف نکنید.
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
  const { calculateMedicalHolds, computeMedicalHoldForSport, isAlwaysSafe } = await import(
    "../engine/talentId/file10_medicalConditionalGate.js"
  );
  const { activePathologyMap } = await import("../engine/talentId/shared/activePathologyMap.js");
  const { sportRequirementMatrix } = await import("../engine/talentId/shared/sportRequirementMatrix.js");

  console.log("\n[بدون هیچ پاتولوژی — همه clear]");
  check("هیچ active_pathologies/chronic_conditions → همه‌ی ۵ رشته status=clear", () => {
    const holds = calculateMedicalHolds(sportRequirementMatrix, { active_pathologies: [], chronic_conditions: [] });
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      assert(holds[sportId].status === "clear", `${sportId}: انتظار clear، گرفتیم ${holds[sportId].status}`);
    }
  });

  console.log("\n[active_disc_herniation — hold برای high/moderate، clear برای safe]");
  check("wrestling_freestyle و weightlifting_olympic (high_risk) → medical_hold", () => {
    const holds = calculateMedicalHolds(sportRequirementMatrix, { active_pathologies: ["active_disc_herniation"] });
    assert(holds.wrestling_freestyle.status === "medical_hold", "wrestling_freestyle باید medical_hold باشد");
    assert(holds.weightlifting_olympic.status === "medical_hold", "weightlifting_olympic باید medical_hold باشد");
    assert(holds.wrestling_freestyle.risk_level === "high_risk", "risk_level نادرست");
  });

  check("soccer_striker و volleyball_middle_blocker (moderate_risk) → medical_hold", () => {
    const holds = calculateMedicalHolds(sportRequirementMatrix, { active_pathologies: ["active_disc_herniation"] });
    assert(holds.soccer_striker.status === "medical_hold", "soccer_striker باید medical_hold باشد");
    assert(holds.volleyball_middle_blocker.status === "medical_hold", "volleyball_middle_blocker باید medical_hold باشد");
  });

  check("swimming_general (safe) → clear می‌ماند، رشته حذف نمی‌شود", () => {
    const holds = calculateMedicalHolds(sportRequirementMatrix, { active_pathologies: ["active_disc_herniation"] });
    assert(holds.swimming_general.status === "clear", `swimming_general باید clear بماند، گرفتیم ${holds.swimming_general.status}`);
  });

  console.log("\n[Override با physician_clearance]");
  check("cleared_sports شامل wrestling_freestyle → status=clearance_obtained", () => {
    const holds = calculateMedicalHolds(sportRequirementMatrix, {
      active_pathologies: ["active_disc_herniation"],
      physician_clearance: { specialist_signed_id: "DR-123", date: "2026-01-01", cleared_sports: ["wrestling_freestyle"], notes: "تأیید شد" },
    });
    assert(holds.wrestling_freestyle.status === "clearance_obtained", "باید clearance_obtained باشد");
    assert(holds.wrestling_freestyle.clearance_date === "2026-01-01", "clearance_date باید ثبت شود");
    assert(holds.weightlifting_olympic.status === "medical_hold", "weightlifting_olympic بدون clearance باید هنوز hold باشد");
  });

  console.log("\n[critical_risk → coach_can_override=false]");
  check("active_acl_partial_tear برای soccer_striker (critical_risk) → coach_can_override=false", () => {
    const holds = calculateMedicalHolds(sportRequirementMatrix, { active_pathologies: ["active_acl_partial_tear"] });
    assert(holds.soccer_striker.status === "medical_hold", "باید medical_hold باشد");
    assert(holds.soccer_striker.coach_can_override === false, "coach_can_override باید false باشد");
  });

  console.log("\n[cardiovascular_disease — universal hold]");
  check("همه‌ی رشته‌ها به‌جز always_safe (chess) → medical_hold می‌گیرند", () => {
    // ⚠️ به‌روزرسانی Commit 19: با ساخته‌شدن chess، این تست دیگر نمی‌تواند
    // فرض کند «هیچ‌کدام در always_safe نیستند» — chess از قبل (Commit 1)
    // در activePathologyMap.cardiovascular_disease.always_safe بود، صرفاً
    // تا حالا خفته بود چون رشته‌ای با این id وجود نداشت. این یافته‌ی
    // مثبت است (صحت طراحی)، نه رگرسیون.
    const holds = calculateMedicalHolds(sportRequirementMatrix, { chronic_conditions: ["cardiovascular_disease"] });
    const alwaysSafeIds = activePathologyMap.cardiovascular_disease.always_safe;
    for (const sportId of Object.keys(sportRequirementMatrix)) {
      if (alwaysSafeIds.includes(sportId)) {
        assert(holds[sportId].status === "clear", `${sportId} در always_safe است، باید clear باشد`);
        continue;
      }
      assert(holds[sportId].status === "medical_hold", `${sportId} باید medical_hold باشد`);
      assert(holds[sportId].required_specialist === "cardiologist", `${sportId}: specialist نادرست`);
    }
  });

  check("isAlwaysSafe: chess در always_safe هست، soccer_striker نیست", () => {
    const cvdDef = activePathologyMap.cardiovascular_disease;
    assert(isAlwaysSafe(cvdDef, "chess") === true, "chess باید همیشه safe باشد");
    assert(isAlwaysSafe(cvdDef, "soccer_striker") === false, "soccer_striker نباید در always_safe باشد");
  });

  console.log("\n[پاتولوژی ناشناخته و ankle sprain duration]");
  check("پاتولوژی ناشناخته در ورودی → رد می‌شود بدون throw", () => {
    const holds = calculateMedicalHolds(sportRequirementMatrix, { active_pathologies: ["totally_unknown_pathology"] });
    assert(holds.soccer_striker.status === "clear", "باید clear بماند (پاتولوژی ناشناخته نادیده گرفته می‌شود)");
  });

  check("active_ankle_sprain_grade_2_or_3: estimated_recovery_weeks = ۹ (میانگین ۶ و ۱۲)", () => {
    const holds = calculateMedicalHolds(sportRequirementMatrix, { active_pathologies: ["active_ankle_sprain_grade_2_or_3"] });
    assert(holds.soccer_striker.estimated_recovery_weeks === 9, `انتظار ۹، گرفتیم ${holds.soccer_striker.estimated_recovery_weeks}`);
    assert(holds.soccer_striker.is_temporary === true, "is_temporary باید true باشد");
  });

  console.log("\n[═══ REGRESSION GUARD: هرگز حذف نشو — این بخش را حذف نکنید ═══]");
  check("برای هر پاتولوژی در activePathologyMap به‌تنهایی، calculateMedicalHolds همیشه به‌تعداد کل matrix رشته با status معتبر برمی‌گرداند", () => {
    const validStatuses = ["clear", "medical_hold", "clearance_obtained"];
    let checkedCount = 0;
    for (const pathologyName of Object.keys(activePathologyMap)) {
      const holds = calculateMedicalHolds(sportRequirementMatrix, { active_pathologies: [pathologyName] });
      const sportIds = Object.keys(sportRequirementMatrix);
      assert(
        Object.keys(holds).length === sportIds.length,
        `${pathologyName}: انتظار ${sportIds.length} رشته، گرفتیم ${Object.keys(holds).length}`
      );
      for (const sportId of sportIds) {
        checkedCount++;
        assert(holds[sportId] !== undefined, `${pathologyName}/${sportId}: نباید غایب باشد`);
        assert(
          validStatuses.includes(holds[sportId].status),
          `${pathologyName}/${sportId}: status نامعتبر "${holds[sportId].status}"`
        );
      }
    }
    assert(
      checkedCount === Object.keys(activePathologyMap).length * Object.keys(sportRequirementMatrix).length,
      "تعداد چک‌ها نادرست است"
    );
    console.log(`     (${checkedCount} ترکیب pathology×sport چک شد)`);
  });

  console.log(`\n[test-engine-talentid-file10-medical] ${passCount} PASS, ${failCount} FAIL`);
  process.exit(failCount > 0 ? 1 : 0);
})();
