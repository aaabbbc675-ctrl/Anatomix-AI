// فقط داخل main process الکترون import شود؛ عمداً از connection.js جدا نگه
// داشته شده تا connection.js بدون وابستگی به `electron` در اسکریپت‌های
// مستقل (scripts/test-db.js) هم قابل استفاده بماند.
const { app } = require("electron");
const path = require("path");

function getUserDataDbPath() {
  return path.join(app.getPath("userData"), "anatomix.db");
}

module.exports = { getUserDataDbPath };
