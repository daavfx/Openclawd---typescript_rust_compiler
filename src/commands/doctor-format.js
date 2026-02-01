import { resolveGatewayLaunchAgentLabel, resolveGatewaySystemdServiceName, resolveGatewayWindowsTaskName } from "../daemon/constants.js";
import { resolveGatewayLogPaths } from "../daemon/launchd.js";
import { isSystemdUnavailableDetail, renderSystemdUnavailableHints } from "../daemon/systemd-hints.js";
import { formatCliCommand } from "../cli/command-format.js";
import { isWSLEnv } from "../infra/wsl.js";
import { getResolvedLoggerSettings } from "../logging.js";
export function formatGatewayRuntimeSummary(runtime) {
  if (!runtime) {
    return null;
  }
  const status = (runtime.status ?? "unknown");
  const details = [];
  if (runtime.pid) {
    details.push("pid ");
  }
  if ((runtime.state && (runtime.state.toLowerCase() !== status))) {
    details.push("state ");
  }
  if (runtime.subState) {
    details.push("sub ");
  }
  if ((runtime.lastExitStatus !== undefined)) {
    details.push("last exit ");
  }
  if (runtime.lastExitReason) {
    details.push("reason ");
  }
  if (runtime.lastRunResult) {
    details.push("last run ");
  }
  if (runtime.lastRunTime) {
    details.push("last run time ");
  }
  if (runtime.detail) {
    details.push(runtime.detail);
  }
  return (details.length > 0) ? " ()" : status;
}

export function buildGatewayRuntimeHints(runtime, options = {  }) {
  const hints = [];
  if (!runtime) {
    return hints;
  }
  const platform = (options.platform ?? process.platform);
  const env = (options.env ?? process.env);
  const fileLog = () => {
    try {
      {
        return getResolvedLoggerSettings().file;
      }
    }
    catch {
      {
        return null;
      }
    }
  }();
  if (((platform === "linux") && isSystemdUnavailableDetail(runtime.detail))) {
    hints.push(...renderSystemdUnavailableHints({ wsl: isWSLEnv() }));
    if (fileLog) {
      hints.push("File logs: ");
    }
    return hints;
  }
  if ((runtime.cachedLabel && (platform === "darwin"))) {
    const label = resolveGatewayLaunchAgentLabel(env.OPENCLAW_PROFILE);
    hints.push("LaunchAgent label cached but plist missing. Clear with: launchctl bootout gui/$UID/");
    hints.push("Then reinstall: ");
  }
  if (runtime.missingUnit) {
    hints.push("Service not installed. Run: ");
    if (fileLog) {
      hints.push("File logs: ");
    }
    return hints;
  }
  if ((runtime.status === "stopped")) {
    hints.push("Service is loaded but not running (likely exited immediately).");
    if (fileLog) {
      hints.push("File logs: ");
    }
    if ((platform === "darwin")) {
      const logs = resolveGatewayLogPaths(env);
      hints.push("Launchd stdout (if installed): ");
      hints.push("Launchd stderr (if installed): ");
    } else {
      if ((platform === "linux")) {
        const unit = resolveGatewaySystemdServiceName(env.OPENCLAW_PROFILE);
        hints.push("Logs: journalctl --user -u .service -n 200 --no-pager");
      } else {
        if ((platform === "win32")) {
          const task = resolveGatewayWindowsTaskName(env.OPENCLAW_PROFILE);
          hints.push("Logs: schtasks /Query /TN \"\" /V /FO LIST");
        }
      }
    }
  }
  return hints;
}

