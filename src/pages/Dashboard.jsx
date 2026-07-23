import React, { useCallback, useEffect, useState } from "react";
import { db } from "../store/db";
import StudentSearchBar from "../components/StudentSearchBar";
import StudentCard from "../components/StudentCard";
import NewStudentModal from "../components/NewStudentModal";

export default function Dashboard({ onOpenStudent }) {
  const [students, setStudents] = useState([]);
  const [programCounts, setProgramCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);

  const loadProgramCounts = useCallback(async (studentList) => {
    const entries = await Promise.all(
      studentList.map(async (student) => {
        const programs = await db.programs.getByStudentId(student.id);
        const activeCount = programs.filter((p) => p.status === "active" || p.status === "approved").length;
        return [student.id, activeCount];
      })
    );
    setProgramCounts(Object.fromEntries(entries));
  }, []);

  const loadStudents = useCallback(
    async (query) => {
      setLoading(true);
      setError(null);
      try {
        const list = query ? await db.students.search(query) : await db.students.getAll();
        setStudents(list);
        await loadProgramCounts(list);
      } catch (err) {
        setError(err.message || "خطا در بارگذاری شاگردها.");
      } finally {
        setLoading(false);
      }
    },
    [loadProgramCounts]
  );

  useEffect(() => {
    loadStudents("");
  }, [loadStudents]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <StudentSearchBar onSearch={loadStudents} />
        <button onClick={() => setShowNewStudentModal(true)}>+ افزودن شاگرد جدید</button>
      </div>

      {loading && <p>در حال بارگذاری...</p>}
      {error && <p style={{ color: "#c0392b" }}>{error}</p>}
      {!loading && !error && students.length === 0 && <p>هنوز شاگردی اضافه نشده است.</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {students.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            activeProgramsCount={programCounts[student.id] ?? 0}
            onClick={() => onOpenStudent(student.id)}
          />
        ))}
      </div>

      {showNewStudentModal && (
        <NewStudentModal
          onClose={() => setShowNewStudentModal(false)}
          onCreated={() => {
            setShowNewStudentModal(false);
            loadStudents("");
          }}
        />
      )}
    </div>
  );
}
