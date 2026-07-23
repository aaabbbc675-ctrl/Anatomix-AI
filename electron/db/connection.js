const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Pure/reusable: no dependency on the `electron` module, so this same code
// runs both inside the Electron main process and from a standalone Node
// script (scripts/test-db.js) without needing app.getPath().
function openDatabase(dbFilePath) {
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
  const db = new Database(dbFilePath);
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
  return db;
}

module.exports = { openDatabase };
