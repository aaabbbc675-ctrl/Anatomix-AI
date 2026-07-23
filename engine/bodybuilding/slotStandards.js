// SLOT_STANDARDS طبق ماژول ۱۰ سند اصلی. هر بازه به‌صورت [min, max] است؛ null یعنی
// آن سر بازه در سند باز/نامحدود ذکر شده (مثلاً «۱۵+ تکرار» یا «استراحت زیر ۶۰ ثانیه»).
//
// نکته: 'power' یکی از ۴ گزینه‌ی Main_Goal نیست (که Strength/Fat_Loss/Maintenance/
// Hypertrophy هستند) — طبق سند برای موارد رشته‌ورزشی/فصل‌بندی است و فعلاً از طریق
// هیچ مسیر فعالی در دسترس نیست؛ فقط برای زیرمرحله‌ی بعدی (۵.۷، فصل‌بندی رشته‌ای)
// اینجا نگه داشته شده تا وقتی لازم شد دوباره کشف/تعریف نشود.
//
// 'maintenance' عمداً اینجا ردیف مستقل ندارد — طبق ماژول ۱۳ سند، Maintenance باید
// از ردیف hypertrophy مشتق شود (حجم × ۰.۵، ایزوله حذف، RIR هرگز صفر). این تبدیل در
// file2_biometrics.js انجام می‌شود، نه اینجا.
const SLOT_STANDARDS = {
  strength: {
    repRange: [1, 6],
    sets: [2, 6],
    intensity1RM: [85, null],
    restSec: [120, 300],
    tempo: "3-1-1-0",
    rir: [1, 2],
  },
  hypertrophy: {
    repRange: [8, 12],
    sets: [3, 4],
    intensity1RM: [70, 80],
    restSec: [60, 90],
    tempo: "3-0-1-0",
    rir: [0, 2],
  },
  fat_loss: {
    repRange: [15, null],
    sets: [2, 3],
    intensity1RM: [null, 67],
    restSec: [null, 60],
    tempo: "2-0-2-0",
    rir: [0, 1],
  },
  power: {
    repRange: [1, 5],
    sets: [3, 5],
    intensity1RM: [75, 90],
    restSec: [120, 300],
    tempo: "2-0-X-0",
    rir: [3, 5],
  },
};

// طبق بخش ۳.۵ سند معماری — به‌ازای هر Main_Goal فرق می‌کند، نه همیشه ثابت ۱+۱.
const ISOLATION_RATIO = {
  strength: 0.15,
  fat_loss: 0.2,
  hypertrophy: 0.4,
  maintenance: 0,
};

// طبق ماژول ۱۱ سند — بر اساس سطح مهارت است، نه ضریب پیوسته‌ی جدا روی یک عدد ثابت.
// max برای advanced سقف سخت نیست؛ فقط بازه‌ی پیش‌فرض نمایشی است (طبق بخش ۱.۱ سند،
// رشد فراتر از این هم ادامه دارد، با شیب کمتر و هشدار بازده کاهشی).
const EXPERIENCE_VOLUME_RANGE = {
  beginner: { min: 8, max: 12 },
  intermediate: { min: 12, max: 18 },
  advanced: { min: 15, max: 20, diminishingReturnsAbove: 20 },
};

function getSlotStandard(goal) {
  const row = SLOT_STANDARDS[goal];
  if (!row) throw new Error(`No SLOT_STANDARDS row for goal "${goal}"`);
  return row;
}

module.exports = { SLOT_STANDARDS, ISOLATION_RATIO, EXPERIENCE_VOLUME_RANGE, getSlotStandard };
