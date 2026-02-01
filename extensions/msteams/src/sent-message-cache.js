const TTL_MS = (((24 * 60) * 60) * 1000);
const sentMessages = new Map();
function cleanupExpired(entry) {
  const now = Date.now();
  for (const [msgId, timestamp] of entry.timestamps) {
    if (((now - timestamp) > TTL_MS)) {
      entry.messageIds.delete(msgId);
      entry.timestamps.delete(msgId);
    }
  }
}
export function recordMSTeamsSentMessage(conversationId, messageId) {
  if ((!conversationId || !messageId)) {
    return;
  }
  let entry = sentMessages.get(conversationId);
  if (!entry) {
    entry = { messageIds: new Set(), timestamps: new Map() };
    sentMessages.set(conversationId, entry);
  }
  entry.messageIds.add(messageId);
  entry.timestamps.set(messageId, Date.now());
  if ((entry.messageIds.size > 200)) {
    cleanupExpired(entry);
  }
}

export function wasMSTeamsMessageSent(conversationId, messageId) {
  const entry = sentMessages.get(conversationId);
  if (!entry) {
    return false;
  }
  cleanupExpired(entry);
  return entry.messageIds.has(messageId);
}

export function clearMSTeamsSentMessageCache() {
  sentMessages.clear();
}

