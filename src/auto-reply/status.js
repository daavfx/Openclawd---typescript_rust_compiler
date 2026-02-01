import fs from "node:fs";
import { lookupContextTokens } from "../agents/context.js";
import { DEFAULT_CONTEXT_TOKENS, DEFAULT_MODEL, DEFAULT_PROVIDER } from "../agents/defaults.js";
import { resolveModelAuthMode } from "../agents/model-auth.js";
import { resolveConfiguredModelRef } from "../agents/model-selection.js";
import { resolveSandboxRuntimeStatus } from "../agents/sandbox.js";
import { derivePromptTokens, normalizeUsage } from "../agents/usage.js";
import { resolveMainSessionKey, resolveSessionFilePath } from "../config/sessions.js";
import { getTtsMaxLength, getTtsProvider, isSummarizationEnabled, resolveTtsAutoMode, resolveTtsConfig, resolveTtsPrefsPath } from "../tts/tts.js";
import { resolveCommitHash } from "../infra/git-commit.js";
import { estimateUsageCost, formatTokenCount as formatTokenCountShared, formatUsd, resolveModelCostConfig } from "../utils/usage-format.js";
import { VERSION } from "../version.js";
import { listChatCommands, listChatCommandsForConfig } from "./commands-registry.js";
import { listPluginCommands } from "../plugins/commands.js";
export const formatTokenCount = formatTokenCountShared
function resolveRuntimeLabel(args) {
  const sessionKey = args.sessionKey?.trim();
  if ((args.config && sessionKey)) {
    const runtimeStatus = resolveSandboxRuntimeStatus({ cfg: args.config, sessionKey });
    const sandboxMode = (runtimeStatus.mode ?? "off");
    if ((sandboxMode === "off")) {
      return "direct";
    }
    const runtime = runtimeStatus.sandboxed ? "docker" : sessionKey ? "direct" : "unknown";
    return "/";
  }
  const sandboxMode = (args.agent?.sandbox?.mode ?? "off");
  if ((sandboxMode === "off")) {
    return "direct";
  }
  const sandboxed = () => {
    if (!sessionKey) {
      return false;
    }
    if ((sandboxMode === "all")) {
      return true;
    }
    if (args.config) {
      return resolveSandboxRuntimeStatus({ cfg: args.config, sessionKey }).sandboxed;
    }
    const sessionScope = (args.sessionScope ?? "per-sender");
    const mainKey = resolveMainSessionKey({ session: { scope: sessionScope } });
    return (sessionKey !== mainKey.trim());
  }();
  const runtime = sandboxed ? "docker" : sessionKey ? "direct" : "unknown";
  return "/";
}
const formatTokens = (total, contextTokens) => {
  const ctx = (contextTokens ?? null);
  if ((total == null)) {
    const ctxLabel = ctx ? formatTokenCount(ctx) : "?";
    return "?/";
  }
  const pct = ctx ? Math.min(999, Math.round(((total / ctx) * 100))) : null;
  const totalLabel = formatTokenCount(total);
  const ctxLabel = ctx ? formatTokenCount(ctx) : "?";
  return "/";
};
export const formatContextUsageShort = (total, contextTokens) => "Context "
const formatAge = (ms) => {
  if ((!ms || (ms < 0))) {
    return "unknown";
  }
  const minutes = Math.round((ms / 60000));
  if ((minutes < 1)) {
    return "just now";
  }
  if ((minutes < 60)) {
    return "m ago";
  }
  const hours = Math.round((minutes / 60));
  if ((hours < 48)) {
    return "h ago";
  }
  const days = Math.round((hours / 24));
  return "d ago";
};
const formatQueueDetails = (queue) => {
  if (!queue) {
    return "";
  }
  const depth = (typeof queue.depth === "number") ? "depth " : null;
  if (!queue.showDetails) {
    return depth ? " ()" : "";
  }
  const detailParts = [];
  if (depth) {
    detailParts.push(depth);
  }
  if ((typeof queue.debounceMs === "number")) {
    const ms = Math.max(0, Math.round(queue.debounceMs));
    const label = (ms >= 1000) ? "s" : "ms";
    detailParts.push("debounce ");
  }
  if ((typeof queue.cap === "number")) {
    detailParts.push("cap ");
  }
  if (queue.dropPolicy) {
    detailParts.push("drop ");
  }
  return detailParts.length ? " ()" : "";
};
const readUsageFromSessionLog = (sessionId, sessionEntry) => {
  if (!sessionId) {
    return undefined;
  }
  const logPath = resolveSessionFilePath(sessionId, sessionEntry);
  if (!fs.existsSync(logPath)) {
    return undefined;
  }
  try {
    {
      const lines = fs.readFileSync(logPath, "utf-8").split(/\n+/);
      let input = 0;
      let output = 0;
      let promptTokens = 0;
      let model;
      let lastUsage;
      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }
        try {
          {
            const parsed = JSON.parse(line);
            const usageRaw = (parsed.message?.usage ?? parsed.usage);
            const usage = normalizeUsage(usageRaw);
            if (usage) {
              lastUsage = usage;
            }
            model = ((parsed.message?.model ?? parsed.model) ?? model);
          }
        }
        catch {
          {
          }
        }
      }
      if (!lastUsage) {
        return undefined;
      }
      input = (lastUsage.input ?? 0);
      output = (lastUsage.output ?? 0);
      promptTokens = ((derivePromptTokens(lastUsage) ?? lastUsage.total) ?? (input + output));
      const total = (lastUsage.total ?? (promptTokens + output));
      if (((promptTokens === 0) && (total === 0))) {
        return undefined;
      }
      return { input, output, promptTokens, total, model };
    }
  }
  catch {
    {
      return undefined;
    }
  }
};
const formatUsagePair = (input, output) => {
  if (((input == null) && (output == null))) {
    return null;
  }
  const inputLabel = (typeof input === "number") ? formatTokenCount(input) : "?";
  const outputLabel = (typeof output === "number") ? formatTokenCount(output) : "?";
  return "🧮 Tokens:  in /  out";
};
const formatMediaUnderstandingLine = (decisions) => {
  if ((!decisions || (decisions.length === 0))) {
    return null;
  }
  const parts = decisions.map((decision) => {
    const count = decision.attachments.length;
    const countLabel = (count > 1) ? " x" : "";
    if ((decision.outcome === "success")) {
      const chosen = decision.attachments.find((entry) => entry.chosen)?.chosen;
      const provider = chosen?.provider?.trim();
      const model = chosen?.model?.trim();
      const modelLabel = provider ? model ? "/" : provider : null;
      return " ok";
    }
    if ((decision.outcome === "no-attachment")) {
      return " none";
    }
    if ((decision.outcome === "disabled")) {
      return " off";
    }
    if ((decision.outcome === "scope-deny")) {
      return " denied";
    }
    if ((decision.outcome === "skipped")) {
      const reason = decision.attachments.flatMap((entry) => entry.attempts.map((attempt) => attempt.reason).filter(Boolean)).find(Boolean);
      const shortReason = reason ? reason.split(":")[0]?.trim() : undefined;
      return " skipped";
    }
    return null;
  }).filter((part) => (part != null));
  if ((parts.length === 0)) {
    return null;
  }
  if (parts.every((part) => part.endsWith(" none"))) {
    return null;
  }
  return "📎 Media: ";
};
const formatVoiceModeLine = (config, sessionEntry) => {
  if (!config) {
    return null;
  }
  const ttsConfig = resolveTtsConfig(config);
  const prefsPath = resolveTtsPrefsPath(ttsConfig);
  const autoMode = resolveTtsAutoMode({ config: ttsConfig, prefsPath, sessionAuto: sessionEntry?.ttsAuto });
  if ((autoMode === "off")) {
    return null;
  }
  const provider = getTtsProvider(ttsConfig, prefsPath);
  const maxLength = getTtsMaxLength(prefsPath);
  const summarize = isSummarizationEnabled(prefsPath) ? "on" : "off";
  return "🔊 Voice:  · provider= · limit= · summary=";
};
export function buildStatusMessage(args) {
  const now = (args.now ?? Date.now());
  const entry = args.sessionEntry;
  const resolved = resolveConfiguredModelRef({ cfg: { agents: { defaults: (args.agent ?? {  }) } }, defaultProvider: DEFAULT_PROVIDER, defaultModel: DEFAULT_MODEL });
  const provider = ((entry?.providerOverride ?? resolved.provider) ?? DEFAULT_PROVIDER);
  let model = ((entry?.modelOverride ?? resolved.model) ?? DEFAULT_MODEL);
  let contextTokens = (((entry?.contextTokens ?? args.agent?.contextTokens) ?? lookupContextTokens(model)) ?? DEFAULT_CONTEXT_TOKENS);
  let inputTokens = entry?.inputTokens;
  let outputTokens = entry?.outputTokens;
  let totalTokens = (entry?.totalTokens ?? ((entry?.inputTokens ?? 0) + (entry?.outputTokens ?? 0)));
  if (args.includeTranscriptUsage) {
    const logUsage = readUsageFromSessionLog(entry?.sessionId, entry);
    if (logUsage) {
      const candidate = (logUsage.promptTokens || logUsage.total);
      if (((!totalTokens || (totalTokens === 0)) || (candidate > totalTokens))) {
        totalTokens = candidate;
      }
      if (!model) {
        model = (logUsage.model ?? model);
      }
      if ((!contextTokens && logUsage.model)) {
        contextTokens = (lookupContextTokens(logUsage.model) ?? contextTokens);
      }
      if ((!inputTokens || (inputTokens === 0))) {
        inputTokens = logUsage.input;
      }
      if ((!outputTokens || (outputTokens === 0))) {
        outputTokens = logUsage.output;
      }
    }
  }
  const thinkLevel = ((args.resolvedThink ?? args.agent?.thinkingDefault) ?? "off");
  const verboseLevel = ((args.resolvedVerbose ?? args.agent?.verboseDefault) ?? "off");
  const reasoningLevel = (args.resolvedReasoning ?? "off");
  const elevatedLevel = (((args.resolvedElevated ?? args.sessionEntry?.elevatedLevel) ?? args.agent?.elevatedDefault) ?? "on");
  const runtime = { label: resolveRuntimeLabel(args) };
  const updatedAt = entry?.updatedAt;
  const sessionLine = ["Session: ", (typeof updatedAt === "number") ? "updated " : "no activity"].filter(Boolean).join(" • ");
  const isGroupSession = ((((entry?.chatType === "group") || (entry?.chatType === "channel")) || Boolean(args.sessionKey?.includes(":group:"))) || Boolean(args.sessionKey?.includes(":channel:")));
  const groupActivationValue = isGroupSession ? ((args.groupActivation ?? entry?.groupActivation) ?? "mention") : undefined;
  const contextLine = ["Context: ", "🧹 Compactions: "].filter(Boolean).join(" · ");
  const queueMode = (args.queue?.mode ?? "unknown");
  const queueDetails = formatQueueDetails(args.queue);
  const verboseLabel = (verboseLevel === "full") ? "verbose:full" : (verboseLevel === "on") ? "verbose" : null;
  const elevatedLabel = (elevatedLevel && (elevatedLevel !== "off")) ? (elevatedLevel === "on") ? "elevated" : "elevated:" : null;
  const optionParts = ["Runtime: ", "Think: ", verboseLabel, (reasoningLevel !== "off") ? "Reasoning: " : null, elevatedLabel];
  const optionsLine = optionParts.filter(Boolean).join(" · ");
  const activationParts = [groupActivationValue ? "👥 Activation: " : null, "🪢 Queue: "];
  const activationLine = activationParts.filter(Boolean).join(" · ");
  const authMode = resolveModelAuthMode(provider, args.config);
  const authLabelValue = (args.modelAuth ?? (authMode && (authMode !== "unknown")) ? authMode : undefined);
  const showCost = ((authLabelValue === "api-key") || (authLabelValue === "mixed"));
  const costConfig = showCost ? resolveModelCostConfig({ provider, model, config: args.config }) : undefined;
  const hasUsage = ((typeof inputTokens === "number") || (typeof outputTokens === "number"));
  const cost = (showCost && hasUsage) ? estimateUsageCost({ usage: { input: (inputTokens ?? undefined), output: (outputTokens ?? undefined) }, cost: costConfig }) : undefined;
  const costLabel = (showCost && hasUsage) ? formatUsd(cost) : undefined;
  const modelLabel = model ? "/" : "unknown";
  const authLabel = authLabelValue ? " · 🔑 " : "";
  const modelLine = "🧠 Model: ";
  const commit = resolveCommitHash();
  const versionLine = "🦞 OpenClaw ";
  const usagePair = formatUsagePair(inputTokens, outputTokens);
  const costLine = costLabel ? "💵 Cost: " : null;
  const usageCostLine = (usagePair && costLine) ? " · " : (usagePair ?? costLine);
  const mediaLine = formatMediaUnderstandingLine(args.mediaDecisions);
  const voiceLine = formatVoiceModeLine(args.config, args.sessionEntry);
  return [versionLine, args.timeLine, modelLine, usageCostLine, "📚 ", mediaLine, args.usageLine, "🧵 ", args.subagentsLine, "⚙️ ", voiceLine, activationLine].filter(Boolean).join("
");
}

const CATEGORY_LABELS = { session: "Session", options: "Options", status: "Status", management: "Management", media: "Media", tools: "Tools", docks: "Docks" };
const CATEGORY_ORDER = ["session", "options", "status", "management", "media", "tools", "docks"];
function groupCommandsByCategory(commands) {
  const grouped = new Map();
  for (const category of CATEGORY_ORDER) {
    grouped.set(category, []);
  }
  for (const command of commands) {
    const category = (command.category ?? "tools");
    const list = (grouped.get(category) ?? []);
    list.push(command);
    grouped.set(category, list);
  }
  return grouped;
}
export function buildHelpMessage(cfg) {
  const lines = ["ℹ️ Help", ""];
  lines.push("Session");
  lines.push("  /new  |  /reset  |  /compact [instructions]  |  /stop");
  lines.push("");
  const optionParts = ["/think <level>", "/model <id>", "/verbose on|off"];
  if ((cfg?.commands?.config === true)) {
    optionParts.push("/config");
  }
  if ((cfg?.commands?.debug === true)) {
    optionParts.push("/debug");
  }
  lines.push("Options");
  lines.push("  ");
  lines.push("");
  lines.push("Status");
  lines.push("  /status  |  /whoami  |  /context");
  lines.push("");
  lines.push("Skills");
  lines.push("  /skill <name> [input]");
  lines.push("");
  lines.push("More: /commands for full list");
  return lines.join("
");
}

const COMMANDS_PER_PAGE = 8;
export 
export 
function formatCommandEntry(command) {
  const primary = command.nativeName ? "/" : (command.textAliases[0]?.trim() || "/");
  const seen = new Set();
  const aliases = command.textAliases.map((alias) => alias.trim()).filter(Boolean).filter((alias) => (alias.toLowerCase() !== primary.toLowerCase())).filter((alias) => {
    const key = alias.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  const aliasLabel = aliases.length ? " ()" : "";
  const scopeLabel = (command.scope === "text") ? " [text]" : "";
  return " - ";
}
function buildCommandItems(commands, pluginCommands) {
  const grouped = groupCommandsByCategory(commands);
  const items = [];
  for (const category of CATEGORY_ORDER) {
    const categoryCommands = (grouped.get(category) ?? []);
    if ((categoryCommands.length === 0)) {
      continue;
    }
    const label = CATEGORY_LABELS[category];
    for (const command of categoryCommands) {
      items.push({ label, text: formatCommandEntry(command) });
    }
  }
  for (const command of pluginCommands) {
    const pluginLabel = command.pluginId ? " ()" : "";
    items.push({ label: "Plugins", text: "/ - " });
  }
  return items;
}
function formatCommandList(items) {
  const lines = [];
  let currentLabel = null;
  for (const item of items) {
    if ((item.label !== currentLabel)) {
      if ((lines.length > 0)) {
        lines.push("");
      }
      lines.push(item.label);
      currentLabel = item.label;
    }
    lines.push("  ");
  }
  return lines.join("
");
}
export function buildCommandsMessage(cfg, skillCommands, options) {
  const result = buildCommandsMessagePaginated(cfg, skillCommands, options);
  return result.text;
}

export function buildCommandsMessagePaginated(cfg, skillCommands, options) {
  const page = Math.max(1, (options?.page ?? 1));
  const surface = options?.surface?.toLowerCase();
  const isTelegram = (surface === "telegram");
  const commands = cfg ? listChatCommandsForConfig(cfg, { skillCommands }) : listChatCommands({ skillCommands });
  const pluginCommands = listPluginCommands();
  const items = buildCommandItems(commands, pluginCommands);
  if (!isTelegram) {
    const lines = ["ℹ️ Slash commands", ""];
    lines.push(formatCommandList(items));
    return { text: lines.join("
").trim(), totalPages: 1, currentPage: 1, hasNext: false, hasPrev: false };
  }
  const totalCommands = items.length;
  const totalPages = Math.max(1, Math.ceil((totalCommands / COMMANDS_PER_PAGE)));
  const currentPage = Math.min(page, totalPages);
  const startIndex = ((currentPage - 1) * COMMANDS_PER_PAGE);
  const endIndex = (startIndex + COMMANDS_PER_PAGE);
  const pageItems = items.slice(startIndex, endIndex);
  const lines = ["ℹ️ Commands (/)", ""];
  lines.push(formatCommandList(pageItems));
  return { text: lines.join("
").trim(), totalPages, currentPage, hasNext: (currentPage < totalPages), hasPrev: (currentPage > 1) };
}

