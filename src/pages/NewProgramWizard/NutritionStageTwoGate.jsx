import React, { useMemo } from "react";
import { processMealTiming } from "../../../engine/nutrition/file5_mealTiming.js";

// تیکه‌ی الف (از ۴ تیکه‌ی زیرکامیت ۶-د-۳): فقط اسکلت اسلات‌های وعده — بدون
// غذا، بدون عدد ماکرو. تعداد و نقش هر اسلات مستقیماً از processMealTiming
// (فایل۵، batch ۵) می‌آید، نه حدس زده می‌شود: role هر وعده فقط به
// meals_count_requested/pre_workout_meal_index/post_workout_meal_index
// وابسته است (نه به مقدار عددی ماکروها) — پس ماکروهای تخت تایید‌شده‌ی Stage1
// فقط چون processMealTiming آن‌ها را در امضایش لازم دارد پاس داده می‌شوند؛
// این تیکه عمداً خروجی protein_g/carb_g/fat_g هر وعده را نمایش نمی‌دهد. آن
// کار تیکه‌ی بعدی (ب) است، وقتی ماکروی هر بلوک/نوع‌روز از فایل۴ واقعاً وارد
// می‌شود و بلوک/های high-day/low-day هم اضافه می‌شوند.
const MEAL_ROLE_LABELS = {
  pre_workout: "قبل تمرین",
  post_workout: "بعد تمرین",
  post_workout_pre_sleep: "بعد تمرین + قبل‌خواب (merge)",
  pre_sleep: "قبل خواب",
  regular: "معمولی",
};

// طبق تصمیم تاییدشده‌ی batch ۵: هیچ ساعت دقیقی برای هیچ وعده‌ای در موتور
// محاسبه نمی‌شود (چون ساعت بیداری/شروع روز اصلاً ورودی نیست). تنها داده‌ی
// ساعتی واقعی که در ورودی خام موجود است training_time است — فقط برای
// اسلات‌های قبل/بعد‌تمرین (که مستقیماً حول همان ساعت می‌چرخند) نمایش داده
// می‌شود؛ برای بقیه‌ی نقش‌ها هیچ بازه‌ی ساعتی‌ای «ندارد».
const ROLES_ANCHORED_TO_TRAINING_TIME = new Set(["pre_workout", "post_workout", "post_workout_pre_sleep"]);

export default function NutritionStageTwoGate({ assessment, cascadeResult, onBack }) {
  const mealTiming = useMemo(
    () =>
      processMealTiming({
        protein_g: cascadeResult.approved_macros.protein_grams,
        carb_g: cascadeResult.approved_macros.carb_grams,
        fat_g: cascadeResult.approved_macros.fat_grams,
        weight_kg: assessment.weight_kg,
        meals_count_requested: assessment.meals_count_requested,
        pre_workout_meal_index: assessment.pre_workout_meal_index,
        post_workout_meal_index: assessment.post_workout_meal_index,
        session_intensity: assessment.session_intensity,
        time_until_next_session_hours: assessment.time_until_next_session_hours,
      }),
    [assessment, cascadeResult]
  );

  return (
    <div style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <h2>چیدن وعده‌ها — ایستگاه دوم (Post-Generation)</h2>
      <p style={{ color: "#666" }}>
        {mealTiming.meals.length} اسلات وعده (طبق meals_count_requested={assessment.meals_count_requested} از فرم ورودی).
      </p>

      {mealTiming.meals.map((meal) => (
        <div key={meal.meal_index} style={{ marginTop: "0.75rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
          <strong>
            وعده {meal.meal_index} — {MEAL_ROLE_LABELS[meal.role]}
          </strong>
          {ROLES_ANCHORED_TO_TRAINING_TIME.has(meal.role) && (
            <p style={{ margin: "0.3rem 0", fontSize: "0.85rem", color: "#666" }}>حدود ساعت تمرین ({assessment.training_time})</p>
          )}
          <p style={{ margin: "0.3rem 0", fontSize: "0.85rem", color: "#999" }}>
            (هنوز بدون غذا و بدون هدف ماکرو — در تیکه‌ی بعدی اضافه می‌شود)
          </p>
        </div>
      ))}

      <div style={{ marginTop: "1.25rem" }}>
        <button type="button" onClick={onBack}>
          ← بازگشت
        </button>
      </div>
    </div>
  );
}
