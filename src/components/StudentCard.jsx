import React from "react";
import "./StudentCard.css";

function getInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function formatLastScanDate(student) {
  const attachedAt = student.device_json_ref?.attachedAt;
  if (!attachedAt) return "بدون اسکن";
  return new Date(attachedAt).toLocaleDateString("fa-IR");
}

export default function StudentCard({ student, activeProgramsCount, onClick }) {
  return (
    <button className="student-card" onClick={onClick}>
      <div className="student-card__avatar">{getInitials(student.full_name)}</div>
      <div className="student-card__info">
        <div className="student-card__name">{student.full_name}</div>
        <div className="student-card__meta">آخرین اسکن: {formatLastScanDate(student)}</div>
        <div className="student-card__meta">
          {activeProgramsCount > 0 ? `${activeProgramsCount} برنامه فعال` : "بدون برنامه فعال"}
        </div>
      </div>
    </button>
  );
}
