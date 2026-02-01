import { resolveBlueBubblesAccount } from "./accounts.js";
import { blueBubblesFetchWithTimeout, buildBlueBubblesApiUrl } from "./types.js";
export 
const REACTION_TYPES = new Set(["love", "like", "dislike", "laugh", "emphasize", "question"]);
const REACTION_ALIASES = new Map([["heart", "love"], ["love", "love"], ["❤", "love"], ["❤️", "love"], ["red_heart", "love"], ["thumbs_up", "like"], ["thumbsup", "like"], ["thumbs-up", "like"], ["thumbsup", "like"], ["like", "like"], ["thumb", "like"], ["ok", "like"], ["thumbs_down", "dislike"], ["thumbsdown", "dislike"], ["thumbs-down", "dislike"], ["dislike", "dislike"], ["boo", "dislike"], ["no", "dislike"], ["haha", "laugh"], ["lol", "laugh"], ["lmao", "laugh"], ["rofl", "laugh"], ["😂", "laugh"], ["🤣", "laugh"], ["xd", "laugh"], ["laugh", "laugh"], ["emphasis", "emphasize"], ["emphasize", "emphasize"], ["exclaim", "emphasize"], ["!!", "emphasize"], ["‼", "emphasize"], ["‼️", "emphasize"], ["❗", "emphasize"], ["important", "emphasize"], ["bang", "emphasize"], ["question", "question"], ["?", "question"], ["❓", "question"], ["❔", "question"], ["ask", "question"], ["loved", "love"], ["liked", "like"], ["disliked", "dislike"], ["laughed", "laugh"], ["emphasized", "emphasize"], ["questioned", "question"], ["fire", "love"], ["🔥", "love"], ["wow", "emphasize"], ["!", "emphasize"], ["heart_eyes", "love"], ["smile", "laugh"], ["smiley", "laugh"], ["happy", "laugh"], ["joy", "laugh"]]);
const REACTION_EMOJIS = new Map([["❤️", "love"], ["❤", "love"], ["♥️", "love"], ["♥", "love"], ["😍", "love"], ["💕", "love"], ["👍", "like"], ["👌", "like"], ["👎", "dislike"], ["🙅", "dislike"], ["😂", "laugh"], ["🤣", "laugh"], ["😆", "laugh"], ["😁", "laugh"], ["😹", "laugh"], ["‼️", "emphasize"], ["‼", "emphasize"], ["!!", "emphasize"], ["❗", "emphasize"], ["❕", "emphasize"], ["!", "emphasize"], ["❓", "question"], ["❔", "question"], ["?", "question"]]);
function resolveAccount(params) {
  const account = resolveBlueBubblesAccount({ cfg: (params.cfg ?? {  }), accountId: params.accountId });
  const baseUrl = (params.serverUrl?.trim() || account.config.serverUrl?.trim());
  const password = (params.password?.trim() || account.config.password?.trim());
  if (!baseUrl) {
    throw new Error("BlueBubbles serverUrl is required");
  }
  if (!password) {
    throw new Error("BlueBubbles password is required");
  }
  return { baseUrl, password };
}
export function normalizeBlueBubblesReactionInput(emoji, remove) {
  const trimmed = emoji.trim();
  if (!trimmed) {
    throw new Error("BlueBubbles reaction requires an emoji or name.");
  }
  let raw = trimmed.toLowerCase();
  if (raw.startsWith("-")) {
    raw = raw.slice(1);
  }
  const aliased = (REACTION_ALIASES.get(raw) ?? raw);
  const mapped = ((REACTION_EMOJIS.get(trimmed) ?? REACTION_EMOJIS.get(raw)) ?? aliased);
  if (!REACTION_TYPES.has(mapped)) {
    throw new Error("Unsupported BlueBubbles reaction: ");
  }
  return remove ? "-" : mapped;
}

export async function sendBlueBubblesReaction(params) {
  const chatGuid = params.chatGuid.trim();
  const messageGuid = params.messageGuid.trim();
  if (!chatGuid) {
    throw new Error("BlueBubbles reaction requires chatGuid.");
  }
  if (!messageGuid) {
    throw new Error("BlueBubbles reaction requires messageGuid.");
  }
  const reaction = normalizeBlueBubblesReactionInput(params.emoji, params.remove);
  const {baseUrl, password} = resolveAccount((params.opts ?? {  }));
  const url = buildBlueBubblesApiUrl({ baseUrl, path: "/api/v1/message/react", password });
  const payload = { chatGuid, selectedMessageGuid: messageGuid, reaction, partIndex: (typeof params.partIndex === "number") ? params.partIndex : 0 };
  const res = await blueBubblesFetchWithTimeout(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, params.opts?.timeoutMs);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error("BlueBubbles reaction failed (): ");
  }
}

