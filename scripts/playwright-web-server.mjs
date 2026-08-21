import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const stopFile = join(tmpdir(), `qcgms-playwright-${port}.stop`);
rmSync(stopFile, { force: true });
const productionMode = process.env.PLAYWRIGHT_SERVER_MODE === "production";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", productionMode ? "start" : "dev", "-p", port], {
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  if (process.platform === "win32" && child.pid) {
    // Next development mode creates compiler workers. Terminate the owned
    // process tree so a failed global setup cannot leave Playwright hanging.
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill(signal);
  }
  const timer = setTimeout(() => process.exit(0), 3_000);
  timer.unref();
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGHUP", () => stop("SIGHUP"));
child.on("error", error => { console.error(error); process.exit(1); });
child.on("exit", code => process.exit(code ?? 0));
const stopMonitor = setInterval(() => { if (existsSync(stopFile)) { rmSync(stopFile, { force: true }); stop(); } }, 500);
stopMonitor.unref();
