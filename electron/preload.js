const { contextBridge } = require("electron");

// Placeholder bridge for this scaffold step. The real data-access API
// (students/programs/etc, see معماری سند بخش ۲.۱ و ۲.۴) is added in a later
// step once the SQLite layer and IPC handlers exist.
contextBridge.exposeInMainWorld("anatomixEnv", {
  isElectron: true,
});
