import React, { useMemo, useState } from "react";
import { runTalentIdAssessment } from "../../engine/talentIdCascade.js";
import AthleteHeader from "./components/AthleteHeader.jsx";
import TierSection from "./components/TierSection.jsx";
import MatchReportModal from "./components/MatchReportModal.jsx";
import TalentTransferSuggestions from "./components/TalentTransferSuggestions.jsx";

// جریان مستقل از NewProgramWizard/db.programs (تصمیم تاییدشده‌ی Commit 21):
// فقط نمایش زنده‌ی in-session — persistence به یک Commit جدا موکول شد.
export default function TalentIdReport({ rawDevice, rawCoach, rawChatbot, athleteName, onBack }) {
  const [selectedReport, setSelectedReport] = useState(null);

  const outcome = useMemo(() => {
    try {
      return { ok: true, data: runTalentIdAssessment(rawDevice, rawCoach, rawChatbot, athleteName) };
    } catch (err) {
      return { ok: false, error: err };
    }
  }, [rawDevice, rawCoach, rawChatbot, athleteName]);

  if (!outcome.ok) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
        <h2>محاسبه‌ی گزارش ممکن نشد</h2>
        <div style={{ padding: "1rem", background: "#fdecea", border: "1px solid #c0392b", borderRadius: 8 }}>
          <p style={{ margin: 0, color: "#c0392b" }}>
            [{outcome.error.code || "خطا"}] {outcome.error.message}
          </p>
        </div>
        <button style={{ marginTop: "1rem" }} onClick={onBack}>
          ← بازگشت و اصلاح ورودی
        </button>
      </div>
    );
  }

  const { coachDashboard, tierClassification, ltadNotes } = outcome.data;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <button onClick={onBack}>← بازگشت</button>

      <AthleteHeader header={coachDashboard.header} ltadNotes={ltadNotes} />

      <p style={{ color: "#555" }}>{coachDashboard.executive_summary.overall_narrative}</p>

      <TierSection title="کلاس A — انتخاب طلایی" reports={tierClassification.tier_A_golden} onSelectReport={setSelectedReport} />
      <TierSection title="کلاس B — در حال توسعه" reports={tierClassification.tier_B_development} onSelectReport={setSelectedReport} />
      <TierSection
        title="کلاس C — قابل‌اصلاح تا A"
        reports={tierClassification.tier_C_correctable}
        onSelectReport={setSelectedReport}
      />
      <TierSection
        title="کلاس C — پتانسیل پایین‌تر (نمایش پیش‌فرض بسته است)"
        reports={tierClassification.tier_C_low_potential}
        onSelectReport={setSelectedReport}
        collapsedByDefault
      />
      <TierSection title="کلاس M — توقف پزشکی" reports={tierClassification.tier_M_medical_hold} onSelectReport={setSelectedReport} />

      <TalentTransferSuggestions suggestions={coachDashboard.talent_transfer_summary} />

      {selectedReport && <MatchReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />}
    </div>
  );
}
