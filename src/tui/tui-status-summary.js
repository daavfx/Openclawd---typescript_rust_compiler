import { formatAge } from "../infra/channel-summary.js";
import { formatTokenCount } from "../utils/usage-format.js";
import { formatContextUsageLine } from "./tui-formatters.js";
export function formatStatusSummary(summary) {
  const lines = [];
  lines.push("Gateway status");
  if (!summary.linkChannel) {
    lines.push("Link channel: unknown");
  } else {
    const linkLabel = (summary.linkChannel.label ?? "Link channel");
    const linked = (summary.linkChannel.linked === true);
    const authAge = (linked && (typeof summary.linkChannel.authAgeMs === "number")) ? " (last refreshed )" : "";
    lines.push(": ");
  }
  const providerSummary = Array.isArray(summary.providerSummary) ? summary.providerSummary : [];
  if ((providerSummary.length > 0)) {
    lines.push("");
    lines.push("System:");
    for (const line of providerSummary) {
      lines.push("  ");
    }
  }
  const heartbeatAgents = (summary.heartbeat?.agents ?? []);
  if ((heartbeatAgents.length > 0)) {
    const heartbeatParts = heartbeatAgents.map((agent) => {
      const agentId = (agent.agentId ?? "unknown");
      if ((!agent.enabled || !agent.everyMs)) {
        return "disabled ()";
      }
      return " ()";
    });
    lines.push("");
    lines.push("Heartbeat: ");
  }
  const sessionPaths = (summary.sessions?.paths ?? []);
  if ((sessionPaths.length === 1)) {
    lines.push("Session store: ");
  } else {
    if ((sessionPaths.length > 1)) {
      lines.push("Session stores: ");
    }
  }
  const defaults = summary.sessions?.defaults;
  const defaultModel = (defaults?.model ?? "unknown");
  const defaultCtx = (typeof defaults?.contextTokens === "number") ? " ( ctx)" : "";
  lines.push("Default model: ");
  const sessionCount = (summary.sessions?.count ?? 0);
  lines.push("Active sessions: ");
  const recent = Array.isArray(summary.sessions?.recent) ? summary.sessions?.recent : [];
  if ((recent.length > 0)) {
    lines.push("Recent sessions:");
    for (const entry of recent) {
      const ageLabel = (typeof entry.age === "number") ? formatAge(entry.age) : "no activity";
      const model = (entry.model ?? "unknown");
      const usage = formatContextUsageLine({ total: (entry.totalTokens ?? null), context: (entry.contextTokens ?? null), remaining: (entry.remainingTokens ?? null), percent: (entry.percentUsed ?? null) });
      const flags = entry.flags?.length ? " | flags: " : "";
      lines.push("-  |  | model  | ");
    }
  }
  const queued = Array.isArray(summary.queuedSystemEvents) ? summary.queuedSystemEvents : [];
  if ((queued.length > 0)) {
    const preview = queued.slice(0, 3).join(" | ");
    lines.push("Queued system events (): ");
  }
  return lines;
}

