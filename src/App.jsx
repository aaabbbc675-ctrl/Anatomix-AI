import React, { useState } from "react";
import Dashboard from "./pages/Dashboard";
import StudentProfile from "./pages/StudentProfile";
import NewProgramWizard from "./pages/NewProgramWizard";

// ناویگیشن ساده با state داخلی، بدون react-router — سه نمای سطح‌بالا هنوز با
// یک state machine کوچک قابل مدیریت است؛ وقتی مسیرهای بیشتری (اصلاحی/تغذیه/...)
// فعال شدند، react-router-dom را همان‌جا معرفی می‌کنیم.
export default function App() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard | profile | wizard
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  function openStudent(id) {
    setSelectedStudentId(id);
    setView("profile");
  }

  return (
    <div style={{ fontFamily: "Tahoma, sans-serif" }}>
      {view === "dashboard" && <Dashboard onOpenStudent={openStudent} />}

      {view === "profile" && (
        <StudentProfile
          key={profileRefreshKey}
          studentId={selectedStudentId}
          onBack={() => setView("dashboard")}
          onNewProgram={() => setView("wizard")}
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
    </div>
  );
}
