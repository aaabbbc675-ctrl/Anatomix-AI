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
