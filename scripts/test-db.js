// اسکریپت تست مستقل (بدون Electron) — مستقیم روی better-sqlite3 اجرا می‌شود
// تا منطق schema/repository ها را با یک سناریوی واقعی (نه فرضی) تأیید کند.
// اجرا: npm run test:db

const fs = require("fs");
const os = require("os");
const path = require("path");

const { openDatabase } = require("../electron/db/connection");
const { createStudentsRepository } = require("../electron/db/repositories/studentsRepository");
const { createProgramsRepository } = require("../electron/db/repositories/programsRepository");
const { createWeeklyLogsRepository } = require("../electron/db/repositories/weeklyLogsRepository");
const { createInjuryBlacklistRepository } = require("../electron/db/repositories/injuryBlacklistRepository");

let passCount = 0;
let failCount = 0;

function check(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${description}`);
    console.log(`     ${err.message}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

function expectThrow(fn, message) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(message || "expected function to throw, but it did not");
}

const dbPath = path.join(os.tmpdir(), `anatomix-test-${Date.now()}.db`);
console.log(`[test-db] using temp database: ${dbPath}`);

const db = openDatabase(dbPath);
const students = createStudentsRepository(db);
const programs = createProgramsRepository(db);
const weeklyLogs = createWeeklyLogsRepository(db);
const injuryBlacklist = createInjuryBlacklistRepository(db);

console.log("\n[Students]");

let studentA;
check("insert a student succeeds and fields round-trip", () => {
  studentA = students.create({
    full_name: "علی رضایی",
    national_code: "0012345678",
    phone: "09120000000",
    device_json_ref: { path: "/scans/ali.json", attachedAt: "2026-07-01", processed: false },
  });
  assert(studentA.full_name === "علی رضایی", "full_name mismatch");
  assert(studentA.device_json_ref.path === "/scans/ali.json", "device_json_ref did not round-trip as an object");
});

check("duplicate national_code is rejected (UNIQUE constraint)", () => {
  expectThrow(() => {
    students.create({ full_name: "شخص دیگر", national_code: "0012345678" });
  }, "expected UNIQUE constraint violation on national_code");
});

check("search finds student by partial name", () => {
  const results = students.search("رضایی");
  assert(results.length === 1 && results[0].id === studentA.id, "search did not find the expected student");
});

console.log("\n[Programs + CASCADE]");

let programA;
check("insert a program with a valid program_type/status succeeds", () => {
  programA = programs.create({
    student_id: studentA.id,
    program_type: "bodybuilding",
    status: "draft",
    total_weeks: 8,
  });
  assert(programA.student_id === studentA.id, "student_id mismatch");
});

check("invalid program_type is rejected (CHECK constraint)", () => {
  expectThrow(() => {
    programs.create({ student_id: studentA.id, program_type: "not_a_real_type", status: "draft" });
  }, "expected CHECK constraint violation on program_type");
});

check("deleting a student cascades and deletes their programs", () => {
  students.remove(studentA.id);
  const remaining = programs.getById(programA.id);
  assert(remaining === null, "program row should have been deleted by ON DELETE CASCADE");
});

console.log("\n[Weekly_Logs + Injury_Blacklist]");

check("weekly log create + fetch by program_id works", () => {
  const studentB = students.create({ full_name: "مریم احمدی", national_code: "0099999999" });
  const programB = programs.create({ student_id: studentB.id, program_type: "corrective", status: "active" });
  weeklyLogs.create({ program_id: programB.id, week_number: 1, avg_rpe: 7.5, volume_completed_percent: 92, fatigue_flag: false, deload_triggered: false });
  weeklyLogs.create({ program_id: programB.id, week_number: 2, avg_rpe: 8.5, volume_completed_percent: 80, fatigue_flag: true, deload_triggered: false });
  const logs = weeklyLogs.getByProgramId(programB.id);
  assert(logs.length === 2, "expected 2 weekly logs");
  assert(logs[1].fatigue_flag === 1, "fatigue_flag should be stored as 1");
});

check("injury blacklist entry is shared/queryable per student", () => {
  const studentC = students.create({ full_name: "حسین کریمی", national_code: "0088888888" });
  injuryBlacklist.create({
    student_id: studentC.id,
    exercise_id: "barbell_bench_press",
    source_module: "bodybuilding",
    reason_note: "درد شانه راست",
  });
  const entries = injuryBlacklist.getByStudentId(studentC.id);
  assert(entries.length === 1 && entries[0].exercise_id === "barbell_bench_press", "injury blacklist entry not found");
});

db.close();
fs.rmSync(dbPath, { force: true });

console.log(`\n[test-db] ${passCount} PASS, ${failCount} FAIL`);
process.exit(failCount > 0 ? 1 : 0);
