import React, { useState } from "react";

const CHILD_MAX_AGE = 12;
const ELDERLY_MIN_AGE = 60;

const MEDICAL_CONDITIONS = [
  { key: "heartOrHypertension", label: "بیماری قلبی / فشارخون" },
  { key: "diabetes", label: "دیابت" },
  { key: "asthma", label: "آسم" },
  { key: "osteoporosis", label: "پوکی استخوان" },
  { key: "arthritis", label: "آرتروز / آرتریت" },
  { key: "cerebralPalsy", label: "فلج مغزی (CP)" },
  { key: "multipleSclerosis", label: "مولتیپل اسکلروزیس (MS)" },
  { key: "kidneyDisease", label: "بیماری کلیوی" },
];

function defaultAssessment() {
  return {
    main_goal: "hypertrophy",
    experience: "beginner",
    weekly_training_days: 3,
    gender: "male",
    age: 25,
    coachConfirmedAgeException: false,
    medicalFlags: {},
    isDialysisDayToday: false,
  };
}

// طبق بخش ۲.۳ سند: مقداردهی اولیه از آخرین برنامه‌ی شاگرد (اگر بود) — ولی
// موتور همیشه از نو روی همین مقادیر (که مربی می‌تواند تغییر بدهد) اجرا می‌شود.
export default function BodybuildingAssessmentForm({ initialValues, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...defaultAssessment(), ...(initialValues || {}) }));

  const isChild = form.age <= CHILD_MAX_AGE;
  const isElderly = form.age >= ELDERLY_MIN_AGE;
  const needsAgeDisclaimer = isChild || isElderly;
  const needsDialysisToggle = form.medicalFlags.kidneyDisease && form.medicalFlags.onDialysis;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMedicalFlag(key) {
    setForm((prev) => ({ ...prev, medicalFlags: { ...prev.medicalFlags, [key]: !prev.medicalFlags[key] } }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <h2>سوالات کوتاه — بدنسازی</h2>

      <label style={{ display: "block", marginTop: "1rem" }}>
        هدف اصلی
        <select value={form.main_goal} onChange={(e) => updateField("main_goal", e.target.value)}>
          <option value="hypertrophy">هایپرتروفی (عضله‌سازی)</option>
          <option value="strength">قدرت</option>
          <option value="fat_loss">کاهش چربی</option>
          <option value="maintenance">حفظ وضعیت</option>
        </select>
      </label>

      <label style={{ display: "block", marginTop: "0.75rem" }}>
        سطح تجربه
        <select value={form.experience} onChange={(e) => updateField("experience", e.target.value)}>
          <option value="beginner">مبتدی</option>
          <option value="intermediate">متوسط</option>
          <option value="advanced">پیشرفته</option>
        </select>
      </label>

      <label style={{ display: "block", marginTop: "0.75rem" }}>
        روزهای تمرین در هفته
        <input
          type="number"
          min={1}
          max={7}
          value={form.weekly_training_days}
          onChange={(e) => updateField("weekly_training_days", Number(e.target.value))}
        />
      </label>

      <label style={{ display: "block", marginTop: "0.75rem" }}>
        جنسیت
        <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)}>
          <option value="male">مرد</option>
          <option value="female">زن</option>
        </select>
      </label>

      <label style={{ display: "block", marginTop: "0.75rem" }}>
        سن
        <input type="number" min={1} max={110} value={form.age} onChange={(e) => updateField("age", Number(e.target.value))} />
      </label>

      {needsAgeDisclaimer && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.85rem",
            border: "1px solid #e0a800",
            background: "#fff8e1",
            borderRadius: 8,
          }}
        >
          <strong>تایید مسئولیت مربی لازم است.</strong>
          <p style={{ margin: "0.4rem 0" }}>
            {isChild
              ? `سن واردشده (${form.age}) در بازه‌ی کودکان (۱۲ سال یا کمتر) است — پروتکل ایمنی سخت‌گیرانه‌ی کودکان اعمال می‌شود.`
              : `سن واردشده (${form.age}) در بازه‌ی سالمندان (۶۰ سال یا بیشتر) است — پروتکل ایمنی مخصوص سالمندان اعمال می‌شود.`}
            {" "}اگر تایید نکنید، سیستم روال استاندارد بزرگسالان را با مسئولیت شما ادامه می‌دهد.
          </p>
          <label>
            <input
              type="checkbox"
              checked={form.coachConfirmedAgeException}
              onChange={(e) => updateField("coachConfirmedAgeException", e.target.checked)}
            />{" "}
            تایید می‌کنم و مسئولیت را می‌پذیرم
          </label>
        </div>
      )}

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>شرایط پزشکی (در صورت وجود تیک بزنید)</legend>
        {MEDICAL_CONDITIONS.map((c) => (
          <label key={c.key} style={{ display: "block", marginTop: "0.3rem" }}>
            <input type="checkbox" checked={!!form.medicalFlags[c.key]} onChange={() => toggleMedicalFlag(c.key)} /> {c.label}
          </label>
        ))}

        {form.medicalFlags.diabetes && (
          <label style={{ display: "block", marginTop: "0.3rem", marginRight: "1.25rem" }}>
            <input type="checkbox" checked={!!form.medicalFlags.diabeticNeuropathy} onChange={() => toggleMedicalFlag("diabeticNeuropathy")} />{" "}
            نوروپاتی دیابتی دارد
          </label>
        )}

        {form.medicalFlags.kidneyDisease && (
          <>
            <label style={{ display: "block", marginTop: "0.3rem", marginRight: "1.25rem" }}>
              <input type="checkbox" checked={!!form.medicalFlags.onDialysis} onChange={() => toggleMedicalFlag("onDialysis")} /> تحت دیالیز است
            </label>
            <label style={{ display: "block", marginTop: "0.3rem", marginRight: "1.25rem" }}>
              <input type="checkbox" checked={!!form.medicalFlags.hasFistula} onChange={() => toggleMedicalFlag("hasFistula")} /> فیستول دیالیز دارد
            </label>
          </>
        )}

        {needsDialysisToggle && (
          <label style={{ display: "block", marginTop: "0.3rem", marginRight: "1.25rem", color: "#c0392b" }}>
            <input type="checkbox" checked={form.isDialysisDayToday} onChange={(e) => updateField("isDialysisDayToday", e.target.checked)} />{" "}
            امروز روز دیالیز شاگرد است
          </label>
        )}

        <label style={{ display: "block", marginTop: "0.5rem" }}>
          <input type="checkbox" checked={!!form.medicalFlags.bmiOver25} onChange={() => toggleMedicalFlag("bmiOver25")} /> BMI بالای ۲۵
        </label>
        <label style={{ display: "block", marginTop: "0.3rem" }}>
          <input type="checkbox" checked={!!form.medicalFlags.elevatedHeartRate} onChange={() => toggleMedicalFlag("elevatedHeartRate")} /> ضربان قلب بالا
        </label>
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
