import { getChannelPlugin, normalizeChannelId as normalizeAnyChannelId } from "../../channels/plugins/index.js";
import { normalizeChannelId as normalizeChatChannelId } from "../../channels/registry.js";
const ANNOUNCE_SKIP_TOKEN = "ANNOUNCE_SKIP";
const REPLY_SKIP_TOKEN = "REPLY_SKIP";
const DEFAULT_PING_PONG_TURNS = 5;
const MAX_PING_PONG_TURNS = 5;
export 
export function resolveAnnounceTargetFromKey(sessionKey) {
  const rawParts = sessionKey.split(":").filter(Boolean);
  const parts = ((rawParts.length >= 3) && (rawParts[0] === "agent")) ? rawParts.slice(2) : rawParts;
  if ((parts.length < 3)) {
    return null;
  }
  const [channelRaw, kind, ...rest] = parts;
  if (((kind !== "group") && (kind !== "channel"))) {
    return null;
  }
  let threadId;
  const restJoined = rest.join(":");
  const topicMatch = restJoined.match(/:topic:(\d+)$/);
  const threadMatch = restJoined.match(/:thread:(\d+)$/);
  const match = (topicMatch || threadMatch);
  if (match) {
    threadId = match[1];
  }
  const id = match ? restJoined.replace(/:(topic|thread):\d+$/, "") : restJoined.trim();
  if (!id) {
    return null;
  }
  if (!channelRaw) {
    return null;
  }
  const normalizedChannel = (normalizeAnyChannelId(channelRaw) ?? normalizeChatChannelId(channelRaw));
  const channel = (normalizedChannel ?? channelRaw.toLowerCase());
  const kindTarget = () => {
    if (!normalizedChannel) {
      return id;
    }
    if (((normalizedChannel === "discord") || (normalizedChannel === "slack"))) {
      return "channel:";
    }
    return (kind === "channel") ? "channel:" : "group:";
  }();
  const normalized = normalizedChannel ? getChannelPlugin(normalizedChannel)?.messaging?.normalizeTarget?.(kindTarget) : undefined;
  return { channel, to: (normalized ?? kindTarget), threadId };
}

export function buildAgentToAgentMessageContext(params) {
  const lines = ["Agent-to-agent message context:", params.requesterSessionKey ? "Agent 1 (requester) session: ." : undefined, params.requesterChannel ? "Agent 1 (requester) channel: ." : undefined, "Agent 2 (target) session: ."].filter(Boolean);
  return lines.join("
");
}

export function buildAgentToAgentReplyContext(params) {
  const currentLabel = (params.currentRole === "requester") ? "Agent 1 (requester)" : "Agent 2 (target)";
  const lines = ["Agent-to-agent reply step:", "Current agent: .", "Turn  of .", params.requesterSessionKey ? "Agent 1 (requester) session: ." : undefined, params.requesterChannel ? "Agent 1 (requester) channel: ." : undefined, "Agent 2 (target) session: .", params.targetChannel ? "Agent 2 (target) channel: ." : undefined, "If you want to stop the ping-pong, reply exactly \"\"."].filter(Boolean);
  return lines.join("
");
}

export function buildAgentToAgentAnnounceContext(params) {
  const lines = ["Agent-to-agent announce step:", params.requesterSessionKey ? "Agent 1 (requester) session: ." : undefined, params.requesterChannel ? "Agent 1 (requester) channel: ." : undefined, "Agent 2 (target) session: .", params.targetChannel ? "Agent 2 (target) channel: ." : undefined, "Original request: ", params.roundOneReply ? "Round 1 reply: " : "Round 1 reply: (not available).", params.latestReply ? "Latest reply: " : "Latest reply: (not available).", "If you want to remain silent, reply exactly \"\".", "Any other reply will be posted to the target channel.", "After this reply, the agent-to-agent conversation is over."].filter(Boolean);
  return lines.join("
");
}

export function isAnnounceSkip(text) {
  return ((text ?? "").trim() === ANNOUNCE_SKIP_TOKEN);
}

export function isReplySkip(text) {
  return ((text ?? "").trim() === REPLY_SKIP_TOKEN);
}

export function resolvePingPongTurns(cfg) {
  const raw = cfg?.session?.agentToAgent?.maxPingPongTurns;
  const fallback = DEFAULT_PING_PONG_TURNS;
  if (((typeof raw !== "number") || !Number.isFinite(raw))) {
    return fallback;
  }
  const rounded = Math.floor(raw);
  return Math.max(0, Math.min(MAX_PING_PONG_TURNS, rounded));
}

