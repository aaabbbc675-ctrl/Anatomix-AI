import React, { useState } from "react";
import Dashboard from "./pages/Dashboard";
import StudentProfile from "./pages/StudentProfile";
import NewProgramWizard from "./pages/NewProgramWizard";
import ManualAssessmentInput from "./pages/ManualAssessmentInput";
import TalentIdAssessment from "./pages/TalentIdAssessment";
import TalentIdReport from "./pages/TalentIdReport";

// ناویگیشن ساده با state داخلی، بدون react-router — نماهای سطح‌بالا هنوز با
// یک state machine کوچک قابل مدیریت است؛ وقتی مسیرهای بیشتری فعال شدند،
// react-router-dom را همان‌جا معرفی می‌کنیم.
//
// ⚠️ talentIdAssessment/talentIdReport عمداً از wizard جدا هستند (تصمیم
// تاییدشده‌ی Commit 21): ارزیابی استعداد یک «Program» نیست — نه از
// ProgramTypeSelect عبور می‌کند، نه در db.programs ذخیره می‌شود. فقط نمایش
// زنده‌ی in-session؛ persistence به یک Commit جدا موکول شده.
export default function App() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard | profile | wizard | manualInput | talentIdAssessment | talentIdReport
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [talentIdInputs, setTalentIdInputs] = useState(null);

  function openStudent(id) {
    setSelectedStudentId(id);
    setView("profile");
  }

  return (
    <div style={{ fontFamily: "Tahoma, sans-serif" }}>
      {view === "dashboard" && <Dashboard onOpenStudent={openStudent} onOpenManualInput={() => setView("manualInput")} />}

      {view === "manualInput" && <ManualAssessmentInput onBack={() => setView("dashboard")} />}

      {view === "profile" && (
        <StudentProfile
          key={profileRefreshKey}
          studentId={selectedStudentId}
          onBack={() => setView("dashboard")}
          onNewProgram={() => setView("wizard")}
          onNewTalentAssessment={(fullName) => {
            setTalentIdInputs({ athleteName: fullName });
            setView("talentIdAssessment");
          }}
        />
      )}

      {view === "wizard" && (
        <NewProgramWizard
          studentId={selectedStudentId}
          onCancel={() => setView("profile")}
          onDone={() => {
            setProfileRefreshKey((k) => k + 1);
            setView("profile");
          }}
        />
      )}

      {view === "talentIdAssessment" && (
        <TalentIdAssessment
          studentId={selectedStudentId}
          initialFullName={talentIdInputs?.athleteName}
          onCancel={() => setView("profile")}
          onComplete={(inputs) => {
            setTalentIdInputs(inputs);
            setView("talentIdReport");
          }}
        />
      )}

      {view === "talentIdReport" && (
        <TalentIdReport
          rawDevice={talentIdInputs.rawDevice}
          rawCoach={talentIdInputs.rawCoach}
          rawChatbot={talentIdInputs.rawChatbot}
          athleteName={talentIdInputs.athleteName}
          onBack={() => setView("talentIdAssessment")}
        />
      )}
    </div>
  );
}
