// قالب‌های روایی Match Report (بخش ۱۴.۴ سند معماری) — تولید coach_narrative
// و client_narrative بر اساس اعداد *واقعی* محاسبه‌شده (نه اعداد نمونه‌ی سند،
// که در Commit 13 نشان داده شد داخلی‌اش سازگار نیست — بخش ۱۴.۵).
//
// طبق تصمیم تاییدشده‌ی Commit 13: اگر maturity_type برابر early_maturer یا
// late_maturer باشد، narrative مربی باید صریحاً این را هشدار بدهد (طبق چک‌لیست
// تست خودِ سند در بخش ۱۴.۶: "early_maturer narrative includes warning").

const TIER_LABEL_FA = { A: "کلاس A", B: "کلاس B", C: "کلاس C", M: "بررسی پزشکی" };

function tierLabelFa(tier) {
  return TIER_LABEL_FA[tier] ?? tier;
}

function generateCoachNarrative({
  sportNameFa,
  finalScore,
  tier,
  topPositiveDrivers,
  primaryExclusionCause,
  whatIf,
  medicalHold,
  maturityType,
}) {
  let text = `${sportNameFa}: امتیاز فعلی ${Math.round(finalScore)}٪ (${tierLabelFa(tier)}).`;

  if (tier === "M" && medicalHold) {
    const overrideNote = medicalHold.coach_can_override
      ? "مربی می‌تواند با احتیاط و مشاهده‌ی دقیق تصمیم بگیرد"
      : `نیازمند تأیید ${medicalHold.required_specialist} پیش از ادامه`;
    return `⚠️ ${text} این رشته به دلیل «${medicalHold.reason_narrative}» در وضعیت بررسی پزشکی است (${overrideNote}). این رشته را از لیست حذف نکنید.`;
  }

  const strengths = topPositiveDrivers
    .slice(0, 2)
    .map((d) => d.narrative)
    .filter(Boolean)
    .join("، ");
  if (strengths) text += ` نقاط قوت: ${strengths}.`;

  if (primaryExclusionCause) {
    text += ` **دلیل اصلی افت امتیاز:** ${primaryExclusionCause.cause_narrative}`;
    if (primaryExclusionCause.contribution_magnitude != null) {
      text += ` (کاهش ${Math.abs(Math.round(primaryExclusionCause.contribution_magnitude))} امتیاز)`;
    }
    text += ".";
  }

  if (whatIf) {
    text += ` 🎯 **این رشته پتانسیل ${tierLabelFa(whatIf.estimated_tier_if_corrected)} (${Math.round(whatIf.estimated_score_if_corrected)}٪) را دارد** اگر مسیر اصلاح طی شود.`;
    if (whatIf.duration_warning) text += ` ${whatIf.duration_warning}`;
    text += " این رشته را از لیست حذف نکنید.";
  }

  if (maturityType === "early_maturer") {
    text +=
      " ⚠️ توجه: این ورزشکار Early Maturer است — بخشی از مزیت فعلی می‌تواند موقتی باشد (مزیت رشد فیزیکی زودرس، نه لزوماً استعداد بلندمدت).";
  } else if (maturityType === "late_maturer") {
    text += " ⚠️ توجه: این ورزشکار Late Maturer است — پتانسیل واقعی ممکن است هنوز کاملاً نمایان نشده باشد.";
  }

  return text;
}

function generateClientNarrative({ sportNameFa, finalScore, tier, primaryExclusionCause, whatIf, medicalHold }) {
  if (tier === "M" && medicalHold) {
    return `⚠️ ${sportNameFa} فعلاً به دلیل شرایط پزشکی («${medicalHold.reason_narrative}») نیاز به بررسی دارد — این به‌معنای رد‌شدن نیست، فقط باید با پزشک هماهنگ شود.`;
  }

  if (whatIf) {
    let text = `⚠️ ${sportNameFa} می‌تونه یکی از بهترین انتخاب‌هات باشه (تا ${Math.round(whatIf.estimated_score_if_corrected)}٪)`;
    if (primaryExclusionCause) {
      text += `، ولی الان به‌خاطر ${primaryExclusionCause.cause_narrative} امکان‌پذیر نیست`;
    }
    text += ". اگه مسیر اصلاح رو طی کنی، این رشته برات مناسب می‌شه!";
    return text;
  }

  return `${sportNameFa}: امتیاز فعلی تو ${Math.round(finalScore)}٪ (${tierLabelFa(tier)}) است.`;
}

// طبق بخش ۱۷.۱.۱ سند: executive_summary.overall_narrative، «۳-۵ خط». Commit 16.
function generateOverallNarrative({ top3Reports, totalCorrectableSports, totalMedicalHolds, maturityType }) {
  const lines = [];

  if (top3Reports.length > 0) {
    const namesWithScores = top3Reports.map((r) => `${r.sport_name_fa} (${Math.round(r.final_score)}٪)`).join("، ");
    lines.push(`رشته‌های برتر فعلی: ${namesWithScores}.`);
  } else {
    lines.push("در حال حاضر هیچ رشته‌ای ارزیابی نشده است.");
  }

  if (totalCorrectableSports > 0) {
    lines.push(`${totalCorrectableSports} رشته‌ی دیگر با اصلاح نقاط ضعف پوسچرال/ROM می‌توانند به کلاس A برسند.`);
  }

  if (totalMedicalHolds > 0) {
    lines.push(`${totalMedicalHolds} رشته نیازمند بررسی/تأیید پزشکی پیش از ادامه هستند.`);
  }

  if (maturityType === "early_maturer") {
    lines.push("⚠️ این ورزشکار Early Maturer است — نتایج فعلی را با احتیاط نسبت به هم‌سالان late maturer تفسیر کنید.");
  } else if (maturityType === "late_maturer") {
    lines.push("⚠️ این ورزشکار Late Maturer است — پتانسیل واقعی ممکن است هنوز کاملاً نمایان نشده باشد.");
  }

  return lines.join(" ");
}

export { generateCoachNarrative, generateClientNarrative, generateOverallNarrative, tierLabelFa, TIER_LABEL_FA };
