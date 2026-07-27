const { ipcMain } = require("electron");
const { createStudentsRepository } = require("./repositories/studentsRepository");
const { createProgramsRepository } = require("./repositories/programsRepository");
const { createWeeklyLogsRepository } = require("./repositories/weeklyLogsRepository");
const { createInjuryBlacklistRepository } = require("./repositories/injuryBlacklistRepository");
const { createFoodsRepository } = require("./repositories/foodsRepository");

// Explicit, one-line-per-channel registration on purpose: greppable, no
// reflection over method names, easy to audit against preload.js's exposed
// surface. The native `db` handle stays a closure here — only plain data
// returned by the repositories ever crosses ipcMain.handle's boundary.
function registerIpcHandlers(db) {
  const students = createStudentsRepository(db);
  ipcMain.handle("db:students:create", (event, input) => students.create(input));
  ipcMain.handle("db:students:getAll", () => students.getAll());
  ipcMain.handle("db:students:getById", (event, id) => students.getById(id));
  ipcMain.handle("db:students:search", (event, query) => students.search(query));
  ipcMain.handle("db:students:update", (event, id, input) => students.update(id, input));
  ipcMain.handle("db:students:remove", (event, id) => students.remove(id));

  const programs = createProgramsRepository(db);
  ipcMain.handle("db:programs:create", (event, input) => programs.create(input));
  ipcMain.handle("db:programs:getById", (event, id) => programs.getById(id));
  ipcMain.handle("db:programs:getByStudentId", (event, studentId) => programs.getByStudentId(studentId));
  ipcMain.handle("db:programs:update", (event, id, input) => programs.update(id, input));
  ipcMain.handle("db:programs:remove", (event, id) => programs.remove(id));

  const weeklyLogs = createWeeklyLogsRepository(db);
  ipcMain.handle("db:weeklyLogs:create", (event, input) => weeklyLogs.create(input));
  ipcMain.handle("db:weeklyLogs:getByProgramId", (event, programId) => weeklyLogs.getByProgramId(programId));
  ipcMain.handle("db:weeklyLogs:remove", (event, id) => weeklyLogs.remove(id));

  const injuryBlacklist = createInjuryBlacklistRepository(db);
  ipcMain.handle("db:injuryBlacklist:create", (event, input) => injuryBlacklist.create(input));
  ipcMain.handle("db:injuryBlacklist:getByStudentId", (event, studentId) => injuryBlacklist.getByStudentId(studentId));
  ipcMain.handle("db:injuryBlacklist:remove", (event, id) => injuryBlacklist.remove(id));

  // فقط getAll — تیکه‌ی ب (۶-د-۳) فقط همین را لازم دارد (فیلتر سمت
  // renderer روی بانک کامل)؛ getByExchangeGroup/search وقتی تیکه‌ی Smart Swap
  // واقعاً به آن‌ها نیاز داشت اضافه می‌شوند، نه از پیش.
  const foods = createFoodsRepository(db);
  ipcMain.handle("db:foods:getAll", () => foods.getAll());
}

module.exports = { registerIpcHandlers };
