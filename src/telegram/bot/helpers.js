import { formatLocationText } from "../../channels/location.js";
const TELEGRAM_GENERAL_TOPIC_ID = 1;
export function resolveTelegramForumThreadId(params) {
  if (!params.isForum) {
    return undefined;
  }
  if ((params.messageThreadId == null)) {
    return TELEGRAM_GENERAL_TOPIC_ID;
  }
  return params.messageThreadId;
}

export function buildTelegramThreadParams(messageThreadId) {
  if ((messageThreadId == null)) {
    return undefined;
  }
  const normalized = Math.trunc(messageThreadId);
  if ((normalized === TELEGRAM_GENERAL_TOPIC_ID)) {
    return undefined;
  }
  return { message_thread_id: normalized };
}

export function buildTypingThreadParams(messageThreadId) {
  if ((messageThreadId == null)) {
    return undefined;
  }
  return { message_thread_id: Math.trunc(messageThreadId) };
}

export function resolveTelegramStreamMode(telegramCfg) {
  const raw = telegramCfg?.streamMode?.trim().toLowerCase();
  if ((((raw === "off") || (raw === "partial")) || (raw === "block"))) {
    return raw;
  }
  return "partial";
}

export function buildTelegramGroupPeerId(chatId, messageThreadId) {
  return (messageThreadId != null) ? ":topic:" : String(chatId);
}

export function buildTelegramGroupFrom(chatId, messageThreadId) {
  return "telegram:group:";
}

export function buildSenderName(msg) {
  const name = ([msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ").trim() || msg.from?.username);
  return (name || undefined);
}

export function buildSenderLabel(msg, senderId) {
  const name = buildSenderName(msg);
  const username = msg.from?.username ? "@" : undefined;
  let label = name;
  if ((name && username)) {
    label = " ()";
  } else {
    if ((!name && username)) {
      label = username;
    }
  }
  const normalizedSenderId = ((senderId != null) && "".trim()) ? "".trim() : undefined;
  const fallbackId = (normalizedSenderId ?? (msg.from?.id != null) ? String(msg.from.id) : undefined);
  const idPart = fallbackId ? "id:" : undefined;
  if ((label && idPart)) {
    return " ";
  }
  if (label) {
    return label;
  }
  return (idPart ?? "id:unknown");
}

export function buildGroupLabel(msg, chatId, messageThreadId) {
  const title = msg.chat?.title;
  const topicSuffix = (messageThreadId != null) ? " topic:" : "";
  if (title) {
    return " id:";
  }
  return "group:";
}

export function hasBotMention(msg, botUsername) {
  const text = ((msg.text ?? msg.caption) ?? "").toLowerCase();
  if (text.includes("@")) {
    return true;
  }
  const entities = ((msg.entities ?? msg.caption_entities) ?? []);
  for (const ent of entities) {
    if ((ent.type !== "mention")) {
      continue;
    }
    const slice = ((msg.text ?? msg.caption) ?? "").slice(ent.offset, (ent.offset + ent.length));
    if ((slice.toLowerCase() === "@")) {
      return true;
    }
  }
  return false;
}

export function expandTextLinks(text, entities) {
  if ((!text || !entities?.length)) {
    return text;
  }
  const textLinks = entities.filter((entity) => ((entity.type === "text_link") && Boolean(entity.url))).sort((a, b) => (b.offset - a.offset));
  if ((textLinks.length === 0)) {
    return text;
  }
  let result = text;
  for (const entity of textLinks) {
    const linkText = text.slice(entity.offset, (entity.offset + entity.length));
    const markdown = "[]()";
    result = ((result.slice(0, entity.offset) + markdown) + result.slice((entity.offset + entity.length)));
  }
  return result;
}

export function resolveTelegramReplyId(raw) {
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

export 
export function describeReplyTarget(msg) {
  const reply = msg.reply_to_message;
  const quote = msg.quote;
  let body = "";
  let kind = "reply";
  if (quote?.text) {
    body = quote.text.trim();
    if (body) {
      kind = "quote";
    }
  }
  if ((!body && reply)) {
    const replyBody = ((reply.text ?? reply.caption) ?? "").trim();
    body = replyBody;
    if (!body) {
      if (reply.photo) {
        body = "<media:image>";
      } else {
        if (reply.video) {
          body = "<media:video>";
        } else {
          if ((reply.audio || reply.voice)) {
            body = "<media:audio>";
          } else {
            if (reply.document) {
              body = "<media:document>";
            } else {
              const locationData = extractTelegramLocation(reply);
              if (locationData) {
                body = formatLocationText(locationData);
              }
            }
          }
        }
      }
    }
  }
  if (!body) {
    return null;
  }
  const sender = reply ? buildSenderName(reply) : undefined;
  const senderLabel = sender ? "" : "unknown sender";
  return { id: reply?.message_id ? String(reply.message_id) : undefined, sender: senderLabel, body, kind };
}

export 
function normalizeForwardedUserLabel(user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  const username = (user.username?.trim() || undefined);
  const id = (user.id != null) ? String(user.id) : undefined;
  const display = ((name && username) ? " (@)" : (name || username ? "@" : undefined) || id ? "user:" : undefined);
  return { display, name: (name || undefined), username, id };
}
function normalizeForwardedChatLabel(chat, fallbackKind) {
  const title = (chat.title?.trim() || undefined);
  const username = (chat.username?.trim() || undefined);
  const id = (chat.id != null) ? String(chat.id) : undefined;
  const display = ((title || username ? "@" : undefined) || id ? ":" : undefined);
  return { display, title, username, id };
}
function buildForwardedContextFromUser(params) {
  const {display, name, username, id} = normalizeForwardedUserLabel(params.user);
  if (!display) {
    return null;
  }
  return { from: display, date: params.date, fromType: params.type, fromId: id, fromUsername: username, fromTitle: name };
}
function buildForwardedContextFromHiddenName(params) {
  const trimmed = params.name?.trim();
  if (!trimmed) {
    return null;
  }
  return { from: trimmed, date: params.date, fromType: params.type, fromTitle: trimmed };
}
function buildForwardedContextFromChat(params) {
  const fallbackKind = ((params.type === "channel") || (params.type === "legacy_channel")) ? "channel" : "chat";
  const {display, title, username, id} = normalizeForwardedChatLabel(params.chat, fallbackKind);
  if (!display) {
    return null;
  }
  const signature = (params.signature?.trim() || undefined);
  const from = signature ? " ()" : display;
  return { from, date: params.date, fromType: params.type, fromId: id, fromUsername: username, fromTitle: title, fromSignature: signature };
}
function resolveForwardOrigin(origin, signature) {
  if (((origin.type === "user") && origin.sender_user)) {
    return buildForwardedContextFromUser({ user: origin.sender_user, date: origin.date, type: "user" });
  }
  if ((origin.type === "hidden_user")) {
    return buildForwardedContextFromHiddenName({ name: origin.sender_user_name, date: origin.date, type: "hidden_user" });
  }
  if (((origin.type === "chat") && origin.sender_chat)) {
    return buildForwardedContextFromChat({ chat: origin.sender_chat, date: origin.date, type: "chat", signature });
  }
  if (((origin.type === "channel") && origin.chat)) {
    return buildForwardedContextFromChat({ chat: origin.chat, date: origin.date, type: "channel", signature });
  }
  return null;
}
export function normalizeForwardedContext(msg) {
  const forwardMsg = msg;
  const signature = (forwardMsg.forward_signature?.trim() || undefined);
  if (forwardMsg.forward_origin) {
    const originContext = resolveForwardOrigin(forwardMsg.forward_origin, signature);
    if (originContext) {
      return originContext;
    }
  }
  if (forwardMsg.forward_from_chat) {
    const legacyType = (forwardMsg.forward_from_chat.type === "channel") ? "legacy_channel" : "legacy_chat";
    const legacyContext = buildForwardedContextFromChat({ chat: forwardMsg.forward_from_chat, date: forwardMsg.forward_date, type: legacyType, signature });
    if (legacyContext) {
      return legacyContext;
    }
  }
  if (forwardMsg.forward_from) {
    const legacyContext = buildForwardedContextFromUser({ user: forwardMsg.forward_from, date: forwardMsg.forward_date, type: "legacy_user" });
    if (legacyContext) {
      return legacyContext;
    }
  }
  const hiddenContext = buildForwardedContextFromHiddenName({ name: forwardMsg.forward_sender_name, date: forwardMsg.forward_date, type: "legacy_hidden_user" });
  if (hiddenContext) {
    return hiddenContext;
  }
  return null;
}

export function extractTelegramLocation(msg) {
  const msgWithLocation = msg;
  const {venue, location} = msgWithLocation;
  if (venue) {
    return { latitude: venue.location.latitude, longitude: venue.location.longitude, accuracy: venue.location.horizontal_accuracy, name: venue.title, address: venue.address, source: "place", isLive: false };
  }
  if (location) {
    const isLive = ((typeof location.live_period === "number") && (location.live_period > 0));
    return { latitude: location.latitude, longitude: location.longitude, accuracy: location.horizontal_accuracy, source: isLive ? "live" : "pin", isLive };
  }
  return null;
}

