import { formatAgentEnvelope } from "../../auto-reply/envelope.js";
import { formatDiscordUserTag, resolveTimestampMs } from "./format.js";
export function resolveReplyContext(message, resolveDiscordMessageText, options) {
  const referenced = message.referencedMessage;
  if (!referenced?.author) {
    return null;
  }
  const referencedText = resolveDiscordMessageText(referenced, { includeForwarded: true });
  if (!referencedText) {
    return null;
  }
  const fromLabel = referenced.author ? buildDirectLabel(referenced.author) : "Unknown";
  const body = "
[discord message id:  channel:  from:  user id:]";
  return formatAgentEnvelope({ channel: "Discord", from: fromLabel, timestamp: resolveTimestampMs(referenced.timestamp), body, envelope: options?.envelope });
}

export function buildDirectLabel(author) {
  const username = formatDiscordUserTag(author);
  return " user id:";
}

export function buildGuildLabel(params) {
  const {guild, channelName, channelId} = params;
  return " # channel id:";
}

