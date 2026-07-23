// Thin wrapper around the API preload.js exposed via contextBridge. The
// shape here must mirror browserAdapter.js exactly so store/db/index.js can
// hand either one to calling code without it knowing which is active.
const bridge = window.anatomixDB;

export const electronAdapter = {
  students: {
    create: (input) => bridge.students.create(input),
    getAll: () => bridge.students.getAll(),
    getById: (id) => bridge.students.getById(id),
    search: (query) => bridge.students.search(query),
    update: (id, input) => bridge.students.update(id, input),
    remove: (id) => bridge.students.remove(id),
  },
  programs: {
    create: (input) => bridge.programs.create(input),
    getById: (id) => bridge.programs.getById(id),
    getByStudentId: (studentId) => bridge.programs.getByStudentId(studentId),
    update: (id, input) => bridge.programs.update(id, input),
    remove: (id) => bridge.programs.remove(id),
  },
  weeklyLogs: {
    create: (input) => bridge.weeklyLogs.create(input),
    getByProgramId: (programId) => bridge.weeklyLogs.getByProgramId(programId),
    remove: (id) => bridge.weeklyLogs.remove(id),
  },
  injuryBlacklist: {
    create: (input) => bridge.injuryBlacklist.create(input),
    getByStudentId: (studentId) => bridge.injuryBlacklist.getByStudentId(studentId),
    remove: (id) => bridge.injuryBlacklist.remove(id),
  },
};
