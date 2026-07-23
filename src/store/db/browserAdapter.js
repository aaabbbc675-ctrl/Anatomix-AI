// Dev-only fallback for `npm run dev` without Electron (see معماری سند
// بخش ۲.۱). Real localStorage-backed implementation, not a stub — the shape
// must mirror electronAdapter.js exactly. Never used in the shipped app;
// data here does not persist across the real SQLite database.
const KEYS = {
  students: "anatomix:students",
  programs: "anatomix:programs",
  weeklyLogs: "anatomix:weeklyLogs",
  injuryBlacklist: "anatomix:injuryBlacklist",
};

function readAll(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function writeAll(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function nowIso() {
  return new Date().toISOString();
}

export const browserAdapter = {
  students: {
    async create(input) {
      const rows = readAll(KEYS.students);
      if (input.national_code && rows.some((r) => r.national_code === input.national_code)) {
        throw new Error(`Student with national_code ${input.national_code} already exists`);
      }
      const now = nowIso();
      const row = {
        id: crypto.randomUUID(),
        full_name: input.full_name,
        national_code: input.national_code ?? null,
        phone: input.phone ?? null,
        device_json_ref: input.device_json_ref ?? null,
        created_at: now,
        updated_at: now,
      };
      rows.push(row);
      writeAll(KEYS.students, rows);
      return row;
    },
    async getAll() {
      return readAll(KEYS.students).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    },
    async getById(id) {
      return readAll(KEYS.students).find((r) => r.id === id) ?? null;
    },
    async search(query) {
      const q = query.toLowerCase();
      return readAll(KEYS.students).filter(
        (r) => r.full_name?.toLowerCase().includes(q) || r.national_code?.toLowerCase().includes(q)
      );
    },
    async update(id, input) {
      const rows = readAll(KEYS.students);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`Student ${id} not found`);
      rows[idx] = { ...rows[idx], ...input, id, updated_at: nowIso() };
      writeAll(KEYS.students, rows);
      return rows[idx];
    },
    async remove(id) {
      writeAll(KEYS.students, readAll(KEYS.students).filter((r) => r.id !== id));
      // Simulate ON DELETE CASCADE onto Programs (and transitively Weekly_Logs)
      // and Injury_Blacklist, matching the real schema's FK behavior.
      const remainingPrograms = readAll(KEYS.programs).filter((p) => p.student_id !== id);
      const removedProgramIds = new Set(
        readAll(KEYS.programs).filter((p) => p.student_id === id).map((p) => p.id)
      );
      writeAll(KEYS.programs, remainingPrograms);
      if (removedProgramIds.size > 0) {
        writeAll(
          KEYS.weeklyLogs,
          readAll(KEYS.weeklyLogs).filter((w) => !removedProgramIds.has(w.program_id))
        );
      }
      writeAll(KEYS.injuryBlacklist, readAll(KEYS.injuryBlacklist).filter((b) => b.student_id !== id));
    },
  },
  programs: {
    async create(input) {
      const now = nowIso();
      const row = {
        id: crypto.randomUUID(),
        student_id: input.student_id,
        program_type: input.program_type,
        status: input.status ?? "draft",
        architecture_json: input.architecture_json ?? null,
        final_program_json: input.final_program_json ?? null,
        total_weeks: input.total_weeks ?? null,
        created_at: now,
        updated_at: now,
      };
      const rows = readAll(KEYS.programs);
      rows.push(row);
      writeAll(KEYS.programs, rows);
      return row;
    },
    async getById(id) {
      return readAll(KEYS.programs).find((r) => r.id === id) ?? null;
    },
    async getByStudentId(studentId) {
      return readAll(KEYS.programs)
        .filter((r) => r.student_id === studentId)
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    },
    async update(id, input) {
      const rows = readAll(KEYS.programs);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`Program ${id} not found`);
      rows[idx] = { ...rows[idx], ...input, id, updated_at: nowIso() };
      writeAll(KEYS.programs, rows);
      return rows[idx];
    },
    async remove(id) {
      writeAll(KEYS.programs, readAll(KEYS.programs).filter((r) => r.id !== id));
      writeAll(KEYS.weeklyLogs, readAll(KEYS.weeklyLogs).filter((w) => w.program_id !== id));
    },
  },
  weeklyLogs: {
    async create(input) {
      const row = {
        id: crypto.randomUUID(),
        program_id: input.program_id,
        week_number: input.week_number,
        avg_rpe: input.avg_rpe ?? null,
        volume_completed_percent: input.volume_completed_percent ?? null,
        fatigue_flag: input.fatigue_flag ? 1 : 0,
        deload_triggered: input.deload_triggered ? 1 : 0,
        logged_at: input.logged_at ?? nowIso(),
      };
      const rows = readAll(KEYS.weeklyLogs);
      rows.push(row);
      writeAll(KEYS.weeklyLogs, rows);
      return row;
    },
    async getByProgramId(programId) {
      return readAll(KEYS.weeklyLogs)
        .filter((r) => r.program_id === programId)
        .sort((a, b) => a.week_number - b.week_number);
    },
    async remove(id) {
      writeAll(KEYS.weeklyLogs, readAll(KEYS.weeklyLogs).filter((r) => r.id !== id));
    },
  },
  injuryBlacklist: {
    async create(input) {
      const row = {
        id: crypto.randomUUID(),
        student_id: input.student_id,
        exercise_id: input.exercise_id,
        source_module: input.source_module,
        reason_note: input.reason_note ?? null,
        created_at: nowIso(),
      };
      const rows = readAll(KEYS.injuryBlacklist);
      rows.push(row);
      writeAll(KEYS.injuryBlacklist, rows);
      return row;
    },
    async getByStudentId(studentId) {
      return readAll(KEYS.injuryBlacklist)
        .filter((r) => r.student_id === studentId)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
    async remove(id) {
      writeAll(KEYS.injuryBlacklist, readAll(KEYS.injuryBlacklist).filter((r) => r.id !== id));
    },
  },
};
