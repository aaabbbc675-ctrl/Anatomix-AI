import React, { useState } from "react";
import {
  VALID_SEX,
  VALID_ACTIVITY_LEVELS,
  VALID_SPORT_TYPES,
  VALID_MAIN_GOALS,
  VALID_BUDGET_TIERS,
  VALID_DIETARY_RESTRICTIONS,
  MIN_MEALS_COUNT,
  MAX_MEALS_COUNT,
  MUSCLE_GAIN_SURPLUS_MIN_KCAL,
  MUSCLE_GAIN_SURPLUS_MAX_KCAL,
  BLOCK_REDUCTION_MIN_KCAL,
  BLOCK_REDUCTION_MAX_KCAL,
} from "../../../engine/nutrition/file1_intakeInputs.js";

// enumها همه از file1_intakeInputs.js موتور تغذیه import می‌شوند — همان الگوی
// CorrectiveAssessmentForm.jsx (خودِ فایل خواندگی، بدون بازنویسی دستی).

const SEX_LABELS = { male: "مرد", female: "زن" };
const ACTIVITY_LEVEL_LABELS = {
  sedentary: "بی‌تحرک",
  light: "کم‌تحرک",
  moderate: "متوسط",
  heavy: "پرتحرک",
  athlete: "ورزشکار حرفه‌ای",
};
const SPORT_TYPE_LABELS = {
  fitness_bodybuilding: "بدنسازی / فیتنس",
  powerlifting_weightlifting: "پاورلیفتینگ / وزنه‌برداری",
  team_sports: "ورزش‌های تیمی",
  combat_sports: "رزمی",
  endurance: "استقامتی",
  sprint: "سرعتی",
  skill_sports: "مهارتی",
};
const MAIN_GOAL_LABELS = { fat_loss: "کاهش چربی", muscle_gain: "افزایش حجم", maintenance: "نگه‌داری وزن" };
const BUDGET_TIER_LABELS = { economic: "اقتصادی", medium: "متوسط", premium: "لوکس" };
const DIETARY_RESTRICTION_LABELS = {
  vegan: "وگان",
  vegetarian: "گیاه‌خوار",
  gluten_free: "بدون گلوتن",
  lactose_free: "بدون لاکتوز",
  diabetic_friendly: "مناسب دیابتی",
};

function defaultAssessment() {
  return {
    age: 25,
    weight_kg: 70,
    height_cm: 175,
    sex: VALID_SEX[0],
    body_fat_percent: "",

    activity_level: VALID_ACTIVITY_LEVELS[0],
    sport_type: VALID_SPORT_TYPES[0],

    main_goal: VALID_MAIN_GOALS[0],
    // فقط وقتی main_goal=muscle_gain واقعاً مصرف می‌شود (پایین‌تر) — طبق
    // بخش ۲.۱-ج سند، هیچ نقطه‌ی پیش‌فرض مستندی ندارد، مربی باید خودش از
    // بازه انتخاب کند؛ اینجا فقط کف بازه به‌عنوان مقدار اولیه‌ی قابل‌ویرایش
    // فرم نشسته، نه یک پیش‌فرض پنهان موتور.
    muscle_gain_surplus_kcal: MUSCLE_GAIN_SURPLUS_MIN_KCAL,
    budget_tier: VALID_BUDGET_TIERS[0],

    // طبق بخش ۲.۴ سند: هیچ نقطه‌ی پیش‌فرض مستندی ندارند، مربی باید خودش
    // انتخاب کند — مقدار اولیه‌ی فرم فقط کف بازه است.
    block2_reduction_kcal: BLOCK_REDUCTION_MIN_KCAL,
    block3_reduction_kcal: BLOCK_REDUCTION_MIN_KCAL,
    // طبق بخش ۲.۵ سند: پارامتر اجباری بدون فرمول مستند، مربی خودش تعیین می‌کند.
    carb_cycling_percent: 20,

    meals_count_requested: 5,
    pre_workout_meal_index: 2,
    post_workout_meal_index: 3,
    training_time: "",
    training_calories_burned: "",

    session_intensity: 5,
    time_until_next_session_hours: 24,

    allergiesText: "",
    dietary_restrictions: Object.fromEntries(VALID_DIETARY_RESTRICTIONS.map((k) => [k, false])),
  };
}

function parseTagList(text) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// شکل خروجی دقیقاً همان قرارداد ورودی خام processIntakeInputs (file1) است —
// این فرم خودش هیچ اعتبارسنجی/محاسبه‌ای انجام نمی‌دهد، فقط شکل می‌دهد؛
// اعتبارسنجی واقعی در ایستگاه اول (زیرکامیت بعدی، processStage1) اجرا می‌شود.
function buildNutritionAssessment(form) {
  return {
    age: form.age,
    weight_kg: form.weight_kg,
    height_cm: form.height_cm,
    sex: form.sex,
    body_fat_percent: form.body_fat_percent === "" ? null : Number(form.body_fat_percent),

    activity_level: form.activity_level,
    sport_type: form.sport_type,

    main_goal: form.main_goal,
    muscle_gain_surplus_kcal: form.main_goal === "muscle_gain" ? Number(form.muscle_gain_surplus_kcal) : null,
    budget_tier: form.budget_tier,

    block2_reduction_kcal: form.block2_reduction_kcal,
    block3_reduction_kcal: form.block3_reduction_kcal,
    carb_cycling_percent: form.carb_cycling_percent,

    meals_count_requested: form.meals_count_requested,
    pre_workout_meal_index: form.pre_workout_meal_index,
    post_workout_meal_index: form.post_workout_meal_index,
    training_time: form.training_time,
    training_calories_burned: form.training_calories_burned === "" ? null : Number(form.training_calories_burned),

    session_intensity: form.session_intensity,
    time_until_next_session_hours: form.time_until_next_session_hours,

    allergies: parseTagList(form.allergiesText),
    dietary_restrictions: VALID_DIETARY_RESTRICTIONS.filter((k) => form.dietary_restrictions[k]),
  };
}

export default function NutritionAssessmentForm({ initialValues, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...defaultAssessment(), ...(initialValues || {}) }));

  const isMuscleGain = form.main_goal === "muscle_gain";

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function toggleDietaryRestriction(key) {
    setForm((prev) => ({ ...prev, dietary_restrictions: { ...prev.dietary_restrictions, [key]: !prev.dietary_restrictions[key] } }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(buildNutritionAssessment(form));
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <h2>سوالات کوتاه — برنامه غذایی</h2>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۱. هویت / بیومتریک</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          سن
          <input type="number" min={1} value={form.age} onChange={(e) => updateField("age", Number(e.target.value))} />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          وزن (کیلوگرم)
          <input
            type="number"
            min={1}
            step="0.1"
            value={form.weight_kg}
            onChange={(e) => updateField("weight_kg", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          قد (سانتی‌متر)
          <input
            type="number"
            min={1}
            value={form.height_cm}
            onChange={(e) => updateField("height_cm", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          جنسیت
          <select value={form.sex} onChange={(e) => updateField("sex", e.target.value)}>
            {VALID_SEX.map((v) => (
              <option key={v} value={v}>
                {SEX_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          درصد چربی بدن (اختیاری — بدون آن EA بعداً «محاسبه نشد» گزارش می‌شود)
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={form.body_fat_percent}
            onChange={(e) => updateField("body_fat_percent", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۲. فعالیت و رشته</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          سطح فعالیت روزانه
          <select value={form.activity_level} onChange={(e) => updateField("activity_level", e.target.value)}>
            {VALID_ACTIVITY_LEVELS.map((v) => (
              <option key={v} value={v}>
                {ACTIVITY_LEVEL_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          رشته‌ی ورزشی
          <select value={form.sport_type} onChange={(e) => updateField("sport_type", e.target.value)}>
            {VALID_SPORT_TYPES.map((v) => (
              <option key={v} value={v}>
                {SPORT_TYPE_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۳. هدف و بودجه</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          هدف اصلی
          <select value={form.main_goal} onChange={(e) => updateField("main_goal", e.target.value)}>
            {VALID_MAIN_GOALS.map((v) => (
              <option key={v} value={v}>
                {MAIN_GOAL_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
        {isMuscleGain && (
          <label style={{ display: "block", marginTop: "0.5rem" }}>
            سورپلاس کالری حجم (بین {MUSCLE_GAIN_SURPLUS_MIN_KCAL} تا {MUSCLE_GAIN_SURPLUS_MAX_KCAL})
            <input
              type="number"
              min={MUSCLE_GAIN_SURPLUS_MIN_KCAL}
              max={MUSCLE_GAIN_SURPLUS_MAX_KCAL}
              value={form.muscle_gain_surplus_kcal}
              onChange={(e) => updateField("muscle_gain_surplus_kcal", Number(e.target.value))}
            />
          </label>
        )}
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          سطح بودجه
          <select value={form.budget_tier} onChange={(e) => updateField("budget_tier", e.target.value)}>
            {VALID_BUDGET_TIERS.map((v) => (
              <option key={v} value={v}>
                {BUDGET_TIER_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۴. دوره‌بندی بلوکی و کربوسایکل</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          کاهش کالری بلوک ۲ (بین {BLOCK_REDUCTION_MIN_KCAL} تا {BLOCK_REDUCTION_MAX_KCAL})
          <input
            type="number"
            min={BLOCK_REDUCTION_MIN_KCAL}
            max={BLOCK_REDUCTION_MAX_KCAL}
            value={form.block2_reduction_kcal}
            onChange={(e) => updateField("block2_reduction_kcal", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          کاهش کالری بلوک ۳ (بین {BLOCK_REDUCTION_MIN_KCAL} تا {BLOCK_REDUCTION_MAX_KCAL})
          <input
            type="number"
            min={BLOCK_REDUCTION_MIN_KCAL}
            max={BLOCK_REDUCTION_MAX_KCAL}
            value={form.block3_reduction_kcal}
            onChange={(e) => updateField("block3_reduction_kcal", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          درصد پایه‌ی کربوهیدرات High-Day (۰ تا کمتر از ۱۰۰)
          <input
            type="number"
            min={0}
            max={99}
            value={form.carb_cycling_percent}
            onChange={(e) => updateField("carb_cycling_percent", Number(e.target.value))}
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۵. زمان‌بندی وعده‌ها</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          تعداد وعده‌ی درخواستی (بین {MIN_MEALS_COUNT} تا {MAX_MEALS_COUNT})
          <input
            type="number"
            min={MIN_MEALS_COUNT}
            max={MAX_MEALS_COUNT}
            value={form.meals_count_requested}
            onChange={(e) => updateField("meals_count_requested", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          شماره‌ی وعده‌ی قبل‌تمرین
          <input
            type="number"
            min={1}
            max={form.meals_count_requested}
            value={form.pre_workout_meal_index}
            onChange={(e) => updateField("pre_workout_meal_index", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          شماره‌ی وعده‌ی بعد‌تمرین (باید بزرگ‌تر از قبل‌تمرین باشد)
          <input
            type="number"
            min={1}
            max={form.meals_count_requested}
            value={form.post_workout_meal_index}
            onChange={(e) => updateField("post_workout_meal_index", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          ساعت تمرین
          <input
            type="text"
            placeholder="مثلاً: 18:00"
            value={form.training_time}
            onChange={(e) => updateField("training_time", e.target.value)}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          کالری سوزانده‌شده‌ی تمرین (اختیاری — بدون آن EA بعداً «محاسبه نشد» گزارش می‌شود)
          <input
            type="number"
            min={0}
            value={form.training_calories_burned}
            onChange={(e) => updateField("training_calories_burned", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۶. شدت و ریکاوری</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          شدت معمول جلسه (RPE، ۱ تا ۱۰)
          <input
            type="number"
            min={1}
            max={10}
            value={form.session_intensity}
            onChange={(e) => updateField("session_intensity", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          فاصله تا جلسه‌ی بعدی (ساعت)
          <input
            type="number"
            min={0}
            step="0.5"
            value={form.time_until_next_session_hours}
            onChange={(e) => updateField("time_until_next_session_hours", Number(e.target.value))}
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۷. آلرژی‌ها و محدودیت‌های رژیمی</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          آلرژی‌ها (آزاد، با کاما جدا کنید — مثلاً: nuts, shellfish)
          <input
            type="text"
            style={{ width: "100%" }}
            value={form.allergiesText}
            onChange={(e) => updateField("allergiesText", e.target.value)}
          />
        </label>
        <p style={{ marginTop: "0.75rem", marginBottom: "0.25rem" }}>محدودیت‌های رژیمی:</p>
        {VALID_DIETARY_RESTRICTIONS.map((key) => (
          <label key={key} style={{ display: "inline-block", marginLeft: "1rem" }}>
            <input type="checkbox" checked={form.dietary_restrictions[key]} onChange={() => toggleDietaryRestriction(key)} />{" "}
            {DIETARY_RESTRICTION_LABELS[key]}
          </label>
        ))}
      </fieldset>

      <div style={{ marginTop: "1.25rem" }}>
        <button type="button" onClick={onCancel}>
          انصراف
        </button>{" "}
        <button type="submit">ادامه به تایید ماکروها →</button>
      </div>
    </form>
  );
}
