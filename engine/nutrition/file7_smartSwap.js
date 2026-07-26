// فایل ۷ موتور تغذیه — زیرکامیت ۶-ب (بخش ۲.۷ سند: سیستم Exchange List / Smart
// Swap). هسته‌ی خالص این فایل روی آبجکت‌های غذا کار می‌کند (نه id)، دقیقاً
// هم‌الگوی اینکه فایل ۶ روی خروجی فایل ۱/۲/۳ کار می‌کند نه ورودی خام دیتابیس؛
// فقط یک تابع نازک انتهای فایل واقعاً به foodsRepository وصل می‌شود.

const MACRO_FIELDS = { protein: "protein_g", carb: "carbs_g", fat: "fat_g" };
const CROSS_GROUP_DEVIATION_THRESHOLD_PERCENT = 10; // طبق بخش ۲.۷ سند، عدد مستند خودِ سند.

// مسیر هم‌گروهی (اصلی، طبق بخش ۲.۷ سند): چون هر دو غذا از یک exchange_group
// هستند، سیستم Exchange List از پیش کالیبره کرده که واحدهایشان معادل‌اند —
// بدون نیاز به محاسبه‌ی معکوس وزن یا هشدار انحراف.
//
// محدودیت شناخته‌شده (نه مسدودکننده): این فرمول برای exchange_group='free'
// معنا ندارد، چون آن گروه ذاتاً واحد ثابت (exchange_serving_grams) ندارد —
// «آزاد» یعنی مقدار محدودکننده‌ای ندارد، نه یک سروینگ استاندارد قابل‌ضرب.
// فعلاً هیچ رکورد free در foods.seed.js نیست (batch ۱)، پس این یک محدودیت
// مستند برای وقتی است که چنین رکوردی اضافه شود، نه یک باگ فعلی.
function computeSameGroupSwap({ old_food, new_food, old_weight_g }) {
  const units = old_weight_g / old_food.exchange_serving_grams;
  const new_weight_g = units * new_food.exchange_serving_grams;
  return { new_weight_g, units };
}

// مسیر بین‌گروهی (fallback Anchor Macro، بخش ۲.۷ سند): فقط وقتی مربی خودش
// دستی غذایی از گروه دیگر انتخاب کند (نه چیزی که سیستم به‌عنوان گزینه
// پیشنهاد داده باشد — پیشنهادها همیشه از getSameGroupCandidates می‌آیند).
function computeCrossGroupAnchorSwap({ old_food, new_food, old_weight_g, meal_calories }) {
  const anchorField = MACRO_FIELDS[old_food.primary_macro];
  const oldAnchorAmount = (old_weight_g / 100) * old_food[anchorField];

  // حفاظ دفاعی (ضرورت ریاضی، نه ابهام محصولی): اگر غذای جدید مقدار صفر از
  // ماکروی لنگر داشته باشد (مثلاً لنگر=چربی و غذای جدید کاملاً بدون‌چربی است)،
  // هیچ وزنی نمی‌تواند آن مقدار لنگر را بازتولید کند.
  if (new_food[anchorField] === 0) {
    throw new Error(
      `غذای جدید "${new_food.name_fa}" مقدار ${old_food.primary_macro} صفر دارد — نمی‌تواند لنگر جایگزینی باشد.`
    );
  }

  const new_weight_g = oldAnchorAmount / (new_food[anchorField] / 100);

  const oldCalories = (old_weight_g / 100) * old_food.calories;
  const newCalories = (new_weight_g / 100) * new_food.calories;
  const delta_calories = newCalories - oldCalories;
  const delta_protein_g = (new_weight_g / 100) * new_food.protein_g - (old_weight_g / 100) * old_food.protein_g;
  const delta_carb_g = (new_weight_g / 100) * new_food.carbs_g - (old_weight_g / 100) * old_food.carbs_g;
  const delta_fat_g = (new_weight_g / 100) * new_food.fat_g - (old_weight_g / 100) * old_food.fat_g;

  // طبق سند: «تطابق خودکار تضمین نمی‌شود» همیشه گفته می‌شود (info)؛ آستانه‌ی
  // ۱۰٪ خودِ سند است (نه یک عدد UX که خودم انتخاب کرده باشم، برخلاف
  // SEVERE_DEVIATION_THRESHOLD_PERCENT در فایل ۴).
  const warnings = [{ code: "cross_group_swap_not_guaranteed", severity: "info", coach_note: null }];
  if (Math.abs(delta_calories) > (CROSS_GROUP_DEVIATION_THRESHOLD_PERCENT / 100) * meal_calories) {
    warnings.push({
      code: "cross_group_swap_large_calorie_deviation",
      severity: "caution",
      coach_note: null,
      deviation_kcal: delta_calories,
    });
  }

  return { new_weight_g, delta_calories, delta_protein_g, delta_carb_g, delta_fat_g, warnings };
}

// مسیریابی: هم‌گروه یا بین‌گروه، صرفاً بر اساس exchange_group دو غذا.
function computeFoodSwap({ old_food, new_food, old_weight_g, meal_calories }) {
  if (old_food.exchange_group === new_food.exchange_group) {
    const result = computeSameGroupSwap({ old_food, new_food, old_weight_g });
    return { ...result, path: "same_group", warnings: [] };
  }
  const result = computeCrossGroupAnchorSwap({ old_food, new_food, old_weight_g, meal_calories });
  return { ...result, path: "cross_group" };
}

// تنها تابع این فایل که واقعاً به foodsRepository (batch ۱) وصل می‌شود.
// طبق بخش ۲.۷ سند: «سیستم فقط گزینه‌های همان exchange_group را پیشنهاد
// می‌دهد» — یعنی هیچ تابع پیشنهاددهنده‌ی بین‌گروهی وجود ندارد؛ مسیر
// بین‌گروهی فقط وقتی فعال می‌شود که مربی خودش (از جای دیگر، مثلاً جست‌وجوی
// آزاد بانک) غذایی از گروه دیگر را صریحاً انتخاب کند.
function getSameGroupCandidates(foodsRepository, old_food_id) {
  const oldFood = foodsRepository.getById(old_food_id);
  if (!oldFood) {
    throw new Error(`غذا با id="${old_food_id}" در بانک پیدا نشد.`);
  }
  const candidates = foodsRepository.getByExchangeGroup(oldFood.exchange_group).filter((f) => f.id !== old_food_id);
  return { old_food: oldFood, candidates };
}

export {
  computeSameGroupSwap,
  computeCrossGroupAnchorSwap,
  computeFoodSwap,
  getSameGroupCandidates,
  CROSS_GROUP_DEVIATION_THRESHOLD_PERCENT,
};
