import React from "react";

// اجزای کوچک قابل‌استفاده‌ی مجدد بین ۶ Step — بدون کتابخانه‌ی جدید، فقط
// style={{...}} خام هم‌الگوی NutritionAssessmentForm.jsx.

export function FieldLabel({ children }) {
  return <label style={{ display: "block", marginTop: "0.5rem" }}>{children}</label>;
}

export function NumberField({ label, value, onChange, min, max, step, suffix }) {
  return (
    <FieldLabel>
      {label} {suffix ? `(${suffix})` : ""}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? "any"}
        onChange={(e) => onChange(e.target.value === "" ? "" : e.target.value)}
      />
    </FieldLabel>
  );
}

export function TextField({ label, value, onChange, placeholder }) {
  return (
    <FieldLabel>
      {label}
      <input type="text" style={{ width: "100%" }} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </FieldLabel>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <FieldLabel>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldLabel>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  return (
    <FieldLabel>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </FieldLabel>
  );
}

// فیلد سه‌تلاشی (bestOfThree طبق بخش ۲.۳.۲ سند) — سه ورودی عددی هم‌ردیف.
export function TrialsField({ label, values, onChange, suffix }) {
  return (
    <FieldLabel>
      {label} {suffix ? `(${suffix}، ۳ تلاش)` : "(۳ تلاش)"}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            type="number"
            step="any"
            style={{ width: "5rem" }}
            placeholder={`تلاش ${i + 1}`}
            value={values[i]}
            onChange={(e) => {
              const next = [...values];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
        ))}
      </div>
    </FieldLabel>
  );
}

export function StepShell({ title, children, onBack, onNext, nextLabel = "بعدی ←", backLabel = "← قبلی" }) {
  return (
    <div style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <h2>{title}</h2>
      {children}
      <div style={{ marginTop: "1.25rem" }}>
        {onBack && (
          <button type="button" onClick={onBack}>
            {backLabel}
          </button>
        )}{" "}
        {onNext && (
          <button type="button" onClick={onNext}>
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
