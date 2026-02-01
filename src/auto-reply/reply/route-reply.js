import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import { resolveEffectiveMessagesConfig } from "../../agents/identity.js";
import { normalizeChannelId } from "../../channels/plugins/index.js";
import { INTERNAL_MESSAGE_CHANNEL } from "../../utils/message-channel.js";
import { normalizeReplyPayload } from "./normalize-reply.js";
export 
export 
export async function routeReply(params) {
  const {payload, channel, to, accountId, threadId, cfg, abortSignal} = params;
  const responsePrefix = params.sessionKey ? resolveEffectiveMessagesConfig(cfg, resolveSessionAgentId({ sessionKey: params.sessionKey, config: cfg })).responsePrefix : (cfg.messages?.responsePrefix === "auto") ? undefined : cfg.messages?.responsePrefix;
  const normalized = normalizeReplyPayload(payload, { responsePrefix });
  if (!normalized) {
    return { ok: true };
  }
  let text = (normalized.text ?? "");
  let mediaUrls = (normalized.mediaUrls?.filter(Boolean) ?? []).length ? normalized.mediaUrls?.filter(Boolean) : normalized.mediaUrl ? [normalized.mediaUrl] : [];
  const replyToId = normalized.replyToId;
  if ((!text.trim() && (mediaUrls.length === 0))) {
    return { ok: true };
  }
  if ((channel === INTERNAL_MESSAGE_CHANNEL)) {
    return { ok: false, error: "Webchat routing not supported for queued replies" };
  }
  const channelId = (normalizeChannelId(channel) ?? null);
  if (!channelId) {
    return { ok: false, error: "Unknown channel: " };
  }
  if (abortSignal?.aborted) {
    return { ok: false, error: "Reply routing aborted" };
  }
  const resolvedReplyToId = (replyToId ?? (((channelId === "slack") && (threadId != null)) && (threadId !== "")) ? String(threadId) : undefined);
  const resolvedThreadId = (channelId === "slack") ? null : (threadId ?? null);
  try {
    {
      const {deliverOutboundPayloads} = await import("../../infra/outbound/deliver.js");
      const results = await deliverOutboundPayloads({ cfg, channel: channelId, to, accountId: (accountId ?? undefined), payloads: [normalized], replyToId: (resolvedReplyToId ?? null), threadId: resolvedThreadId, abortSignal, mirror: ((params.mirror !== false) && params.sessionKey) ? { sessionKey: params.sessionKey, agentId: resolveSessionAgentId({ sessionKey: params.sessionKey, config: cfg }), text, mediaUrls } : undefined });
      const last = results.at(-1);
      return { ok: true, messageId: last?.messageId };
    }
  }
  catch (err) {
    {
      const message = (err instanceof Error) ? err.message : String(err);
      return { ok: false, error: "Failed to route reply to : " };
    }
  }
}

export function isRoutableChannel(channel) {
  if ((!channel || (channel === INTERNAL_MESSAGE_CHANNEL))) {
    return false;
  }
  return (normalizeChannelId(channel) !== null);
}

