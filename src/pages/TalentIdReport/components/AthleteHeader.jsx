import React from "react";

const MATURITY_LABELS = { early_maturer: "زودبلوغ", late_maturer: "دیربلوغ", on_time_maturer: "بلوغ به‌موقع", unknown: "نامشخص" };
const CONFIDENCE_LABELS = { level_ii_consensus: "اجماع سطح ۲ (Balyi LTAD)" };

// طبق کامنت talentIdCascade.js: ltadNotes آثر-سطح-ورزشکار است (نه sport-محور)
// و در header (خروجی خام file16) نیست — اینجا به‌عنوان prop جدا گرفته می‌شود.
export default function AthleteHeader({ header, ltadNotes }) {
  return (
    <div style={{ padding: "1rem", border: "1px solid #ddd", borderRadius: 8, marginBottom: "1rem" }}>
      <h2 style={{ margin: 0 }}>{header.athlete_name || "بدون نام ثبت‌شده"}</h2>
      <p style={{ margin: "0.25rem 0", color: "#555" }}>
        سن تقویمی: {header.chronological_age?.toFixed?.(1) ?? header.chronological_age} — سن بیولوژیک:{" "}
        {header.biological_age?.toFixed?.(1) ?? header.biological_age} ({MATURITY_LABELS[header.maturity_type] || header.maturity_type})
      </p>
      <p style={{ margin: "0.25rem 0", color: "#555" }}>کیفیت داده: {header.data_quality_score}٪ — تاریخ ارزیابی: {header.assessment_date}</p>

      {header.rae_alert && (
        <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6 }}>
          ⚠️ هشدار اثر سن نسبی (RAE): {header.rae_alert.narrative}
        </div>
      )}

      {ltadNotes?.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          <strong>پنجره‌های حساس آموزش‌پذیری فعلی (LTAD):</strong>
          <ul style={{ margin: "0.35rem 0 0" }}>
            {ltadNotes.map((note) => (
              <li key={note.ability}>
                {note.ability_label_fa} — {note.description_fa}
                <span style={{ color: "#888", fontSize: "0.75rem" }}> ({CONFIDENCE_LABELS[note.confidence] || note.confidence})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
