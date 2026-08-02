import React from "react";

export default function CorrectionPath({ steps }) {
  if (!steps || steps.length === 0) return null;
  return (
    <ol style={{ paddingRight: "1.25rem" }}>
      {steps.map((step) => (
        <li key={step.step_id} style={{ marginBottom: "0.4rem" }}>
          {step.description}
          {step.duration_weeks != null && <span style={{ color: "#888" }}> — {step.duration_weeks} هفته</span>}
          <span style={{ color: "#2e7d32" }}> (+{step.expected_score_gain.toFixed(1)} امتیاز)</span>
        </li>
      ))}
    </ol>
  );
}
