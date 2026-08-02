import React from "react";

const TIER_COLORS = { A: "#2e7d32", B: "#4a90d9", C: "#e0a800", M: "#c0392b" };

export default function SportCard({ report, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "right",
        padding: "0.75rem 1rem",
        borderRadius: 8,
        border: `1px solid ${TIER_COLORS[report.final_tier] || "#ddd"}`,
        cursor: "pointer",
        marginBottom: "0.5rem",
      }}
    >
      <strong>{report.sport_name_fa}</strong>
      <span style={{ float: "left", color: TIER_COLORS[report.final_tier] }}>{Math.round(report.final_score)}٪</span>
      {report.medical_hold && <div style={{ fontSize: "0.75rem", color: "#c0392b" }}>توقف پزشکی</div>}
    </button>
  );
}
