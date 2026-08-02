import React from "react";

export default function TalentTransferSuggestions({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div style={{ marginTop: "1rem" }}>
      <h3>پیشنهادهای انتقال استعداد</h3>
      <ul style={{ paddingRight: "1.25rem" }}>
        {suggestions.map((s) => (
          <li key={`${s.excluded_sport}->${s.transfer_target}`} style={{ marginBottom: "0.35rem" }}>
            {s.narrative}
          </li>
        ))}
      </ul>
    </div>
  );
}
