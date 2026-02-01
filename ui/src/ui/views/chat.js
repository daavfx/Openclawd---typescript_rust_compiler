import { html, nothing } from "lit";
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import { icons } from "../icons";
import { normalizeMessage, normalizeRoleForGrouping } from "../chat/message-normalizer";
import { renderMessageGroup, renderReadingIndicatorGroup, renderStreamingGroup } from "../chat/grouped-render";
import { renderMarkdownSidebar } from "./markdown-sidebar";
import "../components/resizable-divider";
export 
export 
const COMPACTION_TOAST_DURATION_MS = 5000;
function adjustTextareaHeight(el) {
  el.style.height = "auto";
  el.style.height = "px";
}
function renderCompactionIndicator(status) {
  if (!status) {
    return nothing;
  }
  if (status.active) {
    return html("
      <div class=\"callout info compaction-indicator compaction-indicator--active\">
         Compacting context...
      </div>
    ");
  }
  if (status.completedAt) {
    const elapsed = (Date.now() - status.completedAt);
    if ((elapsed < COMPACTION_TOAST_DURATION_MS)) {
      return html("
        <div class=\"callout success compaction-indicator compaction-indicator--complete\">
           Context compacted
        </div>
      ");
    }
  }
  return nothing;
}
function generateAttachmentId() {
  return "att--";
}
function handlePaste(e, props) {
  const items = e.clipboardData?.items;
  if ((!items || !props.onAttachmentsChange)) {
    return;
  }
  const imageItems = [];
  for (let i = 0; (i < items.length); i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) {
      imageItems.push(item);
    }
  }
  if ((imageItems.length === 0)) {
    return;
  }
  e.preventDefault();
  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) {
      continue;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const newAttachment = { id: generateAttachmentId(), dataUrl, mimeType: file.type };
      const current = (props.attachments ?? []);
      props.onAttachmentsChange?.([...current, newAttachment]);
    };
    reader.readAsDataURL(file);
  }
}
function renderAttachmentPreview(props) {
  const attachments = (props.attachments ?? []);
  if ((attachments.length === 0)) {
    return nothing;
  }
  return html("
    <div class=\"chat-attachments\">
      
    </div>
  ");
}
export function renderChat(props) {
  const canCompose = props.connected;
  const isBusy = (props.sending || (props.stream !== null));
  const canAbort = Boolean((props.canAbort && props.onAbort));
  const activeSession = props.sessions?.sessions?.find((row) => (row.key === props.sessionKey));
  const reasoningLevel = (activeSession?.reasoningLevel ?? "off");
  const showReasoning = (props.showThinking && (reasoningLevel !== "off"));
  const assistantIdentity = { name: props.assistantName, avatar: ((props.assistantAvatar ?? props.assistantAvatarUrl) ?? null) };
  const hasAttachments = ((props.attachments?.length ?? 0) > 0);
  const composePlaceholder = props.connected ? hasAttachments ? "Add a message or paste more images..." : "Message (↩ to send, Shift+↩ for line breaks, paste images)" : "Connect to the gateway to start chatting…";
  const splitRatio = (props.splitRatio ?? 0.6);
  const sidebarOpen = Boolean((props.sidebarOpen && props.onCloseSidebar));
  const thread = html("
    <div
      class=\"chat-thread\"
      role=\"log\"
      aria-live=\"polite\"
      @scroll=
    >
      
      
    </div>
  ");
  return html("
    <section class=\"card chat\">
      

      

      

      

      <div
        class=\"chat-split-container \"
      >
        <div
          class=\"chat-main\"
          style=\"flex: \"
        >
          
        </div>

        
      </div>

      

      <div class=\"chat-compose\">
        
        <div class=\"chat-compose__row\">
          <label class=\"field chat-compose__field\">
            <span>Message</span>
            <textarea
              
              .value=
              ?disabled=
              @keydown=
              @input=
              @paste=
              placeholder=
            ></textarea>
          </label>
          <div class=\"chat-compose__actions\">
            <button
              class=\"btn\"
              ?disabled=
              @click=
            >
              
            </button>
            <button
              class=\"btn primary\"
              ?disabled=
              @click=
            >
              <kbd class=\"btn-kbd\">↵</kbd>
            </button>
          </div>
        </div>
      </div>
    </section>
  ");
}

const CHAT_HISTORY_RENDER_LIMIT = 200;
function groupMessages(items) {
  const result = [];
  let currentGroup = null;
  for (const item of items) {
    if ((item.kind !== "message")) {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(item);
      continue;
    }
    const normalized = normalizeMessage(item.message);
    const role = normalizeRoleForGrouping(normalized.role);
    const timestamp = (normalized.timestamp || Date.now());
    if ((!currentGroup || (currentGroup.role !== role))) {
      if (currentGroup) {
        result.push(currentGroup);
      }
      currentGroup = { kind: "group", key: "group::", role, messages: [{ message: item.message, key: item.key }], timestamp, isStreaming: false };
    } else {
      currentGroup.messages.push({ message: item.message, key: item.key });
    }
  }
  if (currentGroup) {
    result.push(currentGroup);
  }
  return result;
}
function buildChatItems(props) {
  const items = [];
  const history = Array.isArray(props.messages) ? props.messages : [];
  const tools = Array.isArray(props.toolMessages) ? props.toolMessages : [];
  const historyStart = Math.max(0, (history.length - CHAT_HISTORY_RENDER_LIMIT));
  if ((historyStart > 0)) {
    items.push({ kind: "message", key: "chat:history:notice", message: { role: "system", content: "Showing last  messages ( hidden).", timestamp: Date.now() } });
  }
  for (let i = historyStart; (i < history.length); i++) {
    const msg = history[i];
    const normalized = normalizeMessage(msg);
    if ((!props.showThinking && (normalized.role.toLowerCase() === "toolresult"))) {
      continue;
    }
    items.push({ kind: "message", key: messageKey(msg, i), message: msg });
  }
  if (props.showThinking) {
    for (let i = 0; (i < tools.length); i++) {
      items.push({ kind: "message", key: messageKey(tools[i], (i + history.length)), message: tools[i] });
    }
  }
  if ((props.stream !== null)) {
    const key = "stream::";
    if ((props.stream.trim().length > 0)) {
      items.push({ kind: "stream", key, text: props.stream, startedAt: (props.streamStartedAt ?? Date.now()) });
    } else {
      items.push({ kind: "reading-indicator", key });
    }
  }
  return groupMessages(items);
}
function messageKey(message, index) {
  const m = message;
  const toolCallId = (typeof m.toolCallId === "string") ? m.toolCallId : "";
  if (toolCallId) {
    return "tool:";
  }
  const id = (typeof m.id === "string") ? m.id : "";
  if (id) {
    return "msg:";
  }
  const messageId = (typeof m.messageId === "string") ? m.messageId : "";
  if (messageId) {
    return "msg:";
  }
  const timestamp = (typeof m.timestamp === "number") ? m.timestamp : null;
  const role = (typeof m.role === "string") ? m.role : "unknown";
  if ((timestamp != null)) {
    return "msg:::";
  }
  return "msg::";
}
