import React, { useState } from "react";
import Dashboard from "./pages/Dashboard";
import StudentProfile from "./pages/StudentProfile";

// ناویگیشن ساده با state داخلی، بدون react-router — چون فعلاً فقط دو صفحه
// داریم. وقتی مرحله‌ی بعد (ویزارد «+ برنامه جدید» با چند مسیر) اضافه شد،
// react-router-dom را همان‌جا معرفی می‌کنیم.
export default function App() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  return (
    <div style={{ fontFamily: "Tahoma, sans-serif" }}>
      {selectedStudentId ? (
        <StudentProfile studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />
      ) : (
        <Dashboard onOpenStudent={setSelectedStudentId} />
      )}
    </div>
  );
}
