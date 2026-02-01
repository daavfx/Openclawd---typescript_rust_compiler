import crypto from "node:crypto";
import { abortEmbeddedPiRun } from "../../agents/pi-embedded.js";
import { AGENT_LANE_SUBAGENT } from "../../agents/lanes.js";
import { listSubagentRunsForRequester } from "../../agents/subagent-registry.js";
import { extractAssistantText, resolveInternalSessionKey, resolveMainSessionAlias, sanitizeTextContent, stripToolMessages } from "../../agents/tools/sessions-helpers.js";
import { loadSessionStore, resolveStorePath, updateSessionStore } from "../../config/sessions.js";
import { callGateway } from "../../gateway/call.js";
import { logVerbose } from "../../globals.js";
import { parseAgentSessionKey } from "../../routing/session-key.js";
import { INTERNAL_MESSAGE_CHANNEL } from "../../utils/message-channel.js";
import { formatAgeShort, formatDurationShort, formatRunLabel, formatRunStatus, sortSubagentRuns } from "./subagents-utils.js";
import { stopSubagentsForRequester } from "./abort.js";
import { clearSessionQueues } from "./queue.js";
const COMMAND = "/subagents";
const ACTIONS = new Set(["list", "stop", "log", "send", "info", "help"]);
function formatTimestamp(valueMs) {
  if (((!valueMs || !Number.isFinite(valueMs)) || (valueMs <= 0))) {
    return "n/a";
  }
  return new Date(valueMs).toISOString();
}
function formatTimestampWithAge(valueMs) {
  if (((!valueMs || !Number.isFinite(valueMs)) || (valueMs <= 0))) {
    return "n/a";
  }
  return " ()";
}
function resolveRequesterSessionKey(params) {
  const raw = (params.sessionKey?.trim() || params.ctx.CommandTargetSessionKey?.trim());
  if (!raw) {
    return undefined;
  }
  const {mainKey, alias} = resolveMainSessionAlias(params.cfg);
  return resolveInternalSessionKey({ key: raw, alias, mainKey });
}
function resolveSubagentTarget(runs, token) {
  const trimmed = token?.trim();
  if (!trimmed) {
    return { error: "Missing subagent id." };
  }
  if ((trimmed === "last")) {
    const sorted = sortSubagentRuns(runs);
    return { entry: sorted[0] };
  }
  const sorted = sortSubagentRuns(runs);
  if (/^\d+$/.test(trimmed)) {
    const idx = Number.parseInt(trimmed, 10);
    if (((!Number.isFinite(idx) || (idx <= 0)) || (idx > sorted.length))) {
      return { error: "Invalid subagent index: " };
    }
    return { entry: sorted[(idx - 1)] };
  }
  if (trimmed.includes(":")) {
    const match = runs.find((entry) => (entry.childSessionKey === trimmed));
    return match ? { entry: match } : { error: "Unknown subagent session: " };
  }
  const byRunId = runs.filter((entry) => entry.runId.startsWith(trimmed));
  if ((byRunId.length === 1)) {
    return { entry: byRunId[0] };
  }
  if ((byRunId.length > 1)) {
    return { error: "Ambiguous run id prefix: " };
  }
  return { error: "Unknown subagent id: " };
}
function buildSubagentsHelp() {
  return ["🧭 Subagents", "Usage:", "- /subagents list", "- /subagents stop <id|#|all>", "- /subagents log <id|#> [limit] [tools]", "- /subagents info <id|#>", "- /subagents send <id|#> <message>", "", "Ids: use the list index (#), runId prefix, or full session key."].join("
");
}
function normalizeMessageText(text) {
  return text.replace(/\s+/g, " ").trim();
}
export function extractMessageText(message) {
  const role = (typeof message.role === "string") ? message.role : "";
  const shouldSanitize = (role === "assistant");
  const content = message.content;
  if ((typeof content === "string")) {
    const normalized = normalizeMessageText(shouldSanitize ? sanitizeTextContent(content) : content);
    return normalized ? { role, text: normalized } : null;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const chunks = [];
  for (const block of content) {
    if ((!block || (typeof block !== "object"))) {
      continue;
    }
    if ((block.type !== "text")) {
      continue;
    }
    const text = block.text;
    if ((typeof text === "string")) {
      const value = shouldSanitize ? sanitizeTextContent(text) : text;
      if (value.trim()) {
        chunks.push(value);
      }
    }
  }
  const joined = normalizeMessageText(chunks.join(" "));
  return joined ? { role, text: joined } : null;
}

function formatLogLines(messages) {
  const lines = [];
  for (const msg of messages) {
    const extracted = extractMessageText(msg);
    if (!extracted) {
      continue;
    }
    const label = (extracted.role === "assistant") ? "Assistant" : "User";
    lines.push(": ");
  }
  return lines;
}
function loadSubagentSessionEntry(params, childKey) {
  const parsed = parseAgentSessionKey(childKey);
  const storePath = resolveStorePath(params.cfg.session?.store, { agentId: parsed?.agentId });
  const store = loadSessionStore(storePath);
  return { storePath, store, entry: store[childKey] };
}
export const handleSubagentsCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const normalized = params.command.commandBodyNormalized;
  if (!normalized.startsWith(COMMAND)) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    logVerbose("Ignoring /subagents from unauthorized sender: ");
    return { shouldContinue: false };
  }
  const rest = normalized.slice(COMMAND.length).trim();
  const [actionRaw, ...restTokens] = rest.split(/\s+/).filter(Boolean);
  const action = (actionRaw?.toLowerCase() || "list");
  if (!ACTIONS.has(action)) {
    return { shouldContinue: false, reply: { text: buildSubagentsHelp() } };
  }
  const requesterKey = resolveRequesterSessionKey(params);
  if (!requesterKey) {
    return { shouldContinue: false, reply: { text: "⚠️ Missing session key." } };
  }
  const runs = listSubagentRunsForRequester(requesterKey);
  if ((action === "help")) {
    return { shouldContinue: false, reply: { text: buildSubagentsHelp() } };
  }
  if ((action === "list")) {
    if ((runs.length === 0)) {
      return { shouldContinue: false, reply: { text: "🧭 Subagents: none for this session." } };
    }
    const sorted = sortSubagentRuns(runs);
    const active = sorted.filter((entry) => !entry.endedAt);
    const done = (sorted.length - active.length);
    const lines = ["🧭 Subagents (current session)", "Active:  · Done: "];
    sorted.forEach((entry, index) => {
      const status = formatRunStatus(entry);
      const label = formatRunLabel(entry);
      const runtime = (entry.endedAt && entry.startedAt) ? formatDurationShort((entry.endedAt - entry.startedAt)) : formatAgeShort((Date.now() - (entry.startedAt ?? entry.createdAt)));
      const runId = entry.runId.slice(0, 8);
      lines.push(")  ·  ·  · run  · ");
    });
    return { shouldContinue: false, reply: { text: lines.join("
") } };
  }
  if ((action === "stop")) {
    const target = restTokens[0];
    if (!target) {
      return { shouldContinue: false, reply: { text: "⚙️ Usage: /subagents stop <id|#|all>" } };
    }
    if (((target === "all") || (target === "*"))) {
      const {stopped} = stopSubagentsForRequester({ cfg: params.cfg, requesterSessionKey: requesterKey });
      const label = (stopped === 1) ? "subagent" : "subagents";
      return { shouldContinue: false, reply: { text: "⚙️ Stopped  ." } };
    }
    const resolved = resolveSubagentTarget(runs, target);
    if (!resolved.entry) {
      return { shouldContinue: false, reply: { text: "⚠️ " } };
    }
    if (resolved.entry.endedAt) {
      return { shouldContinue: false, reply: { text: "⚙️ Subagent already finished." } };
    }
    const childKey = resolved.entry.childSessionKey;
    const {storePath, store, entry} = loadSubagentSessionEntry(params, childKey);
    const sessionId = entry?.sessionId;
    if (sessionId) {
      abortEmbeddedPiRun(sessionId);
    }
    const cleared = clearSessionQueues([childKey, sessionId]);
    if (((cleared.followupCleared > 0) || (cleared.laneCleared > 0))) {
      logVerbose("subagents stop: cleared followups= lane= keys=");
    }
    if (entry) {
      entry.abortedLastRun = true;
      entry.updatedAt = Date.now();
      store[childKey] = entry;
      await updateSessionStore(storePath, (nextStore) => {
        nextStore[childKey] = entry;
      });
    }
    return { shouldContinue: false, reply: { text: "⚙️ Stop requested for ." } };
  }
  if ((action === "info")) {
    const target = restTokens[0];
    if (!target) {
      return { shouldContinue: false, reply: { text: "ℹ️ Usage: /subagents info <id|#>" } };
    }
    const resolved = resolveSubagentTarget(runs, target);
    if (!resolved.entry) {
      return { shouldContinue: false, reply: { text: "⚠️ " } };
    }
    const run = resolved.entry;
    const {entry: sessionEntry} = loadSubagentSessionEntry(params, run.childSessionKey);
    const runtime = (run.startedAt && Number.isFinite(run.startedAt)) ? formatDurationShort(((run.endedAt ?? Date.now()) - run.startedAt)) : "n/a";
    const outcome = run.outcome ? "" : "n/a";
    const lines = ["ℹ️ Subagent info", "Status: ", "Label: ", "Task: ", "Run: ", "Session: ", "SessionId: ", "Transcript: ", "Runtime: ", "Created: ", "Started: ", "Ended: ", "Cleanup: ", run.archiveAtMs ? "Archive: " : undefined, run.cleanupHandled ? "Cleanup handled: yes" : undefined, "Outcome: "].filter(Boolean);
    return { shouldContinue: false, reply: { text: lines.join("
") } };
  }
  if ((action === "log")) {
    const target = restTokens[0];
    if (!target) {
      return { shouldContinue: false, reply: { text: "📜 Usage: /subagents log <id|#> [limit]" } };
    }
    const includeTools = restTokens.some((token) => (token.toLowerCase() === "tools"));
    const limitToken = restTokens.find((token) => /^\d+$/.test(token));
    const limit = limitToken ? Math.min(200, Math.max(1, Number.parseInt(limitToken, 10))) : 20;
    const resolved = resolveSubagentTarget(runs, target);
    if (!resolved.entry) {
      return { shouldContinue: false, reply: { text: "⚠️ " } };
    }
    const history = await callGateway({ method: "chat.history", params: { sessionKey: resolved.entry.childSessionKey, limit } });
    const rawMessages = Array.isArray(history?.messages) ? history.messages : [];
    const filtered = includeTools ? rawMessages : stripToolMessages(rawMessages);
    const lines = formatLogLines(filtered);
    const header = "📜 Subagent log: ";
    if ((lines.length === 0)) {
      return { shouldContinue: false, reply: { text: "
(no messages)" } };
    }
    return { shouldContinue: false, reply: { text: [header, ...lines].join("
") } };
  }
  if ((action === "send")) {
    const target = restTokens[0];
    const message = restTokens.slice(1).join(" ").trim();
    if ((!target || !message)) {
      return { shouldContinue: false, reply: { text: "✉️ Usage: /subagents send <id|#> <message>" } };
    }
    const resolved = resolveSubagentTarget(runs, target);
    if (!resolved.entry) {
      return { shouldContinue: false, reply: { text: "⚠️ " } };
    }
    const idempotencyKey = crypto.randomUUID();
    let runId = idempotencyKey;
    try {
      {
        const response = await callGateway({ method: "agent", params: { message, sessionKey: resolved.entry.childSessionKey, idempotencyKey, deliver: false, channel: INTERNAL_MESSAGE_CHANNEL, lane: AGENT_LANE_SUBAGENT }, timeoutMs: 10000 });
        if (response?.runId) {
          runId = response.runId;
        }
      }
    }
    catch (err) {
      {
        const messageText = (err instanceof Error) ? err.message : (typeof err === "string") ? err : "error";
        return { shouldContinue: false, reply: { text: "⚠️ Send failed: " } };
      }
    }
    const waitMs = 30000;
    const wait = await callGateway({ method: "agent.wait", params: { runId, timeoutMs: waitMs }, timeoutMs: (waitMs + 2000) });
    if ((wait?.status === "timeout")) {
      return { shouldContinue: false, reply: { text: "⏳ Subagent still running (run )." } };
    }
    if ((wait?.status === "error")) {
      return { shouldContinue: false, reply: { text: "⚠️ Subagent error:  (run )." } };
    }
    const history = await callGateway({ method: "chat.history", params: { sessionKey: resolved.entry.childSessionKey, limit: 50 } });
    const filtered = stripToolMessages(Array.isArray(history?.messages) ? history.messages : []);
    const last = (filtered.length > 0) ? filtered[(filtered.length - 1)] : undefined;
    const replyText = last ? extractAssistantText(last) : undefined;
    return { shouldContinue: false, reply: { text: (replyText ?? "✅ Sent to  (run ).") } };
  }
  return { shouldContinue: false, reply: { text: buildSubagentsHelp() } };
}
