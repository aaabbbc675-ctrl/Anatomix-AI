// دیتاست دستی (۱۸ حرکت اولیه‌ی رایج + ۳۱ حرکت تکمیلی بدنسازی از
// bodybuilding-exercises.csv) — طبق تصمیم صریح: این placeholder موقت برای
// تست منطق موتور است، نه بانک حرکات نهایی. بانک واقعی طبق بخش ۵ سند
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
//
// چهار فیلد contraindications/neural_tension_type/rehab_target/application_rule
// طبق بخش ۳.۱۵ سند موتور اصلاحی (دسته‌ی ۱) اضافه شدند — این بانک باید همان
// دیتاست مشترک دو موتور باشد، نه یک بانک جدا برای اصلاحی. صادقانه بگوییم: این
// ۱۸ حرکت همگی حرکات اصلی بدنسازی هستند (اسکوات، ددلیفت، پرس...)، نه حرکات
// اصلاحی/ریهب واقعی، پس مقدار معنادار برای این ۴ فیلد روی اکثرشان خالی/None/
// null می‌ماند — هیچ داده‌ی بیومکانیکی دقیقی (مثلاً «این اسکوات دقیقاً چه
// contraindication‌ای دارد» یا برای ۴ حرکت unilateral، Same_Side یا
// Opposite_Side درست است) از خودمان اختراع نکردیم. ارزش واقعی این فیلدها وقتی
// آشکار می‌شود که بانک واقعی حرکات اصلاحی (که موازی در دست ساخت است) به همین
// فایل اضافه شود.
//
// دو فیلد tags/phase هم به همین دلیل به همه‌ی ۱۸ رکورد اضافه شدند (نه فقط
// رکوردهای جدید): file11/file12 از قبل با فرض exercise.tags ?? [] نوشته
// شده بودند، و file10 با exercise.phase — یعنی schema باید برای همه‌ی
// رکوردهای بانک یکسان باشد، نه فقط رکوردهای تازه. tags مثل contraindications
// یک آرایه‌ی خالی پیش‌فرض دارد (نه یک مقدار "None" مستند مثل
// neural_tension_type). phase برخلاف neural_tension_type هیچ مقدار enum
// "بدون فاز" مستندی ندارد (فقط ۴ مقدار CEx_Inhibit/CEx_Lengthen/CEx_Activate/
// CEx_Integrate)، پس همان الگوی rehab_target/application_rule (null برای
// «فعلاً نامشخص») برایش استفاده شد.
const EXERCISES = [
  { id: "SQ-BB", short_code: "SQ-BB", name: "اسکوات با هالتر", muscle_group: "legs", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "DL-CV", short_code: "DL-CV", name: "ددلیفت", muscle_group: "back", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "power"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "BP-BB", short_code: "BP-BB", name: "پرس سینه با هالتر", muscle_group: "chest", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "OHP-BB", short_code: "OHP-BB", name: "پرس سرشانه با هالتر", muscle_group: "shoulders", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "BR-BB", short_code: "BR-BB", name: "زیربغل خم با هالتر", muscle_group: "back", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "LPD-CB", short_code: "LPD-CB", name: "لت پول‌داون", muscle_group: "back", movement_type: "compound", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy", "endurance"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "LP-MC", short_code: "LP-MC", name: "پرس پا با دستگاه", muscle_group: "legs", movement_type: "compound", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy", "strength"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "RDL-BB", short_code: "RDL-BB", name: "ددلیفت رومانیایی", muscle_group: "hamstrings", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "LNG-DB", short_code: "LNG-DB", name: "لانج با دمبل", muscle_group: "legs", movement_type: "compound", equipment: "dumbbell", laterality: "unilateral", trainingGoal: ["hypertrophy", "endurance"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "BSS-DB", short_code: "BSS-DB", name: "اسکوات بلغاری", muscle_group: "legs", movement_type: "compound", equipment: "dumbbell", laterality: "unilateral", trainingGoal: ["hypertrophy", "power"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "LC-MC", short_code: "LC-MC", name: "پشت پا خوابیده با دستگاه", muscle_group: "hamstrings", movement_type: "isolation", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "LE-MC", short_code: "LE-MC", name: "جلو پا با دستگاه", muscle_group: "quads", movement_type: "isolation", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "BC-BB", short_code: "BC-BB", name: "جلو بازو با هالتر", muscle_group: "biceps", movement_type: "isolation", equipment: "barbell", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "DC-DB", short_code: "DC-DB", name: "جلو بازو تک دمبل", muscle_group: "biceps", movement_type: "isolation", equipment: "dumbbell", laterality: "unilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "DR-DB", short_code: "DR-DB", name: "زیربغل تک دمبل خم", muscle_group: "back", movement_type: "compound", equipment: "dumbbell", laterality: "unilateral", trainingGoal: ["hypertrophy", "strength"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "TP-CB", short_code: "TP-CB", name: "پشت بازو سیم‌کش", muscle_group: "triceps", movement_type: "isolation", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "SH-BB", short_code: "SH-BB", name: "شراگ با هالتر", muscle_group: "traps", movement_type: "isolation", equipment: "barbell", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "CR-MC", short_code: "CR-MC", name: "ساق پا ایستاده با دستگاه", muscle_group: "calves", movement_type: "isolation", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy", "endurance"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },

  // ۳۱ رکورد زیر از bodybuilding-exercises.csv اضافه شدند (تکمیل بانک
  // بدنسازی). طبق تصمیم صریح: چون این فایل CSV اصلاً ستون tags/phase ندارد
  // (این دو فقط در corrective-exercises.csv هستند) و این ۳۱ حرکت خالص
  // بدنسازی‌اند (بخشی از سیستم فاز CEx موتور اصلاحی نیستند)، tags/phase روی
  // همه‌شان همان پیش‌فرض خالی/null ۱۸ رکورد قبلی ماند — مقداردهی‌شان اختراع
  // داده می‌بود.
  { id: "INCBP-BB", short_code: "INCBP-BB", name: "پرس بالاسینه با هالتر", muscle_group: "chest", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "DFLY-DB", short_code: "DFLY-DB", name: "فلای دمبل روی نیمکت", muscle_group: "chest", movement_type: "isolation", equipment: "dumbbell", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "CCO-CB", short_code: "CCO-CB", name: "کراس‌اور با کابل", muscle_group: "chest", movement_type: "isolation", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "PU-BW", short_code: "PU-BW", name: "شنا سوئدی", muscle_group: "chest", movement_type: "compound", equipment: "bodyweight", laterality: "bilateral", trainingGoal: ["hypertrophy", "endurance"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "PLUP-BW", short_code: "PLUP-BW", name: "بارفیکس", muscle_group: "back", movement_type: "compound", equipment: "bodyweight", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "SCR-CB", short_code: "SCR-CB", name: "زیربغل نشسته با سیم‌کش", muscle_group: "back", movement_type: "compound", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy", "strength"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "TBR-BB", short_code: "TBR-BB", name: "زیربغل تی‌بار", muscle_group: "back", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "BBFP-CB", short_code: "BBFP-CB", name: "فیس‌پول (بدنسازی)", muscle_group: "back", movement_type: "isolation", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "LR-DB", short_code: "LR-DB", name: "نشر جانبی با دمبل", muscle_group: "shoulders", movement_type: "isolation", equipment: "dumbbell", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "ARN-DB", short_code: "ARN-DB", name: "پرس آرنولد", muscle_group: "shoulders", movement_type: "compound", equipment: "dumbbell", laterality: "bilateral", trainingGoal: ["hypertrophy", "strength"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "RDF-CB", short_code: "RDF-CB", name: "فلای خلفی با کابل", muscle_group: "shoulders", movement_type: "isolation", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "UPR-BB", short_code: "UPR-BB", name: "کشش قایقی با هالتر", muscle_group: "traps", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "HT-BB", short_code: "HT-BB", name: "هیپ تراست با هالتر", muscle_group: "glutes", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "HAB-MC", short_code: "HAB-MC", name: "دورکننده‌ی لگن با دستگاه", muscle_group: "Gluteus_Medius", movement_type: "isolation", equipment: "machine", laterality: "unilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "SCLF-MC", short_code: "SCLF-MC", name: "ساق پا نشسته با دستگاه", muscle_group: "calves", movement_type: "isolation", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy", "endurance"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "SLC-MC", short_code: "SLC-MC", name: "پشت پا نشسته با دستگاه", muscle_group: "hamstrings", movement_type: "isolation", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "FSQ-BB", short_code: "FSQ-BB", name: "اسکوات جلو با هالتر", muscle_group: "quads", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "HACK-MC", short_code: "HACK-MC", name: "هک اسکوات با دستگاه", muscle_group: "quads", movement_type: "compound", equipment: "machine", laterality: "bilateral", trainingGoal: ["hypertrophy", "strength"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "GOB-DB", short_code: "GOB-DB", name: "اسکوات گابلت", muscle_group: "legs", movement_type: "compound", equipment: "dumbbell", laterality: "bilateral", trainingGoal: ["hypertrophy", "strength"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "KBS-DB", short_code: "KBS-DB", name: "سوئینگ کتل‌بل", muscle_group: "glutes", movement_type: "compound", equipment: "dumbbell", laterality: "bilateral", trainingGoal: ["power", "endurance"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "HC-DB", short_code: "HC-DB", name: "جلو بازو چکشی", muscle_group: "biceps", movement_type: "isolation", equipment: "dumbbell", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "CC-CB", short_code: "CC-CB", name: "جلو بازو سیم‌کش", muscle_group: "biceps", movement_type: "isolation", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "PC-BB", short_code: "PC-BB", name: "جلو بازو لاری", muscle_group: "biceps", movement_type: "isolation", equipment: "barbell", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "OHE-DB", short_code: "OHE-DB", name: "پشت بازو دمبل بالای سر", muscle_group: "triceps", movement_type: "isolation", equipment: "dumbbell", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "CGBP-BB", short_code: "CGBP-BB", name: "پرس سینه دست‌جمع", muscle_group: "triceps", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["strength", "hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "DIP-BW", short_code: "DIP-BW", name: "دیپ سینه/بازو", muscle_group: "triceps", movement_type: "compound", equipment: "bodyweight", laterality: "bilateral", trainingGoal: ["hypertrophy", "strength"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "WC-DB", short_code: "WC-DB", name: "کرل مچ با دمبل", muscle_group: "forearms", movement_type: "isolation", equipment: "dumbbell", laterality: "bilateral", trainingGoal: ["hypertrophy", "endurance"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "CCR-CB", short_code: "CCR-CB", name: "کرانچ سیم‌کش", muscle_group: "abs", movement_type: "isolation", equipment: "cable", laterality: "bilateral", trainingGoal: ["hypertrophy"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "HLR-BW", short_code: "HLR-BW", name: "بالاآوردن پا آویزان", muscle_group: "abs", movement_type: "isolation", equipment: "bodyweight", laterality: "bilateral", trainingGoal: ["hypertrophy", "strength"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "RT-BW", short_code: "RT-BW", name: "چرخش روسی", muscle_group: "abs", movement_type: "isolation", equipment: "bodyweight", laterality: "bilateral", trainingGoal: ["hypertrophy", "endurance"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
  { id: "CLEAN-BB", short_code: "CLEAN-BB", name: "یک‌ضرب پاورلیفتینگ (کلین‌اند‌پرس)", muscle_group: "full_body", movement_type: "compound", equipment: "barbell", laterality: "bilateral", trainingGoal: ["power", "strength"], contraindications: [], neural_tension_type: "None", rehab_target: null, application_rule: null, tags: [], phase: null },
];

export { EXERCISES };
