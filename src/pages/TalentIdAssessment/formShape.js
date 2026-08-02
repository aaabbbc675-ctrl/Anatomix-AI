// شکل مشترک formState برای هر ۶ Step + تبدیل نهایی به سه ورودی خام
// normalizeIntake (rawDevice/rawCoach/rawChatbot)، طبق بخش ۲.۱ سند معماری
// استعدادیابی و قرارداد واقعی engine/talentId/file1_intakeInputs.js.

// طبق activePathologyMap.js (فایل ۱۰) — کلیدهای واقعی پشتیبانی‌شده. تفکیک
// injuries/chronic فقط برای UX است؛ file10 هر دو آرایه را با هم ادغام
// می‌کند، پس این تفکیک روی نتیجه اثر ندارد.
export const ACTIVE_INJURY_OPTIONS = [
  { key: "active_disc_herniation", label: "فتق دیسک کمر (فعال)" },
  { key: "active_shoulder_impingement", label: "گیرگیری روتاتور کاف شانه (فعال)" },
  { key: "active_meniscus_tear", label: "پارگی مینیسک زانو (فعال)" },
  { key: "active_acl_partial_tear", label: "پارگی جزئی رباط صلیبی زانو (فعال)" },
  { key: "active_severe_scoliosis_cobb_over_40", label: "اسکولیوز شدید (Cobb بالای ۴۰ درجه)" },
  { key: "active_ankle_sprain_grade_2_or_3", label: "پیچ‌خوردگی مچ پا درجه ۲ یا ۳ (فعال)" },
];
export const CHRONIC_CONDITION_OPTIONS = [
  { key: "cardiovascular_disease", label: "بیماری قلبی-عروقی" },
  { key: "chronic_kidney_disease", label: "بیماری مزمن کلیوی" },
  { key: "epilepsy_uncontrolled", label: "صرع کنترل‌نشده" },
];

export const POSTURE_TYPES = [
  { key: "kyphosis", label: "کایفوز (گوژپشتی)" },
  { key: "hyperlordosis", label: "گودی بیش‌ازحد کمر" },
  { key: "scoliosis", label: "اسکولیوز" },
  { key: "genu_valgum", label: "زانوی ضربدری (Genu Valgum)" },
  { key: "genu_varum", label: "زانوی پرانتزی (Genu Varum)" },
  { key: "flat_foot", label: "کف پای صاف" },
  { key: "forward_head", label: "گردن به‌جلو (Forward Head)" },
  { key: "rounded_shoulder", label: "شانه‌ی گرد" },
];
export const POSTURE_SEVERITY_LABELS = { 0: "ندارد", 1: "خفیف", 2: "متوسط", 3: "شدید" };

export const ROM_DEFICIT_TYPES = [
  { key: "achilles_short", label: "کوتاهی تاندون آشیل" },
  { key: "hamstring_short", label: "کوتاهی همسترینگ" },
  { key: "shoulder_flexor_short", label: "کوتاهی فلکسور شانه" },
  { key: "hip_flexor_short", label: "کوتاهی فلکسور لگن" },
  { key: "pectoralis_short", label: "کوتاهی سینه‌ای (Pectoralis)" },
];
export const ROM_SEVERITY_OPTIONS = [
  { value: "normal", label: "طبیعی" },
  { value: "mild_short", label: "کوتاهی خفیف" },
  { value: "moderate_short", label: "کوتاهی متوسط" },
  { value: "severe_short", label: "کوتاهی شدید" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function defaultTalentIdForm() {
  return {
    // Step 1 — هویت
    athlete_id: "",
    date_of_birth: "",
    assessment_date: todayISO(),
    biological_sex: "male",

    // Step 2 — آنتروپومتریک و ترکیب بدنی
    standing_height_cm: 150,
    sitting_height_cm: 75,
    weight_kg: 45,
    arm_span_cm: "",
    wrist_circumference_cm: "",
    shoulder_width_cm: "",
    hip_width_cm: "",
    body_fat_percent: 15,
    smm_percent_of_body_weight: "",
    total_body_water_percent: "",
    fat_free_mass_kg: "",

    // Step 3 — پوسچرال / ROM / بیومتریک
    // ⚠️ رفع باگ Commit 22 (کشف‌شده حین ساخت caseB E2E): computePosturalAdjustments
    // (file5, خط ۹۳) انتظار posture[type]={severity:N} دارد، نه عدد خام — هم‌شکل
    // نمونه‌ی خودِ سند (بخش ۲.۱: posture.kyphosis={severity:2,...}). قبلاً عدد
    // خام بود که یعنی هیچ پنالتی پوسچرالی هرگز واقعاً اعمال نمی‌شد.
    posture: Object.fromEntries(POSTURE_TYPES.map((p) => [p.key, { severity: 0 }])),
    rom_deficits: Object.fromEntries(ROM_DEFICIT_TYPES.map((r) => [r.key, "normal"])),
    hypermobility_detected: false,
    resting_heart_rate_bpm: 70,
    balance_score_0_to_10: 5,
    bilateral_weight_asymmetry_percent: 0,

    // Step 4 — تست‌های عملکردی میدانی (هرکدام ۳ تلاش، جز موارد تک‌مقداری)
    vertical_jump_cm: ["", "", ""],
    broad_jump_cm: ["", "", ""],
    sprint_10m_sec: ["", "", ""],
    sprint_30m_sec: ["", "", ""],
    agility_5_10_5_sec: ["", "", ""],
    beep_level: "",
    beep_shuttle: "",
    handgrip_dominant_kg: ["", "", ""],
    handgrip_nondominant_kg: ["", "", ""],
    pushups_60sec_count: "",
    sit_and_reach_cm: "",
    wall_toss_30sec_count: "",

    // Step 5 — پزشکی و سابقه‌ی خانوادگی
    active_injuries: [],
    chronic_conditions: [],
    pain_scale_current_max_0_to_10: 0,
    // ⚠️ رفع باگ Commit 22: physician_clearance باید ساختاریافته باشد
    // (cleared_sports/date/notes)، نه یک رشته‌ی وضعیت آزاد — رجوع کنید به
    // کامنت normalizeMedical در file1_intakeInputs.js.
    physician_clearance_sports: [],
    physician_clearance_date: "",
    physician_clearance_notes: "",
    parent_athletes: false,
    elite_relatives: false,

    // Step 6 — علاقه‌مندی (روان‌شناسی بدون چت‌بات — رجوع کنید به talentIdCascade.js)
    explicit_sport_interest: [],
  };
}

function toNumOrNull(v) {
  return v === "" || v === null || v === undefined ? null : Number(v);
}
function trialsToNums(arr) {
  return (arr ?? []).map((v) => (v === "" ? null : Number(v)));
}

// خروجی این تابع دقیقاً سه ورودی خام normalizeIntake است (بخش ۲.۱ سند) —
// caller (TalentIdReport) مستقیم به runTalentIdAssessment می‌دهد.
export function buildRawInputsFromForm(form) {
  const rawDevice = {
    anthropometrics: {
      standing_height_cm: toNumOrNull(form.standing_height_cm),
      sitting_height_cm: toNumOrNull(form.sitting_height_cm),
      weight_kg: toNumOrNull(form.weight_kg),
      arm_span_cm: toNumOrNull(form.arm_span_cm),
      wrist_circumference_cm: toNumOrNull(form.wrist_circumference_cm),
      shoulder_width_cm: toNumOrNull(form.shoulder_width_cm),
      hip_width_cm: toNumOrNull(form.hip_width_cm),
    },
    body_composition_bia: {
      body_fat_percent: toNumOrNull(form.body_fat_percent),
      smm_percent_of_body_weight: toNumOrNull(form.smm_percent_of_body_weight),
      total_body_water_percent: toNumOrNull(form.total_body_water_percent),
      fat_free_mass_kg: toNumOrNull(form.fat_free_mass_kg),
    },
    biometric: {
      resting_heart_rate_bpm: toNumOrNull(form.resting_heart_rate_bpm),
      balance_score_0_to_10: toNumOrNull(form.balance_score_0_to_10),
      bilateral_weight_asymmetry_percent: toNumOrNull(form.bilateral_weight_asymmetry_percent),
    },
    posture: form.posture,
    rom_deficits: form.rom_deficits,
    hypermobility_detected: form.hypermobility_detected,
  };

  const rawCoach = {
    athlete_id: form.athlete_id || null,
    date_of_birth: form.date_of_birth,
    assessment_date: form.assessment_date,
    biological_sex: form.biological_sex,
    performance_tests: {
      vertical_jump_cm: trialsToNums(form.vertical_jump_cm),
      broad_jump_cm: trialsToNums(form.broad_jump_cm),
      sprint_10m_sec: trialsToNums(form.sprint_10m_sec),
      sprint_30m_sec: trialsToNums(form.sprint_30m_sec),
      agility_5_10_5_sec: trialsToNums(form.agility_5_10_5_sec),
      beep_test: { level: toNumOrNull(form.beep_level), shuttle: toNumOrNull(form.beep_shuttle) },
      handgrip_dynamometer_kg: {
        dominant: trialsToNums(form.handgrip_dominant_kg),
        non_dominant: trialsToNums(form.handgrip_nondominant_kg),
      },
      pushups_60sec_count: toNumOrNull(form.pushups_60sec_count),
      sit_and_reach_cm: toNumOrNull(form.sit_and_reach_cm),
      wall_toss_30sec_count: toNumOrNull(form.wall_toss_30sec_count),
    },
    medical_history: {
      active_injuries: form.active_injuries,
      chronic_conditions: form.chronic_conditions,
      pain_scale_current_max_0_to_10: form.pain_scale_current_max_0_to_10,
      physician_clearance:
        form.physician_clearance_sports.length > 0
          ? {
              cleared_sports: form.physician_clearance_sports,
              date: form.physician_clearance_date || null,
              notes: form.physician_clearance_notes || null,
            }
          : null,
    },
    family_sport_history: {
      parent_athletes: form.parent_athletes,
      elite_relatives: form.elite_relatives,
    },
  };

  // طبق تصمیم تاییدشده: بدون UI مکالمه‌ی چت (docs/TODO-api-key-security.md) —
  // فقط explicit_sport_interest، که مستقل از psych است.
  const rawChatbot = { explicit_sport_interest: form.explicit_sport_interest };

  return { rawDevice, rawCoach, rawChatbot };
}
