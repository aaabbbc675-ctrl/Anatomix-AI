// فایل ۲ موتور اصلاحی (بخش ۳.۲ سند): اولویت‌بندی تخصیص اسلات + موتور
// اضافه‌بار ماهانه (۴ گام اجباری به ترتیب) + آزادسازی سختی ماهانه.
//
// مقدار دقیق هر گام اضافه‌بار عمداً پارامتری است، نه هاردکد: ادبیات علمی
// (روش Double Progression) برای این مقدار عدد ثابت جهانی نمی‌دهد — ذاتاً
// باید بسته به فرد/حرکت متغیر باشد. سقف‌های هر گام (رپ تا ۱۵، ست تا ۳-۴)
// اما با بازه‌های فاز ثبات‌محور NASM OPT هم‌خوانی دارند.

// --- اولویت تخصیص اسلات (بخش ۳.۲، «اولویت تخصیص اسلات (مطلق)») ---
// ترتیب دقیقاً طبق سند: آسیب فعال > اورراید مربی > ستون فقرات/لگن (اولویت
// اول) > مفاصل بزرگ (اولویت دوم) > انتهای زنجیره/مچ-کف‌پا (اولویت سوم).
const SLOT_PRIORITY_ORDER = ["active_injury", "coach_override", "spine_pelvis", "big_joints", "chain_end"];

function assignSlotPriority(items) {
  // اعتبارسنجی جدا از sort انجام می‌شود، نه داخل comparator: برای آرایه‌ی
  // با کمتر از ۲ عضو، Array.prototype.sort اصلاً comparator را صدا نمی‌زند
  // و دسته‌ی نامعتبر بی‌صدا رد می‌شد.
  items.forEach((item) => {
    if (!SLOT_PRIORITY_ORDER.includes(item.category)) {
      throw new Error(`دسته‌ی ناشناخته در اسلات: "${item.category}". مقادیر مجاز: ${SLOT_PRIORITY_ORDER.join(", ")}`);
    }
  });

  return [...items].sort(
    (a, b) => SLOT_PRIORITY_ORDER.indexOf(a.category) - SLOT_PRIORITY_ORDER.indexOf(b.category)
  );
}

// --- موتور اضافه‌بار ماهانه (بخش ۳.۲، «۴ گام اضافه‌بار ماهانه») ---
// سقف‌ها/کف: سند با «مثلاً» آورده، پس پارامتر ورودی‌اند با مقدار پیش‌فرض
// همان عددهای سند (همان الگوی deloadMultipliers در موتور بدنسازی).
const DEFAULT_REP_CAP = 15;
const DEFAULT_SET_CAP_MAX = 4;
const DEFAULT_REST_FLOOR_SEC = 60;
// نمونه‌ی مستند تنها تبدیل تمپوی داده‌شده در سند (۲-۰-۲-۰ → ۴-۲-۱-۰). سند
// فرمول عمومی نداده، پس این یک نگاشت (lookup) قابل‌گسترش است، نه فرمول.
const DEFAULT_TEMPO_PROGRESSION_MAP = { "2-0-2-0": "4-2-1-0" };

function applyMonthlyOverloadStep({
  currentReps,
  currentSets,
  currentTempo,
  currentRestSec,
  repIncrement,
  setIncrement,
  restDecrementSec,
  repCap = DEFAULT_REP_CAP,
  setCapMax = DEFAULT_SET_CAP_MAX,
  restFloorSec = DEFAULT_REST_FLOOR_SEC,
  isElderlyOrPatient = false,
  tempoProgressionMap = DEFAULT_TEMPO_PROGRESSION_MAP,
}) {
  // گام ۱: افزایش تکرار تا سقف
  if (currentReps < repCap) {
    if (!Number.isFinite(repIncrement) || repIncrement <= 0) {
      throw new Error(`repIncrement نامعتبر: "${repIncrement}". برای اجرای گام ۱ باید عدد مثبت باشد.`);
    }
    return {
      step: "increase_reps",
      reps: Math.min(currentReps + repIncrement, repCap),
      sets: currentSets,
      tempo: currentTempo,
      restSec: currentRestSec,
    };
  }

  // گام ۲: افزایش ست تا سقف
  if (currentSets < setCapMax) {
    if (!Number.isFinite(setIncrement) || setIncrement <= 0) {
      throw new Error(`setIncrement نامعتبر: "${setIncrement}". برای اجرای گام ۲ باید عدد مثبت باشد.`);
    }
    return {
      step: "increase_sets",
      reps: currentReps,
      sets: Math.min(currentSets + setIncrement, setCapMax),
      tempo: currentTempo,
      restSec: currentRestSec,
    };
  }

  // گام ۳: افزایش زمان تحت تنش (تمپو) — فقط اگر برای تمپوی فعلی نگاشتی
  // مستند وجود داشته باشد؛ در غیر این صورت گام صادقانه "قابل‌محاسبه نیست"
  // اعلام می‌شود، نه یک تمپوی حدسی.
  if (Object.prototype.hasOwnProperty.call(tempoProgressionMap, currentTempo)) {
    return {
      step: "increase_tempo",
      reps: currentReps,
      sets: currentSets,
      tempo: tempoProgressionMap[currentTempo],
      restSec: currentRestSec,
    };
  }

  // گام ۴: کاهش استراحت — طبق سند هرگز زیر ۶۰ ثانیه برای سالمند/بیمار
  const restFloor = isElderlyOrPatient ? restFloorSec : 0;
  if (currentRestSec > restFloor) {
    if (!Number.isFinite(restDecrementSec) || restDecrementSec <= 0) {
      throw new Error(`restDecrementSec نامعتبر: "${restDecrementSec}". برای اجرای گام ۴ باید عدد مثبت باشد.`);
    }
    return {
      step: "decrease_rest",
      reps: currentReps,
      sets: currentSets,
      tempo: currentTempo,
      restSec: Math.max(currentRestSec - restDecrementSec, restFloor),
    };
  }

  // هر ۴ گام قبلاً به سقف/کف خودشان رسیده‌اند — چیزی برای اضافه‌بار این ماه نیست
  return { step: "none", reps: currentReps, sets: currentSets, tempo: currentTempo, restSec: currentRestSec };
}

// --- آزادسازی سختی (بخش ۳.۲، «آزادسازی سختی») ---
const BASE_DIFFICULTIES = ["Easy", "Medium"];
const ALL_DIFFICULTIES = ["Easy", "Medium", "Hard"];

function resolveDifficultyUnlock({ monthNumber, painFreeSoFar }) {
  if (!Number.isInteger(monthNumber) || monthNumber < 1) {
    throw new Error(`monthNumber نامعتبر: "${monthNumber}". باید عدد صحیح ≥۱ باشد.`);
  }
  if (typeof painFreeSoFar !== "boolean") {
    throw new Error(`painFreeSoFar نامعتبر: "${painFreeSoFar}". باید true یا false باشد.`);
  }
  // ماه ۱-۲: فقط Easy/Medium. ماه ۳+: اگر بدون درد بود، Hard هم باز می‌شود.
  if (monthNumber >= 3 && painFreeSoFar) {
    return [...ALL_DIFFICULTIES];
  }
  return [...BASE_DIFFICULTIES];
}

export { SLOT_PRIORITY_ORDER, assignSlotPriority, applyMonthlyOverloadStep, resolveDifficultyUnlock };
