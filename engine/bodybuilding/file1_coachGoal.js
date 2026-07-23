// فایل ۱ کسکید (بخش ۳.۱ سند): پایه‌ی ورودی مربی — هدف، تجربه، روزهای تمرین.
// این ورودی از assessment/ویزارد می‌آید و در architecture_json ذخیره می‌شود
// (بخش ۲.۲ سند: ستون جدید در Students اضافه نمی‌شود).
const VALID_GOALS = ["strength", "fat_loss", "maintenance", "hypertrophy"];
const VALID_EXPERIENCE = ["beginner", "intermediate", "advanced"];

function processCoachGoal(input) {
  if (!VALID_GOALS.includes(input.main_goal)) {
    throw new Error(`main_goal نامعتبر: "${input.main_goal}". مقادیر مجاز: ${VALID_GOALS.join(", ")}`);
  }
  if (!VALID_EXPERIENCE.includes(input.experience)) {
    throw new Error(`experience نامعتبر: "${input.experience}". مقادیر مجاز: ${VALID_EXPERIENCE.join(", ")}`);
  }
  const days = Number(input.weekly_training_days);
  if (!Number.isInteger(days) || days < 1 || days > 7) {
    throw new Error(`weekly_training_days نامعتبر: "${input.weekly_training_days}". باید عدد صحیح بین ۱ تا ۷ باشد.`);
  }

  return {
    main_goal: input.main_goal,
    experience: input.experience,
    weekly_training_days: days,
  };
}

module.exports = { processCoachGoal, VALID_GOALS, VALID_EXPERIENCE };
