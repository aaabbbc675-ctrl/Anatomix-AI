import React from "react";

const RISK_COLORS = { critical_risk: "#c0392b", high_risk: "#e0a800", moderate_risk: "#e0a800", safe: "#2e7d32", therapeutic: "#2e7d32" };

export default function MedicalHoldPanel({ medicalHold }) {
  if (!medicalHold) return null;
  const color = RISK_COLORS[medicalHold.risk_level] || "#888";
  return (
    <div style={{ marginTop: "1rem", padding: "0.75rem", border: `1px solid ${color}`, borderRadius: 8 }}>
      <strong style={{ color }}>توقف مشروط پزشکی — {medicalHold.status === "clearance_obtained" ? "با تأییدیه‌ی پزشک" : "نیازمند بررسی"}</strong>
      <p style={{ margin: "0.35rem 0" }}>{medicalHold.reason_narrative}</p>
      <p style={{ margin: "0.35rem 0", fontSize: "0.85rem", color: "#555" }}>
        متخصص لازم: {medicalHold.required_specialist}
        {medicalHold.is_temporary && medicalHold.estimated_recovery_weeks != null && ` — بازگشت تخمینی: ${medicalHold.estimated_recovery_weeks} هفته`}
      </p>
      {!medicalHold.coach_can_override && <p style={{ margin: "0.35rem 0", color: "#c0392b" }}>⚠️ این مورد قابل override توسط مربی نیست.</p>}
    </div>
  );
}
