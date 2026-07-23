const { contextBridge, ipcRenderer } = require("electron");

// Only Electron's own built-in modules are required here (contextBridge,
// ipcRenderer) — never our own project files or native modules. This keeps
// the preload script valid regardless of future sandbox/version changes.
contextBridge.exposeInMainWorld("anatomixEnv", {
  isElectron: true,
});

contextBridge.exposeInMainWorld("anatomixDB", {
  students: {
    create: (input) => ipcRenderer.invoke("db:students:create", input),
    getAll: () => ipcRenderer.invoke("db:students:getAll"),
    getById: (id) => ipcRenderer.invoke("db:students:getById", id),
    search: (query) => ipcRenderer.invoke("db:students:search", query),
    update: (id, input) => ipcRenderer.invoke("db:students:update", id, input),
    remove: (id) => ipcRenderer.invoke("db:students:remove", id),
  },
  programs: {
    create: (input) => ipcRenderer.invoke("db:programs:create", input),
    getById: (id) => ipcRenderer.invoke("db:programs:getById", id),
    getByStudentId: (studentId) => ipcRenderer.invoke("db:programs:getByStudentId", studentId),
    update: (id, input) => ipcRenderer.invoke("db:programs:update", id, input),
    remove: (id) => ipcRenderer.invoke("db:programs:remove", id),
  },
  weeklyLogs: {
    create: (input) => ipcRenderer.invoke("db:weeklyLogs:create", input),
    getByProgramId: (programId) => ipcRenderer.invoke("db:weeklyLogs:getByProgramId", programId),
    remove: (id) => ipcRenderer.invoke("db:weeklyLogs:remove", id),
  },
  injuryBlacklist: {
    create: (input) => ipcRenderer.invoke("db:injuryBlacklist:create", input),
    getByStudentId: (studentId) => ipcRenderer.invoke("db:injuryBlacklist:getByStudentId", studentId),
    remove: (id) => ipcRenderer.invoke("db:injuryBlacklist:remove", id),
  },
});
