// فایل ۱۲ موتور اصلاحی (بخش ۳.۱۴ سند): حل تعارض / Chain of Responsibility
// روی لیست نهایی حرکات.
//
// طبق تحلیل تاییدشده، این فایل چیزی را که از قبل جای دیگری هست دوباره
// نمی‌سازد:
//   - ActiveInjuryFilter = دقیقاً applyContraindicationFilterWithFallback
//     (file3_triageFallback.js) — فراخوان خودش آن را داخل زنجیره پاس می‌دهد.
//   - EquipmentFilter = دقیقاً filterExercisesByAvailableEquipment
//     (file8_capacityEngine.js) — همچنین توسط فراخوان پاس داده می‌شود.
// این فایل فقط ۳ چیزی را اضافه می‌کند که با grep روی کل engine/ تایید شد
// هیچ‌جای دیگری وجود ندارند:
//   ۱. unionContraindicationSources — یکی‌کردن چند منبع تگ منع هم‌زمان
//      (ورودی دستی + هر آسیب فعال + banned_tags خروجی file4) پیش از فراخوانی
//      فایل۳، که خودش این یونیون را نمی‌سازد (فقط یک آرایه‌ی مسطح می‌گیرد).
//   ۲. filterExercisesByBannedTags — فیلتر MedicalConditionFilter که تا الان
//      هیچ فایلی banned_tags خروجی file4 را واقعاً روی exercise.tags اعمال
//      نمی‌کرد (banned_tags/equipment_priority فقط تولید می‌شدند، مصرف
//      نمی‌شدند).
//   ۳. runFilterChain — اجراکننده‌ی عمومی «آرایه‌ای از فیلترها که به‌ترتیب
//      اجرا می‌شوند»، همان معادل تابعی که سند صراحتاً کافی دانسته.

function unionContraindicationSources(sources) {
  if (!Array.isArray(sources) || sources.some((s) => !Array.isArray(s))) {
    throw new Error("sources باید آرایه‌ای از آرایه‌ها باشد.");
  }
  return [...new Set(sources.flat())];
}

function filterExercisesByBannedTags(exercises, bannedTags) {
  if (!Array.isArray(exercises)) {
    throw new Error("exercises باید آرایه باشد.");
  }
  if (!Array.isArray(bannedTags) || bannedTags.some((t) => typeof t !== "string")) {
    throw new Error("bannedTags باید آرایه‌ای از رشته باشد.");
  }
  return exercises.filter((exercise) => !(exercise.tags ?? []).some((t) => bannedTags.includes(t)));
}

// هر فیلتر یک تابع (exercises) => exercises است؛ اگر فراخوان به warnings هم
// نیاز دارد (مثل خروجی applyContraindicationFilterWithFallback)، باید خودش
// آن را با یک closure جمع کند — این تابع فقط مسئول تنگ‌ترکردن پیاپی لیست است.
function runFilterChain(exercises, filters) {
  if (!Array.isArray(exercises)) {
    throw new Error("exercises باید آرایه باشد.");
  }
  if (!Array.isArray(filters) || filters.some((f) => typeof f !== "function")) {
    throw new Error("filters باید آرایه‌ای از تابع باشد.");
  }
  return filters.reduce((current, filter) => filter(current), exercises);
}

export { unionContraindicationSources, filterExercisesByBannedTags, runFilterChain };
