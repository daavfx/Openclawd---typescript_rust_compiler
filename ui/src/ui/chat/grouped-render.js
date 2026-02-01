import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { toSanitizedMarkdownHtml } from "../markdown";
import { renderCopyAsMarkdownButton } from "./copy-as-markdown";
import { isToolResultMessage, normalizeRoleForGrouping } from "./message-normalizer";
import { extractTextCached, extractThinkingCached, formatReasoningMarkdown } from "./message-extract";
import { extractToolCards, renderToolCardSidebar } from "./tool-cards";
function extractImages(message) {
  const m = message;
  const content = m.content;
  const images = [];
  if (Array.isArray(content)) {
    for (const block of content) {
      if (((typeof block !== "object") || (block === null))) {
        continue;
      }
      const b = block;
      if ((b.type === "image")) {
        const source = b.source;
        if (((source?.type === "base64") && (typeof source.data === "string"))) {
          const data = source.data;
          const mediaType = (source.media_type || "image/png");
          const url = data.startsWith("data:") ? data : "data:;base64,";
          images.push({ url });
        } else {
          if ((typeof b.url === "string")) {
            images.push({ url: b.url });
          }
        }
      } else {
        if ((b.type === "image_url")) {
          const imageUrl = b.image_url;
          if ((typeof imageUrl?.url === "string")) {
            images.push({ url: imageUrl.url });
          }
        }
      }
    }
  }
  return images;
}
export function renderReadingIndicatorGroup(assistant) {
  return html("
    <div class=\"chat-group assistant\">
      
      <div class=\"chat-group-messages\">
        <div class=\"chat-bubble chat-reading-indicator\" aria-hidden=\"true\">
          <span class=\"chat-reading-indicator__dots\">
            <span></span><span></span><span></span>
          </span>
        </div>
      </div>
    </div>
  ");
}

export function renderStreamingGroup(text, startedAt, onOpenSidebar, assistant) {
  const timestamp = new Date(startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const name = (assistant?.name ?? "Assistant");
  return html("
    <div class=\"chat-group assistant\">
      
      <div class=\"chat-group-messages\">
        
        <div class=\"chat-group-footer\">
          <span class=\"chat-sender-name\"></span>
          <span class=\"chat-group-timestamp\"></span>
        </div>
      </div>
    </div>
  ");
}

export function renderMessageGroup(group, opts) {
  const normalizedRole = normalizeRoleForGrouping(group.role);
  const assistantName = (opts.assistantName ?? "Assistant");
  const who = (normalizedRole === "user") ? "You" : (normalizedRole === "assistant") ? assistantName : normalizedRole;
  const roleClass = (normalizedRole === "user") ? "user" : (normalizedRole === "assistant") ? "assistant" : "other";
  const timestamp = new Date(group.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return html("
    <div class=\"chat-group \">
      
      <div class=\"chat-group-messages\">
        
        <div class=\"chat-group-footer\">
          <span class=\"chat-sender-name\"></span>
          <span class=\"chat-group-timestamp\"></span>
        </div>
      </div>
    </div>
  ");
}

function renderAvatar(role, assistant) {
  const normalized = normalizeRoleForGrouping(role);
  const assistantName = (assistant?.name?.trim() || "Assistant");
  const assistantAvatar = (assistant?.avatar?.trim() || "");
  const initial = (normalized === "user") ? "U" : (normalized === "assistant") ? (assistantName.charAt(0).toUpperCase() || "A") : (normalized === "tool") ? "⚙" : "?";
  const className = (normalized === "user") ? "user" : (normalized === "assistant") ? "assistant" : (normalized === "tool") ? "tool" : "other";
  if ((assistantAvatar && (normalized === "assistant"))) {
    if (isAvatarUrl(assistantAvatar)) {
      return html("<img
        class=\"chat-avatar \"
        src=\"\"
        alt=\"\"
      />");
    }
    return html("<div class=\"chat-avatar \"></div>");
  }
  return html("<div class=\"chat-avatar \"></div>");
}
function isAvatarUrl(value) {
  return ((/^https?:\/\//i.test(value) || /^data:image\//i.test(value)) || /^\//.test(value));
}
function renderMessageImages(images) {
  if ((images.length === 0)) {
    return nothing;
  }
  return html("
    <div class=\"chat-message-images\">
      
    </div>
  ");
}
function renderGroupedMessage(message, opts, onOpenSidebar) {
  const m = message;
  const role = (typeof m.role === "string") ? m.role : "unknown";
  const isToolResult = ((((isToolResultMessage(message) || (role.toLowerCase() === "toolresult")) || (role.toLowerCase() === "tool_result")) || (typeof m.toolCallId === "string")) || (typeof m.tool_call_id === "string"));
  const toolCards = extractToolCards(message);
  const hasToolCards = (toolCards.length > 0);
  const images = extractImages(message);
  const hasImages = (images.length > 0);
  const extractedText = extractTextCached(message);
  const extractedThinking = (opts.showReasoning && (role === "assistant")) ? extractThinkingCached(message) : null;
  const markdownBase = extractedText?.trim() ? extractedText : null;
  const reasoningMarkdown = extractedThinking ? formatReasoningMarkdown(extractedThinking) : null;
  const markdown = markdownBase;
  const canCopyMarkdown = ((role === "assistant") && Boolean(markdown?.trim()));
  const bubbleClasses = ["chat-bubble", canCopyMarkdown ? "has-copy" : "", opts.isStreaming ? "streaming" : "", "fade-in"].filter(Boolean).join(" ");
  if (((!markdown && hasToolCards) && isToolResult)) {
    return html("");
  }
  if (((!markdown && !hasToolCards) && !hasImages)) {
    return nothing;
  }
  return html("
    <div class=\"\">
      
      
      
      
      
    </div>
  ");
}
