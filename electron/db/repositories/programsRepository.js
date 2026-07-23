const { randomUUID } = require("crypto");

function deserialize(row) {
  return {
    ...row,
    architecture_json: row.architecture_json ? JSON.parse(row.architecture_json) : null,
    final_program_json: row.final_program_json ? JSON.parse(row.final_program_json) : null,
  };
}

function createProgramsRepository(db) {
  const insertStmt = db.prepare(`
    INSERT INTO Programs (id, student_id, program_type, status, architecture_json, final_program_json, total_weeks, created_at, updated_at)
    VALUES (@id, @student_id, @program_type, @status, @architecture_json, @final_program_json, @total_weeks, @created_at, @updated_at)
  `);
  const getByIdStmt = db.prepare(`SELECT * FROM Programs WHERE id = ?`);
  const getByStudentStmt = db.prepare(`SELECT * FROM Programs WHERE student_id = ? ORDER BY updated_at DESC`);
  const updateStmt = db.prepare(`
    UPDATE Programs
    SET program_type = @program_type, status = @status, architecture_json = @architecture_json,
        final_program_json = @final_program_json, total_weeks = @total_weeks, updated_at = @updated_at
    WHERE id = @id
  `);
  const removeStmt = db.prepare(`DELETE FROM Programs WHERE id = ?`);

  const repo = {
    create(input) {
      const now = new Date().toISOString();
      const row = {
        id: randomUUID(),
        student_id: input.student_id,
        program_type: input.program_type,
        status: input.status ?? "draft",
        architecture_json: input.architecture_json ? JSON.stringify(input.architecture_json) : null,
        final_program_json: input.final_program_json ? JSON.stringify(input.final_program_json) : null,
        total_weeks: input.total_weeks ?? null,
        created_at: now,
        updated_at: now,
      };
      insertStmt.run(row);
      return repo.getById(row.id);
    },
    getById(id) {
      const row = getByIdStmt.get(id);
      return row ? deserialize(row) : null;
    },
    getByStudentId(studentId) {
      return getByStudentStmt.all(studentId).map(deserialize);
    },
    update(id, input) {
      const existing = getByIdStmt.get(id);
      if (!existing) throw new Error(`Program ${id} not found`);
      const row = {
        id,
        program_type: input.program_type ?? existing.program_type,
        status: input.status ?? existing.status,
        architecture_json:
          input.architecture_json !== undefined
            ? input.architecture_json
              ? JSON.stringify(input.architecture_json)
              : null
            : existing.architecture_json,
        final_program_json:
          input.final_program_json !== undefined
            ? input.final_program_json
              ? JSON.stringify(input.final_program_json)
              : null
            : existing.final_program_json,
        total_weeks: input.total_weeks ?? existing.total_weeks,
        updated_at: new Date().toISOString(),
      };
      updateStmt.run(row);
      return repo.getById(id);
    },
    remove(id) {
      removeStmt.run(id);
    },
  };

  return repo;
}

module.exports = { createProgramsRepository };
