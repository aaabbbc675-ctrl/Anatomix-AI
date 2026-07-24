import React, { useState } from "react";
import { SUPPORTED_DISEASES } from "../../../engine/corrective/file4_diseaseManagement.js";
import {
  ELDERLY_MIN_AGE,
  ELDERLY_EXPERIENCE_LEVELS,
  ELDERLY_TRAINING_FOCUSES,
  ELDERLY_MOVEMENT_TYPES,
} from "../../../engine/corrective/file5_ageAdjustments.js";
import { AFFECTED_SIDES } from "../../../engine/corrective/file7_asymmetry.js";
import { VALID_USER_LEVELS } from "../../../engine/corrective/file1_systemInputs.js";

// enum ها همه از خودِ فایل‌های موتور اصلاحی import می‌شوند (همان الگوی
// src/pages/ManualAssessmentInput.jsx) — بازنویسی دستی نمی‌شوند تا اگر موتور
// تغییر کرد این فرم بی‌صدا از آن جا نماند.

const DISEASE_LABELS = {
  heartOrHypertension: "بیماری قلبی / فشارخون",
  diabetes: "دیابت",
  arthritis: "آرتروز / آرتریت",
  cerebralPalsy: "فلج مغزی (CP)",
  multipleSclerosis: "مولتیپل اسکلروزیس (MS)",
  kidneyDisease: "بیماری کلیوی",
};

// equipment هیچ‌جا به‌عنوان ثابت export نشده (فقط مقادیر واقعی داخل
// exercises.seed.js) — همان فهرست ManualAssessmentInput.jsx بازاستفاده شد.
const EQUIPMENT_OPTIONS = ["barbell", "dumbbell", "machine", "cable"];
const EQUIPMENT_LABELS = { barbell: "هالتر", dumbbell: "دمبل", machine: "دستگاه", cable: "کابل" };

const USER_LEVEL_LABELS = { Beginner: "مبتدی", Intermediate: "متوسط", Advanced: "پیشرفته" };
const AFFECTED_SIDE_LABELS = { Right: "راست", Left: "چپ", Bilateral: "دوطرفه", Unknown: "نامشخص" };
const ELDERLY_EXPERIENCE_LABELS = { beginner: "مبتدی", professional: "حرفه‌ای" };
const ELDERLY_FOCUS_LABELS = { endurance: "استقامتی", massMaintenance: "حفظ توده" };
const ELDERLY_MOVEMENT_LABELS = { isolated: "ایزوله", compound: "مرکب" };

function defaultAssessment() {
  return {
    userLevel: VALID_USER_LEVELS[0],
    daysPerWeek: 3,
    bodybuildingRequest: false,
    age: 25,

    restingHr: "",
    bmi: "",

    diseases: Object.fromEntries(SUPPORTED_DISEASES.map((k) => [k, false])),
    onDialysis: false,
    hasFistula: false,
    isDialysisDayToday: false,

    elderlyExperienceLevel: ELDERLY_EXPERIENCE_LEVELS[0],
    elderlyTrainingFocus: ELDERLY_TRAINING_FOCUSES[0],
    elderlyMovementType: ELDERLY_MOVEMENT_TYPES[0],

    activeInjuriesCount: 0,
    deformitiesCount: 0,
    coachPrioritizedDeformitiesText: "",

    hasSShapeDeformity: false,
    affectedSide: "Unknown",
    coreStabilizationExerciseIdsText: "",

    availableEquipment: Object.fromEntries(EQUIPMENT_OPTIONS.map((k) => [k, false])),

    totalAllowedMinutes: 60,
    setsPerExercise: 3,
    executionSecPerSet: 40,
    restSecPerSet: 90,

    userContraindicationsText: "",
    manualBlacklistExercises: [],
    generalNotes: "",
  };
}

function parseTagList(text) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// شکل خروجی دقیقاً همان زیرمجموعه‌ی buildCorrectiveObject در
// ManualAssessmentInput.jsx است — بدون فیلدهای مخصوص ماه ۲+ (monthNumber،
// monthlyFeedback، previousMonthRpeInInjuredArea، painFreeSoFar) که برای
// ساخت اولیه‌ی برنامه (ماه ۱) معنا ندارند.
function buildCorrectiveAssessment(form) {
  const restingHr = form.restingHr === "" ? null : Number(form.restingHr);
  const bmi = form.bmi === "" ? null : Number(form.bmi);
  const diseases = SUPPORTED_DISEASES.filter((key) => form.diseases[key]);
  const availableEquipment = EQUIPMENT_OPTIONS.filter((key) => form.availableEquipment[key]);

  return {
    // بدون دستگاه واقعی هنوز — همان محدودیت مستندشده‌ی ManualAssessmentInput.
    assessmentData: null,
    userLevel: form.userLevel,
    bodybuildingRequest: form.bodybuildingRequest,
    workoutDaysPerWeek: form.daysPerWeek,
    coachPrioritizedDeformities: parseTagList(form.coachPrioritizedDeformitiesText),
    manualBlacklistExercises: form.manualBlacklistExercises,
    generalNotes: form.generalNotes,

    diseases,
    onDialysis: form.onDialysis,
    hasFistula: form.hasFistula,
    isDialysisDayToday: form.isDialysisDayToday,
    // به‌جای تیک جدا، از همان تیک بیماری قلبی/فشارخون مشتق می‌شود — یک منبع حقیقت.
    hasCardiacCondition: form.diseases.heartOrHypertension,

    age: form.age,
    ...(form.age >= ELDERLY_MIN_AGE
      ? {
          elderlyExperienceLevel: form.elderlyExperienceLevel,
          elderlyTrainingFocus: form.elderlyTrainingFocus,
          elderlyMovementType: form.elderlyMovementType,
        }
      : {}),

    restingHr,
    bmi,

    hasSShapeDeformity: form.hasSShapeDeformity,
    affectedSide: form.affectedSide,
    coreStabilizationExerciseIds: parseTagList(form.coreStabilizationExerciseIdsText),

    availableEquipment,
    totalAllowedMinutes: form.totalAllowedMinutes,
    setsPerExercise: form.setsPerExercise,
    executionSecPerSet: form.executionSecPerSet,
    restSecPerSet: form.restSecPerSet,

    userContraindications: parseTagList(form.userContraindicationsText),

    activeInjuriesCount: form.activeInjuriesCount,
    deformitiesCount: form.deformitiesCount,
  };
}

export default function CorrectiveAssessmentForm({ initialValues, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...defaultAssessment(), ...(initialValues || {}) }));

  const isElderly = form.age >= ELDERLY_MIN_AGE;
  const needsDialysisToggle = form.diseases.kidneyDisease && form.onDialysis;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function toggleDisease(key) {
    setForm((prev) => ({ ...prev, diseases: { ...prev.diseases, [key]: !prev.diseases[key] } }));
  }
  function toggleEquipment(key) {
    setForm((prev) => ({ ...prev, availableEquipment: { ...prev.availableEquipment, [key]: !prev.availableEquipment[key] } }));
  }

  function addBlacklistRow() {
    setForm((prev) => ({
      ...prev,
      manualBlacklistExercises: [...prev.manualBlacklistExercises, { exerciseId: "", reasonNote: "" }],
    }));
  }
  function updateBlacklistRow(index, key, value) {
    setForm((prev) => ({
      ...prev,
      manualBlacklistExercises: prev.manualBlacklistExercises.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  }
  function removeBlacklistRow(index) {
    setForm((prev) => ({
      ...prev,
      manualBlacklistExercises: prev.manualBlacklistExercises.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(buildCorrectiveAssessment(form));
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <h2>سوالات کوتاه — حرکات اصلاحی</h2>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۱. هویت / سطح</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          سطح تجربه‌ی شاگرد
          <select value={form.userLevel} onChange={(e) => updateField("userLevel", e.target.value)}>
            {VALID_USER_LEVELS.map((v) => (
              <option key={v} value={v}>
                {USER_LEVEL_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          روزهای تمرین در هفته
          <input
            type="number"
            min={1}
            max={7}
            value={form.daysPerWeek}
            onChange={(e) => updateField("daysPerWeek", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          <input
            type="checkbox"
            checked={form.bodybuildingRequest}
            onChange={(e) => updateField("bodybuildingRequest", e.target.checked)}
          />{" "}
          درخواست بدنسازی هم‌زمان دارد
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          سن
          <input type="number" min={7} value={form.age} onChange={(e) => updateField("age", Number(e.target.value))} />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۲. بیومتریک</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          ضربان استراحت — Resting HR
          <input type="number" min={1} value={form.restingHr} onChange={(e) => updateField("restingHr", e.target.value)} />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          BMI
          <input type="number" min={1} step="0.1" value={form.bmi} onChange={(e) => updateField("bmi", e.target.value)} />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۳. بیماری‌ها</legend>
        {SUPPORTED_DISEASES.map((key) => (
          <label key={key} style={{ display: "block", marginTop: "0.3rem" }}>
            <input type="checkbox" checked={form.diseases[key]} onChange={() => toggleDisease(key)} /> {DISEASE_LABELS[key]}
          </label>
        ))}

        {form.diseases.kidneyDisease && (
          <>
            <label style={{ display: "block", marginTop: "0.3rem", marginRight: "1.25rem" }}>
              <input type="checkbox" checked={form.onDialysis} onChange={(e) => updateField("onDialysis", e.target.checked)} />{" "}
              تحت دیالیز است
            </label>
            <label style={{ display: "block", marginTop: "0.3rem", marginRight: "1.25rem" }}>
              <input type="checkbox" checked={form.hasFistula} onChange={(e) => updateField("hasFistula", e.target.checked)} />{" "}
              فیستول دیالیز دارد
            </label>
          </>
        )}

        {needsDialysisToggle && (
          <label style={{ display: "block", marginTop: "0.3rem", marginRight: "1.25rem", color: "#c0392b" }}>
            <input
              type="checkbox"
              checked={form.isDialysisDayToday}
              onChange={(e) => updateField("isDialysisDayToday", e.target.checked)}
            />{" "}
            امروز روز دیالیز شاگرد است
          </label>
        )}
      </fieldset>

      {isElderly && (
        <fieldset style={{ marginTop: "1rem" }}>
          <legend>۴. سن مرزی — سالمند</legend>
          <label style={{ display: "block", marginTop: "0.5rem" }}>
            سطح تجربه‌ی سالمند
            <select value={form.elderlyExperienceLevel} onChange={(e) => updateField("elderlyExperienceLevel", e.target.value)}>
              {ELDERLY_EXPERIENCE_LEVELS.map((v) => (
                <option key={v} value={v}>
                  {ELDERLY_EXPERIENCE_LABELS[v] || v}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "block", marginTop: "0.5rem" }}>
            هدف تمرینی سالمند
            <select value={form.elderlyTrainingFocus} onChange={(e) => updateField("elderlyTrainingFocus", e.target.value)}>
              {ELDERLY_TRAINING_FOCUSES.map((v) => (
                <option key={v} value={v}>
                  {ELDERLY_FOCUS_LABELS[v] || v}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "block", marginTop: "0.5rem" }}>
            نوع حرکت سالمند
            <select value={form.elderlyMovementType} onChange={(e) => updateField("elderlyMovementType", e.target.value)}>
              {ELDERLY_MOVEMENT_TYPES.map((v) => (
                <option key={v} value={v}>
                  {ELDERLY_MOVEMENT_LABELS[v] || v}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      )}

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۵. ناهنجاری‌ها / آسیب</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          تعداد آسیب فعال
          <input
            type="number"
            min={0}
            value={form.activeInjuriesCount}
            onChange={(e) => updateField("activeInjuriesCount", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          تعداد ناهنجاری وضعیتی
          <input
            type="number"
            min={0}
            value={form.deformitiesCount}
            onChange={(e) => updateField("deformitiesCount", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          اولویت ناهنجاری‌های مربی (آزاد، با کاما جدا کنید)
          <input
            type="text"
            style={{ width: "100%" }}
            value={form.coachPrioritizedDeformitiesText}
            onChange={(e) => updateField("coachPrioritizedDeformitiesText", e.target.value)}
            placeholder="مثلاً: forward_head, kyphosis"
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۶. عدم‌تقارن</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          <input
            type="checkbox"
            checked={form.hasSShapeDeformity}
            onChange={(e) => updateField("hasSShapeDeformity", e.target.checked)}
          />{" "}
          عارضه‌ی S-شکل دارد
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          سمت درگیر (Affected Side)
          <select value={form.affectedSide} onChange={(e) => updateField("affectedSide", e.target.value)}>
            {AFFECTED_SIDES.map((v) => (
              <option key={v} value={v}>
                {AFFECTED_SIDE_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          شناسه‌ی حرکات Bilateral Core Stabilization (اختیاری، آزاد)
          <input
            type="text"
            style={{ width: "100%" }}
            value={form.coreStabilizationExerciseIdsText}
            onChange={(e) => updateField("coreStabilizationExerciseIdsText", e.target.value)}
            placeholder="مثلاً: CORE-1, CORE-2"
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۷. تجهیزات در دسترس شاگرد</legend>
        {EQUIPMENT_OPTIONS.map((key) => (
          <label key={key} style={{ display: "inline-block", marginLeft: "1rem" }}>
            <input type="checkbox" checked={form.availableEquipment[key]} onChange={() => toggleEquipment(key)} />{" "}
            {EQUIPMENT_LABELS[key]}
          </label>
        ))}
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۸. ظرفیت جلسه</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          کل زمان مجاز جلسه (دقیقه)
          <input
            type="number"
            min={1}
            value={form.totalAllowedMinutes}
            onChange={(e) => updateField("totalAllowedMinutes", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          ست به‌ازای هر حرکت
          <input
            type="number"
            min={1}
            value={form.setsPerExercise}
            onChange={(e) => updateField("setsPerExercise", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          زمان اجرای هر ست (ثانیه)
          <input
            type="number"
            min={1}
            value={form.executionSecPerSet}
            onChange={(e) => updateField("executionSecPerSet", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          استراحت هر ست (ثانیه)
          <input
            type="number"
            min={1}
            value={form.restSecPerSet}
            onChange={(e) => updateField("restSecPerSet", Number(e.target.value))}
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۹. «این نوع محدودیت بالینی را دارم» — تگ‌های Contraindication</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          آزاد، با کاما جدا کنید (مثلاً: knee_pain, shoulder_pain)
          <input
            type="text"
            style={{ width: "100%" }}
            value={form.userContraindicationsText}
            onChange={(e) => updateField("userContraindicationsText", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۱۰. «این حرکت مشخص را ممنوع کن» — لیست سیاه دستی حرکات</legend>
        {form.manualBlacklistExercises.map((row, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem" }}>
            <input
              type="text"
              placeholder="شناسه‌ی حرکت"
              value={row.exerciseId}
              onChange={(e) => updateBlacklistRow(index, "exerciseId", e.target.value)}
            />
            <input
              type="text"
              placeholder="دلیل (اختیاری)"
              value={row.reasonNote}
              onChange={(e) => updateBlacklistRow(index, "reasonNote", e.target.value)}
            />
            <button type="button" onClick={() => removeBlacklistRow(index)}>
              حذف
            </button>
          </div>
        ))}
        <button type="button" onClick={addBlacklistRow} style={{ marginTop: "0.5rem" }}>
          + افزودن حرکت ممنوع
        </button>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۱۱. یادداشت آزاد</legend>
        <textarea
          style={{ width: "100%", minHeight: 60 }}
          value={form.generalNotes}
          onChange={(e) => updateField("generalNotes", e.target.value)}
        />
      </fieldset>

      <div style={{ marginTop: "1.25rem" }}>
        <button type="button" onClick={onCancel}>
          انصراف
        </button>{" "}
        <button type="submit">ادامه به تایید معماری کلان →</button>
      </div>
    </form>
  );
}
