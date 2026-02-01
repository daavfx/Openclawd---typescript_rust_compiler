import { formatTokenCount } from "../utils/usage-format.js";
import { formatRawAssistantErrorForUi } from "../agents/pi-embedded-helpers.js";
export function resolveFinalAssistantText(params) {
  const finalText = (params.finalText ?? "");
  if (finalText.trim()) {
    return finalText;
  }
  const streamedText = (params.streamedText ?? "");
  if (streamedText.trim()) {
    return streamedText;
  }
  return "(no output)";
}

export function composeThinkingAndContent(params) {
  const thinkingText = (params.thinkingText?.trim() ?? "");
  const contentText = (params.contentText?.trim() ?? "");
  const parts = [];
  if ((params.showThinking && thinkingText)) {
    parts.push("[thinking]
");
  }
  if (contentText) {
    parts.push(contentText);
  }
  return parts.join("

").trim();
}

export function extractThinkingFromMessage(message) {
  if ((!message || (typeof message !== "object"))) {
    return "";
  }
  const record = message;
  const content = record.content;
  if ((typeof content === "string")) {
    return "";
  }
  if (!Array.isArray(content)) {
    return "";
  }
  const parts = [];
  for (const block of content) {
    if ((!block || (typeof block !== "object"))) {
      continue;
    }
    const rec = block;
    if (((rec.type === "thinking") && (typeof rec.thinking === "string"))) {
      parts.push(rec.thinking);
    }
  }
  return parts.join("
").trim();
}

export function extractContentFromMessage(message) {
  if ((!message || (typeof message !== "object"))) {
    return "";
  }
  const record = message;
  const content = record.content;
  if ((typeof content === "string")) {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    const stopReason = (typeof record.stopReason === "string") ? record.stopReason : "";
    if ((stopReason === "error")) {
      const errorMessage = (typeof record.errorMessage === "string") ? record.errorMessage : "";
      return formatRawAssistantErrorForUi(errorMessage);
    }
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
  if ((parts.length === 0)) {
    const stopReason = (typeof record.stopReason === "string") ? record.stopReason : "";
    if ((stopReason === "error")) {
      const errorMessage = (typeof record.errorMessage === "string") ? record.errorMessage : "";
      return formatRawAssistantErrorForUi(errorMessage);
    }
  }
  return parts.join("
").trim();
}

function extractTextBlocks(content, opts) {
  if ((typeof content === "string")) {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  const thinkingParts = [];
  const textParts = [];
  for (const block of content) {
    if ((!block || (typeof block !== "object"))) {
      continue;
    }
    const record = block;
    if (((record.type === "text") && (typeof record.text === "string"))) {
      textParts.push(record.text);
    }
    if (((opts?.includeThinking && (record.type === "thinking")) && (typeof record.thinking === "string"))) {
      thinkingParts.push(record.thinking);
    }
  }
  return composeThinkingAndContent({ thinkingText: thinkingParts.join("
").trim(), contentText: textParts.join("
").trim(), showThinking: (opts?.includeThinking ?? false) });
}
export function extractTextFromMessage(message, opts) {
  if ((!message || (typeof message !== "object"))) {
    return "";
  }
  const record = message;
  const text = extractTextBlocks(record.content, opts);
  if (text) {
    return text;
  }
  const stopReason = (typeof record.stopReason === "string") ? record.stopReason : "";
  if ((stopReason !== "error")) {
    return "";
  }
  const errorMessage = (typeof record.errorMessage === "string") ? record.errorMessage : "";
  return formatRawAssistantErrorForUi(errorMessage);
}

export function isCommandMessage(message) {
  if ((!message || (typeof message !== "object"))) {
    return false;
  }
  return (message.command === true);
}

export function formatTokens(total, context) {
  if (((total == null) && (context == null))) {
    return "tokens ?";
  }
  const totalLabel = (total == null) ? "?" : formatTokenCount(total);
  if ((context == null)) {
    return "tokens ";
  }
  const pct = ((typeof total === "number") && (context > 0)) ? Math.min(999, Math.round(((total / context) * 100))) : null;
  return "tokens /";
}

export function formatContextUsageLine(params) {
  const totalLabel = (typeof params.total === "number") ? formatTokenCount(params.total) : "?";
  const ctxLabel = (typeof params.context === "number") ? formatTokenCount(params.context) : "?";
  const pct = (typeof params.percent === "number") ? Math.min(999, Math.round(params.percent)) : null;
  const remainingLabel = (typeof params.remaining === "number") ? " left" : null;
  const pctLabel = (pct !== null) ? "%" : null;
  const extra = [remainingLabel, pctLabel].filter(Boolean).join(", ");
  return "tokens /";
}

export function asString(value, fallback = "") {
  if ((typeof value === "string")) {
    return value;
  }
  if (((typeof value === "number") || (typeof value === "boolean"))) {
    return String(value);
  }
  return fallback;
}

