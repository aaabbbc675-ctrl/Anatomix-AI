import React from "react";

// طبق شکل خام Commit 13 (top_positive_drivers/top_negative_drivers هر
// MatchReport): {driver_id, category, magnitude, trainability, narrative,
// is_correctable, ...} — نه شکل نگاشته‌شده‌ی سطح‌dashboard (drivers_summary)
// که contribution_magnitude/short_narrative دارد.
export default function DriverList({ drivers, kind }) {
  if (!drivers || drivers.length === 0) {
    return <p style={{ color: "#888" }}>{kind === "positive" ? "نقطه‌قوت برجسته‌ای ثبت نشد." : "نقطه‌ضعف برجسته‌ای ثبت نشد."}</p>;
  }
  const color = kind === "positive" ? "#2e7d32" : "#c0392b";
  return (
    <ul style={{ paddingRight: "1.25rem" }}>
      {drivers.map((d) => (
        <li key={d.driver_id} style={{ marginBottom: "0.25rem" }}>
          <span style={{ color, fontWeight: "bold" }}>
            {typeof d.magnitude === "number" ? `${d.magnitude > 0 ? "+" : ""}${Math.round(d.magnitude)}` : ""}
          </span>{" "}
          {d.narrative}
          {d.is_correctable && <span style={{ color: "#888", fontSize: "0.75rem" }}> (قابل اصلاح)</span>}
        </li>
      ))}
    </ul>
  );
}
