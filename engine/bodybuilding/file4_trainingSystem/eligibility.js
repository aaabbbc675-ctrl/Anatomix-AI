const { TECHNIQUES } = require("./techniques");
const { applyTempoRule } = require("./tempoRule");

// خروجی reason وقتی eligible=false باشد، پیام صریح می‌دهد — همان چیزی که UI
// (زیرمرحله‌ی ۵.۵) برای غیرفعال/خاکستری‌کردن گزینه در ویزارد لازم دارد.
function applyTrainingTechnique({
  techniqueId,
  experience,
  exerciseEquipment,
  exerciseMovementType,
  coachManuallySelected = false,
  main_goal,
  tempo,
}) {
  const technique = TECHNIQUES[techniqueId];
  if (!technique) {
    return { eligible: false, reason: `تکنیک «${techniqueId}» شناخته‌شده نیست`, volumeMultiplier: null, intensityMultiplier: null };
  }

  if (!technique.allowedExperience.includes(experience)) {
    return {
      eligible: false,
      reason: `تکنیک «${techniqueId}» فقط برای سطح ${technique.allowedExperience.join("/")} مجاز است`,
      volumeMultiplier: null,
      intensityMultiplier: null,
    };
  }

  if (technique.equipmentBan && technique.equipmentBan.includes(exerciseEquipment)) {
    return {
      eligible: false,
      reason: `تکنیک «${techniqueId}» روی حرکات ${exerciseEquipment} مجاز نیست`,
      volumeMultiplier: null,
      intensityMultiplier: null,
    };
  }

  if (technique.requiresManualCoachSelection && !coachManuallySelected) {
    return {
      eligible: false,
      reason: `تکنیک «${techniqueId}» فقط با انتخاب دستی صریح مربی قابل‌استفاده است`,
      volumeMultiplier: null,
      intensityMultiplier: null,
    };
  }

  if (technique.onlyForGoal && technique.onlyForGoal !== main_goal) {
    return {
      eligible: false,
      reason: `تکنیک «${techniqueId}» فقط برای هدف ${technique.onlyForGoal} مجاز است`,
      volumeMultiplier: null,
      intensityMultiplier: null,
    };
  }

  if (technique.requiresMixedMovementTypes && exerciseMovementType !== "mixed") {
    return {
      eligible: false,
      reason: `تکنیک «${techniqueId}» نیازمند ترکیب حرکت ایزوله+ترکیبی است`,
      volumeMultiplier: null,
      intensityMultiplier: null,
    };
  }

  // fst_7 مکانیزم متفاوتی دارد (افزودن ثابت، نه ضرب) — جداگانه برمی‌گردد.
  if (technique.type === "fixed_addition") {
    return {
      eligible: true,
      reason: null,
      additionalSets: technique.additionalSets,
      restSecOverride: technique.restSecOverride,
      placement: technique.placement,
    };
  }

  const intensityMultiplier = applyTempoRule(technique.intensityMultiplier, tempo);

  return {
    eligible: true,
    reason: null,
    volumeMultiplier: technique.volumeMultiplier,
    intensityMultiplier,
  };
}

module.exports = { applyTrainingTechnique };
