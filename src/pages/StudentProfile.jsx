import React, { useEffect, useState } from "react";
import { db } from "../store/db";

const STATUS_LABELS = {
  draft: "پیش‌نویس",
  pending_coach_review: "در انتظار بررسی مربی",
  approved: "تأییدشده",
  active: "فعال",
  archived: "بایگانی‌شده",
};

function formatLastScanDate(student) {
  const attachedAt = student?.device_json_ref?.attachedAt;
  if (!attachedAt) return "بدون اسکن";
  return new Date(attachedAt).toLocaleDateString("fa-IR");
}

export default function StudentProfile({ studentId, onBack, onNewProgram }) {
  const [student, setStudent] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([db.students.getById(studentId), db.programs.getByStudentId(studentId)])
      .then(([studentResult, programsResult]) => {
        if (cancelled) return;
        setStudent(studentResult);
        setPrograms(programsResult);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "خطا در بارگذاری اطلاعات شاگرد.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <button onClick={onBack}>← بازگشت به دایرکتوری</button>

      {loading && <p>در حال بارگذاری...</p>}
      {error && <p style={{ color: "#c0392b" }}>{error}</p>}

      {!loading && !error && student && (
        <>
          <h2 style={{ marginTop: "1rem" }}>{student.full_name}</h2>
          <p>کد ملی: {student.national_code || "ثبت‌نشده"}</p>
          <p>تلفن: {student.phone || "ثبت‌نشده"}</p>
          <p>آخرین اسکن: {formatLastScanDate(student)}</p>

          <div style={{ margin: "1.5rem 0" }}>
            <button onClick={onNewProgram}>+ برنامه جدید</button>
          </div>

          <h3>تاریخچه‌ی برنامه‌ها</h3>
          {programs.length === 0 && <p>هنوز برنامه‌ای برای این شاگرد ثبت نشده است.</p>}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {programs.map((program) => (
              <li
                key={program.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  marginBottom: "0.5rem",
                }}
              >
                <strong>{program.program_type}</strong> — {STATUS_LABELS[program.status] || program.status}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
