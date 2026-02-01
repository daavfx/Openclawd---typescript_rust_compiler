import { scot, da } from "@urbit/aura";
export 
export async function sendDm({api, fromShip, toShip, text}) {
  const story = [{ inline: [text] }];
  const sentAt = Date.now();
  const idUd = scot("ud", da.fromUnix(sentAt));
  const id = "/";
  const delta = { add: { memo: { content: story, author: fromShip, sent: sentAt }, kind: null, time: null } };
  const action = { ship: toShip, diff: { id, delta } };
  await api.poke({ app: "chat", mark: "chat-dm-action", json: action });
  return { channel: "tlon", messageId: id };
}

export async function sendGroupMessage({api, fromShip, hostShip, channelName, text, replyToId}) {
  const story = [{ inline: [text] }];
  const sentAt = Date.now();
  let formattedReplyId = replyToId;
  if ((replyToId && /^\d+$/.test(replyToId))) {
    try {
      {
        formattedReplyId = formatUd(BigInt(replyToId));
      }
    }
    catch {
      {
      }
    }
  }
  const action = { channel: { nest: "chat//", action: formattedReplyId ? { post: { reply: { id: formattedReplyId, action: { add: { content: story, author: fromShip, sent: sentAt } } } } } : { post: { add: { content: story, author: fromShip, sent: sentAt, kind: "/chat", blob: null, meta: null } } } } };
  await api.poke({ app: "channels", mark: "channel-action-1", json: action });
  return { channel: "tlon", messageId: "/" };
}

export function buildMediaText(text, mediaUrl) {
  const cleanText = (text?.trim() ?? "");
  const cleanUrl = (mediaUrl?.trim() ?? "");
  if ((cleanText && cleanUrl)) {
    return "
";
  }
  if (cleanUrl) {
    return cleanUrl;
  }
  return cleanText;
}

