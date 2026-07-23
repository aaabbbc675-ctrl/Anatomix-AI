// فیلتر Injury_Blacklist روی انتخاب حرکت — تابع خالص، بدون تماس مستقیم با
// دیتابیس (طبق همان الگوی فایل‌های ۱ تا ۳). آرایه‌ی رکوردهای blacklist باید
// از قبل با injuryBlacklistRepository.getByStudentId(...) واکشی شده باشد؛
// اتصال واقعی به IPC/DB کار زیرمرحله‌ی ۵.۵ (UI) است.
function filterExercisesByInjuryBlacklist(exercises, blacklistEntries = []) {
  const blockedIds = new Set(blacklistEntries.map((entry) => entry.exercise_id));
  return exercises.filter((exercise) => !blockedIds.has(exercise.id));
}

export { filterExercisesByInjuryBlacklist };
