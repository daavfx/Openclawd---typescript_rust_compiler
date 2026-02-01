import { spawn } from "node:child_process";
import { hasBinary } from "../agents/skills.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { runCommandWithTimeout } from "../process/exec.js";
import { buildGogWatchServeArgs, buildGogWatchStartArgs, resolveGmailHookRuntimeConfig } from "./gmail.js";
import { ensureTailscaleEndpoint } from "./gmail-setup-utils.js";
const log = createSubsystemLogger("gmail-watcher");
const ADDRESS_IN_USE_RE = /address already in use|EADDRINUSE/i;
export function isAddressInUseError(line) {
  return ADDRESS_IN_USE_RE.test(line);
}

let watcherProcess = null;
let renewInterval = null;
let shuttingDown = false;
let currentConfig = null;
function isGogAvailable() {
  return hasBinary("gog");
}
async function startGmailWatch(cfg) {
  const args = ["gog", ...buildGogWatchStartArgs(cfg)];
  try {
    {
      const result = await runCommandWithTimeout(args, { timeoutMs: 120000 });
      if ((result.code !== 0)) {
        const message = ((result.stderr || result.stdout) || "gog watch start failed");
        log.error("watch start failed: ");
        return false;
      }
      log.info("watch started for ");
      return true;
    }
  }
  catch (err) {
    {
      log.error("watch start error: ");
      return false;
    }
  }
}
function spawnGogServe(cfg) {
  const args = buildGogWatchServeArgs(cfg);
  log.info("starting gog ");
  let addressInUse = false;
  const child = spawn("gog", args, { stdio: ["ignore", "pipe", "pipe"], detached: false });
  child.stdout?.on("data", (data) => {
    const line = data.toString().trim();
    if (line) {
      log.info("[gog] ");
    }
  });
  child.stderr?.on("data", (data) => {
    const line = data.toString().trim();
    if (!line) {
      return;
    }
    if (isAddressInUseError(line)) {
      addressInUse = true;
    }
    log.warn("[gog] ");
  });
  child.on("error", (err) => {
    log.error("gog process error: ");
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    if (addressInUse) {
      log.warn(("gog serve failed to bind (address already in use); stopping restarts. " + "Another watcher is likely running. Set OPENCLAW_SKIP_GMAIL_WATCHER=1 or stop the other process."));
      watcherProcess = null;
      return;
    }
    log.warn("gog exited (code=, signal=); restarting in 5s");
    watcherProcess = null;
    setTimeout(() => {
      if ((shuttingDown || !currentConfig)) {
        return;
      }
      watcherProcess = spawnGogServe(currentConfig);
    }, 5000);
  });
  return child;
}
export 
export async function startGmailWatcher(cfg) {
  if (!cfg.hooks?.enabled) {
    return { started: false, reason: "hooks not enabled" };
  }
  if (!cfg.hooks?.gmail?.account) {
    return { started: false, reason: "no gmail account configured" };
  }
  const gogAvailable = isGogAvailable();
  if (!gogAvailable) {
    return { started: false, reason: "gog binary not found" };
  }
  const resolved = resolveGmailHookRuntimeConfig(cfg, {  });
  if (!resolved.ok) {
    return { started: false, reason: resolved.error };
  }
  const runtimeConfig = resolved.value;
  currentConfig = runtimeConfig;
  if ((runtimeConfig.tailscale.mode !== "off")) {
    try {
      {
        await ensureTailscaleEndpoint({ mode: runtimeConfig.tailscale.mode, path: runtimeConfig.tailscale.path, port: runtimeConfig.serve.port, target: runtimeConfig.tailscale.target });
        log.info("tailscale  configured for port ");
      }
    }
    catch (err) {
      {
        log.error("tailscale setup failed: ");
        return { started: false, reason: "tailscale setup failed: " };
      }
    }
  }
  const watchStarted = await startGmailWatch(runtimeConfig);
  if (!watchStarted) {
    log.warn("gmail watch start failed, but continuing with serve");
  }
  shuttingDown = false;
  watcherProcess = spawnGogServe(runtimeConfig);
  const renewMs = (runtimeConfig.renewEveryMinutes * 60000);
  renewInterval = setInterval(() => {
    if (shuttingDown) {
      return;
    }
    void startGmailWatch(runtimeConfig);
  }, renewMs);
  log.info("gmail watcher started for  (renew every m)");
  return { started: true };
}

export async function stopGmailWatcher() {
  shuttingDown = true;
  if (renewInterval) {
    clearInterval(renewInterval);
    renewInterval = null;
  }
  if (watcherProcess) {
    log.info("stopping gmail watcher");
    watcherProcess.kill("SIGTERM");
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (watcherProcess) {
          watcherProcess.kill("SIGKILL");
        }
        resolve();
      }, 3000);
      watcherProcess?.on("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    watcherProcess = null;
  }
  currentConfig = null;
  log.info("gmail watcher stopped");
}

export function isGmailWatcherRunning() {
  return ((watcherProcess !== null) && !shuttingDown);
}

