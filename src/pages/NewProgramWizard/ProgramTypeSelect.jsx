import React from "react";

const PROGRAM_TYPES = [
  { id: "bodybuilding", label: "بدنسازی", enabled: true },
  { id: "corrective", label: "حرکات اصلاحی", enabled: false },
  { id: "hybrid_sc", label: "هیبرید آمادگی جسمانی", enabled: false },
  { id: "diet", label: "برنامه غذایی", enabled: false },
  { id: "home_workout", label: "تمرین در منزل", enabled: false },
];

export default function ProgramTypeSelect({ onSelect }) {
  return (
    <div style={{ padding: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <h2>نوع برنامه را انتخاب کنید</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
        {PROGRAM_TYPES.map((type) => (
          <button
            key={type.id}
            disabled={!type.enabled}
            onClick={() => type.enabled && onSelect(type.id)}
            title={type.enabled ? undefined : "این بخش هنوز ساخته نشده — به‌زودی"}
            style={{
              padding: "1.5rem 1rem",
              borderRadius: 10,
              border: "1px solid #ddd",
              cursor: type.enabled ? "pointer" : "not-allowed",
              opacity: type.enabled ? 1 : 0.45,
              fontSize: "1rem",
            }}
          >
            {type.label}
            {!type.enabled && <div style={{ fontSize: "0.75rem", marginTop: "0.4rem", color: "#888" }}>به‌زودی</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
