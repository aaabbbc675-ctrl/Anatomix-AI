// فایل ۹ موتور اصلاحی (بخش ۳.۱۱ سند): تشخیص سندروم ترکیبی + قیف تمرینی
// (بیش از ۴ ناهنجاری) + اولویت‌دهی حرکات چندمنظوره.
//
// شناسه‌های ناهنجاری (forward_head/rounded_shoulders/...) مستقیماً از نام‌های
// انگلیسی خودِ سند می‌آیند (Forward_Head/Rounded_Shoulders/...)، فقط به
// snake_case تبدیل شده‌اند — چیزی اختراع نشده.
const FORWARD_HEAD = "forward_head";
const ROUNDED_SHOULDERS = "rounded_shoulders";
const KYPHOSIS = "kyphosis";
const LORDOSIS = "lordosis";
const ANTERIOR_PELVIC_TILT = "anterior_pelvic_tilt";
const FLAT_FOOT = "flat_foot";
const GENU_VALGUM = "genu_valgum";

// --- سندروم‌های ترکیبی (بخش ۳.۱۱، «سندرم‌های ترکیبی») ---
const COMPOUND_SYNDROMES = {
  upper_crossed_syndrome: [FORWARD_HEAD, ROUNDED_SHOULDERS, KYPHOSIS],
  lower_crossed_syndrome: [LORDOSIS, ANTERIOR_PELVIC_TILT],
  pronation_distortion_syndrome: [FLAT_FOOT, GENU_VALGUM],
};

function detectCompoundSyndromes(userDeformities) {
  if (!Array.isArray(userDeformities) || userDeformities.some((d) => typeof d !== "string")) {
    throw new Error("userDeformities باید آرایه‌ای از رشته باشد.");
  }

  return Object.entries(COMPOUND_SYNDROMES)
    .filter(([, requiredDeformities]) => requiredDeformities.every((d) => userDeformities.includes(d)))
    .map(([syndromeId]) => syndromeId);
}

// --- قیف تمرینی (بخش ۳.۱۱، «قیف (بیش از ۴ ناهنجاری)») ---
// طبق تصمیم صریح: دسته‌ی اولویت هر ناهنجاری (کدام «ستون فقرات/لگن»، کدام
// «مفصل بزرگ»، کدام «مچ/کف پا» است) از خودِ فراخوان می‌آید، نه اینکه اینجا
// حدس زده شود — دقیقاً همان الگوی items[].category در file2. برای اینکه این
// سه دسته واقعاً همان دسته‌های file2 بمانند (نه یک enum موازی)، مستقیماً از
// SLOT_PRIORITY_ORDER فایل۲ مشتق می‌شوند، نه رشته‌ی هاردکد جدا.
import { SLOT_PRIORITY_ORDER } from "./file2_priorityAndOverload.js";

const NON_DEFORMITY_CATEGORIES = ["active_injury", "coach_override"];
const DEFORMITY_PRIORITY_TIERS = SLOT_PRIORITY_ORDER.filter((c) => !NON_DEFORMITY_CATEGORIES.includes(c));
const [TIER_1_SPINE_PELVIS, TIER_2_BIG_JOINTS, TIER_3_CHAIN_END] = DEFORMITY_PRIORITY_TIERS;

const DEFORMITY_FUNNEL_THRESHOLD = 4;

function applyDeformityFunnel(deformities) {
  if (!Array.isArray(deformities)) {
    throw new Error("deformities باید آرایه باشد.");
  }
  deformities.forEach((d) => {
    if (!DEFORMITY_PRIORITY_TIERS.includes(d.priorityCategory)) {
      throw new Error(
        `priorityCategory نامعتبر برای ناهنجاری "${d.id}": "${d.priorityCategory}". مقادیر مجاز: ${DEFORMITY_PRIORITY_TIERS.join(", ")}`
      );
    }
  });

  // طبق سند: «بیش از ۴» یعنی خودِ ۴ هنوز قیف را فعال نمی‌کند.
  if (deformities.length <= DEFORMITY_FUNNEL_THRESHOLD) {
    return { funnelActive: false, slotDeformities: deformities, homeworkOnlyDeformities: [] };
  }

  const tier1 = deformities.filter((d) => d.priorityCategory === TIER_1_SPINE_PELVIS);
  const tier2 = deformities.filter((d) => d.priorityCategory === TIER_2_BIG_JOINTS);
  const tier3 = deformities.filter((d) => d.priorityCategory === TIER_3_CHAIN_END);

  return {
    funnelActive: true,
    // اسلات‌ها به ترتیب اولویت ۱ سپس ۲ پر می‌شوند.
    slotDeformities: [...tier1, ...tier2],
    // اولویت ۳ (مچ/کف پا) Drop می‌شود و فقط تکلیف خانگی می‌گیرد.
    homeworkOnlyDeformities: tier3,
  };
}

// --- اولویت‌دهی حرکات چندمنظوره (بخش ۳.۱۱، «حرکات چندمنظوره») ---
// طبق تصمیم صریح: Target_Posture_Correction روی هیچ رکورد واقعی
// exercises.seed.js نیست، پس اینجا هم مثل alternative_corrective_exercise در
// file3، یک فیلد اختیاری روی آبجکت حرکت است (exercise.target_posture_correction)،
// نه پارامتر جدا و نه فیلدی که این فایل به بانک اضافه کند.
const MULTI_PURPOSE_MIN_MATCH_COUNT = 2;

function scoreMultiPurposeExercises(exercises, userDeformities) {
  if (!Array.isArray(exercises)) {
    throw new Error("exercises باید آرایه باشد.");
  }
  if (!Array.isArray(userDeformities) || userDeformities.some((d) => typeof d !== "string")) {
    throw new Error("userDeformities باید آرایه‌ای از رشته باشد.");
  }

  return exercises.map((exercise) => {
    const targets = exercise.target_posture_correction ?? [];
    const matchCount = targets.filter((t) => userDeformities.includes(t)).length;
    return {
      ...exercise,
      multiPurposeMatchCount: matchCount,
      isMultiPurposePriority: matchCount >= MULTI_PURPOSE_MIN_MATCH_COUNT,
    };
  });
}

export {
  COMPOUND_SYNDROMES,
  detectCompoundSyndromes,
  DEFORMITY_PRIORITY_TIERS,
  DEFORMITY_FUNNEL_THRESHOLD,
  applyDeformityFunnel,
  MULTI_PURPOSE_MIN_MATCH_COUNT,
  scoreMultiPurposeExercises,
};
