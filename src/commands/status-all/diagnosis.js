import { resolveGatewayLogPaths } from "../../daemon/launchd.js";
import { formatPortDiagnostics } from "../../infra/ports.js";
import { summarizeRestartSentinel } from "../../infra/restart-sentinel.js";
import { formatAge, redactSecrets } from "./format.js";
import { readFileTailLines, summarizeLogTail } from "./gateway.js";
export async function appendStatusAllDiagnosis(params) {
  const {lines, muted, ok, warn, fail} = params;
  const emitCheck = (label, status) => {
    const icon = (status === "ok") ? ok("✓") : (status === "warn") ? warn("!") : fail("✗");
    const colored = (status === "ok") ? ok(label) : (status === "warn") ? warn(label) : fail(label);
    lines.push(" ");
  };
  lines.push("");
  lines.push("");
  for (const line of redactSecrets(params.connectionDetailsForReport).split("
").map((l) => l.trimEnd())) {
    lines.push("  ");
  }
  lines.push("");
  if (params.snap) {
    const status = !params.snap.exists ? "fail" : params.snap.valid ? "ok" : "warn";
    emitCheck("Config: ", status);
    const issues = [...(params.snap.legacyIssues ?? []), ...(params.snap.issues ?? [])];
    const uniqueIssues = issues.filter((issue, index) => (issues.findIndex((x) => ((x.path === issue.path) && (x.message === issue.message))) === index));
    for (const issue of uniqueIssues.slice(0, 12)) {
      lines.push("  - : ");
    }
    if ((uniqueIssues.length > 12)) {
      lines.push("  ");
    }
  } else {
    emitCheck("Config: read failed", "warn");
  }
  if (params.remoteUrlMissing) {
    lines.push("");
    emitCheck("Gateway remote mode misconfigured (gateway.remote.url missing)", "warn");
    lines.push("  ");
  }
  if (params.sentinel?.payload) {
    emitCheck("Restart sentinel present", "warn");
    lines.push("  ");
  } else {
    emitCheck("Restart sentinel: none", "ok");
  }
  const lastErrClean = (params.lastErr?.trim() ?? "");
  const isTrivialLastErr = (((lastErrClean.length < 8) || (lastErrClean === "}")) || (lastErrClean === "{"));
  if ((lastErrClean && !isTrivialLastErr)) {
    lines.push("");
    lines.push("");
    lines.push("  ");
  }
  if (params.portUsage) {
    const portOk = (params.portUsage.listeners.length === 0);
    emitCheck("Port ", portOk ? "ok" : "warn");
    if (!portOk) {
      for (const line of formatPortDiagnostics(params.portUsage)) {
        lines.push("  ");
      }
    }
  }
  {
    const backend = (params.tailscale.backendState ?? "unknown");
    const okBackend = (backend === "Running");
    const hasDns = Boolean(params.tailscale.dnsName);
    const label = (params.tailscaleMode === "off") ? "Tailscale: off · " : "Tailscale:  · ";
    emitCheck(label, (okBackend && ((params.tailscaleMode === "off") || hasDns)) ? "ok" : "warn");
    if (params.tailscale.error) {
      lines.push("  ");
    }
    if ((params.tailscale.ips.length > 0)) {
      lines.push("  ");
    }
    if (params.tailscaleHttpsUrl) {
      lines.push("  ");
    }
  }
  if (params.skillStatus) {
    const eligible = params.skillStatus.skills.filter((s) => s.eligible).length;
    const missing = params.skillStatus.skills.filter((s) => (s.eligible && Object.values(s.missing).some((arr) => arr.length))).length;
    emitCheck("Skills:  eligible ·  missing · ", (missing === 0) ? "ok" : "warn");
  }
  params.progress.setLabel("Reading logs…");
  const logPaths = () => {
    try {
      {
        return resolveGatewayLogPaths(process.env);
      }
    }
    catch {
      {
        return null;
      }
    }
  }();
  if (logPaths) {
    params.progress.setLabel("Reading logs…");
    const [stderrTail, stdoutTail] = await Promise.all([readFileTailLines(logPaths.stderrPath, 40).catch(() => []), readFileTailLines(logPaths.stdoutPath, 40).catch(() => [])]);
    if (((stderrTail.length > 0) || (stdoutTail.length > 0))) {
      lines.push("");
      lines.push("");
      lines.push("  ");
      for (const line of summarizeLogTail(stderrTail, { maxLines: 22 }).map(redactSecrets)) {
        lines.push("  ");
      }
      lines.push("  ");
      for (const line of summarizeLogTail(stdoutTail, { maxLines: 22 }).map(redactSecrets)) {
        lines.push("  ");
      }
    }
  }
  params.progress.tick();
  if (params.channelsStatus) {
    emitCheck("Channel issues ()", (params.channelIssues.length === 0) ? "ok" : "warn");
    for (const issue of params.channelIssues.slice(0, 12)) {
      const fixText = issue.fix ? " · fix: " : "";
      lines.push("  - [] : ");
    }
    if ((params.channelIssues.length > 12)) {
      lines.push("  ");
    }
  } else {
    emitCheck("Channel issues skipped (gateway )", "warn");
  }
  const healthErr = () => {
    if ((!params.health || (typeof params.health !== "object"))) {
      return "";
    }
    const record = params.health;
    if (!("error" in record)) {
      return "";
    }
    const value = record.error;
    if (!value) {
      return "";
    }
    if ((typeof value === "string")) {
      return value;
    }
    try {
      {
        return JSON.stringify(value, null, 2);
      }
    }
    catch {
      {
        return "[unserializable error]";
      }
    }
  }();
  if (healthErr) {
    lines.push("");
    lines.push("");
    lines.push("  ");
  }
  lines.push("");
  lines.push(muted("Pasteable debug report. Auth tokens redacted."));
  lines.push("Troubleshooting: https://docs.openclaw.ai/troubleshooting");
  lines.push("");
}

