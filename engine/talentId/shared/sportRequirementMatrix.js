// ماتریس نیازهای رشته‌ها، طبق schema بخش ۱۸.۱ سند معماری استعدادیابی.
// این فایل عمداً یک آبجکت ساده‌ی id-keyed است، نه Map — خودِ سند بین این دو
// (`sportRequirementMatrix.keys()` در جاهایی، `sportMatrix[sportId]` در
// جاهای دیگه) ناسازگار است؛ چون بقیه‌ی دیتاهای مشابه در این کدبیس
// (SLOT_STANDARDS، posturalSportImpactMap) همه آبجکت ساده با یک getter
// کمکی هستند، همون الگو اینجا هم دنبال می‌شود.
//
// Commit 1 فقط ۵ رشته‌ی اول را seed می‌کند (طبق بخش ۲۴.۱). بونوس‌ها/جریمه‌ها
// هرجا که خودِ سند صریحاً عددش را داده (بخش‌های ۵، ۱۰، ۱۵.۲، ۲۰.۴) عیناً از
// آنجا کپی شده‌اند؛ هرجا سند فقط اسم رشته را برده بدون عدد دقیق (بیشتر
// composition/biometric bonuses)، آن رشته را خالی گذاشتیم تا چیزی که سند
// تعیین نکرده حدس زده نشود. تکمیل کامل ۵۲ رشته در Commit 17-19 (Wave 1-3) است.
import { TalentIdError } from "./talentIdErrors.js";

const sportRequirementMatrix = {
  // === بخش ۲۰.۴ سند: نمونه‌ی کامل، عیناً کپی شده ===
  soccer_striker: {
    id: "soccer_striker",
    name_fa: "فوتبال - مهاجم هدف",
    name_en: "Soccer - Target Striker",
    category: "team_ball",
    subcategory: "field_striker",
    is_position_specific: true,
    parent_sport: "soccer",

    anthropometric_bonuses: {
      tall_stature: { threshold_cm_male: 178, threshold_cm_female: 168, bonus: 15 },
      strong_upper_body_frame: 10,
      cormic_high: 10,
    },
    // طبق تصمیم تاییدشده‌ی Commit 5: body_fat_low → bf_very_low (نام رسمی
    // driver طبق بخش ۵.۵ سند).
    composition_bonuses: {
      bf_very_low: 10,
      smm_high: 10,
    },
    // طبق تصمیم تاییدشده‌ی Commit 5: balance_high → balance_score_high
    // (نام رسمی بخش ۵.۵ سند) + bilateral_asymmetry_high اضافه شد چون
    // soccer در لیست پنالتی بخش ۵.۳.۶ سند است (بدون این کلید، آن قانون
    // سند هیچ‌وقت برای هیچ‌کدام از ۵ رشته‌ی Commit 1 اجرا نمی‌شد).
    biometric_bonuses: {
      balance_score_high: 10,
      bilateral_asymmetry_high: -15,
    },

    performance_weights: {
      sprint_10m: 0.25,
      sprint_30m: 0.15,
      vertical_jump: 0.2,
      broad_jump: 0.1,
      agility_5_10_5: 0.1,
      beep_test: 0.1,
      handgrip: 0.05,
      wall_toss: 0.05,
    },
    critical_perf_tests: ["sprint_10m", "vertical_jump"],

    psych_requirements: {
      teamwork_score: 2,
      aggression_contact: 4,
      focus_patience: 5,
      pressure_tolerance: 5,
      dynamic_activity: 4,
      chaos_decision: 5,
      resilience: 5,
    },
    trait_importance: {
      pressure_tolerance: 2,
      resilience: 2,
      chaos_decision: 1.5,
      aggression_contact: 1,
      teamwork_score: 0.7,
      focus_patience: 1,
      dynamic_activity: 1,
    },

    minimum_bio_age_recommended: 10,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: ["flat_foot", "genu_valgum"],
    medical_contraindications: ["active_acl_partial_tear", "active_meniscus_tear"],

    similar_sports: {
      by_anthropometry: ["handball", "basketball_forward"],
      by_performance: ["sprint_100m", "rugby_center"],
      by_psychology: ["boxing", "handball_pivot"],
    },
  },

  // === بخش ۲۰.۴ سند (نمونه‌ی ترجمه‌ی کشتی) + بخش ۱۱.۲ activePathologyMap ===
  wrestling_freestyle: {
    id: "wrestling_freestyle",
    name_fa: "کشتی آزاد",
    name_en: "Wrestling - Freestyle",
    category: "combat",
    subcategory: "freestyle",
    is_position_specific: false,

    anthropometric_bonuses: {
      cormic_high: 15,
      ape_index_low: 10,
    },
    // ffmi_athletic طبق تصمیم تاییدشده‌ی Commit 5 اضافه شد: کشتی در لیست
    // بونوس بخش ۵.۳.۸ سند است (ffm_index بین ۲۴ تا ۲۷)، بدون این کلید آن
    // قانون هیچ‌وقت اجرا نمی‌شد.
    composition_bonuses: {
      smm_high: 15,
      ffmi_athletic: 15,
    },
    biometric_bonuses: {},

    performance_weights: {
      handgrip: 0.25,
      beep_test: 0.25,
      agility_5_10_5: 0.15,
      vertical_jump: 0.1,
      broad_jump: 0.1,
      pushups: 0.1,
      sit_and_reach: 0.05,
    },
    critical_perf_tests: ["handgrip", "beep_test"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 5,
      focus_patience: 4,
      pressure_tolerance: 5,
      dynamic_activity: 5,
      chaos_decision: 4,
      resilience: 5,
    },
    trait_importance: {
      teamwork_score: 0.5,
      aggression_contact: 2,
      resilience: 2,
      pressure_tolerance: 1.5,
      focus_patience: 1,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 10,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    // طبق posturalSportImpactMap (بخش ۶.۴): scoliosis.wrestling_freestyle = -25
    postural_contraindications: ["scoliosis"],
    // طبق activePathologyMap (بخش ۱۱.۲): active_disc_herniation.wrestling_freestyle = high_risk
    medical_contraindications: ["active_disc_herniation"],

    // طبق sportSimilarityGraph نمونه‌ی بخش ۱۵.۲
    similar_sports: {
      by_anthropometry: ["judo", "weightlifting_olympic"],
      by_performance: ["judo"],
      by_psychology: ["boxing"],
    },
  },

  // === بخش ۱۴.۵ Match Report نمونه + بخش ۵.۳.۱ و ۱۵.۲ سند ===
  volleyball_middle_blocker: {
    id: "volleyball_middle_blocker",
    name_fa: "والیبال - مدافع میانی",
    name_en: "Volleyball - Middle Blocker",
    category: "team_ball",
    subcategory: "middle_blocker",
    is_position_specific: true,
    parent_sport: "volleyball",

    // ape_index_high: +15 دقیقاً طبق بخش ۵.۳.۱ (volleyball_middle_blocker در لیست است)
    anthropometric_bonuses: {
      ape_index_high: 15,
      tall_stature: { threshold_cm_male: 195, threshold_cm_female: 180, bonus: 20 },
    },
    composition_bonuses: {},
    // bilateral_asymmetry_high طبق تصمیم تاییدشده‌ی Commit 5 اضافه شد:
    // volleyball در لیست پنالتی بخش ۵.۳.۶ سند است (رشته‌ی پرشی، ریسک ACL).
    biometric_bonuses: {
      bilateral_asymmetry_high: -15,
    },

    performance_weights: {
      vertical_jump: 0.3,
      broad_jump: 0.1,
      sprint_10m: 0.05,
      agility_5_10_5: 0.15,
      beep_test: 0.1,
      handgrip: 0.1,
      pushups: 0.1,
      wall_toss: 0.1,
    },
    critical_perf_tests: ["vertical_jump"],

    psych_requirements: {
      teamwork_score: 5,
      aggression_contact: 3,
      focus_patience: 4,
      pressure_tolerance: 5,
      dynamic_activity: 4,
      chaos_decision: 3,
      resilience: 4,
    },
    trait_importance: {
      teamwork_score: 1.5,
      pressure_tolerance: 1.5,
      resilience: 1,
      aggression_contact: 0.5,
      focus_patience: 1,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 11,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    // طبق posturalSportImpactMap (بخش ۶.۴): kyphosis.volleyball_middle_blocker = -25
    postural_contraindications: ["kyphosis", "rounded_shoulder"],
    // طبق activePathologyMap (بخش ۱۱.۲): volleyball در disc_herniation و shoulder_impingement است
    medical_contraindications: ["active_disc_herniation", "active_shoulder_impingement"],

    // عیناً از sportSimilarityGraph بخش ۱۵.۲
    similar_sports: {
      by_anthropometry: ["basketball_center", "high_jump", "swimming"],
      by_performance: ["basketball", "handball", "high_jump"],
      by_psychology: ["basketball", "volleyball_outside", "gymnastics"],
    },
  },

  // === بخش ۵.۳ (ape/cormic/TBW/HR bonuses) + بخش ۶.۴/۱۱.۲ سند ===
  swimming_general: {
    id: "swimming_general",
    name_fa: "شنا - عمومی",
    name_en: "Swimming - General",
    category: "endurance",
    subcategory: "general",
    is_position_specific: false,

    // ape_index_high و cormic_high هر دو در لیست شنا هستند (بخش ۵.۳.۱ و ۵.۳.۲)
    anthropometric_bonuses: {
      ape_index_high: 15,
      cormic_high: 15,
    },
    // resting_hr_low و tbw_high طبق بخش ۵.۳.۳/۵.۳.۴ برای رشته‌های استقامتی شنا
    composition_bonuses: {
      tbw_high: 10,
    },
    biometric_bonuses: {
      resting_hr_low: 20,
    },

    performance_weights: {
      beep_test: 0.35,
      sit_and_reach: 0.2,
      pushups: 0.15,
      handgrip: 0.1,
      vertical_jump: 0.1,
      broad_jump: 0.1,
    },
    critical_perf_tests: ["beep_test"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 1,
      focus_patience: 5,
      pressure_tolerance: 3,
      dynamic_activity: 3,
      chaos_decision: 2,
      resilience: 4,
    },
    trait_importance: {
      focus_patience: 1.5,
      resilience: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      pressure_tolerance: 1,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 8,
    is_recommended_early_specialization: true,
    ltad_stage: "FUNdamentals",

    // طبق posturalSportImpactMap: kyphosis.swimming = -25، rounded_shoulder.swimming = -20
    postural_contraindications: ["kyphosis", "rounded_shoulder"],
    // طبق activePathologyMap: active_shoulder_impingement.swimming = high_risk
    medical_contraindications: ["active_shoulder_impingement"],

    similar_sports: {
      by_anthropometry: ["rowing"],
      by_performance: ["rowing"],
      by_psychology: ["rowing", "cycling_road"],
    },
  },

  // === بخش ۵.۳ (ape_index_low، smm_high) + بخش ۶.۴/۱۱.۲/۱۵.۲ سند ===
  weightlifting_olympic: {
    id: "weightlifting_olympic",
    name_fa: "وزنه‌برداری المپیک",
    name_en: "Weightlifting - Olympic",
    category: "strength",
    subcategory: "olympic",
    is_position_specific: false,

    // ape_index_low: +15 دقیقاً طبق بخش ۵.۳.۱ (weightlifting_olympic در لیست است)
    anthropometric_bonuses: {
      ape_index_low: 15,
    },
    // smm_high: +20 دقیقاً طبق بخش ۵.۳.۳
    composition_bonuses: {
      smm_high: 20,
    },
    // handgrip_asymmetry_high طبق تصمیم تاییدشده‌ی Commit 5 اضافه شد:
    // weightlifting در لیست پنالتی بخش ۵.۳.۷ سند است.
    biometric_bonuses: {
      handgrip_asymmetry_high: -10,
    },

    performance_weights: {
      handgrip: 0.25,
      vertical_jump: 0.25,
      broad_jump: 0.2,
      sprint_10m: 0.1,
      agility_5_10_5: 0.05,
      beep_test: 0.05,
      pushups: 0.1,
    },
    critical_perf_tests: ["vertical_jump", "handgrip"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 2,
      focus_patience: 5,
      pressure_tolerance: 5,
      dynamic_activity: 2,
      chaos_decision: 2,
      resilience: 4,
    },
    trait_importance: {
      focus_patience: 2,
      pressure_tolerance: 2,
      resilience: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 12,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    // طبق posturalSportImpactMap: kyphosis/hyperlordosis/scoliosis همه برای weightlifting_olympic منفی‌اند
    postural_contraindications: ["kyphosis", "hyperlordosis", "scoliosis"],
    // طبق activePathologyMap (بخش ۱۱.۲)
    medical_contraindications: [
      "active_disc_herniation",
      "active_shoulder_impingement",
      "active_severe_scoliosis_cobb_over_40",
    ],

    similar_sports: {
      by_anthropometry: ["wrestling_freestyle", "powerlifting"],
      by_performance: ["powerlifting"],
      by_psychology: ["powerlifting", "wrestling_freestyle"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Commit 17 — ۲۴ رشته‌ی جدید (طبق docs/TODO-wave-labeling-correction.md:
  // این‌ها ردیف‌های ۱۶-۴۰ جدول ۲۰.۶ سند به‌جز wrestling_freestyle که از قبل
  // ساخته شده بود؛ برچسب «Wave» دیگر استفاده نمی‌شود چون خودِ سند در
  // شمارش Wave ناسازگار بود). داده‌ی هر رشته از دانش عمومی علوم ورزشی
  // (NSCA/ACSM، طبق بخش ۲۳ سند) استنتاج شده، نه از جزئیات دقیق سند —
  // فقط دو رشته (soccer_striker، wrestling_freestyle) جزئیات کامل سندی
  // داشتند. سطح اطمینان هر رابطه‌ی similar_sports طبق همان قرارداد
  // Commit 14 (۳/۲/۱ دسته → قوی/متوسط/ضعیف) در کامنت هر رشته مشخص شده،
  // با تفکیک صریح «قوی — مستند» (از داده‌ی موجود Commit 1) در برابر
  // «قوی — استنتاجی» (منطق ماست، نه سند) — طبق تصمیم تاییدشده‌ی کاربر.
  // ═══════════════════════════════════════════════════════════════════════

  // ─── تیمی-توپی: هندبال ─────────────────────────────────────────────────
  handball_goalkeeper: {
    id: "handball_goalkeeper",
    name_fa: "هندبال - دروازه‌بان",
    name_en: "Handball - Goalkeeper",
    category: "team_ball",
    subcategory: "goalkeeper",
    is_position_specific: true,
    parent_sport: "handball",

    anthropometric_bonuses: {
      tall_stature: { threshold_cm_male: 185, threshold_cm_female: 172, bonus: 15 },
      ape_index_high: 10,
    },
    composition_bonuses: {},
    biometric_bonuses: {},

    performance_weights: {
      agility_5_10_5: 0.35,
      sit_and_reach: 0.15,
      vertical_jump: 0.15,
      broad_jump: 0.15,
      handgrip: 0.1,
      beep_test: 0.1,
    },
    critical_perf_tests: ["agility_5_10_5"],

    psych_requirements: {
      teamwork_score: 2,
      aggression_contact: 2,
      focus_patience: 5,
      pressure_tolerance: 5,
      dynamic_activity: 3,
      chaos_decision: 4,
      resilience: 5,
    },
    trait_importance: {
      pressure_tolerance: 2,
      focus_patience: 1.5,
      resilience: 1.5,
      chaos_decision: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      dynamic_activity: 1,
    },

    minimum_bio_age_recommended: 10,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: ["kyphosis"],
    medical_contraindications: ["active_shoulder_impingement"],

    // هیچ ارتباط معناداری با ۵ رشته‌ی موجود پیدا نشد — دروازه‌بانی مهارت
    // کاملاً متمایزی است؛ صادقانه خالی گذاشته شد (هم‌الگوی سکوت soccer_striker
    // در Commit 14)، نه حدس زده شد.
    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: [] },
  },

  handball_wing: {
    id: "handball_wing",
    name_fa: "هندبال - وینگر",
    name_en: "Handball - Wing",
    category: "team_ball",
    subcategory: "wing",
    is_position_specific: true,
    parent_sport: "handball",

    anthropometric_bonuses: {},
    composition_bonuses: { smm_high: 10 },
    biometric_bonuses: {},

    performance_weights: {
      sprint_10m: 0.25,
      vertical_jump: 0.25,
      agility_5_10_5: 0.25,
      broad_jump: 0.15,
      beep_test: 0.1,
    },
    critical_perf_tests: ["sprint_10m", "vertical_jump"],

    psych_requirements: {
      teamwork_score: 2,
      aggression_contact: 3,
      focus_patience: 3,
      pressure_tolerance: 4,
      dynamic_activity: 5,
      chaos_decision: 5,
      resilience: 4,
    },
    trait_importance: {
      dynamic_activity: 1.5,
      chaos_decision: 1.5,
      pressure_tolerance: 1,
      teamwork_score: 0.5,
      aggression_contact: 1,
      focus_patience: 1,
      resilience: 1,
    },

    minimum_bio_age_recommended: 10,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: ["genu_valgum"],
    medical_contraindications: ["active_acl_partial_tear"],

    // اطمینان متوسط (۱ دسته): اتکای مشترک به vertical_jump، نه رابطه‌ی سندی.
    similar_sports: { by_anthropometry: [], by_performance: ["volleyball_middle_blocker"], by_psychology: [] },
  },

  handball_back: {
    id: "handball_back",
    name_fa: "هندبال - بک",
    name_en: "Handball - Back",
    category: "team_ball",
    subcategory: "back",
    is_position_specific: true,
    parent_sport: "handball",

    anthropometric_bonuses: {
      ape_index_high: 15,
      tall_stature: { threshold_cm_male: 188, threshold_cm_female: 175, bonus: 15 },
    },
    composition_bonuses: { smm_high: 10 },
    biometric_bonuses: {},

    performance_weights: {
      handgrip: 0.3,
      vertical_jump: 0.25,
      broad_jump: 0.15,
      sprint_10m: 0.15,
      beep_test: 0.15,
    },
    critical_perf_tests: ["handgrip", "vertical_jump"],

    psych_requirements: {
      teamwork_score: 2,
      aggression_contact: 4,
      focus_patience: 4,
      pressure_tolerance: 5,
      dynamic_activity: 4,
      chaos_decision: 4,
      resilience: 5,
    },
    trait_importance: {
      pressure_tolerance: 2,
      resilience: 1.5,
      aggression_contact: 1,
      teamwork_score: 0.5,
      focus_patience: 1,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 11,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: ["kyphosis"],
    medical_contraindications: ["active_shoulder_impingement"],

    // اطمینان ضعیف (۱ دسته، کاملاً استنتاجی): شباهت مفهومی «شوت‌زنی تحت
    // فشار» با soccer_striker، نه بیومکانیک یکسان (پرتاب دست در برابر شوت پا).
    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: ["soccer_striker"] },
  },

  handball_pivot: {
    id: "handball_pivot",
    name_fa: "هندبال - پیوت",
    name_en: "Handball - Pivot",
    category: "team_ball",
    subcategory: "pivot",
    is_position_specific: true,
    parent_sport: "handball",

    anthropometric_bonuses: {
      tall_stature: { threshold_cm_male: 190, threshold_cm_female: 178, bonus: 15 },
    },
    composition_bonuses: { smm_high: 15, ffmi_athletic: 15 },
    biometric_bonuses: {},

    performance_weights: {
      handgrip: 0.25,
      vertical_jump: 0.2,
      pushups: 0.2,
      broad_jump: 0.15,
      beep_test: 0.2,
    },
    critical_perf_tests: ["handgrip"],

    psych_requirements: {
      teamwork_score: 2,
      aggression_contact: 5,
      focus_patience: 3,
      pressure_tolerance: 4,
      dynamic_activity: 3,
      chaos_decision: 3,
      resilience: 4,
    },
    trait_importance: {
      aggression_contact: 2,
      pressure_tolerance: 1.5,
      resilience: 1,
      teamwork_score: 0.5,
      focus_patience: 1,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 11,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: ["kyphosis"],
    medical_contraindications: ["active_shoulder_impingement"],

    // اطمینان قوی — مستند: soccer_striker.similar_sports.by_psychology از
    // قبل (Commit 1) شامل "handball_pivot" است؛ اینجا رابطه‌ی متقابل ثبت
    // می‌شود، نه یک حدس تازه. ارتباط با weightlifting_olympic (قدرت
    // بالاتنه) استنتاجی و ضعیف‌تر است.
    similar_sports: {
      by_anthropometry: ["weightlifting_olympic"],
      by_performance: [],
      by_psychology: ["soccer_striker"],
    },
  },

  // ─── تیمی-توپی: فوتسال ─────────────────────────────────────────────────
  futsal_goalkeeper: {
    id: "futsal_goalkeeper",
    name_fa: "فوتسال - دروازه‌بان",
    name_en: "Futsal - Goalkeeper",
    category: "team_ball",
    subcategory: "goalkeeper",
    is_position_specific: true,
    parent_sport: "futsal",

    // برخلاف handball_goalkeeper، عمداً بدون tall_stature: دروازه‌ی فوتسال
    // کوچک است (۳×۲ متر)، بونوس قد معنادار نیست.
    anthropometric_bonuses: {},
    composition_bonuses: {},
    biometric_bonuses: {},

    performance_weights: {
      agility_5_10_5: 0.4,
      sit_and_reach: 0.15,
      vertical_jump: 0.15,
      broad_jump: 0.15,
      handgrip: 0.15,
    },
    critical_perf_tests: ["agility_5_10_5"],

    psych_requirements: {
      teamwork_score: 2,
      aggression_contact: 2,
      focus_patience: 5,
      pressure_tolerance: 5,
      dynamic_activity: 3,
      chaos_decision: 5,
      resilience: 5,
    },
    trait_importance: {
      pressure_tolerance: 2,
      chaos_decision: 1.5,
      focus_patience: 1.5,
      resilience: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      dynamic_activity: 1,
    },

    minimum_bio_age_recommended: 9,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: ["kyphosis"],
    medical_contraindications: ["active_shoulder_impingement"],

    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: [] },
  },

  futsal_fixo: {
    id: "futsal_fixo",
    name_fa: "فوتسال - فیکسو",
    name_en: "Futsal - Fixo",
    category: "team_ball",
    subcategory: "fixo",
    is_position_specific: true,
    parent_sport: "futsal",

    // ⚠️ cormic_high اینجا یک حدس مهندسی با اطمینان متوسط است (مرکز ثقل
    // پایین‌تر برای دفاع در فضای تنگ)، نه استخراج مستقیم از منبع مشخص —
    // طبق همان سطح افشای body_fat زنانه در Commit 5.
    anthropometric_bonuses: { cormic_high: 10 },
    composition_bonuses: {},
    biometric_bonuses: {},

    performance_weights: {
      agility_5_10_5: 0.35,
      sprint_10m: 0.25,
      beep_test: 0.2,
      broad_jump: 0.1,
      handgrip: 0.1,
    },
    critical_perf_tests: ["agility_5_10_5"],

    psych_requirements: {
      teamwork_score: 3,
      aggression_contact: 2,
      focus_patience: 4,
      pressure_tolerance: 4,
      dynamic_activity: 3,
      chaos_decision: 3,
      resilience: 4,
    },
    trait_importance: {
      teamwork_score: 1,
      focus_patience: 1.5,
      pressure_tolerance: 1,
      resilience: 1,
      aggression_contact: 0.5,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 9,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: ["genu_valgum"],
    medical_contraindications: [],

    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: [] },
  },

  futsal_flank: {
    id: "futsal_flank",
    name_fa: "فوتسال - الا",
    name_en: "Futsal - Flank (Ala)",
    category: "team_ball",
    subcategory: "flank",
    is_position_specific: true,
    parent_sport: "futsal",

    anthropometric_bonuses: {},
    composition_bonuses: { bf_very_low: 10 },
    biometric_bonuses: {},

    performance_weights: {
      sprint_10m: 0.35,
      agility_5_10_5: 0.35,
      broad_jump: 0.15,
      beep_test: 0.15,
    },
    critical_perf_tests: ["sprint_10m", "agility_5_10_5"],

    psych_requirements: {
      teamwork_score: 2,
      aggression_contact: 3,
      focus_patience: 3,
      pressure_tolerance: 4,
      dynamic_activity: 5,
      chaos_decision: 5,
      resilience: 4,
    },
    trait_importance: {
      dynamic_activity: 1.5,
      chaos_decision: 1.5,
      pressure_tolerance: 1,
      teamwork_score: 0.5,
      aggression_contact: 1,
      focus_patience: 1,
      resilience: 1,
    },

    minimum_bio_age_recommended: 9,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: ["genu_valgum"],
    medical_contraindications: ["active_ankle_sprain_grade_2_or_3"],

    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: [] },
  },

  futsal_pivot: {
    id: "futsal_pivot",
    name_fa: "فوتسال - پیوت",
    name_en: "Futsal - Pivot",
    category: "team_ball",
    subcategory: "pivot",
    is_position_specific: true,
    parent_sport: "futsal",

    anthropometric_bonuses: {},
    composition_bonuses: { smm_high: 10 },
    biometric_bonuses: {},

    performance_weights: {
      sprint_10m: 0.3,
      agility_5_10_5: 0.3,
      handgrip: 0.15,
      broad_jump: 0.15,
      beep_test: 0.1,
    },
    critical_perf_tests: ["sprint_10m", "agility_5_10_5"],

    psych_requirements: {
      teamwork_score: 2,
      aggression_contact: 4,
      focus_patience: 4,
      pressure_tolerance: 5,
      dynamic_activity: 4,
      chaos_decision: 4,
      resilience: 5,
    },
    trait_importance: {
      pressure_tolerance: 1.5,
      resilience: 1.5,
      aggression_contact: 1,
      teamwork_score: 0.5,
      focus_patience: 1,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 9,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: ["kyphosis"],
    medical_contraindications: [],

    // اطمینان متوسط-قوی (استنتاجی): نقش «هدف پشت‌به‌دروازه» تقریباً معادل
    // futsal کوچک‌شده‌ی soccer_striker است.
    similar_sports: { by_anthropometry: [], by_performance: ["soccer_striker"], by_psychology: ["soccer_striker"] },
  },

  // ─── رزمی ───────────────────────────────────────────────────────────────
  wrestling_greco: {
    id: "wrestling_greco",
    name_fa: "کشتی فرنگی",
    name_en: "Wrestling - Greco-Roman",
    category: "combat",
    subcategory: "greco_roman",
    is_position_specific: false,

    anthropometric_bonuses: { cormic_high: 15 },
    // بالاتر از wrestling_freestyle عمداً: چون تکل پا در فرنگی ممنوع است،
    // تمام قدرت روی بالاتنه متمرکز می‌شود.
    composition_bonuses: { smm_high: 20, ffmi_athletic: 15 },
    biometric_bonuses: {},

    performance_weights: {
      handgrip: 0.3,
      pushups: 0.2,
      beep_test: 0.2,
      broad_jump: 0.15,
      sit_and_reach: 0.15,
    },
    critical_perf_tests: ["handgrip", "pushups"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 5,
      focus_patience: 4,
      pressure_tolerance: 5,
      dynamic_activity: 5,
      chaos_decision: 4,
      resilience: 5,
    },
    trait_importance: {
      teamwork_score: 0.5,
      aggression_contact: 2,
      resilience: 2,
      pressure_tolerance: 1.5,
      focus_patience: 1,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 10,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    postural_contraindications: ["scoliosis"],
    medical_contraindications: ["active_disc_herniation"],

    // اطمینان قوی — استنتاجی (نه از داده‌ی موجود، بلکه رابطه‌ی مکانیکی
    // کاملاً شناخته‌شده‌ی فرنگی/آزاد در ادبیات کشتی: عملاً همان رشته با
    // قانون متفاوت).
    similar_sports: {
      by_anthropometry: ["wrestling_freestyle"],
      by_performance: ["wrestling_freestyle"],
      by_psychology: ["wrestling_freestyle"],
    },
  },

  boxing: {
    id: "boxing",
    name_fa: "بوکس",
    name_en: "Boxing",
    category: "combat",
    subcategory: "boxing",
    is_position_specific: false,

    // ape_index_high برخلاف کشتی عمدی است: «reach advantage» یک مزیت
    // شناخته‌شده و مستند در ادبیات بوکس است — دقیقاً برعکس ape_index_low
    // کشتی (بازوی کوتاه برای اهرم در گیر و گرفتن).
    anthropometric_bonuses: { ape_index_high: 15, cormic_low: 10 },
    composition_bonuses: { bf_very_low: 10 },
    biometric_bonuses: {},

    performance_weights: {
      agility_5_10_5: 0.3,
      beep_test: 0.3,
      handgrip: 0.15,
      sprint_10m: 0.15,
      pushups: 0.1,
    },
    critical_perf_tests: ["agility_5_10_5", "beep_test"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 5,
      focus_patience: 4,
      pressure_tolerance: 5,
      dynamic_activity: 5,
      chaos_decision: 5,
      resilience: 5,
    },
    trait_importance: {
      aggression_contact: 2,
      resilience: 2,
      pressure_tolerance: 1.5,
      chaos_decision: 1.5,
      teamwork_score: 0.5,
      focus_patience: 1,
      dynamic_activity: 1,
    },

    minimum_bio_age_recommended: 11,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    // طبق posturalSportImpactMap (بخش ۶.۴، از قبل موجود در Commit 6):
    // forward_head.boxing = -15 (پنالتی واقعی). kyphosis/rounded_shoulder
    // هم برای boxing تعریف شده‌اند اما هر دو beneficial:'mild_only' با
    // penalty=0 (گارد طبیعی/حفاظت چانه) — عمداً در این لیست نیامدند چون
    // واقعاً «contraindication» نیستند، بلکه خنثی/مفیدند.
    postural_contraindications: ["forward_head"],
    medical_contraindications: ["active_shoulder_impingement"],

    // اطمینان قوی — مستند: wrestling_freestyle.similar_sports.by_psychology
    // از قبل (Commit 1) شامل "boxing" است؛ رابطه‌ی متقابل ثبت می‌شود.
    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: ["wrestling_freestyle"] },
  },

  taekwondo: {
    id: "taekwondo",
    name_fa: "تکواندو",
    name_en: "Taekwondo",
    category: "combat",
    subcategory: "kyorugi",
    is_position_specific: false,

    // ⚠️ تصحیح حین پیاده‌سازی: در جدول خلاصه‌ی تأییدشده «skeliac_index»
    // پیشنهاد شده بود، اما این کلید در computeActiveConditions (file4،
    // Commit 5) پشتیبانی نمی‌شود — چک شد. به‌جایش cormic_low استفاده شد که
    // همان مفهوم (پای بلند نسبت به تنه) را با کلید واقعاً پشتیبانی‌شده
    // می‌سنجد (cormic_index = sitting_height/standing_height؛ پای بلندتر
        // نسبی = cormic_index پایین‌تر).
    anthropometric_bonuses: { cormic_low: 10 },
    composition_bonuses: { bf_very_low: 10 },
    biometric_bonuses: {},

    performance_weights: {
      sit_and_reach: 0.3,
      agility_5_10_5: 0.25,
      vertical_jump: 0.2,
      sprint_10m: 0.15,
      beep_test: 0.1,
    },
    critical_perf_tests: ["sit_and_reach"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 4,
      focus_patience: 3,
      pressure_tolerance: 5,
      dynamic_activity: 5,
      chaos_decision: 5,
      resilience: 4,
    },
    trait_importance: {
      pressure_tolerance: 1.5,
      chaos_decision: 1.5,
      dynamic_activity: 1,
      aggression_contact: 1,
      teamwork_score: 0.5,
      focus_patience: 1,
      resilience: 1,
    },

    minimum_bio_age_recommended: 9,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: [],
    medical_contraindications: [],

    // اطمینان متوسط (استنتاجی): روحیه‌ی رزمی-ایستاده‌ی مشترک با boxing/karate.
    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: ["boxing"] },
  },

  judo: {
    id: "judo",
    name_fa: "جودو",
    name_en: "Judo",
    category: "combat",
    subcategory: "judo",
    is_position_specific: false,

    anthropometric_bonuses: { cormic_high: 15, ape_index_low: 10 },
    composition_bonuses: { smm_high: 15, ffmi_athletic: 15 },
    biometric_bonuses: {},

    // handgrip حتی حیاتی‌تر از کشتی: کومی‌کاتا (گیر روی گی) محور فنی جودو است.
    performance_weights: {
      handgrip: 0.3,
      beep_test: 0.2,
      agility_5_10_5: 0.15,
      broad_jump: 0.1,
      vertical_jump: 0.1,
      pushups: 0.1,
      sit_and_reach: 0.05,
    },
    critical_perf_tests: ["handgrip"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 5,
      focus_patience: 5,
      pressure_tolerance: 5,
      dynamic_activity: 4,
      chaos_decision: 4,
      resilience: 5,
    },
    trait_importance: {
      aggression_contact: 2,
      resilience: 2,
      focus_patience: 1.5,
      pressure_tolerance: 1.5,
      teamwork_score: 0.5,
      dynamic_activity: 1,
      chaos_decision: 1,
    },

    minimum_bio_age_recommended: 9,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    postural_contraindications: ["scoliosis"],
    medical_contraindications: ["active_disc_herniation"],

    // اطمینان قوی — مستند و دوطرفه: wrestling_freestyle.similar_sports از
    // قبل (Commit 1) شامل "judo" در by_anthropometry و by_performance است.
    similar_sports: {
      by_anthropometry: ["wrestling_freestyle"],
      by_performance: ["wrestling_freestyle"],
      by_psychology: [],
    },
  },

  MMA: {
    id: "MMA",
    name_fa: "ام‌ام‌ای",
    name_en: "Mixed Martial Arts",
    category: "combat",
    subcategory: "hybrid",
    is_position_specific: false,

    // عمداً خنثی/میانه، نه افراط در ape_index_high یا low — چون هم گرفتن
    // هم زدن مهم است؛ برخلاف رابطه‌ی نمادین سند (بخش ۱۵.۲، هرگز استفاده
    // نشده)، اینجا از صفر استدلال شد.
    anthropometric_bonuses: {},
    composition_bonuses: { smm_high: 10, ffmi_athletic: 10 },
    biometric_bonuses: {},

    performance_weights: {
      handgrip: 0.2,
      agility_5_10_5: 0.2,
      beep_test: 0.25,
      pushups: 0.15,
      broad_jump: 0.1,
      sprint_10m: 0.1,
    },
    critical_perf_tests: ["beep_test"],

    // سخت‌ترین پروفایل روانی این دسته: همه‌ی صفات رزمی هم‌زمان در سقف.
    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 5,
      focus_patience: 4,
      pressure_tolerance: 5,
      dynamic_activity: 5,
      chaos_decision: 5,
      resilience: 5,
    },
    trait_importance: {
      aggression_contact: 2,
      resilience: 2,
      pressure_tolerance: 2,
      chaos_decision: 1.5,
      teamwork_score: 0.5,
      focus_patience: 1,
      dynamic_activity: 1,
    },

    minimum_bio_age_recommended: 14,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToCompete",

    postural_contraindications: ["scoliosis"],
    medical_contraindications: ["active_disc_herniation", "active_shoulder_impingement"],

    // اطمینان متوسط (استنتاجی، کاملاً از صفر — نه از رابطه‌ی نمادین سند
    // بخش ۱۵.۲ که هرگز در sportSimilarityGraph واقعی ما استفاده نشد):
    // grappling مشترک با wrestling_freestyle و judo، striking مشترک با boxing.
    similar_sports: {
      by_anthropometry: ["wrestling_freestyle"],
      by_performance: ["judo"],
      by_psychology: ["boxing"],
    },
  },

  wushu_sanda: {
    id: "wushu_sanda",
    name_fa: "ووشو ساندا",
    name_en: "Wushu Sanda",
    category: "combat",
    subcategory: "sanda",
    is_position_specific: false,

    // ⚠️⚠️ اطمینان پایین — نیازمند بازبینی متخصص ووشو ⚠️⚠️
    // برخلاف بقیه‌ی رشته‌های این دسته (که منابع NSCA/ACSM/ادبیات المپیک
    // پوششان می‌دهند)، ساندا منبع انگلیسی‌زبان محکم کمی دارد. تمام اعداد
    // این رشته (آنتروپومتریک، وزن‌های عملکردی، روانی) حدس مهندسی با
        // قیاس به بوکس/کشتی هستند، نه استنتاج مستقیم از منبع علمی مشخص.
    // TODO: قبل از استفاده‌ی production، این schema باید توسط یک متخصص
    // یا مربی ووشو ساندا بازبینی و تصحیح شود.
    anthropometric_bonuses: { ape_index_high: 10 },
    composition_bonuses: { bf_very_low: 10 },
    biometric_bonuses: {},

    performance_weights: {
      agility_5_10_5: 0.3,
      beep_test: 0.25,
      handgrip: 0.2,
      sprint_10m: 0.15,
      pushups: 0.1,
    },
    critical_perf_tests: ["agility_5_10_5"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 5,
      focus_patience: 3,
      pressure_tolerance: 5,
      dynamic_activity: 5,
      chaos_decision: 5,
      resilience: 4,
    },
    trait_importance: {
      aggression_contact: 1.5,
      pressure_tolerance: 1.5,
      chaos_decision: 1.5,
      resilience: 1,
      teamwork_score: 0.5,
      focus_patience: 1,
      dynamic_activity: 1,
    },

    minimum_bio_age_recommended: 11,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    postural_contraindications: [],
    medical_contraindications: [],

    // اطمینان ضعیف (۱ دسته، کاملاً استنتاجی و کم‌اطمینان — رجوع به هشدار بالا).
    similar_sports: { by_anthropometry: ["wrestling_freestyle"], by_performance: [], by_psychology: ["boxing"] },
  },

  karate: {
    id: "karate",
    name_fa: "کاراته",
    name_en: "Karate",
    category: "combat",
    subcategory: "kumite",
    is_position_specific: false,

    anthropometric_bonuses: { ape_index_high: 10 },
    composition_bonuses: { bf_very_low: 10 },
    biometric_bonuses: {},

    performance_weights: {
      agility_5_10_5: 0.3,
      sprint_10m: 0.2,
      beep_test: 0.2,
      sit_and_reach: 0.15,
      vertical_jump: 0.15,
    },
    critical_perf_tests: ["agility_5_10_5"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 4,
      focus_patience: 4,
      pressure_tolerance: 5,
      dynamic_activity: 4,
      chaos_decision: 4,
      resilience: 4,
    },
    trait_importance: {
      pressure_tolerance: 1.5,
      aggression_contact: 1,
      chaos_decision: 1,
      resilience: 1,
      teamwork_score: 0.5,
      focus_patience: 1,
      dynamic_activity: 1,
    },

    minimum_bio_age_recommended: 9,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: [],
    medical_contraindications: [],

    // اطمینان متوسط (استنتاجی): روحیه‌ی رزمی-ایستاده‌ی مشترک.
    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: ["boxing", "taekwondo"] },
  },

  // ─── رکوردی/استقامتی ────────────────────────────────────────────────────
  sprint_100m: {
    id: "sprint_100m",
    name_fa: "دوی سرعت ۱۰۰ متر",
    name_en: "Sprint - 100m",
    category: "record",
    subcategory: "sprint_100m",
    is_position_specific: false,

    // cormic_low: پای بلند نسبت به تنه = گام بلندتر (همان تصحیح skeliac_index
    // که برای taekwondo هم اعمال شد).
    anthropometric_bonuses: { cormic_low: 10 },
    composition_bonuses: { bf_very_low: 10 },
    biometric_bonuses: {},

    // مستقیم‌ترین تطابق کل این پروژه: sprint_10m/sprint_30m دقیقاً همان
    // چیزی هستند که این رشته اندازه می‌گیرد.
    performance_weights: {
      sprint_10m: 0.45,
      sprint_30m: 0.35,
      vertical_jump: 0.1,
      broad_jump: 0.1,
    },
    critical_perf_tests: ["sprint_10m", "sprint_30m"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 2,
      focus_patience: 2,
      pressure_tolerance: 5,
      dynamic_activity: 5,
      chaos_decision: 2,
      resilience: 3,
    },
    trait_importance: {
      pressure_tolerance: 2,
      dynamic_activity: 1,
      resilience: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      focus_patience: 0.5,
      chaos_decision: 0.5,
    },

    minimum_bio_age_recommended: 10,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    // طبق posturalSportImpactMap (از قبل موجود در Commit 6): flat_foot.sprint_100m
    // = -20 (انتقال نیرو ضعیف‌تر).
    postural_contraindications: ["flat_foot"],
    medical_contraindications: [],

    // اطمینان متوسط (استنتاجی): sprint_10m عیناً critical_perf_test مشترک با
    // soccer_striker است.
    similar_sports: { by_anthropometry: [], by_performance: ["soccer_striker"], by_psychology: [] },
  },

  sprint_200m: {
    id: "sprint_200m",
    name_fa: "دوی سرعت ۲۰۰ متر",
    name_en: "Sprint - 200m",
    category: "record",
    subcategory: "sprint_200m",
    is_position_specific: false,

    anthropometric_bonuses: { cormic_low: 10 },
    composition_bonuses: { bf_very_low: 10 },
    biometric_bonuses: {},

    // sprint_30m وزن بالاتر از ۱۰۰ متر: نزدیک‌تر به فاصله‌ی واقعی مسابقه.
    performance_weights: {
      sprint_30m: 0.4,
      sprint_10m: 0.3,
      beep_test: 0.15,
      vertical_jump: 0.15,
    },
    critical_perf_tests: ["sprint_30m"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 2,
      focus_patience: 3,
      pressure_tolerance: 5,
      dynamic_activity: 5,
      chaos_decision: 2,
      resilience: 4,
    },
    trait_importance: {
      pressure_tolerance: 2,
      resilience: 1,
      dynamic_activity: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      focus_patience: 0.5,
      chaos_decision: 0.5,
    },

    minimum_bio_age_recommended: 10,
    is_recommended_early_specialization: false,
    ltad_stage: "LearningToTrain",

    postural_contraindications: [],
    medical_contraindications: [],

    // اطمینان قوی — استنتاجی: همان خانواده‌ی رویداد sprint_100m.
    similar_sports: { by_anthropometry: [], by_performance: ["sprint_100m"], by_psychology: [] },
  },

  middle_distance_running: {
    id: "middle_distance_running",
    name_fa: "دو میان‌مسافت",
    name_en: "Middle Distance Running",
    category: "endurance",
    subcategory: "middle_distance",
    is_position_specific: false,

    anthropometric_bonuses: {},
    composition_bonuses: { bf_very_low: 10 },
    biometric_bonuses: {},

    performance_weights: {
      beep_test: 0.45,
      sprint_30m: 0.25,
      sit_and_reach: 0.15,
      pushups: 0.15,
    },
    critical_perf_tests: ["beep_test"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 2,
      focus_patience: 4,
      pressure_tolerance: 4,
      dynamic_activity: 4,
      chaos_decision: 2,
      resilience: 5,
    },
    trait_importance: {
      resilience: 2,
      focus_patience: 1.5,
      pressure_tolerance: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      dynamic_activity: 1,
      chaos_decision: 0.5,
    },

    minimum_bio_age_recommended: 11,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    postural_contraindications: [],
    medical_contraindications: [],

    // اطمینان متوسط (استنتاجی — نه از داده‌ی موجود سورس شده): سیستم هوازی
    // مشترک با swimming_general، بیومکانیک متفاوت. اطمینان قوی-استنتاجی با
    // marathon (خانواده‌ی رویداد مشترک).
    similar_sports: { by_anthropometry: [], by_performance: ["marathon"], by_psychology: ["swimming_general"] },
  },

  marathon: {
    id: "marathon",
    name_fa: "ماراتن",
    name_en: "Marathon",
    category: "endurance",
    subcategory: "marathon",
    is_position_specific: false,

    anthropometric_bonuses: {},
    composition_bonuses: { bf_very_low: 15 },
    // بازاستفاده از الگوی موجود swimming_general (Commit 5) — همان مکانیزم
    // فیزیولوژیک (ظرفیت هوازی)، نه بازتعریف.
    biometric_bonuses: { resting_hr_low: 20 },

    performance_weights: {
      beep_test: 0.6,
      sit_and_reach: 0.15,
      pushups: 0.15,
      sprint_30m: 0.1,
    },
    critical_perf_tests: ["beep_test"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 1,
      focus_patience: 5,
      pressure_tolerance: 3,
      dynamic_activity: 2,
      chaos_decision: 1,
      resilience: 5,
    },
    trait_importance: {
      resilience: 2,
      focus_patience: 2,
      pressure_tolerance: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      dynamic_activity: 0.5,
      chaos_decision: 0.5,
    },

    // طبق ادبیات LTAD: ماراتن رشته‌ای است که باید صریحاً از تخصص زودرس
    // اجتناب کند (ریسک آسیب صفحه‌ی رشد)، بازه‌ی سنی توصیه‌شده بالاتر از
    // بقیه‌ی رشته‌های این دسته.
    minimum_bio_age_recommended: 16,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToCompete",

    // طبق posturalSportImpactMap (از قبل موجود در Commit 6): flat_foot.marathon
    // = -20 (ریسک تندینوپاتی پاشنه).
    postural_contraindications: ["flat_foot"],
    medical_contraindications: ["cardiovascular_disease"],

    // ⚠️ اطمینان قوی — استنتاجی (نه مستند): swimming_general.similar_sports
    // فعلی فقط rowing/cycling_road را دارد، نه marathon/running — این
    // رابطه‌ی منطقی خودِ ماست (هر دو beep_test-محور، هر دو resting_hr_low
    // استفاده می‌کنند، هر دو focus_patience بالا)، باید با «مستند» اشتباه
    // گرفته نشود.
    similar_sports: {
      by_anthropometry: [],
      by_performance: ["middle_distance_running"],
      by_psychology: ["swimming_general"],
    },
  },

  cycling_road: {
    id: "cycling_road",
    name_fa: "دوچرخه‌سواری جاده",
    name_en: "Cycling - Road",
    category: "endurance",
    subcategory: "road",
    is_position_specific: false,

    anthropometric_bonuses: { cormic_low: 10 },
    composition_bonuses: { bf_very_low: 10 },
    biometric_bonuses: { resting_hr_low: 15 },

    performance_weights: {
      beep_test: 0.55,
      pushups: 0.15,
      sit_and_reach: 0.15,
      sprint_30m: 0.15,
    },
    critical_perf_tests: ["beep_test"],

    psych_requirements: {
      teamwork_score: 2,
      aggression_contact: 2,
      focus_patience: 5,
      pressure_tolerance: 3,
      dynamic_activity: 2,
      chaos_decision: 3,
      resilience: 5,
    },
    trait_importance: {
      focus_patience: 2,
      resilience: 1.5,
      chaos_decision: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      pressure_tolerance: 1,
      dynamic_activity: 0.5,
    },

    minimum_bio_age_recommended: 12,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    postural_contraindications: [],
    medical_contraindications: [],

    // اطمینان قوی — مستند: swimming_general.similar_sports.by_psychology از
    // قبل (Commit 1) شامل "cycling_road" است؛ رابطه‌ی متقابل ثبت می‌شود.
    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: ["swimming_general"] },
  },

  // ─── راکتی/دقتی/زیبایی‌شناختی ───────────────────────────────────────────
  tennis_singles: {
    id: "tennis_singles",
    name_fa: "تنیس خاکی",
    name_en: "Tennis - Singles",
    category: "racket",
    subcategory: "singles",
    is_position_specific: false,

    anthropometric_bonuses: {
      tall_stature: { threshold_cm_male: 185, threshold_cm_female: 172, bonus: 10 },
      ape_index_high: 10,
    },
    composition_bonuses: {},
    biometric_bonuses: {},

    performance_weights: {
      agility_5_10_5: 0.3,
      handgrip: 0.2,
      sprint_10m: 0.2,
      beep_test: 0.2,
      vertical_jump: 0.1,
    },
    critical_perf_tests: ["agility_5_10_5"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 2,
      focus_patience: 5,
      pressure_tolerance: 5,
      dynamic_activity: 4,
      chaos_decision: 4,
      resilience: 5,
    },
    trait_importance: {
      pressure_tolerance: 2,
      resilience: 1.5,
      focus_patience: 1.5,
      chaos_decision: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      dynamic_activity: 1,
    },

    minimum_bio_age_recommended: 7,
    is_recommended_early_specialization: true,
    ltad_stage: "FUNdamentals",

    postural_contraindications: [],
    medical_contraindications: ["active_shoulder_impingement"],

    // اطمینان ضعیف (استنتاجی): فشار رقابتی فردی مشترک، نه مکانیک مشابه.
    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: ["weightlifting_olympic"] },
  },

  table_tennis: {
    id: "table_tennis",
    name_fa: "تنیس روی میز",
    name_en: "Table Tennis",
    category: "racket",
    subcategory: "table",
    is_position_specific: false,

    // بدون بونوس آنتروپومتریک — میز کوچک است، برد بدن اهمیت چندانی ندارد
    // (یافته‌ی صادقانه، نه حدس).
    anthropometric_bonuses: {},
    composition_bonuses: {},
    biometric_bonuses: {},

    // ⚠️ رجوع کنید به docs/TODO-missing-reaction-test.md: هیچ‌کدام از این
    // تست‌ها واقعاً واکنش/هماهنگی دست-چشم (رکن اصلی این رشته) را نمی‌سنجند؛
    // agility_5_10_5 فقط نزدیک‌ترین proxy موجود (چابکی پا) است.
    performance_weights: {
      agility_5_10_5: 0.6,
      handgrip: 0.2,
      sit_and_reach: 0.2,
    },
    critical_perf_tests: ["agility_5_10_5"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 1,
      focus_patience: 5,
      pressure_tolerance: 4,
      dynamic_activity: 3,
      chaos_decision: 5,
      resilience: 4,
    },
    trait_importance: {
      chaos_decision: 2,
      focus_patience: 1.5,
      pressure_tolerance: 1,
      resilience: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      dynamic_activity: 0.5,
    },

    minimum_bio_age_recommended: 6,
    is_recommended_early_specialization: true,
    ltad_stage: "FUNdamentals",

    postural_contraindications: [],
    medical_contraindications: [],

    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: [] },
  },

  shooting_target: {
    id: "shooting_target",
    name_fa: "تیراندازی",
    name_en: "Shooting - Target",
    category: "precision",
    subcategory: "target",
    is_position_specific: false,

    // بدون بونوس آنتروپومتریک — ساختار بدن بی‌ربط است.
    anthropometric_bonuses: {},
    composition_bonuses: {},
    // ⚠️ resting_hr_low اینجا با مکانیزم فیزیولوژیک کاملاً متفاوت از
    // swimming_general/marathon بازاستفاده شده: آنجا نشانه‌ی ظرفیت هوازی
    // است، اینجا نشانه‌ی کنترل لرزش دست است — تیراندازان نخبه معمولاً بین
    // دو ضربان قلب شلیک می‌کنند (کمتر لرزش). این یک reuse آگاهانه است، نه
    // کپی-پیست بی‌فکر.
    biometric_bonuses: { resting_hr_low: 15 },

    // ⚠️ هیچ‌کدام از این تست‌ها واقعاً ثبات/دقت تیراندازی را نمی‌سنجند —
    // فقط چون داده‌ی دیگری نداریم انتخاب شدند، با وزن‌های نسبتاً مساوی تا
    // هیچ‌کدام کاذبانه «مهم» جلوه نکند. طبق همین صداقت، critical_perf_tests
    // عمداً خالی است — هیچ تست موجودی واقعاً برای این رشته حیاتی نیست.
    performance_weights: {
      sit_and_reach: 0.3,
      handgrip: 0.3,
      pushups: 0.2,
      agility_5_10_5: 0.2,
    },
    critical_perf_tests: [],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 1,
      focus_patience: 5,
      pressure_tolerance: 5,
      dynamic_activity: 1,
      chaos_decision: 1,
      resilience: 4,
    },
    trait_importance: {
      focus_patience: 2,
      pressure_tolerance: 2,
      resilience: 1,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      dynamic_activity: 0.5,
      chaos_decision: 0.5,
    },

    minimum_bio_age_recommended: 12,
    is_recommended_early_specialization: false,
    ltad_stage: "TrainingToTrain",

    postural_contraindications: [],
    medical_contraindications: [],

    // تنها رشته‌ی کل ماتریس بدون هیچ ارتباط معنادار با ۵ رشته‌ی موجود —
    // صادقانه، نه ضعف تحلیل: پایین‌ترین dynamic_activity کل ماتریس، بدون
    // هیچ نظیر آنتروپومتریک/عملکردی/روانی در بقیه‌ی رشته‌ها.
    similar_sports: { by_anthropometry: [], by_performance: [], by_psychology: [] },
  },

  gymnastics_artistic: {
    id: "gymnastics_artistic",
    name_fa: "ژیمناستیک",
    name_en: "Gymnastics - Artistic",
    category: "aesthetic",
    subcategory: "artistic",
    is_position_specific: false,

    // ⚠️ تصمیم تاییدشده: بدون بونوس مبتنی‌بر قد. برخلاف اکثر رشته‌های این
    // ماتریس، قد کوتاه‌تر معمولاً در ژیمناستیک مزیت محسوب می‌شود، اما
    // schema فعلی (tall_stature) هیچ مکانیزم متقارنی برای «بونوس قد کوتاه»
    // ندارد. طبق اصل «زیرساخت جدید بدون مبنا نساز»، به‌جای اختراع یک کلید
    // بونوس جدید، این رشته بدون بونوس قد می‌ماند — نه مثبت نه منفی. همین
    // محدودیت برای diving (Wave 3 بعدی) هم صدق می‌کند.
    anthropometric_bonuses: {},
    composition_bonuses: { smm_high: 10 },
    biometric_bonuses: { balance_score_high: 10 },

    performance_weights: {
      sit_and_reach: 0.3,
      vertical_jump: 0.25,
      pushups: 0.25,
      broad_jump: 0.2,
    },
    critical_perf_tests: ["sit_and_reach"],

    psych_requirements: {
      teamwork_score: 1,
      aggression_contact: 1,
      focus_patience: 5,
      pressure_tolerance: 5,
      dynamic_activity: 3,
      chaos_decision: 1,
      resilience: 5,
    },
    trait_importance: {
      focus_patience: 1.5,
      pressure_tolerance: 2,
      resilience: 1.5,
      teamwork_score: 0.5,
      aggression_contact: 0.5,
      dynamic_activity: 1,
      chaos_decision: 0.5,
    },

    minimum_bio_age_recommended: 6,
    is_recommended_early_specialization: true,
    ltad_stage: "FUNdamentals",

    postural_contraindications: [],
    medical_contraindications: [],

    // اطمینان متوسط (استنتاجی): balance_score_high کلیدی است که soccer_striker
    // هم استفاده می‌کند (بازاستفاده، نه اختراع). ارتباط با volleyball_middle_blocker
    // ضعیف‌تر (اتکای مشترک به vertical_jump).
    similar_sports: {
      by_anthropometry: [],
      by_performance: ["soccer_striker", "volleyball_middle_blocker"],
      by_psychology: [],
    },
  },
};

function getSportEntry(id) {
  const entry = sportRequirementMatrix[id];
  if (!entry) {
    throw new TalentIdError("SPORT_NOT_FOUND", `رشته با id "${id}" در sportRequirementMatrix پیدا نشد.`, {
      sportId: id,
    });
  }
  return entry;
}

export { sportRequirementMatrix, getSportEntry };
