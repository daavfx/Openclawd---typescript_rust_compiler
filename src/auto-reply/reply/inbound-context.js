import { normalizeChatType } from "../../channels/chat-type.js";
import { resolveConversationLabel } from "../../channels/conversation-label.js";
import { formatInboundBodyWithSenderMeta } from "./inbound-sender-meta.js";
import { normalizeInboundTextNewlines } from "./inbound-text.js";
export 
function normalizeTextField(value) {
  if ((typeof value !== "string")) {
    return undefined;
  }
  return normalizeInboundTextNewlines(value);
}
export function finalizeInboundContext(ctx, opts = {  }) {
  const normalized = ctx;
  normalized.Body = normalizeInboundTextNewlines((typeof normalized.Body === "string") ? normalized.Body : "");
  normalized.RawBody = normalizeTextField(normalized.RawBody);
  normalized.CommandBody = normalizeTextField(normalized.CommandBody);
  normalized.Transcript = normalizeTextField(normalized.Transcript);
  normalized.ThreadStarterBody = normalizeTextField(normalized.ThreadStarterBody);
  const chatType = normalizeChatType(normalized.ChatType);
  if ((chatType && (opts.forceChatType || (normalized.ChatType !== chatType)))) {
    normalized.ChatType = chatType;
  }
  const bodyForAgentSource = opts.forceBodyForAgent ? normalized.Body : (normalized.BodyForAgent ?? normalized.Body);
  normalized.BodyForAgent = normalizeInboundTextNewlines(bodyForAgentSource);
  const bodyForCommandsSource = opts.forceBodyForCommands ? ((normalized.CommandBody ?? normalized.RawBody) ?? normalized.Body) : (((normalized.BodyForCommands ?? normalized.CommandBody) ?? normalized.RawBody) ?? normalized.Body);
  normalized.BodyForCommands = normalizeInboundTextNewlines(bodyForCommandsSource);
  const explicitLabel = normalized.ConversationLabel?.trim();
  if ((opts.forceConversationLabel || !explicitLabel)) {
    const resolved = resolveConversationLabel(normalized)?.trim();
    if (resolved) {
      normalized.ConversationLabel = resolved;
    }
  } else {
    normalized.ConversationLabel = explicitLabel;
  }
  normalized.Body = formatInboundBodyWithSenderMeta({ ctx: normalized, body: normalized.Body });
  normalized.BodyForAgent = formatInboundBodyWithSenderMeta({ ctx: normalized, body: normalized.BodyForAgent });
  normalized.CommandAuthorized = (normalized.CommandAuthorized === true);
  return normalized;
}

