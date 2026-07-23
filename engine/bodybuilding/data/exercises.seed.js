// دیتاست دستی و کوچک (۱۸ حرکت رایج) — طبق تصمیم صریح: این placeholder موقت
// برای تست منطق موتور است، نه بانک حرکات نهایی. بانک واقعی طبق بخش ۵ سند
// (free-exercise-db / wger.de) جداگانه و موازی تکمیل می‌شود و همین فایل با
// همان ساختار جایگزین خواهد شد.
//
// فیلدهای laterality / trainingGoal / Short_Code دقیقاً طبق بخش ۵ سند.
// فیلدهای muscle_group و movement_type افزوده‌ی من هستند (سند نخواسته)، چون
// بدون آن‌ها محاسبه‌ی isolationRatio و توزیع حجم هر عضله ممکن نیست.
// فیلد equipment هم در زیرمرحله‌ی ۵.۳ اضافه شد — برای قانون «دراپ‌ست روی هالتر
// ممنوع است» لازم بود (barbell/dumbbell/machine/cable).
//
// واژگان trainingGoal (power/strength/hypertrophy/endurance) با واژگان
// Program.main_goal (strength/fat_loss/maintenance/hypertrophy) یکی نیست؛
// نگاشت مصرفی در فایل ۴ (زیرمرحله‌ی ۵.۳): fat_loss→endurance، maintenance→hypertrophy.
const EXERCISES = [
  { id: "SQ-BB", short_code: "SQ-BB", name: "اسکوات با هالتر", muscle_group: "legs", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"] },
  { id: "DL-CV", short_code: "DL-CV", name: "ددلیفت", muscle_group: "back", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "power"] },
  { id: "BP-BB", short_code: "BP-BB", name: "پرس سینه با هالتر", muscle_group: "chest", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"] },
  { id: "OHP-BB", short_code: "OHP-BB", name: "پرس سرشانه با هالتر", muscle_group: "shoulders", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"] },
  { id: "BR-BB", short_code: "BR-BB", name: "زیربغل خم با هالتر", muscle_group: "back", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"] },
  { id: "LPD-CB", short_code: "LPD-CB", name: "لت پول‌داون", muscle_group: "back", movement_type: "compound", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy", "endurance"] },
  { id: "LP-MC", short_code: "LP-MC", name: "پرس پا با دستگاه", muscle_group: "legs", movement_type: "compound", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy", "strength"] },
  { id: "RDL-BB", short_code: "RDL-BB", name: "ددلیفت رومانیایی", muscle_group: "hamstrings", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"] },
  { id: "LNG-DB", short_code: "LNG-DB", name: "لانج با دمبل", muscle_group: "legs", movement_type: "compound", equipment: "dumbbell", laterality: "unilateral", trainingGoal: ["hypertrophy", "endurance"] },
  { id: "BSS-DB", short_code: "BSS-DB", name: "اسکوات بلغاری", muscle_group: "legs", movement_type: "compound", equipment: "dumbbell", laterality: "unilateral", trainingGoal: ["hypertrophy", "power"] },
  { id: "LC-MC", short_code: "LC-MC", name: "پشت پا خوابیده با دستگاه", muscle_group: "hamstrings", movement_type: "isolation", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy"] },
  { id: "LE-MC", short_code: "LE-MC", name: "جلو پا با دستگاه", muscle_group: "quads", movement_type: "isolation", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy"] },
  { id: "BC-BB", short_code: "BC-BB", name: "جلو بازو با هالتر", muscle_group: "biceps", movement_type: "isolation", equipment: "barbell", laterality: "bilateral", trainingGoal: ["hypertrophy"] },
  { id: "DC-DB", short_code: "DC-DB", name: "جلو بازو تک دمبل", muscle_group: "biceps", movement_type: "isolation", equipment: "dumbbell", laterality: "unilateral", trainingGoal: ["hypertrophy"] },
  { id: "DR-DB", short_code: "DR-DB", name: "زیربغل تک دمبل خم", muscle_group: "back", movement_type: "compound", equipment: "dumbbell", laterality: "unilateral", trainingGoal: ["hypertrophy", "strength"] },
  { id: "TP-CB", short_code: "TP-CB", name: "پشت بازو سیم‌کش", muscle_group: "triceps", movement_type: "isolation", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy"] },
  { id: "SH-BB", short_code: "SH-BB", name: "شراگ با هالتر", muscle_group: "traps", movement_type: "isolation", equipment: "barbell", laterality: "bilateral", trainingGoal: ["hypertrophy"] },
  { id: "CR-MC", short_code: "CR-MC", name: "ساق پا ایستاده با دستگاه", muscle_group: "calves", movement_type: "isolation", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy", "endurance"] },
];

export { EXERCISES };
