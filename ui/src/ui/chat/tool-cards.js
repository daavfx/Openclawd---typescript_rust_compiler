import { html, nothing } from "lit";
import { formatToolDetail, resolveToolDisplay } from "../tool-display";
import { icons } from "../icons";
import { TOOL_INLINE_THRESHOLD } from "./constants";
import { formatToolOutputForSidebar, getTruncatedPreview } from "./tool-helpers";
import { isToolResultMessage } from "./message-normalizer";
import { extractTextCached } from "./message-extract";
export function extractToolCards(message) {
  const m = message;
  const content = normalizeContent(m.content);
  const cards = [];
  for (const item of content) {
    const kind = String((item.type ?? "")).toLowerCase();
    const isToolCall = (["toolcall", "tool_call", "tooluse", "tool_use"].includes(kind) || ((typeof item.name === "string") && (item.arguments != null)));
    if (isToolCall) {
      cards.push({ kind: "call", name: (item.name ?? "tool"), args: coerceArgs((item.arguments ?? item.args)) });
    }
  }
  for (const item of content) {
    const kind = String((item.type ?? "")).toLowerCase();
    if (((kind !== "toolresult") && (kind !== "tool_result"))) {
      continue;
    }
    const text = extractToolText(item);
    const name = (typeof item.name === "string") ? item.name : "tool";
    cards.push({ kind: "result", name, text });
  }
  if ((isToolResultMessage(message) && !cards.some((card) => (card.kind === "result")))) {
    const name = ((((typeof m.toolName === "string") && m.toolName) || ((typeof m.tool_name === "string") && m.tool_name)) || "tool");
    const text = (extractTextCached(message) ?? undefined);
    cards.push({ kind: "result", name, text });
  }
  return cards;
}

export function renderToolCardSidebar(card, onOpenSidebar) {
  const display = resolveToolDisplay({ name: card.name, args: card.args });
  const detail = formatToolDetail(display);
  const hasText = Boolean(card.text?.trim());
  const canClick = Boolean(onOpenSidebar);
  const handleClick = canClick ? () => {
    if (hasText) {
      onOpenSidebar(formatToolOutputForSidebar(card.text));
      return;
    }
    const info = "## 

*No output — tool completed successfully.*";
    onOpenSidebar(info);
  } : undefined;
  const isShort = (hasText && ((card.text?.length ?? 0) <= TOOL_INLINE_THRESHOLD));
  const showCollapsed = (hasText && !isShort);
  const showInline = (hasText && isShort);
  const isEmpty = !hasText;
  return html("
    <div
      class=\"chat-tool-card \"
      @click=
      role=
      tabindex=
      @keydown=
    >
      <div class=\"chat-tool-card__header\">
        <div class=\"chat-tool-card__title\">
          <span class=\"chat-tool-card__icon\"></span>
          <span></span>
        </div>
        
        
      </div>
      
      
      
      
    </div>
  ");
}

function normalizeContent(content) {
  if (!Array.isArray(content)) {
    return [];
  }
  return content.filter(Boolean);
}
function coerceArgs(value) {
  if ((typeof value !== "string")) {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  if ((!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return value;
  }
  try {
    {
      return JSON.parse(trimmed);
    }
  }
  catch {
    {
      return value;
    }
  }
}
function extractToolText(item) {
  if ((typeof item.text === "string")) {
    return item.text;
  }
  if ((typeof item.content === "string")) {
    return item.content;
  }
  return undefined;
}
