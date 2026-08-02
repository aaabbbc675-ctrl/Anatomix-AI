import React from "react";
import CorrectionPath from "./CorrectionPath.jsx";

export default function WhatIfPanel({ whatIf }) {
  if (!whatIf) return null;
  return (
    <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#eef7ee", border: "1px solid #2e7d32", borderRadius: 8 }}>
      <strong>{whatIf.highlight_message}</strong>
      <p style={{ margin: "0.35rem 0" }}>
        امتیاز تخمینی پس از اصلاح: {Math.round(whatIf.estimated_score_if_corrected)}٪ (کلاس {whatIf.estimated_tier_if_corrected})
      </p>
      {whatIf.total_estimated_weeks_to_A_tier != null && <p style={{ margin: "0.35rem 0" }}>زمان تخمینی: {whatIf.total_estimated_weeks_to_A_tier} هفته</p>}
      {whatIf.duration_warning && <p style={{ margin: "0.35rem 0", color: "#8a6d00" }}>{whatIf.duration_warning}</p>}
      <CorrectionPath steps={whatIf.correction_path} />
    </div>
  );
}
