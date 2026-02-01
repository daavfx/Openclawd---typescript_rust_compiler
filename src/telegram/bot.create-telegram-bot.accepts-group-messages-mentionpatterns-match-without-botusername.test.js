import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeRegExp, formatEnvelopeTimestamp } from "../../test/helpers/envelope-timestamp.js";
let createTelegramBot;
let resetInboundDedupe;
const {sessionStorePath} = vi.hoisted(() => { sessionStorePath: "/tmp/openclaw-telegram-.json" });
const {loadWebMedia} = vi.hoisted(() => { loadWebMedia: vi.fn() });
vi.mock("../web/media.js", () => { loadWebMedia });
const {loadConfig} = vi.hoisted(() => { loadConfig: vi.fn(() => {  }) });
vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual: , loadConfig };
});
vi.mock("../config/sessions.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual: , resolveStorePath: vi.fn((storePath) => (storePath ?? sessionStorePath)) };
});
const {readTelegramAllowFromStore, upsertTelegramPairingRequest} = vi.hoisted(() => { readTelegramAllowFromStore: vi.fn(async () => []), upsertTelegramPairingRequest: vi.fn(async () => { code: "PAIRCODE", created: true }) });
vi.mock("./pairing-store.js", () => { readTelegramAllowFromStore, upsertTelegramPairingRequest });
const useSpy = vi.fn();
const middlewareUseSpy = vi.fn();
const onSpy = vi.fn();
const stopSpy = vi.fn();
const commandSpy = vi.fn();
const botCtorSpy = vi.fn();
const answerCallbackQuerySpy = vi.fn(async () => undefined);
const sendChatActionSpy = vi.fn();
const setMessageReactionSpy = vi.fn(async () => undefined);
const setMyCommandsSpy = vi.fn(async () => undefined);
const sendMessageSpy = vi.fn(async () => { message_id: 77 });
const sendAnimationSpy = vi.fn(async () => { message_id: 78 });
const sendPhotoSpy = vi.fn(async () => { message_id: 79 });
const apiStub = { config: { use: useSpy }, answerCallbackQuery: answerCallbackQuerySpy, sendChatAction: sendChatActionSpy, setMessageReaction: setMessageReactionSpy, setMyCommands: setMyCommandsSpy, sendMessage: sendMessageSpy, sendAnimation: sendAnimationSpy, sendPhoto: sendPhotoSpy };
vi.mock("grammy", () => { Bot: function() {
}, InputFile: function() {
}, webhookCallback: vi.fn() });
const sequentializeMiddleware = vi.fn();
const sequentializeSpy = vi.fn(() => sequentializeMiddleware);
let _sequentializeKey;
vi.mock("@grammyjs/runner", () => { sequentialize: (keyFn) => {
  _sequentializeKey = keyFn;
  return sequentializeSpy();
} });
const throttlerSpy = vi.fn(() => "throttler");
vi.mock("@grammyjs/transformer-throttler", () => { apiThrottler: () => throttlerSpy() });
vi.mock("../auto-reply/reply.js", () => {
  const replySpy = vi.fn(async (_ctx, opts) => {
    await opts?.onReplyStart?.();
    return undefined;
  });
  return { getReplyFromConfig: replySpy, __replySpy: replySpy };
});
let replyModule;
const getOnHandler = (event) => {
  const handler = onSpy.mock.calls.find((call) => (call[0] === event))?.[1];
  if (!handler) {
    throw new Error("Missing handler for event: ");
  }
  return handler;
};
const ORIGINAL_TZ = process.env.TZ;
describe("createTelegramBot", () => {
  beforeEach(async () => {
    vi.resetModules();
    { resetInboundDedupe } = await import("../auto-reply/reply/inbound-dedupe.js");
    { createTelegramBot } = await import("./bot.js");
    replyModule = await import("../auto-reply/reply.js");
    process.env.TZ = "UTC";
    resetInboundDedupe();
    loadConfig.mockReturnValue({ channels: { telegram: { dmPolicy: "open", allowFrom: ["*"] } } });
    loadWebMedia.mockReset();
    sendAnimationSpy.mockReset();
    sendPhotoSpy.mockReset();
    setMessageReactionSpy.mockReset();
    answerCallbackQuerySpy.mockReset();
    setMyCommandsSpy.mockReset();
    middlewareUseSpy.mockReset();
    sequentializeSpy.mockReset();
    botCtorSpy.mockReset();
    _sequentializeKey = undefined;
  });
  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ;
  });
  it("accepts group messages when mentionPatterns match (without @botUsername)", async () => {
    onSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ agents: { defaults: { envelopeTimezone: "utc" } }, identity: { name: "Bert" }, messages: { groupChat: { mentionPatterns: ["\\bbert\\b"] } }, channels: { telegram: { groupPolicy: "open", groups: { "*": { requireMention: true } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: 7, type: "group", title: "Test Group" }, text: "bert: introduce yourself", date: 1736380800, message_id: 1, from: { id: 9, first_name: "Ada" } }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).toHaveBeenCalledTimes(1);
    const payload = replySpy.mock.calls[0][0];
    expect(payload.WasMentioned).toBe(true);
    expect(payload.SenderName).toBe("Ada");
    expect(payload.SenderId).toBe("9");
    const expectedTimestamp = formatEnvelopeTimestamp(new Date("2025-01-09T00:00:00Z"));
    const timestampPattern = escapeRegExp(expectedTimestamp);
    expect(payload.Body).toMatch(new RegExp("^\\[Telegram Test Group id:7 (\\+\\d+[smhd] )?\\]"));
  });
  it("accepts group messages when mentionPatterns match even if another user is mentioned", async () => {
    onSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ agents: { defaults: { envelopeTimezone: "utc" } }, identity: { name: "Bert" }, messages: { groupChat: { mentionPatterns: ["\\bbert\\b"] } }, channels: { telegram: { groupPolicy: "open", groups: { "*": { requireMention: true } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: 7, type: "group", title: "Test Group" }, text: "bert: hello @alice", entities: [{ type: "mention", offset: 12, length: 6 }], date: 1736380800, message_id: 3, from: { id: 9, first_name: "Ada" } }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(replySpy.mock.calls[0][0].WasMentioned).toBe(true);
  });
  it("keeps group envelope headers stable (sender identity is separate)", async () => {
    onSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ agents: { defaults: { envelopeTimezone: "utc" } }, channels: { telegram: { groupPolicy: "open", groups: { "*": { requireMention: false } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: 42, type: "group", title: "Ops" }, text: "hello", date: 1736380800, message_id: 2, from: { id: 99, first_name: "Ada", last_name: "Lovelace", username: "ada" } }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).toHaveBeenCalledTimes(1);
    const payload = replySpy.mock.calls[0][0];
    expect(payload.SenderName).toBe("Ada Lovelace");
    expect(payload.SenderId).toBe("99");
    expect(payload.SenderUsername).toBe("ada");
    const expectedTimestamp = formatEnvelopeTimestamp(new Date("2025-01-09T00:00:00Z"));
    const timestampPattern = escapeRegExp(expectedTimestamp);
    expect(payload.Body).toMatch(new RegExp("^\\[Telegram Ops id:42 (\\+\\d+[smhd] )?\\]"));
  });
  it("reacts to mention-gated group messages when ackReaction is enabled", async () => {
    onSpy.mockReset();
    setMessageReactionSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ messages: { ackReaction: "👀", ackReactionScope: "group-mentions", groupChat: { mentionPatterns: ["\\bbert\\b"] } }, channels: { telegram: { groupPolicy: "open", groups: { "*": { requireMention: true } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: 7, type: "group", title: "Test Group" }, text: "bert hello", date: 1736380800, message_id: 123, from: { id: 9, first_name: "Ada" } }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(setMessageReactionSpy).toHaveBeenCalledWith(7, 123, [{ type: "emoji", emoji: "👀" }]);
  });
  it("clears native commands when disabled", () => {
    loadConfig.mockReturnValue({ commands: { native: false } });
    createTelegramBot({ token: "tok" });
    expect(setMyCommandsSpy).toHaveBeenCalledWith([]);
  });
  it("skips group messages when requireMention is enabled and no mention matches", async () => {
    onSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ messages: { groupChat: { mentionPatterns: ["\\bbert\\b"] } }, channels: { telegram: { groupPolicy: "open", groups: { "*": { requireMention: true } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: 7, type: "group", title: "Test Group" }, text: "hello everyone", date: 1736380800, message_id: 2, from: { id: 9, first_name: "Ada" } }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).not.toHaveBeenCalled();
  });
  it("allows group messages when requireMention is enabled but mentions cannot be detected", async () => {
    onSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ messages: { groupChat: { mentionPatterns: [] } }, channels: { telegram: { groupPolicy: "open", groups: { "*": { requireMention: true } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: 7, type: "group", title: "Test Group" }, text: "hello everyone", date: 1736380800, message_id: 3, from: { id: 9, first_name: "Ada" } }, me: {  }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).toHaveBeenCalledTimes(1);
    const payload = replySpy.mock.calls[0][0];
    expect(payload.WasMentioned).toBe(false);
  });
  it("includes reply-to context when a Telegram reply is received", async () => {
    onSpy.mockReset();
    sendMessageSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: 7, type: "private" }, text: "Sure, see below", date: 1736380800, reply_to_message: { message_id: 9001, text: "Can you summarize this?", from: { first_name: "Ada" } } }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).toHaveBeenCalledTimes(1);
    const payload = replySpy.mock.calls[0][0];
    expect(payload.Body).toContain("[Replying to Ada id:9001]");
    expect(payload.Body).toContain("Can you summarize this?");
    expect(payload.ReplyToId).toBe("9001");
    expect(payload.ReplyToBody).toBe("Can you summarize this?");
    expect(payload.ReplyToSender).toBe("Ada");
  });
});
