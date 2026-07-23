const { randomUUID } = require("crypto");

function createWeeklyLogsRepository(db) {
  const insertStmt = db.prepare(`
    INSERT INTO Weekly_Logs (id, program_id, week_number, avg_rpe, volume_completed_percent, fatigue_flag, deload_triggered, logged_at)
    VALUES (@id, @program_id, @week_number, @avg_rpe, @volume_completed_percent, @fatigue_flag, @deload_triggered, @logged_at)
  `);
  const getByProgramStmt = db.prepare(`SELECT * FROM Weekly_Logs WHERE program_id = ? ORDER BY week_number ASC`);
  const removeStmt = db.prepare(`DELETE FROM Weekly_Logs WHERE id = ?`);

  return {
    create(input) {
      const row = {
        id: randomUUID(),
        program_id: input.program_id,
        week_number: input.week_number,
        avg_rpe: input.avg_rpe ?? null,
        volume_completed_percent: input.volume_completed_percent ?? null,
        fatigue_flag: input.fatigue_flag ? 1 : 0,
        deload_triggered: input.deload_triggered ? 1 : 0,
        logged_at: input.logged_at ?? new Date().toISOString(),
      };
      insertStmt.run(row);
      return row;
    },
    getByProgramId(programId) {
      return getByProgramStmt.all(programId);
    },
    remove(id) {
      removeStmt.run(id);
    },
  };
}

module.exports = { createWeeklyLogsRepository };
