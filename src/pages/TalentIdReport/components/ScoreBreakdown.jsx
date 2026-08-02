import React from "react";

const COMPONENT_LABELS = { bio_component: "زیستی (Bio)", perf_component: "عملکردی (Perf)", psych_component: "روان‌شناختی (Psych)" };

export default function ScoreBreakdown({ breakdown }) {
  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "right" }}>مؤلفه</th>
            <th style={{ textAlign: "right" }}>مقدار</th>
            <th style={{ textAlign: "right" }}>وزن</th>
            <th style={{ textAlign: "right" }}>سهم در امتیاز نهایی</th>
          </tr>
        </thead>
        <tbody>
          {["bio_component", "perf_component", "psych_component"].map((key) => (
            <tr key={key}>
              <td>{COMPONENT_LABELS[key]}</td>
              <td>{breakdown[key].value.toFixed(1)}</td>
              <td>{Math.round(breakdown[key].weight * 100)}٪</td>
              <td>{breakdown[key].contribution.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.5rem" }}>
        ضریب بیو-بندینگ بلوغ: ×{breakdown.maturity_adjustment_factor} — پنالتی پوسچرال: {breakdown.postural_rom_penalty_applied.postural} — پنالتی ROM:{" "}
        {breakdown.postural_rom_penalty_applied.rom}
      </p>
    </div>
  );
}
