export function resolveDiscordSystemLocation(params) {
  const {isDirectMessage, isGroupDm, guild, channelName} = params;
  if (isDirectMessage) {
    return "DM";
  }
  if (isGroupDm) {
    return "Group DM #";
  }
  return guild?.name ? " #" : "#";
}

export function formatDiscordReactionEmoji(emoji) {
  if ((emoji.id && emoji.name)) {
    return ":";
  }
  return (emoji.name ?? "emoji");
}

export function formatDiscordUserTag(user) {
  const discriminator = (user.discriminator ?? "").trim();
  if ((discriminator && (discriminator !== "0"))) {
    return "#";
  }
  return (user.username ?? user.id);
}

export function resolveTimestampMs(timestamp) {
  if (!timestamp) {
    return undefined;
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? undefined : parsed;
}

