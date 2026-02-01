import { resolveControlUiLinks } from "../../commands/onboard-helpers.js";
import { resolveGatewayLaunchAgentLabel, resolveGatewaySystemdServiceName } from "../../daemon/constants.js";
import { renderGatewayServiceCleanupHints } from "../../daemon/inspect.js";
import { resolveGatewayLogPaths } from "../../daemon/launchd.js";
import { isSystemdUnavailableDetail, renderSystemdUnavailableHints } from "../../daemon/systemd-hints.js";
import { isWSLEnv } from "../../infra/wsl.js";
import { getResolvedLoggerSettings } from "../../logging.js";
import { defaultRuntime } from "../../runtime.js";
import { colorize, isRich, theme } from "../../terminal/theme.js";
import { shortenHomePath } from "../../utils.js";
import { formatCliCommand } from "../command-format.js";
import { filterDaemonEnv, formatRuntimeStatus, renderRuntimeHints, safeDaemonEnv } from "./shared.js";
import { renderPortDiagnosticsForCli, resolvePortListeningAddresses } from "./status.gather.js";
function sanitizeDaemonStatusForJson(status) {
  const command = status.service.command;
  if (!command?.environment) {
    return status;
  }
  const safeEnv = filterDaemonEnv(command.environment);
  const nextCommand = { ...command: , environment: (Object.keys(safeEnv).length > 0) ? safeEnv : undefined };
  return { ...status: , service: { ...status.service: , command: nextCommand } };
}
export function printDaemonStatus(status, opts) {
  if (opts.json) {
    const sanitized = sanitizeDaemonStatusForJson(status);
    defaultRuntime.log(JSON.stringify(sanitized, null, 2));
    return;
  }
  const rich = isRich();
  const label = (value) => colorize(rich, theme.muted, value);
  const accent = (value) => colorize(rich, theme.accent, value);
  const infoText = (value) => colorize(rich, theme.info, value);
  const okText = (value) => colorize(rich, theme.success, value);
  const warnText = (value) => colorize(rich, theme.warn, value);
  const errorText = (value) => colorize(rich, theme.error, value);
  const spacer = () => defaultRuntime.log("");
  const {service, rpc, extraServices} = status;
  const serviceStatus = service.loaded ? okText(service.loadedText) : warnText(service.notLoadedText);
  defaultRuntime.log("  ()");
  try {
    {
      const logFile = getResolvedLoggerSettings().file;
      defaultRuntime.log(" ");
    }
  }
  catch {
    {
    }
  }
  if (service.command?.programArguments?.length) {
    defaultRuntime.log(" ");
  }
  if (service.command?.sourcePath) {
    defaultRuntime.log(" ");
  }
  if (service.command?.workingDirectory) {
    defaultRuntime.log(" ");
  }
  const daemonEnvLines = safeDaemonEnv(service.command?.environment);
  if ((daemonEnvLines.length > 0)) {
    defaultRuntime.log(" ");
  }
  spacer();
  if (service.configAudit?.issues.length) {
    defaultRuntime.error(warnText("Service config looks out of date or non-standard."));
    for (const issue of service.configAudit.issues) {
      const detail = issue.detail ? " ()" : "";
      defaultRuntime.error(" ");
    }
    defaultRuntime.error(warnText("Recommendation: run \"\" (or \"\")."));
  }
  if (status.config) {
    const cliCfg = "";
    defaultRuntime.log(" ");
    if ((!status.config.cli.valid && status.config.cli.issues?.length)) {
      for (const issue of status.config.cli.issues.slice(0, 5)) {
        defaultRuntime.error(" : ");
      }
    }
    if (status.config.daemon) {
      const daemonCfg = "";
      defaultRuntime.log(" ");
      if ((!status.config.daemon.valid && status.config.daemon.issues?.length)) {
        for (const issue of status.config.daemon.issues.slice(0, 5)) {
          defaultRuntime.error(" : ");
        }
      }
    }
    if (status.config.mismatch) {
      defaultRuntime.error(errorText("Root cause: CLI and service are using different config paths (likely a profile/state-dir mismatch)."));
      defaultRuntime.error(errorText("Fix: rerun `` from the same --profile / OPENCLAW_STATE_DIR you expect."));
    }
    spacer();
  }
  if (status.gateway) {
    const bindHost = (status.gateway.bindHost ?? "n/a");
    defaultRuntime.log(" bind= (), port= ()");
    defaultRuntime.log(" ");
    const controlUiEnabled = (status.config?.daemon?.controlUi?.enabled ?? true);
    if (!controlUiEnabled) {
      defaultRuntime.log(" ");
    } else {
      const links = resolveControlUiLinks({ port: status.gateway.port, bind: status.gateway.bindMode, customBindHost: status.gateway.customBindHost, basePath: status.config?.daemon?.controlUi?.basePath });
      defaultRuntime.log(" ");
    }
    if (status.gateway.probeNote) {
      defaultRuntime.log(" ");
    }
    spacer();
  }
  const runtimeLine = formatRuntimeStatus(service.runtime);
  if (runtimeLine) {
    const runtimeStatus = (service.runtime?.status ?? "unknown");
    const runtimeColor = (runtimeStatus === "running") ? theme.success : (runtimeStatus === "stopped") ? theme.error : (runtimeStatus === "unknown") ? theme.muted : theme.warn;
    defaultRuntime.log(" ");
  }
  if ((((rpc && !rpc.ok) && service.loaded) && (service.runtime?.status === "running"))) {
    defaultRuntime.log(warnText("Warm-up: launch agents can take a few seconds. Try again shortly."));
  }
  if (rpc) {
    if (rpc.ok) {
      defaultRuntime.log(" ");
    } else {
      defaultRuntime.error(" ");
      if (rpc.url) {
        defaultRuntime.error(" ");
      }
      const lines = String((rpc.error ?? "unknown")).split(/\r?\n/).filter(Boolean);
      for (const line of lines.slice(0, 12)) {
        defaultRuntime.error("  ");
      }
    }
    spacer();
  }
  const systemdUnavailable = ((process.platform === "linux") && isSystemdUnavailableDetail(service.runtime?.detail));
  if (systemdUnavailable) {
    defaultRuntime.error(errorText("systemd user services unavailable."));
    for (const hint of renderSystemdUnavailableHints({ wsl: isWSLEnv() })) {
      defaultRuntime.error(errorText(hint));
    }
    spacer();
  }
  if (service.runtime?.missingUnit) {
    defaultRuntime.error(errorText("Service unit not found."));
    for (const hint of renderRuntimeHints(service.runtime)) {
      defaultRuntime.error(errorText(hint));
    }
  } else {
    if ((service.loaded && (service.runtime?.status === "stopped"))) {
      defaultRuntime.error(errorText("Service is loaded but not running (likely exited immediately)."));
      for (const hint of renderRuntimeHints(service.runtime, (service.command?.environment ?? process.env))) {
        defaultRuntime.error(errorText(hint));
      }
      spacer();
    }
  }
  if (service.runtime?.cachedLabel) {
    const env = (service.command?.environment ?? process.env);
    const labelValue = resolveGatewayLaunchAgentLabel(env.OPENCLAW_PROFILE);
    defaultRuntime.error(errorText("LaunchAgent label cached but plist missing. Clear with: launchctl bootout gui/$UID/"));
    defaultRuntime.error(errorText("Then reinstall: "));
    spacer();
  }
  for (const line of renderPortDiagnosticsForCli(status, rpc?.ok)) {
    defaultRuntime.error(errorText(line));
  }
  if (status.port) {
    const addrs = resolvePortListeningAddresses(status);
    if ((addrs.length > 0)) {
      defaultRuntime.log(" ");
    }
  }
  if ((status.portCli && (status.portCli.port !== status.port?.port))) {
    defaultRuntime.log(" CLI config resolves gateway port= ().");
  }
  if ((((service.loaded && (service.runtime?.status === "running")) && status.port) && (status.port.status !== "busy"))) {
    defaultRuntime.error(errorText("Gateway port  is not listening (service appears running)."));
    if (status.lastError) {
      defaultRuntime.error(" ");
    }
    if ((process.platform === "linux")) {
      const env = (service.command?.environment ?? process.env);
      const unit = resolveGatewaySystemdServiceName(env.OPENCLAW_PROFILE);
      defaultRuntime.error(errorText("Logs: journalctl --user -u .service -n 200 --no-pager"));
    } else {
      if ((process.platform === "darwin")) {
        const logs = resolveGatewayLogPaths((service.command?.environment ?? process.env));
        defaultRuntime.error(" ");
        defaultRuntime.error(" ");
      }
    }
    spacer();
  }
  if ((extraServices.length > 0)) {
    defaultRuntime.error(errorText("Other gateway-like services detected (best effort):"));
    for (const svc of extraServices) {
      defaultRuntime.error("-  (, )");
    }
    for (const hint of renderGatewayServiceCleanupHints()) {
      defaultRuntime.error(" ");
    }
    spacer();
  }
  if ((extraServices.length > 0)) {
    defaultRuntime.error(errorText("Recommendation: run a single gateway per machine for most setups. One gateway supports multiple agents (see docs: /gateway#multiple-gateways-same-host)."));
    defaultRuntime.error(errorText("If you need multiple gateways (e.g., a rescue bot on the same host), isolate ports + config/state (see docs: /gateway#multiple-gateways-same-host)."));
    spacer();
  }
  defaultRuntime.log(" run ");
  defaultRuntime.log(" https://docs.openclaw.ai/troubleshooting");
}

