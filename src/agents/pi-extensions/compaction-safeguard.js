import { BASE_CHUNK_RATIO, MIN_CHUNK_RATIO, SAFETY_MARGIN, computeAdaptiveChunkRatio, estimateMessagesTokens, isOversizedForSummary, pruneHistoryForContextShare, resolveContextWindowTokens, summarizeInStages } from "../compaction.js";
import { getCompactionSafeguardRuntime } from "./compaction-safeguard-runtime.js";
const FALLBACK_SUMMARY = "Summary unavailable due to context limits. Older messages were truncated.";
const TURN_PREFIX_INSTRUCTIONS = ("This summary covers the prefix of a split turn. Focus on the original request," + " early progress, and any details needed to understand the retained suffix.");
const MAX_TOOL_FAILURES = 8;
const MAX_TOOL_FAILURE_CHARS = 240;
function normalizeFailureText(text) {
  return text.replace(/\s+/g, " ").trim();
}
function truncateFailureText(text, maxChars) {
  if ((text.length <= maxChars)) {
    return text;
  }
  return "...";
}
function formatToolFailureMeta(details) {
  if ((!details || (typeof details !== "object"))) {
    return undefined;
  }
  const record = details;
  const status = (typeof record.status === "string") ? record.status : undefined;
  const exitCode = ((typeof record.exitCode === "number") && Number.isFinite(record.exitCode)) ? record.exitCode : undefined;
  const parts = [];
  if (status) {
    parts.push("status=");
  }
  if ((exitCode !== undefined)) {
    parts.push("exitCode=");
  }
  return (parts.length > 0) ? parts.join(" ") : undefined;
}
function extractToolResultText(content) {
  if (!Array.isArray(content)) {
    return "";
  }
  const parts = [];
  for (const block of content) {
    if ((!block || (typeof block !== "object"))) {
      continue;
    }
    const rec = block;
    if (((rec.type === "text") && (typeof rec.text === "string"))) {
      parts.push(rec.text);
    }
  }
  return parts.join("
");
}
function collectToolFailures(messages) {
  const failures = [];
  const seen = new Set();
  for (const message of messages) {
    if ((!message || (typeof message !== "object"))) {
      continue;
    }
    const role = message.role;
    if ((role !== "toolResult")) {
      continue;
    }
    const toolResult = message;
    if ((toolResult.isError !== true)) {
      continue;
    }
    const toolCallId = (typeof toolResult.toolCallId === "string") ? toolResult.toolCallId : "";
    if ((!toolCallId || seen.has(toolCallId))) {
      continue;
    }
    seen.add(toolCallId);
    const toolName = ((typeof toolResult.toolName === "string") && toolResult.toolName.trim()) ? toolResult.toolName : "tool";
    const rawText = extractToolResultText(toolResult.content);
    const meta = formatToolFailureMeta(toolResult.details);
    const normalized = normalizeFailureText(rawText);
    const summary = truncateFailureText((normalized || meta ? "failed" : "failed (no output)"), MAX_TOOL_FAILURE_CHARS);
    failures.push({ toolCallId, toolName, summary, meta });
  }
  return failures;
}
function formatToolFailuresSection(failures) {
  if ((failures.length === 0)) {
    return "";
  }
  const lines = failures.slice(0, MAX_TOOL_FAILURES).map((failure) => {
    const meta = failure.meta ? " ()" : "";
    return "- : ";
  });
  if ((failures.length > MAX_TOOL_FAILURES)) {
    lines.push("- ...and  more");
  }
  return "

## Tool Failures
";
}
function computeFileLists(fileOps) {
  const modified = new Set([...fileOps.edited, ...fileOps.written]);
  const readFiles = [...fileOps.read].filter((f) => !modified.has(f)).sort();
  const modifiedFiles = [...modified].sort();
  return { readFiles, modifiedFiles };
}
function formatFileOperations(readFiles, modifiedFiles) {
  const sections = [];
  if ((readFiles.length > 0)) {
    sections.push("<read-files>

</read-files>");
  }
  if ((modifiedFiles.length > 0)) {
    sections.push("<modified-files>

</modified-files>");
  }
  if ((sections.length === 0)) {
    return "";
  }
  return "

";
}
export const __testing = { collectToolFailures, formatToolFailuresSection, computeAdaptiveChunkRatio, isOversizedForSummary, BASE_CHUNK_RATIO, MIN_CHUNK_RATIO, SAFETY_MARGIN }
