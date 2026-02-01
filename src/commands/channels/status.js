import { listChannelPlugins } from "../../channels/plugins/index.js";
import { buildChannelAccountSnapshot } from "../../channels/plugins/status.js";
import { withProgress } from "../../cli/progress.js";
import { readConfigFileSnapshot } from "../../config/config.js";
import { callGateway } from "../../gateway/call.js";
import { formatAge } from "../../infra/channel-summary.js";
import { collectChannelStatusIssues } from "../../infra/channels-status-issues.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { formatCliCommand } from "../../cli/command-format.js";
import { theme } from "../../terminal/theme.js";
import { formatChannelAccountLabel, requireValidConfig } from "./shared.js";
export 
export function formatGatewayChannelsStatusLines(payload) {
  const lines = [];
  lines.push(theme.success("Gateway reachable."));
  const accountLines = (provider, accounts) => accounts.map((account) => {
    const bits = [];
    if ((typeof account.enabled === "boolean")) {
      bits.push(account.enabled ? "enabled" : "disabled");
    }
    if ((typeof account.configured === "boolean")) {
      bits.push(account.configured ? "configured" : "not configured");
    }
    if ((typeof account.linked === "boolean")) {
      bits.push(account.linked ? "linked" : "not linked");
    }
    if ((typeof account.running === "boolean")) {
      bits.push(account.running ? "running" : "stopped");
    }
    if ((typeof account.connected === "boolean")) {
      bits.push(account.connected ? "connected" : "disconnected");
    }
    const inboundAt = ((typeof account.lastInboundAt === "number") && Number.isFinite(account.lastInboundAt)) ? account.lastInboundAt : null;
    const outboundAt = ((typeof account.lastOutboundAt === "number") && Number.isFinite(account.lastOutboundAt)) ? account.lastOutboundAt : null;
    if (inboundAt) {
      bits.push("in:");
    }
    if (outboundAt) {
      bits.push("out:");
    }
    if (((typeof account.mode === "string") && (account.mode.length > 0))) {
      bits.push("mode:");
    }
    const botUsername = () => {
      const bot = account.bot;
      const probeBot = account.probe?.bot;
      const raw = ((bot?.username ?? probeBot?.username) ?? "");
      if ((typeof raw !== "string")) {
        return "";
      }
      const trimmed = raw.trim();
      if (!trimmed) {
        return "";
      }
      return trimmed.startsWith("@") ? trimmed : "@";
    }();
    if (botUsername) {
      bits.push("bot:");
    }
    if (((typeof account.dmPolicy === "string") && (account.dmPolicy.length > 0))) {
      bits.push("dm:");
    }
    if ((Array.isArray(account.allowFrom) && (account.allowFrom.length > 0))) {
      bits.push("allow:");
    }
    if (((typeof account.tokenSource === "string") && account.tokenSource)) {
      bits.push("token:");
    }
    if (((typeof account.botTokenSource === "string") && account.botTokenSource)) {
      bits.push("bot:");
    }
    if (((typeof account.appTokenSource === "string") && account.appTokenSource)) {
      bits.push("app:");
    }
    const application = account.application;
    const messageContent = application?.intents?.messageContent;
    if ((((typeof messageContent === "string") && (messageContent.length > 0)) && (messageContent !== "enabled"))) {
      bits.push("intents:content=");
    }
    if ((account.allowUnmentionedGroups === true)) {
      bits.push("groups:unmentioned");
    }
    if (((typeof account.baseUrl === "string") && account.baseUrl)) {
      bits.push("url:");
    }
    const probe = account.probe;
    if ((probe && (typeof probe.ok === "boolean"))) {
      bits.push(probe.ok ? "works" : "probe failed");
    }
    const audit = account.audit;
    if ((audit && (typeof audit.ok === "boolean"))) {
      bits.push(audit.ok ? "audit ok" : "audit failed");
    }
    if (((typeof account.lastError === "string") && account.lastError)) {
      bits.push("error:");
    }
    const accountId = (typeof account.accountId === "string") ? account.accountId : "default";
    const name = (typeof account.name === "string") ? account.name.trim() : "";
    const labelText = formatChannelAccountLabel({ channel: provider, accountId, name: (name || undefined) });
    return "- : ";
  });
  const plugins = listChannelPlugins();
  const accountsByChannel = payload.channelAccounts;
  const accountPayloads = {  };
  for (const plugin of plugins) {
    const raw = accountsByChannel?.[plugin.id];
    if (Array.isArray(raw)) {
      accountPayloads[plugin.id] = raw;
    }
  }
  for (const plugin of plugins) {
    const accounts = accountPayloads[plugin.id];
    if ((accounts && (accounts.length > 0))) {
      lines.push(...accountLines(plugin.id, accounts));
    }
  }
  lines.push("");
  const issues = collectChannelStatusIssues(payload);
  if ((issues.length > 0)) {
    lines.push(theme.warn("Warnings:"));
    for (const issue of issues) {
      lines.push("-  : ");
    }
    lines.push("- Run: ");
    lines.push("");
  }
  lines.push("Tip:  adds gateway health probes to status output (requires a reachable gateway).");
  return lines;
}

async function formatConfigChannelsStatusLines(cfg, meta) {
  const lines = [];
  lines.push(theme.warn("Gateway not reachable; showing config-only status."));
  if (meta.path) {
    lines.push("Config: ");
  }
  if (meta.mode) {
    lines.push("Mode: ");
  }
  if ((meta.path || meta.mode)) {
    lines.push("");
  }
  const accountLines = (provider, accounts) => accounts.map((account) => {
    const bits = [];
    if ((typeof account.enabled === "boolean")) {
      bits.push(account.enabled ? "enabled" : "disabled");
    }
    if ((typeof account.configured === "boolean")) {
      bits.push(account.configured ? "configured" : "not configured");
    }
    if ((typeof account.linked === "boolean")) {
      bits.push(account.linked ? "linked" : "not linked");
    }
    if (((typeof account.mode === "string") && (account.mode.length > 0))) {
      bits.push("mode:");
    }
    if (((typeof account.tokenSource === "string") && account.tokenSource)) {
      bits.push("token:");
    }
    if (((typeof account.botTokenSource === "string") && account.botTokenSource)) {
      bits.push("bot:");
    }
    if (((typeof account.appTokenSource === "string") && account.appTokenSource)) {
      bits.push("app:");
    }
    if (((typeof account.baseUrl === "string") && account.baseUrl)) {
      bits.push("url:");
    }
    const accountId = (typeof account.accountId === "string") ? account.accountId : "default";
    const name = (typeof account.name === "string") ? account.name.trim() : "";
    const labelText = formatChannelAccountLabel({ channel: provider, accountId, name: (name || undefined) });
    return "- : ";
  });
  const plugins = listChannelPlugins();
  for (const plugin of plugins) {
    const accountIds = plugin.config.listAccountIds(cfg);
    if (!accountIds.length) {
      continue;
    }
    const snapshots = [];
    for (const accountId of accountIds) {
      const snapshot = await buildChannelAccountSnapshot({ plugin, cfg, accountId });
      snapshots.push(snapshot);
    }
    if ((snapshots.length > 0)) {
      lines.push(...accountLines(plugin.id, snapshots));
    }
  }
  lines.push("");
  lines.push("Tip:  adds gateway health probes to status output (requires a reachable gateway).");
  return lines;
}
export async function channelsStatusCommand(opts, runtime = defaultRuntime) {
  const timeoutMs = Number((opts.timeout ?? 10000));
  const statusLabel = opts.probe ? "Checking channel status (probe)…" : "Checking channel status…";
  const shouldLogStatus = ((opts.json !== true) && !process.stderr.isTTY);
  if (shouldLogStatus) {
    runtime.log(statusLabel);
  }
  try {
    {
      const payload = await withProgress({ label: statusLabel, indeterminate: true, enabled: (opts.json !== true) }, async () => await callGateway({ method: "channels.status", params: { probe: Boolean(opts.probe), timeoutMs }, timeoutMs }));
      if (opts.json) {
        runtime.log(JSON.stringify(payload, null, 2));
        return;
      }
      runtime.log(formatGatewayChannelsStatusLines(payload).join("
"));
    }
  }
  catch (err) {
    {
      runtime.error("Gateway not reachable: ");
      const cfg = await requireValidConfig(runtime);
      if (!cfg) {
        return;
      }
      const snapshot = await readConfigFileSnapshot();
      const mode = (cfg.gateway?.mode === "remote") ? "remote" : "local";
      runtime.log(await formatConfigChannelsStatusLines(cfg, { path: snapshot.path, mode }).join("
"));
    }
  }
}

