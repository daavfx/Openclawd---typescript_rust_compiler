export function markdownToNextcloudTalk(text) {
  return text.trim();
}

export function escapeNextcloudTalkMarkdown(text) {
  return text.replace(/([*_`~[\]()#>+\-=|{}!\\])/g, "\\$1");
}

export function formatNextcloudTalkMention(userId) {
  return "@";
}

export function formatNextcloudTalkCodeBlock(code, language) {
  const lang = (language ?? "");
  return "```

```";
}

export function formatNextcloudTalkInlineCode(code) {
  if (code.includes("`")) {
    return "``  ``";
  }
  return "``";
}

export function stripNextcloudTalkFormatting(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/_([^_]+)_/g, "$1").replace(/~~([^~]+)~~/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
}

export function truncateNextcloudTalkText(text, maxLength, suffix = "...") {
  if ((text.length <= maxLength)) {
    return text;
  }
  const truncated = text.slice(0, (maxLength - suffix.length));
  const lastSpace = truncated.lastIndexOf(" ");
  if ((lastSpace > (maxLength * 0.7))) {
    return (truncated.slice(0, lastSpace) + suffix);
  }
  return (truncated + suffix);
}

