// better-sqlite3 is a native addon; the copy that `npm install` compiles by
// default targets the system Node ABI, not Electron's bundled Node. Electron
// 33's Node (v20.18.3) caps at N-API version 9, while better-sqlite3's
// binding.gyp (as of the 13.x line) requires NAPI_VERSION=10 — loading that
// combination inside Electron segfaults (verified empirically, not assumed).
// This project pins better-sqlite3@12.11.1, which doesn't force NAPI_VERSION,
// but the native binary still has to be *compiled* against Electron's headers
// to be safe going forward — hence this explicit rebuild step.
//
// The `build/` directory is removed first: node-gyp's incremental-build state
// otherwise reports success without actually recompiling (observed directly —
// stale .tlog files caused two full rebuild attempts to silently no-op).
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const electronVersion = require("electron/package.json").version;
const modulePath = path.join(__dirname, "..", "node_modules", "better-sqlite3");
const buildPath = path.join(modulePath, "build");

if (fs.existsSync(buildPath)) {
  fs.rmSync(buildPath, { recursive: true, force: true });
}

execFileSync(
  process.execPath,
  [
    require.resolve("node-gyp/bin/node-gyp.js"),
    "rebuild",
    "--runtime=electron",
    `--target=${electronVersion}`,
    "--arch=x64",
    "--dist-url=https://www.electronjs.org/headers",
  ],
  { cwd: modulePath, stdio: "inherit" }
);

console.log(`[rebuild-native] better-sqlite3 rebuilt for Electron ${electronVersion}`);
