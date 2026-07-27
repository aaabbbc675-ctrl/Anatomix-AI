import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../store/db";
import { processMealTiming } from "../../../engine/nutrition/file5_mealTiming.js";
import { SEVERE_DEVIATION_THRESHOLD_PERCENT } from "../../../engine/nutrition/file4_periodizationAndCarbCycle.js";

// تیکه‌ی الف: اسکلت اسلات‌های وعده — بدون تغییر از قبل (role هر وعده مستقیماً
// از processMealTiming، فایل۵، batch ۵).
const MEAL_ROLE_LABELS = {
  pre_workout: "قبل تمرین",
  post_workout: "بعد تمرین",
  post_workout_pre_sleep: "بعد تمرین + قبل‌خواب (merge)",
  pre_sleep: "قبل خواب",
  regular: "معمولی",
};
const ROLES_ANCHORED_TO_TRAINING_TIME = new Set(["pre_workout", "post_workout", "post_workout_pre_sleep"]);

// تیکه‌ی ب: فیلتر بانک غذا طبق budget_tier/آلرژی/محدودیت رژیمی از فرم
// ایستگاه اول. طبق بخش ۲.۶ سند («فیلتر سه‌سطحی: اقتصادی/متوسط/لوکس»)، جهت
// فیلتر یک‌طرفه است (سقف بودجه) — تصمیم تفسیری من (نه عدد مستند سند): هر
// سطح، سطح خودش و ارزان‌ترها را هم می‌پذیرد (economic ⊂ medium ⊂ premium).
const COST_TIER_RANK = { economic: 0, medium: 1, premium: 2 };

// هنوز فیلتر نقش وعده (pre_workout_approved/post_workout_approved/
// pre_sleep_approved) اعمال نشده — دامنه‌ی این تیکه فقط budget_tier +
// آلرژی/رژیم بود (طبق درخواست صریح). می‌تواند در تیکه‌ی بعدی اضافه شود.
function filterEligibleFoods(foods, { budget_tier, allergies, dietary_restrictions }) {
  return foods.filter((f) => {
    if (f.cost_tier && COST_TIER_RANK[f.cost_tier] > COST_TIER_RANK[budget_tier]) return false;
    if (allergies.some((a) => f.allergens.includes(a))) return false;
    if (dietary_restrictions.includes("vegan") && !f.is_vegan) return false;
    if (dietary_restrictions.includes("vegetarian") && !f.is_vegetarian) return false;
    if (dietary_restrictions.includes("gluten_free") && !f.gluten_free) return false;
    if (dietary_restrictions.includes("lactose_free") && !f.lactose_free) return false;
    if (dietary_restrictions.includes("diabetic_friendly") && !f.diabetic_friendly) return false;
    return true;
  });
}

function computeTotals(items, foodsById) {
  return items.reduce(
    (totals, item) => {
      const food = foodsById.get(item.food_id);
      if (!food) return totals;
      const factor = item.weight_g / 100;
      return {
        calories: totals.calories + factor * food.calories,
        protein_g: totals.protein_g + factor * food.protein_g,
        carb_g: totals.carb_g + factor * food.carbs_g,
        fat_g: totals.fat_g + factor * food.fat_g,
      };
    },
    { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 }
  );
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// رنگ‌بندی کل‌روز در برابر approved_macros — «هم‌روحیه با EA» یعنی الگوی
// سه‌رنگ، نه عین همان آستانه‌های EA (که kcal/kg FFM هستند، بی‌ربط به درصد
// انحراف ماکرو). آستانه‌ی قرمز = SEVERE_DEVIATION_THRESHOLD_PERCENT (۱۰٪)،
// همان ثابت تاییدشده‌ی فایل۴ (بازاستفاده، نه عدد تازه). آستانه‌ی زرد/سبز
// (نصفِ همان، ۵٪) یک تصمیم UX محض من است، مستند سند نیست — قابل تغییر با
// نظر شما.
const GREEN_MAX_DEVIATION_PERCENT = SEVERE_DEVIATION_THRESHOLD_PERCENT / 2;
const DEVIATION_COLORS = { green: "#2e7d32", yellow: "#e0a800", red: "#c0392b" };

function deviationColor(actual, target) {
  if (!(target > 0)) return DEVIATION_COLORS.red;
  const deviationPercent = (Math.abs(actual - target) / target) * 100;
  if (deviationPercent <= GREEN_MAX_DEVIATION_PERCENT) return DEVIATION_COLORS.green;
  if (deviationPercent <= SEVERE_DEVIATION_THRESHOLD_PERCENT) return DEVIATION_COLORS.yellow;
  return DEVIATION_COLORS.red;
}

export default function NutritionStageTwoGate({ assessment, cascadeResult, onBack }) {
  const [allFoods, setAllFoods] = useState(null);
  const [loadError, setLoadError] = useState(null);
  // mealFoods[mealIndex] = [{food_id, weight_g}, ...]
  const [mealFoods, setMealFoods] = useState({});

  useEffect(() => {
    let cancelled = false;
    db.foods
      .getAll()
      .then((foods) => {
        if (!cancelled) setAllFoods(foods);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "خطا در بارگذاری بانک غذا.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const foodsById = useMemo(() => new Map((allFoods ?? []).map((f) => [f.id, f])), [allFoods]);

  const eligibleFoods = useMemo(
    () =>
      allFoods
        ? filterEligibleFoods(allFoods, {
            budget_tier: assessment.budget_tier,
            allergies: assessment.allergies,
            dietary_restrictions: assessment.dietary_restrictions,
          })
        : [],
    [allFoods, assessment]
  );

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

  function addFoodToMeal(mealIndex, food) {
    setMealFoods((prev) => ({
      ...prev,
      [mealIndex]: [...(prev[mealIndex] ?? []), { food_id: food.id, weight_g: food.common_unit_grams ?? 100 }],
    }));
  }
  function removeFoodFromMeal(mealIndex, itemIndex) {
    setMealFoods((prev) => ({
      ...prev,
      [mealIndex]: (prev[mealIndex] ?? []).filter((_, i) => i !== itemIndex),
    }));
  }
  function setFoodWeight(mealIndex, itemIndex, weight_g) {
    setMealFoods((prev) => ({
      ...prev,
      [mealIndex]: (prev[mealIndex] ?? []).map((it, i) => (i === itemIndex ? { ...it, weight_g } : it)),
    }));
  }

  const dayTotals = useMemo(
    () => computeTotals(Object.values(mealFoods).flat(), foodsById),
    [mealFoods, foodsById]
  );

  if (loadError) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
        <p style={{ color: "#c0392b" }}>خطا در بارگذاری بانک غذا: {loadError}</p>
        <button type="button" onClick={onBack}>
          ← بازگشت
        </button>
      </div>
    );
  }
  if (allFoods === null) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
        <p>در حال بارگذاری بانک غذا...</p>
      </div>
    );
  }

  const target = cascadeResult.approved_macros;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 760, margin: "0 auto" }}>
      <h2>چیدن وعده‌ها — ایستگاه دوم (Post-Generation)</h2>
      <p style={{ color: "#666" }}>
        {mealTiming.meals.length} اسلات وعده (طبق meals_count_requested={assessment.meals_count_requested} از فرم ورودی) —{" "}
        {eligibleFoods.length} غذای مناسب (بعد از فیلتر بودجه/آلرژی/رژیم) از {allFoods.length} غذای کل بانک.
      </p>

      {mealTiming.meals.map((meal) => {
        const items = mealFoods[meal.meal_index] ?? [];
        const totals = computeTotals(items, foodsById);
        return (
          <div key={meal.meal_index} style={{ marginTop: "0.75rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
            <strong>
              وعده {meal.meal_index} — {MEAL_ROLE_LABELS[meal.role]}
            </strong>
            {ROLES_ANCHORED_TO_TRAINING_TIME.has(meal.role) && (
              <p style={{ margin: "0.3rem 0", fontSize: "0.85rem", color: "#666" }}>حدود ساعت تمرین ({assessment.training_time})</p>
            )}

            {items.map((item, itemIndex) => {
              const food = foodsById.get(item.food_id);
              return (
                <div key={itemIndex} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.3rem" }}>
                  <span>{food?.name_fa ?? item.food_id}</span>
                  <input
                    type="number"
                    min={0}
                    value={item.weight_g}
                    onChange={(e) => setFoodWeight(meal.meal_index, itemIndex, Number(e.target.value))}
                    style={{ width: "5rem" }}
                  />
                  <span>گرم</span>
                  <button type="button" onClick={() => removeFoodFromMeal(meal.meal_index, itemIndex)}>
                    حذف
                  </button>
                </div>
              );
            })}

            <select
              style={{ marginTop: "0.5rem" }}
              value=""
              onChange={(e) => {
                const food = eligibleFoods.find((f) => f.id === e.target.value);
                if (food) addFoodToMeal(meal.meal_index, food);
              }}
            >
              <option value="">+ افزودن غذا ({eligibleFoods.length} گزینه‌ی مناسب)</option>
              {eligibleFoods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name_fa}
                </option>
              ))}
            </select>

            {items.length > 0 && (
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "#666" }}>
                جمع این اسلات: {round1(totals.calories)} کالری — پروتئین {round1(totals.protein_g)} گرم — کربوهیدرات{" "}
                {round1(totals.carb_g)} گرم — چربی {round1(totals.fat_g)} گرم
              </p>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <strong>جمع کل روز در برابر ماکروهای تایید‌شده‌ی ایستگاه اول</strong>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" }}>
          <tbody>
            <tr>
              <td>کالری</td>
              <td style={{ color: deviationColor(dayTotals.calories, target.target_calories) }}>
                {round1(dayTotals.calories)} / {round1(target.target_calories)}
              </td>
            </tr>
            <tr>
              <td>پروتئین (گرم)</td>
              <td style={{ color: deviationColor(dayTotals.protein_g, target.protein_grams) }}>
                {round1(dayTotals.protein_g)} / {round1(target.protein_grams)}
              </td>
            </tr>
            <tr>
              <td>کربوهیدرات (گرم)</td>
              <td style={{ color: deviationColor(dayTotals.carb_g, target.carb_grams) }}>
                {round1(dayTotals.carb_g)} / {round1(target.carb_grams)}
              </td>
            </tr>
            <tr>
              <td>چربی (گرم)</td>
              <td style={{ color: deviationColor(dayTotals.fat_g, target.fat_grams) }}>
                {round1(dayTotals.fat_g)} / {round1(target.fat_grams)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <button type="button" onClick={onBack}>
          ← بازگشت
        </button>
      </div>
    </div>
  );
}
