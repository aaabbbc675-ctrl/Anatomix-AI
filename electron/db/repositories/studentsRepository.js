const { randomUUID } = require("crypto");

function deserialize(row) {
  return {
    ...row,
    device_json_ref: row.device_json_ref ? JSON.parse(row.device_json_ref) : null,
  };
}

function createStudentsRepository(db) {
  const insertStmt = db.prepare(`
    INSERT INTO Students (id, full_name, national_code, phone, device_json_ref, created_at, updated_at)
    VALUES (@id, @full_name, @national_code, @phone, @device_json_ref, @created_at, @updated_at)
  `);
  const getAllStmt = db.prepare(`SELECT * FROM Students ORDER BY updated_at DESC`);
  const getByIdStmt = db.prepare(`SELECT * FROM Students WHERE id = ?`);
  const searchStmt = db.prepare(`
    SELECT * FROM Students
    WHERE full_name LIKE @query OR national_code LIKE @query
    ORDER BY updated_at DESC
  `);
  const updateStmt = db.prepare(`
    UPDATE Students
    SET full_name = @full_name, national_code = @national_code, phone = @phone,
        device_json_ref = @device_json_ref, updated_at = @updated_at
    WHERE id = @id
  `);
  const removeStmt = db.prepare(`DELETE FROM Students WHERE id = ?`);

  const repo = {
    create(input) {
      const now = new Date().toISOString();
      const row = {
        id: randomUUID(),
        full_name: input.full_name,
        national_code: input.national_code ?? null,
        phone: input.phone ?? null,
        device_json_ref: input.device_json_ref ? JSON.stringify(input.device_json_ref) : null,
        created_at: now,
        updated_at: now,
      };
      insertStmt.run(row);
      return repo.getById(row.id);
    },
    getAll() {
      return getAllStmt.all().map(deserialize);
    },
    getById(id) {
      const row = getByIdStmt.get(id);
      return row ? deserialize(row) : null;
    },
    search(query) {
      return searchStmt.all({ query: `%${query}%` }).map(deserialize);
    },
    update(id, input) {
      const existing = getByIdStmt.get(id);
      if (!existing) throw new Error(`Student ${id} not found`);
      const row = {
        id,
        full_name: input.full_name ?? existing.full_name,
        national_code: input.national_code ?? existing.national_code,
        phone: input.phone ?? existing.phone,
        device_json_ref:
          input.device_json_ref !== undefined
            ? input.device_json_ref
              ? JSON.stringify(input.device_json_ref)
              : null
            : existing.device_json_ref,
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

module.exports = { createStudentsRepository };
