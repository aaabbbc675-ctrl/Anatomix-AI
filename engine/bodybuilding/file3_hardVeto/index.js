// فایل ۳ کسکید (بخش ۳.۱ سند): Hard Veto پزشکی/سنی — بالاترین اولویت.
//
// نکته‌ی سخت‌افزاری مهم: سنسور SpO2 از دستگاه حذف شده است. این ماژول هیچ گیت/
// ارزیابی مبتنی بر SpO2 ندارد و نباید داشته باشد.
//
// طبق بخش ۳.۱ سند، اعمال «غیرقابل‌دورزدن‌بودن» واقعی روی خروجی نهایی کار فایل ۵
// (finalizePrescription، زیرمرحله‌ی ۵.۴) است. این فایل فقط محدودیت‌های پزشکی/سنی
// را از روی ورودی، مستقل از فایل ۲ (بیومتریک)، محاسبه و با هم ترکیب می‌کند.
const { evaluateAgeProtocol } = require("./ageProtocol");
const { mergeRestrictions } = require("./mergeRestrictions");
const { heartDisease } = require("./conditions/heartDisease");
const { diabetes } = require("./conditions/diabetes");
const { asthma } = require("./conditions/asthma");
const { osteoporosis } = require("./conditions/osteoporosis");
const { arthritis } = require("./conditions/arthritis");
const { cerebralPalsy } = require("./conditions/cerebralPalsy");
const { multipleSclerosis } = require("./conditions/multipleSclerosis");
const { kidneyDisease } = require("./conditions/kidneyDisease");
const { obesity } = require("./conditions/obesity");

const MANDATORY_HEADER_WARNING = "در صورت تنگی نفس یا سرگیجه فوراً تمرین را متوقف کنید.";

function evaluateHardVeto({
  age,
  experience,
  main_goal,
  coachConfirmedAgeException = false,
  medicalFlags = {},
  isDialysisDayToday = false,
} = {}) {
  const patches = [];
  const confirmations = [];

  const ageResult = evaluateAgeProtocol({ age, experience, main_goal, coachConfirmedAgeException });
  if (ageResult.requiresConfirmation) {
    confirmations.push({ reason: ageResult.confirmationReason });
  }
  if (ageResult.patch) patches.push(ageResult.patch);

  if (medicalFlags.heartOrHypertension) patches.push(heartDisease());
  if (medicalFlags.diabetes) patches.push(diabetes({ neuropathy: !!medicalFlags.diabeticNeuropathy }));
  if (medicalFlags.asthma) patches.push(asthma());
  if (medicalFlags.osteoporosis) patches.push(osteoporosis());
  if (medicalFlags.arthritis) patches.push(arthritis());
  if (medicalFlags.cerebralPalsy) patches.push(cerebralPalsy());
  if (medicalFlags.multipleSclerosis) patches.push(multipleSclerosis());
  if (medicalFlags.kidneyDisease) {
    patches.push(
      kidneyDisease({
        onDialysis: !!medicalFlags.onDialysis,
        hasFistula: !!medicalFlags.hasFistula,
        isDialysisDayToday,
      })
    );
  }
  // طبق سند: چاقی (BMI>=25) فقط وقتی این محدودیت اعمال می‌شود که هم‌زمان ضربان
  // بالا هم گزارش شده باشد — هرکدام به‌تنهایی کافی نیست.
  if (medicalFlags.bmiOver25 && medicalFlags.elevatedHeartRate) patches.push(obesity());

  const merged = mergeRestrictions(patches);
  merged.warnings = Array.from(new Set([MANDATORY_HEADER_WARNING, ...merged.warnings]));
  merged.requires_coach_confirmation = [...confirmations, ...merged.requires_coach_confirmation];

  return merged;
}

module.exports = { evaluateHardVeto };
