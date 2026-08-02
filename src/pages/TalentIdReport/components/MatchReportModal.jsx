import React from "react";
import "../../../components/Modal.css";
import ScoreBreakdown from "./ScoreBreakdown.jsx";
import DriverList from "./DriverList.jsx";
import WhatIfPanel from "./WhatIfPanel.jsx";
import MedicalHoldPanel from "./MedicalHoldPanel.jsx";

export default function MatchReportModal({ report, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 640, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
        <h2>
          {report.sport_name_fa} — {Math.round(report.final_score)}٪ (کلاس {report.final_tier})
        </h2>

        <MedicalHoldPanel medicalHold={report.medical_hold} />

        {report.primary_exclusion_cause && (
          <p style={{ color: "#c0392b" }}>دلیل اصلی: {report.primary_exclusion_cause.cause_narrative}</p>
        )}

        <h3>ریزامتیاز</h3>
        <ScoreBreakdown breakdown={report.score_breakdown} />

        <h3>نقاط قوت</h3>
        <DriverList drivers={report.top_positive_drivers} kind="positive" />

        <h3>نقاط قابل‌بهبود</h3>
        <DriverList drivers={report.top_negative_drivers} kind="negative" />

        <WhatIfPanel whatIf={report.what_if_analysis} />

        <p style={{ marginTop: "1rem", padding: "0.75rem", background: "#f5f5f5", borderRadius: 8 }}>{report.coach_narrative}</p>

        <div style={{ marginTop: "1rem" }}>
          <button type="button" onClick={onClose}>
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
