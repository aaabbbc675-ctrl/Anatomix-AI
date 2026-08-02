import React from "react";
import SportCard from "./SportCard.jsx";

export default function TierSection({ title, reports, onSelectReport, collapsedByDefault }) {
  const [expanded, setExpanded] = React.useState(!collapsedByDefault);
  if (!reports || reports.length === 0) return null;

  return (
    <div style={{ marginTop: "1rem" }}>
      <h3 style={{ cursor: collapsedByDefault ? "pointer" : "default" }} onClick={() => collapsedByDefault && setExpanded((e) => !e)}>
        {title} ({reports.length}) {collapsedByDefault && (expanded ? "▲" : "▼")}
      </h3>
      {expanded && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.5rem" }}>
          {reports.map((r) => (
            <SportCard key={r.sport_id} report={r} onClick={() => onSelectReport(r)} />
          ))}
        </div>
      )}
    </div>
  );
}
