// فایل ۵ کسکید (بخش ۳.۱ سند): لایه‌ی ایمنی نهایی. متن پزشکی/سنی (خروجی فایل ۳،
// زیرمرحله‌ی ۵.۲) روی هر خروجی دیگری غیرقابل‌دورزدن نگه داشته می‌شود — این فایل
// جایی است که آن وصله واقعاً clamp می‌شود، نه فقط محاسبه.
//
// ترتیب اعمال (همیشه به همین ترتیب، تا veto پزشکی همیشه آخرین حرف را بزند):
//   ۱. خط پایه‌ی خام کسکید (فایل ۱+۲، + فایل ۴ اگر تکنیکی اعمال شده بود)
//   ۲. ضریب هفتگی دی‌لود/بازگشت ایمن (اگر trigger شده بود)
//   ۳. clamp نهایی و مطلق با محدودیت فایل ۳ — همیشه آخرین قدم
//
// مرز صریح این فایل: محدودیت‌های خاصِ یک حرکت مشخص (مثل قفل پرس پا روی ۳۰-۴۰٪
// برای بیماری قلبی، در specific_exercise_overrides) اینجا اعمال نمی‌شود — فقط
// بدون تغییر pass-through می‌شود تا زیرمرحله‌ی ۵.۵ (انتخاب واقعی حرکت) از آن
// استفاده کند. اینجا فقط اعداد سطح جلسه/عضله (نه سطح تک‌حرکت) clamp می‌شوند.
import { clampScalarIntoRange, clampRange } from "./clamp.js";
import { resolveTempo } from "./tempoResolver.js";
import { resolveVolumeIntensityAdjustment } from "./returnProtocolResolver.js";

function finalizePrescription({
  cascadeOutput,
  hardVetoRestriction,
  returnProtocolTriggered = false,
  deloadTriggered = false,
  deloadMultipliers,
}) {
  if (hardVetoRestriction.hard_stop) {
    return {
      blocked: true,
      block_reasons: hardVetoRestriction.hard_stop_reasons,
      prescription: null,
      banned_tags: hardVetoRestriction.banned_tags,
      equipment_priority: hardVetoRestriction.equipment_priority,
      specific_exercise_overrides: hardVetoRestriction.specific_exercise_overrides,
      warnings: hardVetoRestriction.warnings,
      requires_coach_confirmation: hardVetoRestriction.requires_coach_confirmation,
      adjustment_source: "none",
    };
  }

  const adjustment = resolveVolumeIntensityAdjustment({ returnProtocolTriggered, deloadTriggered, deloadMultipliers });

  // مرحله ۱+۲: اعمال ضریب هفتگی روی خط پایه‌ی خام
  const adjustedSets = Math.round(cascadeOutput.weekly_sets_per_muscle * adjustment.setsMultiplier);
  const adjustedIntensity = cascadeOutput.intensity_percent_1rm.map((v) => (v === null ? null : v * adjustment.loadMultiplier));

  // مرحله ۳: clamp نهایی و مطلق با محدودیت فایل ۳
  const sets = clampScalarIntoRange(adjustedSets, hardVetoRestriction.sets_range);
  const repRange = clampRange(cascadeOutput.rep_range, hardVetoRestriction.rep_range);
  const intensityRange = clampRange(adjustedIntensity, hardVetoRestriction.intensity_percent_1rm_range);
  const rirRange = clampRange(cascadeOutput.rir, hardVetoRestriction.rir_range);
  const restSecFloor = hardVetoRestriction.rest_sec_min;
  const restSec = restSecFloor === null
    ? cascadeOutput.rest_sec
    : cascadeOutput.rest_sec.map((v) => (v === null ? restSecFloor : Math.max(v, restSecFloor)));
  const tempo = resolveTempo(cascadeOutput.tempo, hardVetoRestriction.tempo_overrides);

  return {
    blocked: false,
    block_reasons: [],
    prescription: {
      weekly_sets_per_muscle: sets,
      rep_range: repRange,
      intensity_percent_1rm: intensityRange,
      rest_sec: restSec,
      tempo,
      rir: rirRange,
      isolation_ratio: cascadeOutput.isolation_ratio,
      // فایل ۲ اصلاً خروجی RPE ندارد (فقط RIR)؛ سقف RPE (اگر فایل ۳ داده باشد،
      // مثل بیماری قلبی/MS) صرفاً به‌عنوان یک محدودیت آگاهانه pass-through می‌شود.
      rpe_advisory_range: hardVetoRestriction.rpe_range,
    },
    banned_tags: hardVetoRestriction.banned_tags,
    equipment_priority: hardVetoRestriction.equipment_priority,
    specific_exercise_overrides: hardVetoRestriction.specific_exercise_overrides,
    warnings: hardVetoRestriction.warnings,
    requires_coach_confirmation: hardVetoRestriction.requires_coach_confirmation,
    adjustment_source: adjustment.source,
  };
}

export { finalizePrescription };
