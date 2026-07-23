const { randomUUID } = require("crypto");

function createInjuryBlacklistRepository(db) {
  const insertStmt = db.prepare(`
    INSERT INTO Injury_Blacklist (id, student_id, exercise_id, source_module, reason_note, created_at)
    VALUES (@id, @student_id, @exercise_id, @source_module, @reason_note, @created_at)
  `);
  const getByStudentStmt = db.prepare(`SELECT * FROM Injury_Blacklist WHERE student_id = ? ORDER BY created_at DESC`);
  const removeStmt = db.prepare(`DELETE FROM Injury_Blacklist WHERE id = ?`);

  return {
    create(input) {
      const row = {
        id: randomUUID(),
        student_id: input.student_id,
        exercise_id: input.exercise_id,
        source_module: input.source_module,
        reason_note: input.reason_note ?? null,
        created_at: new Date().toISOString(),
      };
      insertStmt.run(row);
      return row;
    },
    getByStudentId(studentId) {
      return getByStudentStmt.all(studentId);
    },
    remove(id) {
      removeStmt.run(id);
    },
  };
}

module.exports = { createInjuryBlacklistRepository };
