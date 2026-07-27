import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../store/db";
import { processMealTiming } from "../../../engine/nutrition/file5_mealTiming.js";
import { SEVERE_DEVIATION_THRESHOLD_PERCENT } from "../../../engine/nutrition/file4_periodizationAndCarbCycle.js";
import { computeSameGroupSwap, computeCrossGroupAnchorSwap, getSameGroupCandidates } from "../../../engine/nutrition/file7_smartSwap.js";

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

// تیکه‌ی د: طبق بخش ۳.۲ سند، فقط هشدارهای caution به خروجی نهایی شاگرد
// می‌روند. کدهای caution ای که واقعاً می‌توانند در safety_check.warnings
// (خروجی processStage1، فایل۶) ظاهر شوند -- بررسی شد، فقط همین سه‌تا:
// ea_low (فایل۲)، target_calories_unrealistic (فایل۳/فایل۶)،
// override_calories_deviated_from_target (فایل۶). بقیه‌ی کدهای ممکن
// (ea_suboptimal، fat_raised_to_generic_floor، carb_outside_sport_range،
// protein/fat/carb_below_floor) همه severity=info دارند، هرگز به این آرایه
// نمی‌رسند. متن‌ها پیش‌نویس من هستند (کپی UI، نه عدد/فرمول) -- لحن طبق
// نمونه‌ی خودِ سند (بخش ۳.۲، خط ۲۷۳: «ساده و غیرترسناک»).
const DEFAULT_STUDENT_MESSAGES = {
  ea_low:
    "این برنامه با انرژی در دسترس کمتر از حد مطلوب طراحی شده — مربی‌تان این را آگاهانه انتخاب کرده. در صورت خستگی شدید یا سرگیجه با مربی خود صحبت کنید.",
  target_calories_unrealistic: "کالری هدف این برنامه با محدودیت‌های سلامتی هم‌خوانی کامل ندارد — با مربی خود صحبت کنید.",
  override_calories_deviated_from_target: "تغییر دستی ماکروها باعث فاصله گرفتن کالری واقعی از هدف اصلی شده.",
};

// طبق بخش ۳.۲ سند: «اگر coach_note موجود بود، همین جایگزین متن پیش‌فرض
// می‌شود» + «فقط caution به‌طور پیش‌فرض به خروجی شاگرد می‌رود».
function buildStudentFacingWarnings(warnings, coachNotes) {
  return warnings
    .map((w, index) => ({ ...w, coach_note: coachNotes[index] || null }))
    .filter((w) => w.severity === "caution")
    .map((w) => ({ code: w.code, message: w.coach_note ?? DEFAULT_STUDENT_MESSAGES[w.code] ?? w.code }));
}

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

// رنگ‌بندی کل‌روز در برابر approved_macros — دو رنگ، نه سه. نسخه‌ی قبلی این
// تیکه یک آستانه‌ی سوم (۵٪، نصفِ SEVERE_DEVIATION_THRESHOLD_PERCENT) داشت که
// هیچ منبعی نداشت — دقیقاً همان نوع عدد حدسی که همیشه رد کرده‌ایم؛ حذف شد.
// آستانه‌ی باقی‌مانده (۱۰٪) عدد تازه‌ای نیست، دو منبع مستقل دارد که هر دو از
// قبل تاییدشده‌اند:
//   ۱) SEVERE_DEVIATION_THRESHOLD_PERCENT در فایل۴ (batch ۴، تاییدشده).
//   ۲) CROSS_GROUP_DEVIATION_THRESHOLD_PERCENT در فایل۷ — که خودش مستقیماً
//      از بخش ۲.۷ سند می‌آید («اگر اختلاف کالری از ۱۰٪ کالری آن معده بیشتر
//      شد، هشدار داده شود»)، یعنی این یکی حتی مستند سند هم هست، نه فقط UX.
// هر دو دقیقاً روی همین عدد (۱۰) توافق دارند — پس هیچ آستانه‌ی میانی تازه‌ای
// اختراع نمی‌شود؛ فقط زیر ۱۰٪ (سبز) یا روی/بالای ۱۰٪ (قرمز).
const DEVIATION_COLORS = { green: "#2e7d32", red: "#c0392b" };

function deviationColor(actual, target) {
  if (!(target > 0)) return DEVIATION_COLORS.red;
  const deviationPercent = (Math.abs(actual - target) / target) * 100;
  return deviationPercent <= SEVERE_DEVIATION_THRESHOLD_PERCENT ? DEVIATION_COLORS.green : DEVIATION_COLORS.red;
}

export default function NutritionStageTwoGate({ studentId, assessment, cascadeResult, onBack, onSave }) {
  const [allFoods, setAllFoods] = useState(null);
  const [loadError, setLoadError] = useState(null);
  // {[warningIndex]: noteText} -- کلید ایندکس امن است چون
  // cascadeResult.safety_check.warnings برای کل عمر این کامپوننت ثابت است
  // (فقط یک‌بار در Stage1 محاسبه و به‌عنوان prop پاس داده شده، اینجا تغییر
  // نمی‌کند).
  const [coachNotes, setCoachNotes] = useState({});
  const [showInfoWarnings, setShowInfoWarnings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // mealFoods[mealIndex] = [{food_id, weight_g}, ...]
  const [mealFoods, setMealFoods] = useState({});
  // {mealIndex, itemIndex, oldFood, sameGroupCandidates, crossGroupQuery,
  // crossGroupResults, crossGroupPreview: null|{newFood, result}, crossGroupError}
  const [swapPanel, setSwapPanel] = useState(null);

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

  // getSameGroupCandidates (فایل۷) روی یک foodsRepository سنکرون
  // (getById/getByExchangeGroup) طراحی شده — همان چیزی که در batch ۱
  // ساخته شد. اینجا در renderer فقط db.foods.getAll (async) داریم، اما چون
  // کل بانک از قبل در allFoods بارگذاری شده، یک آداپتور سنکرون از همان
  // داده‌ی حاضر می‌سازیم — نه یک IPC تازه، نه بازسازی منطق getSameGroupCandidates
  // خودش (که مستقیماً و بدون تغییر صدا زده می‌شود). is_active=1 اینجا هم
  // اعمال می‌شود چون getByExchangeGroup واقعی (foodsRepository.js) هم دقیقاً
  // همین فیلتر را دارد.
  const syncFoodsRepo = useMemo(
    () => ({
      getById: (id) => foodsById.get(id) ?? null,
      getByExchangeGroup: (group) => (allFoods ?? []).filter((f) => f.exchange_group === group && f.is_active === 1),
    }),
    [allFoods, foodsById]
  );

  function openSwapPanel(mealIndex, itemIndex) {
    const item = mealFoods[mealIndex][itemIndex];
    const { old_food, candidates } = getSameGroupCandidates(syncFoodsRepo, item.food_id);
    setSwapPanel({
      mealIndex,
      itemIndex,
      oldFood: old_food,
      sameGroupCandidates: candidates,
      crossGroupQuery: "",
      crossGroupResults: [],
      crossGroupPreview: null,
      crossGroupError: null,
    });
  }
  function closeSwapPanel() {
    setSwapPanel(null);
  }

  // مسیر هم‌گروه: بدون هشدار، بدون پیش‌نمایش — دقیقاً طبق طرح تاییدشده‌ی
  // batch ۶-ب (تبدیل واحد قطعی است، نیازی به تایید میانی ندارد).
  function applySameGroupSwap(newFood) {
    const item = mealFoods[swapPanel.mealIndex][swapPanel.itemIndex];
    const result = computeSameGroupSwap({ old_food: swapPanel.oldFood, new_food: newFood, old_weight_g: item.weight_g });
    setFoodWeightAndFood(swapPanel.mealIndex, swapPanel.itemIndex, newFood.id, result.new_weight_g);
    closeSwapPanel();
  }

  function runCrossGroupSearch(query) {
    setSwapPanel((prev) => (prev ? { ...prev, crossGroupQuery: query, crossGroupPreview: null, crossGroupError: null } : prev));
    if (!query.trim() || !allFoods) {
      setSwapPanel((prev) => (prev ? { ...prev, crossGroupResults: [] } : prev));
      return;
    }
    const q = query.trim();
    const results = allFoods.filter((f) => f.id !== swapPanel.oldFood.id && f.name_fa.includes(q));
    setSwapPanel((prev) => (prev ? { ...prev, crossGroupResults: results } : prev));
  }

  // مسیر بین‌گروهی (Anchor Macro، فایل۷): طبق طرح تاییدشده، اول پیش‌نمایش
  // دلتای سه ماکرو + هشدارها نشان داده می‌شود، تایید نهایی جدا از انتخاب
  // است. meal_calories چون هدف ماکروی هر وعده هنوز (تیکه‌های بعدی) وارد
  // نشده، مجموع کالری واقعیِ همین اسلات قبل از swap است — تنها عدد واقعی
  // در دسترس، نه یک هدف حدسی.
  function previewCrossGroupSwap(newFood) {
    const item = mealFoods[swapPanel.mealIndex][swapPanel.itemIndex];
    const meal_calories = computeTotals(mealFoods[swapPanel.mealIndex], foodsById).calories;
    try {
      const result = computeCrossGroupAnchorSwap({
        old_food: swapPanel.oldFood,
        new_food: newFood,
        old_weight_g: item.weight_g,
        meal_calories,
      });
      setSwapPanel((prev) => ({ ...prev, crossGroupPreview: { newFood, result }, crossGroupError: null }));
    } catch (err) {
      setSwapPanel((prev) => ({ ...prev, crossGroupPreview: null, crossGroupError: err.message }));
    }
  }
  function confirmCrossGroupSwap() {
    const { newFood, result } = swapPanel.crossGroupPreview;
    setFoodWeightAndFood(swapPanel.mealIndex, swapPanel.itemIndex, newFood.id, result.new_weight_g, result.warnings);
    closeSwapPanel();
  }

  function setFoodWeightAndFood(mealIndex, itemIndex, food_id, weight_g, swapWarnings = []) {
    setMealFoods((prev) => ({
      ...prev,
      [mealIndex]: (prev[mealIndex] ?? []).map((it, i) => (i === itemIndex ? { food_id, weight_g, swapWarnings } : it)),
    }));
  }

  const dayTotals = useMemo(
    () => computeTotals(Object.values(mealFoods).flat(), foodsById),
    [mealFoods, foodsById]
  );

  function updateCoachNote(index, text) {
    setCoachNotes((prev) => ({ ...prev, [index]: text }));
  }

  // طبق الگوی موجود پروژه (StageTwoGate/CorrectiveStageTwoGate): همان دو
  // ستون architecture_json/final_program_json روی Programs، program_type="diet".
  // architecture_json = کل ردِ محاسبه (ورودی خام + خروجی Stage1 + انتخاب واقعی
  // غذاها + یادداشت‌های مربی)؛ final_program_json = چیزی که واقعاً دست شاگرد
  // می‌رسد (وعده‌ها با غذای واقعی + فقط هشدارهای caution با متن نهایی).
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const warningsWithNotes = cascadeResult.safety_check.warnings.map((w, index) => ({
        ...w,
        coach_note: coachNotes[index] || null,
      }));

      const meals = mealTiming.meals.map((meal) => ({
        meal_index: meal.meal_index,
        role: meal.role,
        foods: (mealFoods[meal.meal_index] ?? []).map((item) => ({
          food_id: item.food_id,
          name_fa: foodsById.get(item.food_id)?.name_fa ?? item.food_id,
          weight_g: item.weight_g,
        })),
      }));

      const architecture_json = {
        intake: assessment,
        stage1Result: cascadeResult,
        mealFoods,
        safety_check_warnings_with_notes: warningsWithNotes,
      };
      const final_program_json = {
        meals,
        student_facing_warnings: buildStudentFacingWarnings(cascadeResult.safety_check.warnings, coachNotes),
      };

      const program = await db.programs.create({
        student_id: studentId,
        program_type: "diet",
        status: "active",
        architecture_json,
        final_program_json,
        total_weeks: null,
      });
      onSave(program);
    } catch (err) {
      setSaveError(err.message || "خطا در ذخیره‌ی برنامه.");
    } finally {
      setSaving(false);
    }
  }

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
                  <button type="button" onClick={() => openSwapPanel(meal.meal_index, itemIndex)}>
                    🔄 جایگزینی
                  </button>
                  <button type="button" onClick={() => removeFoodFromMeal(meal.meal_index, itemIndex)}>
                    حذف
                  </button>
                  {item.swapWarnings?.map((w, wi) => (
                    <span key={wi} style={{ fontSize: "0.8rem", color: w.severity === "caution" ? "#c0392b" : "#8a6d00" }}>
                      [{w.code}]
                    </span>
                  ))}
                </div>
              );
            })}

            {swapPanel && swapPanel.mealIndex === meal.meal_index && (
              <div style={{ marginTop: "0.5rem", padding: "0.5rem", border: "1px solid #2e7d32", borderRadius: 8 }}>
                <strong>جایگزینی «{swapPanel.oldFood.name_fa}»</strong>

                <p style={{ fontSize: "0.85rem", color: "#666", margin: "0.4rem 0 0.2rem" }}>
                  گزینه‌های هم‌گروه ({swapPanel.oldFood.exchange_group}) — بدون هشدار، تبدیل واحد قطعی:
                </p>
                {swapPanel.sameGroupCandidates.length === 0 && <p style={{ fontSize: "0.85rem" }}>هیچ گزینه‌ی هم‌گروه دیگری در بانک نیست.</p>}
                <ul style={{ margin: 0, paddingRight: "1.2rem" }}>
                  {swapPanel.sameGroupCandidates.map((f) => (
                    <li key={f.id}>
                      {f.name_fa}{" "}
                      <button type="button" onClick={() => applySameGroupSwap(f)}>
                        انتخاب
                      </button>
                    </li>
                  ))}
                </ul>

                <p style={{ fontSize: "0.85rem", color: "#666", margin: "0.6rem 0 0.2rem" }}>
                  یا جست‌وجوی آزاد در کل بانک (جایگزینی بین‌گروهی، طبق Anchor Macro Rule):
                </p>
                <input
                  type="text"
                  value={swapPanel.crossGroupQuery}
                  onChange={(e) => runCrossGroupSearch(e.target.value)}
                  placeholder="نام غذا..."
                />
                <ul style={{ margin: "0.3rem 0", paddingRight: "1.2rem" }}>
                  {swapPanel.crossGroupResults.map((f) => (
                    <li key={f.id}>
                      {f.name_fa} ({f.exchange_group}){" "}
                      <button type="button" onClick={() => previewCrossGroupSwap(f)}>
                        پیش‌نمایش
                      </button>
                    </li>
                  ))}
                </ul>

                {swapPanel.crossGroupError && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{swapPanel.crossGroupError}</p>}

                {swapPanel.crossGroupPreview && (
                  <div style={{ marginTop: "0.4rem", padding: "0.4rem", background: "#fafafa", border: "1px solid #ddd" }}>
                    <strong>پیش‌نمایش جایگزینی با «{swapPanel.crossGroupPreview.newFood.name_fa}»</strong>
                    <p style={{ margin: "0.3rem 0", fontSize: "0.85rem" }}>
                      وزن جدید: {round1(swapPanel.crossGroupPreview.result.new_weight_g)} گرم — دلتا: کالری{" "}
                      {round1(swapPanel.crossGroupPreview.result.delta_calories)} — پروتئین{" "}
                      {round1(swapPanel.crossGroupPreview.result.delta_protein_g)} — کربوهیدرات{" "}
                      {round1(swapPanel.crossGroupPreview.result.delta_carb_g)} — چربی{" "}
                      {round1(swapPanel.crossGroupPreview.result.delta_fat_g)}
                    </p>
                    <ul style={{ margin: 0, paddingRight: "1.2rem" }}>
                      {swapPanel.crossGroupPreview.result.warnings.map((w, wi) => (
                        <li key={wi} style={{ color: w.severity === "caution" ? "#c0392b" : "#8a6d00", fontSize: "0.85rem" }}>
                          {w.code === "cross_group_swap_not_guaranteed"
                            ? "این جایگزینی هم‌گروه نیست — تطابق کامل ماکرو تضمین نمی‌شود."
                            : w.code}
                          {w.deviation_kcal !== undefined ? ` (${round1(w.deviation_kcal)} kcal)` : ""}
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={confirmCrossGroupSwap} style={{ marginTop: "0.3rem" }}>
                      تایید جایگزینی
                    </button>
                  </div>
                )}

                <div style={{ marginTop: "0.5rem" }}>
                  <button type="button" onClick={closeSwapPanel}>
                    انصراف
                  </button>
                </div>
              </div>
            )}

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

      <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 8 }}>
        <strong>نکات مهم برنامه‌ی شما</strong>
        {(() => {
          const cautionWarnings = cascadeResult.safety_check.warnings
            .map((w, index) => ({ ...w, index }))
            .filter((w) => w.severity === "caution");
          const infoWarnings = cascadeResult.safety_check.warnings
            .map((w, index) => ({ ...w, index }))
            .filter((w) => w.severity === "info");

          function renderWarningRow(w) {
            return (
              <div key={w.index} style={{ marginTop: "0.5rem", paddingRight: "0.5rem", borderRight: `3px solid ${w.severity === "caution" ? "#c0392b" : "#8a6d00"}` }}>
                <span style={{ fontSize: "0.85rem", color: w.severity === "caution" ? "#c0392b" : "#8a6d00" }}>
                  [{w.severity}] {w.code}
                  {w.deviation_kcal !== undefined ? ` (${round1(w.deviation_kcal)} kcal)` : ""}
                </span>
                {w.severity === "caution" && (
                  <p style={{ margin: "0.2rem 0", fontSize: "0.8rem", color: "#666" }}>
                    متن پیش‌فرض شاگرد: «{DEFAULT_STUDENT_MESSAGES[w.code] ?? w.code}»
                  </p>
                )}
                <textarea
                  style={{ width: "100%", minHeight: 40, fontSize: "0.85rem" }}
                  placeholder="یادداشت اختیاری برای شاگرد (اگر خالی بماند، متن پیش‌فرض بالا نمایش داده می‌شود)"
                  value={coachNotes[w.index] ?? ""}
                  onChange={(e) => updateCoachNote(w.index, e.target.value)}
                />
              </div>
            );
          }

          return (
            <>
              {cautionWarnings.length === 0 && infoWarnings.length === 0 && (
                <p style={{ fontSize: "0.85rem", color: "#666" }}>هیچ هشداری از ایستگاه اول ثبت نشده.</p>
              )}
              {cautionWarnings.map(renderWarningRow)}

              {infoWarnings.length > 0 && (
                <>
                  <button type="button" style={{ marginTop: "0.5rem" }} onClick={() => setShowInfoWarnings((v) => !v)}>
                    {showInfoWarnings ? "پنهان کردن" : "نمایش"} {infoWarnings.length} هشدار اطلاعاتی (فقط داشبورد مربی، به شاگرد نمی‌رود)
                  </button>
                  {showInfoWarnings && infoWarnings.map(renderWarningRow)}
                </>
              )}
            </>
          );
        })()}
      </div>

      {saveError && <p style={{ color: "#c0392b" }}>{saveError}</p>}

      <div style={{ marginTop: "1.25rem" }}>
        <button type="button" onClick={onBack} disabled={saving}>
          ← بازگشت
        </button>{" "}
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "در حال ذخیره..." : "تایید نهایی و ذخیره‌ی برنامه"}
        </button>
      </div>
    </div>
  );
}
