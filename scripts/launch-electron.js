// Launcher wrapper (not a workaround): the parent dev environment this project
// is built inside is itself an Electron app, which sets ELECTRON_RUN_AS_NODE=1
// for its own internal Node usage. That variable leaks to any child process by
// default. If our Electron instance inherits it, `require("electron")` inside
// electron/main.js returns a plain path string instead of the app API (app is
// undefined). It must be removed here, before spawning, not inside main.js —
// by the time main.js runs, Electron has already booted in Node-compat mode.
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require("child_process");
const electronPath = require("electron");

const child = spawn(electronPath, ["."], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
