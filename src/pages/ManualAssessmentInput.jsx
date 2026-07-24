import React, { useMemo, useState } from "react";
import { VALID_GOALS, VALID_EXPERIENCE } from "../../engine/bodybuilding/file1_coachGoal.js";
import { SUPPORTED_DISEASES } from "../../engine/corrective/file4_diseaseManagement.js";
import {
  ELDERLY_MIN_AGE,
  ELDERLY_EXPERIENCE_LEVELS,
  ELDERLY_TRAINING_FOCUSES,
  ELDERLY_MOVEMENT_TYPES,
} from "../../engine/corrective/file5_ageAdjustments.js";
import { AFFECTED_SIDES } from "../../engine/corrective/file7_asymmetry.js";

// ابزار ورودی دستی برای تست هر دو موتور (بدنسازی + اصلاحی) قبل از آماده‌شدن
// دستگاه واقعی. طبق جدول تاییدشده‌ی «هر پارامتر ورودی هر تابع صادرشده»:
// این فرم فقط فیلدهای «ورودی خام» را می‌پرسد، نه فیلدهایی که خروجی محاسبه‌شده‌ی
// یک تابع دیگرند (مثل cascadeOutput یا hardVetoRestriction).
//
// enum ها همه از خودِ فایل‌های موتور import می‌شوند (VALID_GOALS، SUPPORTED_DISEASES
// و...)، نه بازنویسی دستی — تا اگر موتور تغییر کرد، این فرم بی‌صدا از آن جا نماند.

// بدنسازی این ۹ بیماری/شرط را دارد (medicalFlags)؛ اصلاحی فقط ۶ تای مشترک را
// می‌شناسد (SUPPORTED_DISEASES) — آسم و پوکی استخوان فقط در بدنسازی هستند.
const BODYBUILDING_ONLY_CONDITIONS = ["asthma", "osteoporosis"];
const DISEASE_LABELS = {
  heartOrHypertension: "بیماری قلبی / فشارخون",
  diabetes: "دیابت",
  asthma: "آسم (فقط بدنسازی)",
  osteoporosis: "پوکی استخوان (فقط بدنسازی)",
  arthritis: "آرتروز / آرتریت",
  cerebralPalsy: "فلج مغزی (CP)",
  multipleSclerosis: "مولتیپل اسکلروزیس (MS)",
  kidneyDisease: "بیماری کلیوی",
};
const ALL_DISEASE_KEYS = [...SUPPORTED_DISEASES, ...BODYBUILDING_ONLY_CONDITIONS];

// equipment هیچ‌جا به‌عنوان یک ثابت export نشده (فقط مقادیر واقعی داخل
// exercises.seed.js: barbell/dumbbell/machine/cable) — این فهرست از همان
// مقادیر واقعی می‌آید، نه اختراع جدید.
const EQUIPMENT_OPTIONS = ["barbell", "dumbbell", "machine", "cable"];
const EQUIPMENT_LABELS = { barbell: "هالتر", dumbbell: "دمبل", machine: "دستگاه", cable: "کابل" };

const CAUSED_PAIN_OPTIONS = ["none", "muscle_soreness", "joint_nerve_pain"];
const CAUSED_PAIN_LABELS = { none: "بدون درد", muscle_soreness: "کوفتگی عضلانی", joint_nerve_pain: "درد مفصلی/عصبی" };

const GOAL_LABELS = { strength: "قدرت", fat_loss: "کاهش چربی", maintenance: "حفظ وضعیت", hypertrophy: "هایپرتروفی" };
const EXPERIENCE_LABELS = { beginner: "مبتدی", intermediate: "متوسط", advanced: "پیشرفته" };
const AFFECTED_SIDE_LABELS = { Right: "راست", Left: "چپ", Bilateral: "دوطرفه", Unknown: "نامشخص" };
const ELDERLY_EXPERIENCE_LABELS = { beginner: "مبتدی", professional: "حرفه‌ای" };
const ELDERLY_FOCUS_LABELS = { endurance: "استقامتی", massMaintenance: "حفظ توده" };
const ELDERLY_MOVEMENT_LABELS = { isolated: "ایزوله", compound: "مرکب" };

function initialState() {
  return {
    experience: "beginner",
    main_goal: "hypertrophy",
    daysPerWeek: 3,
    bodybuildingRequest: true,
    gender: "male",
    age: 25,

    restFactorOverride: "",
    volumeFactorOverride: "",
    bmi: "",
    restingHr: "",

    diseases: Object.fromEntries(ALL_DISEASE_KEYS.map((k) => [k, false])),
    diabeticNeuropathy: false,
    onDialysis: false,
    hasFistula: false,
    isDialysisDayToday: false,

    coachConfirmedAgeException: false,
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

    monthNumber: 1,
    totalAllowedMinutes: 60,
    setsPerExercise: 3,
    executionSecPerSet: 40,
    restSecPerSet: 90,
    painFreeSoFar: true,
    previousMonthRpeInInjuredArea: "",

    monthlyRpe: "",
    exerciseFeedback: [],

    generalNotes: "",
    manualBlacklistExercises: [],
    userContraindicationsText: "",
  };
}

function parseTagList(text) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function capitalizeFirst(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function buildBodybuildingObject(s) {
  const restingHr = s.restingHr === "" ? null : Number(s.restingHr);
  const bmi = s.bmi === "" ? null : Number(s.bmi);
  // طبق تصمیم صریح: هیچ آستانه‌ی مستندی برای «ضربان بالا» در سند بدنسازی
  // نیست؛ تنها عدد مستند در کل دو سند آستانه‌ی >۸۰ سند اصلاحی (بخش ۳.۴) است،
  // پس همان برای مشتق‌کردن این فلگ بدنسازی هم استفاده می‌شود.
  const elevatedHeartRate = restingHr !== null && restingHr > 80;
  const bmiOver25 = bmi !== null && bmi >= 25;

  const genderOverrides = {};
  if (s.restFactorOverride !== "") genderOverrides.restFactor = Number(s.restFactorOverride);
  if (s.volumeFactorOverride !== "") genderOverrides.volumeFactor = Number(s.volumeFactorOverride);

  return {
    main_goal: s.main_goal,
    experience: s.experience,
    weekly_training_days: s.daysPerWeek,
    gender: s.gender,
    ...(Object.keys(genderOverrides).length > 0 ? { genderOverrides } : {}),
    age: s.age,
    coachConfirmedAgeException: s.coachConfirmedAgeException,
    isDialysisDayToday: s.isDialysisDayToday,
    medicalFlags: {
      heartOrHypertension: s.diseases.heartOrHypertension,
      diabetes: s.diseases.diabetes,
      diabeticNeuropathy: s.diabeticNeuropathy,
      asthma: s.diseases.asthma,
      osteoporosis: s.diseases.osteoporosis,
      arthritis: s.diseases.arthritis,
      cerebralPalsy: s.diseases.cerebralPalsy,
      multipleSclerosis: s.diseases.multipleSclerosis,
      kidneyDisease: s.diseases.kidneyDisease,
      onDialysis: s.onDialysis,
      hasFistula: s.hasFistula,
      bmiOver25,
      elevatedHeartRate,
    },
  };
}

function buildCorrectiveObject(s) {
  const restingHr = s.restingHr === "" ? null : Number(s.restingHr);
  const bmi = s.bmi === "" ? null : Number(s.bmi);
  const diseases = SUPPORTED_DISEASES.filter((key) => s.diseases[key]);

  const availableEquipment = EQUIPMENT_OPTIONS.filter((key) => s.availableEquipment[key]);

  const result = {
    // بدون دستگاه واقعی — عمداً null. کل هدف این ابزار جایگزینی موقت همین فیلد است.
    assessmentData: null,
    userLevel: capitalizeFirst(s.experience),
    bodybuildingRequest: s.bodybuildingRequest,
    workoutDaysPerWeek: s.daysPerWeek,
    coachPrioritizedDeformities: parseTagList(s.coachPrioritizedDeformitiesText),
    manualBlacklistExercises: s.manualBlacklistExercises,
    generalNotes: s.generalNotes,

    diseases,
    onDialysis: s.onDialysis,
    hasFistula: s.hasFistula,
    isDialysisDayToday: s.isDialysisDayToday,
    monthNumber: s.monthNumber,
    // به‌جای تیک جدا، از همان تیک بیماری قلبی/فشارخون مشتق می‌شود — یک منبع حقیقت.
    hasCardiacCondition: s.diseases.heartOrHypertension,

    age: s.age,
    ...(s.age >= ELDERLY_MIN_AGE
      ? {
          elderlyExperienceLevel: s.elderlyExperienceLevel,
          elderlyTrainingFocus: s.elderlyTrainingFocus,
          elderlyMovementType: s.elderlyMovementType,
        }
      : {}),

    restingHr,
    bmi,

    hasSShapeDeformity: s.hasSShapeDeformity,
    affectedSide: s.affectedSide,
    coreStabilizationExerciseIds: parseTagList(s.coreStabilizationExerciseIdsText),

    availableEquipment,
    totalAllowedMinutes: s.totalAllowedMinutes,
    setsPerExercise: s.setsPerExercise,
    executionSecPerSet: s.executionSecPerSet,
    restSecPerSet: s.restSecPerSet,

    userContraindications: parseTagList(s.userContraindicationsText),
    previousMonthRpeInInjuredArea:
      s.previousMonthRpeInInjuredArea === "" ? null : Number(s.previousMonthRpeInInjuredArea),

    painFreeSoFar: s.painFreeSoFar,

    activeInjuriesCount: s.activeInjuriesCount,
    deformitiesCount: s.deformitiesCount,
  };

  if (s.monthlyRpe !== "" || s.exerciseFeedback.length > 0) {
    result.monthlyFeedback = {
      rpe: s.monthlyRpe === "" ? null : Number(s.monthlyRpe),
      exerciseFeedback: s.exerciseFeedback,
    };
  }

  return result;
}

export default function ManualAssessmentInput({ onBack }) {
  const [form, setForm] = useState(initialState);
  const [saveStatus, setSaveStatus] = useState(null); // { kind: 'success'|'error'|'canceled', message }

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

  function addFeedbackRow() {
    setForm((prev) => ({
      ...prev,
      exerciseFeedback: [...prev.exerciseFeedback, { exerciseId: "", causedPain: "none", note: "" }],
    }));
  }
  function updateFeedbackRow(index, key, value) {
    setForm((prev) => ({
      ...prev,
      exerciseFeedback: prev.exerciseFeedback.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  }
  function removeFeedbackRow(index) {
    setForm((prev) => ({ ...prev, exerciseFeedback: prev.exerciseFeedback.filter((_, i) => i !== index) }));
  }

  const bodybuildingPreview = useMemo(() => buildBodybuildingObject(form), [form]);
  const correctivePreview = useMemo(() => buildCorrectiveObject(form), [form]);

  const isElderly = form.age >= ELDERLY_MIN_AGE;
  const needsDialysisToggle = form.diseases.kidneyDisease && form.onDialysis;

  async function handleSaveAsJson() {
    setSaveStatus(null);
    const payload = {
      savedAt: new Date().toISOString(),
      bodybuilding: bodybuildingPreview,
      corrective: correctivePreview,
    };

    if (window.anatomixFile?.saveJsonFile) {
      try {
        const result = await window.anatomixFile.saveJsonFile("manual-assessment.json", payload);
        if (result.canceled) {
          setSaveStatus({ kind: "canceled", message: "ذخیره لغو شد." });
        } else {
          setSaveStatus({ kind: "success", message: `ذخیره شد: ${result.filePath}` });
        }
      } catch (err) {
        setSaveStatus({ kind: "error", message: err.message || "خطا در ذخیره‌سازی." });
      }
      return;
    }

    // بیرون از الکترون (مثلاً npm run dev در مرورگر خام): دانلود مرورگری معمولی.
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manual-assessment.json";
    a.click();
    URL.revokeObjectURL(url);
    setSaveStatus({ kind: "success", message: "دانلود شد (حالت مرورگر، بدون الکترون)." });
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 820, margin: "0 auto" }}>
      <button type="button" onClick={onBack}>
        ← بازگشت به داشبورد
      </button>
      <h2>ابزار ورودی دستی — تست موتورها (بدون دستگاه واقعی)</h2>
      <p style={{ color: "#666" }}>
        این فرم فیلدهای خام هر دو موتور (بدنسازی + اصلاحی) را یک‌جا می‌پرسد و در پایان دو آبجکت جدا (با شکل دقیق ورودی
        توابع واقعی موتورها) در یک فایل JSON ذخیره می‌کند.
      </p>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۱. هویت / سطح</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          سطح تجربه (بدنسازی experience / اصلاحی userLevel از همین مشتق می‌شود)
          <select value={form.experience} onChange={(e) => updateField("experience", e.target.value)}>
            {VALID_EXPERIENCE.map((v) => (
              <option key={v} value={v}>
                {EXPERIENCE_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          هدف اصلی (فقط بدنسازی)
          <select value={form.main_goal} onChange={(e) => updateField("main_goal", e.target.value)}>
            {VALID_GOALS.map((v) => (
              <option key={v} value={v}>
                {GOAL_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          روزهای تمرین در هفته (هر دو موتور)
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
          درخواست بدنسازی دارد (فقط اصلاحی)
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          جنسیت (فقط بدنسازی)
          <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)}>
            <option value="male">مرد</option>
            <option value="female">زن</option>
          </select>
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          سن (هر دو موتور، حداقل ۷)
          <input type="number" min={7} value={form.age} onChange={(e) => updateField("age", Number(e.target.value))} />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۲. بیومتریک</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          ضربان استراحت — Resting HR (هر دو موتور؛ elevatedHeartRate بدنسازی از همین با آستانه‌ی &gt;۸۰ مشتق می‌شود)
          <input type="number" min={1} value={form.restingHr} onChange={(e) => updateField("restingHr", e.target.value)} />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          BMI (هر دو موتور؛ bmiOver25 بدنسازی از همین با آستانه‌ی ≥۲۵ مشتق می‌شود)
          <input type="number" min={1} step="0.1" value={form.bmi} onChange={(e) => updateField("bmi", e.target.value)} />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          override دستی ضریب استراحت زنانه (اختیاری، فقط بدنسازی)
          <input
            type="number"
            step="0.01"
            value={form.restFactorOverride}
            onChange={(e) => updateField("restFactorOverride", e.target.value)}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          override دستی ضریب حجم زنانه (اختیاری، فقط بدنسازی)
          <input
            type="number"
            step="0.01"
            value={form.volumeFactorOverride}
            onChange={(e) => updateField("volumeFactorOverride", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۳. بیماری‌ها (شرط هم‌زمان اعمال‌شده روی هر دو موتور، جز آسم/پوکی استخوان)</legend>
        {ALL_DISEASE_KEYS.map((key) => (
          <label key={key} style={{ display: "block", marginTop: "0.3rem" }}>
            <input type="checkbox" checked={form.diseases[key]} onChange={() => toggleDisease(key)} /> {DISEASE_LABELS[key]}
          </label>
        ))}

        {form.diseases.diabetes && (
          <label style={{ display: "block", marginTop: "0.3rem", marginRight: "1.25rem" }}>
            <input
              type="checkbox"
              checked={form.diabeticNeuropathy}
              onChange={(e) => updateField("diabeticNeuropathy", e.target.checked)}
            />{" "}
            نوروپاتی دیابتی دارد (فقط بدنسازی)
          </label>
        )}

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

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۴. سن مرزی</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          <input
            type="checkbox"
            checked={form.coachConfirmedAgeException}
            onChange={(e) => updateField("coachConfirmedAgeException", e.target.checked)}
          />{" "}
          تایید مسئولیت مربی برای سن مرزی (فقط بدنسازی؛ اگر سن ≤۱۲ یا ≥۶۰ باشد معنا دارد)
        </label>

        {isElderly && (
          <>
            <label style={{ display: "block", marginTop: "0.5rem" }}>
              سطح تجربه‌ی سالمند (فقط اصلاحی)
              <select value={form.elderlyExperienceLevel} onChange={(e) => updateField("elderlyExperienceLevel", e.target.value)}>
                {ELDERLY_EXPERIENCE_LEVELS.map((v) => (
                  <option key={v} value={v}>
                    {ELDERLY_EXPERIENCE_LABELS[v] || v}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", marginTop: "0.5rem" }}>
              هدف تمرینی سالمند (فقط اصلاحی)
              <select value={form.elderlyTrainingFocus} onChange={(e) => updateField("elderlyTrainingFocus", e.target.value)}>
                {ELDERLY_TRAINING_FOCUSES.map((v) => (
                  <option key={v} value={v}>
                    {ELDERLY_FOCUS_LABELS[v] || v}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", marginTop: "0.5rem" }}>
              نوع حرکت سالمند (فقط اصلاحی — برای تست تک‌سناریویی یکی را انتخاب کنید)
              <select value={form.elderlyMovementType} onChange={(e) => updateField("elderlyMovementType", e.target.value)}>
                {ELDERLY_MOVEMENT_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {ELDERLY_MOVEMENT_LABELS[v] || v}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۵. ناهنجاری‌ها / آسیب</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          تعداد آسیب فعال (هر دو موتور، از طریق گیت مشترک)
          <input
            type="number"
            min={0}
            value={form.activeInjuriesCount}
            onChange={(e) => updateField("activeInjuriesCount", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          تعداد ناهنجاری وضعیتی (هر دو موتور، از طریق گیت مشترک)
          <input
            type="number"
            min={0}
            value={form.deformitiesCount}
            onChange={(e) => updateField("deformitiesCount", Number(e.target.value))}
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          اولویت ناهنجاری‌های مربی (فقط اصلاحی — آزاد، با کاما جدا کنید)
          <input
            type="text"
            style={{ width: "100%" }}
            value={form.coachPrioritizedDeformitiesText}
            onChange={(e) => updateField("coachPrioritizedDeformitiesText", e.target.value)}
            placeholder="مثلاً: forward_head, kyphosis"
          />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          RPE ماه قبل در ناحیه‌ی آسیب‌دیده (اختیاری، فقط اصلاحی، ۰ تا ۱۰)
          <input
            type="number"
            min={0}
            max={10}
            value={form.previousMonthRpeInInjuredArea}
            onChange={(e) => updateField("previousMonthRpeInInjuredArea", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۶. عدم‌تقارن (فقط اصلاحی)</legend>
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
          شناسه‌ی حرکات Bilateral Core Stabilization (اختیاری، آزاد — فعلاً بدون منبع واقعی، فقط برای تست)
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
        <legend>۷. تجهیزات در دسترس شاگرد (فقط اصلاحی — سطح شاگرد، نه سطح هر حرکت)</legend>
        {EQUIPMENT_OPTIONS.map((key) => (
          <label key={key} style={{ display: "inline-block", marginLeft: "1rem" }}>
            <input type="checkbox" checked={form.availableEquipment[key]} onChange={() => toggleEquipment(key)} />{" "}
            {EQUIPMENT_LABELS[key]}
          </label>
        ))}
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۸. ظرفیت جلسه و ماه (فقط اصلاحی)</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          شماره‌ی ماه برنامه
          <input type="number" min={1} value={form.monthNumber} onChange={(e) => updateField("monthNumber", Number(e.target.value))} />
        </label>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          <input type="checkbox" checked={form.painFreeSoFar} onChange={(e) => updateField("painFreeSoFar", e.target.checked)} /> تا
          الان بدون درد بوده
        </label>
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
        <legend>۹. بازخورد ماهانه (اختیاری، فقط اصلاحی، ماه ۲+)</legend>
        <label style={{ display: "block", marginTop: "0.5rem" }}>
          RPE کلی ماه (۱ تا ۱۰)
          <input type="number" min={1} max={10} value={form.monthlyRpe} onChange={(e) => updateField("monthlyRpe", e.target.value)} />
        </label>

        <p style={{ marginTop: "0.75rem", marginBottom: "0.25rem" }}>بازخورد درد به‌ازای هر حرکت:</p>
        {form.exerciseFeedback.map((row, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem" }}>
            <input
              type="text"
              placeholder="شناسه‌ی حرکت"
              value={row.exerciseId}
              onChange={(e) => updateFeedbackRow(index, "exerciseId", e.target.value)}
            />
            <select value={row.causedPain} onChange={(e) => updateFeedbackRow(index, "causedPain", e.target.value)}>
              {CAUSED_PAIN_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {CAUSED_PAIN_LABELS[v]}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="یادداشت (اختیاری)"
              value={row.note}
              onChange={(e) => updateFeedbackRow(index, "note", e.target.value)}
            />
            <button type="button" onClick={() => removeFeedbackRow(index)}>
              حذف
            </button>
          </div>
        ))}
        <button type="button" onClick={addFeedbackRow} style={{ marginTop: "0.5rem" }}>
          + افزودن بازخورد حرکت
        </button>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>۱۰. «این حرکت مشخص را ممنوع کن» — لیست سیاه دستی حرکات (فقط اصلاحی)</legend>
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
        <legend>۱۱. «این نوع محدودیت بالینی را دارم» — تگ‌های Contraindication (فقط اصلاحی)</legend>
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
        <legend>۱۲. یادداشت آزاد (فقط اصلاحی)</legend>
        <textarea
          style={{ width: "100%", minHeight: 60 }}
          value={form.generalNotes}
          onChange={(e) => updateField("generalNotes", e.target.value)}
        />
      </fieldset>

      <div style={{ marginTop: "1.5rem" }}>
        <button type="button" onClick={handleSaveAsJson}>
          ذخیره به‌عنوان JSON
        </button>
        {saveStatus && (
          <p style={{ color: saveStatus.kind === "error" ? "#c0392b" : saveStatus.kind === "canceled" ? "#888" : "#2e7d32" }}>
            {saveStatus.message}
          </p>
        )}
      </div>

      <details style={{ marginTop: "1.5rem" }}>
        <summary>پیش‌نمایش JSON بدنسازی</summary>
        <pre style={{ background: "#f5f5f5", padding: "0.75rem", overflowX: "auto" }} dir="ltr">
          {JSON.stringify(bodybuildingPreview, null, 2)}
        </pre>
      </details>

      <details style={{ marginTop: "1rem" }}>
        <summary>پیش‌نمایش JSON اصلاحی</summary>
        <pre style={{ background: "#f5f5f5", padding: "0.75rem", overflowX: "auto" }} dir="ltr">
          {JSON.stringify(correctivePreview, null, 2)}
        </pre>
      </details>
    </div>
  );
}
