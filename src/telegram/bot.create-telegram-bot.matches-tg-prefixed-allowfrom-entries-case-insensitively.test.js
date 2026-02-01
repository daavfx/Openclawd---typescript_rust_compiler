import { beforeEach, describe, expect, it, vi } from "vitest";
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
describe("createTelegramBot", () => {
  beforeEach(async () => {
    vi.resetModules();
    { resetInboundDedupe } = await import("../auto-reply/reply/inbound-dedupe.js");
    { createTelegramBot } = await import("./bot.js");
    replyModule = await import("../auto-reply/reply.js");
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
  it("matches tg:-prefixed allowFrom entries case-insensitively in group allowlist", async () => {
    onSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ channels: { telegram: { groupPolicy: "allowlist", allowFrom: ["TG:123456789"], groups: { "*": { requireMention: false } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: -100123456789, type: "group", title: "Test Group" }, from: { id: 123456789, username: "testuser" }, text: "hello from prefixed user", date: 1736380800 }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).toHaveBeenCalled();
  });
  it("blocks group messages when groupPolicy allowlist has no groupAllowFrom", async () => {
    onSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ channels: { telegram: { groupPolicy: "allowlist", groups: { "*": { requireMention: false } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: -100123456789, type: "group", title: "Test Group" }, from: { id: 123456789, username: "testuser" }, text: "hello", date: 1736380800 }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).not.toHaveBeenCalled();
  });
  it("allows control commands with TG-prefixed groupAllowFrom entries", async () => {
    onSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ channels: { telegram: { groupPolicy: "allowlist", groupAllowFrom: ["  TG:123456789  "], groups: { "*": { requireMention: true } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: -100123456789, type: "group", title: "Test Group" }, from: { id: 123456789, username: "testuser" }, text: "/status", date: 1736380800 }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).toHaveBeenCalledTimes(1);
  });
  it("isolates forum topic sessions and carries thread metadata", async () => {
    onSpy.mockReset();
    sendChatActionSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ channels: { telegram: { groupPolicy: "open", groups: { "*": { requireMention: false } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: -1001234567890, type: "supergroup", title: "Forum Group", is_forum: true }, from: { id: 12345, username: "testuser" }, text: "hello", date: 1736380800, message_id: 42, message_thread_id: 99 }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).toHaveBeenCalledTimes(1);
    const payload = replySpy.mock.calls[0][0];
    expect(payload.SessionKey).toContain("telegram:group:-1001234567890:topic:99");
    expect(payload.From).toBe("telegram:group:-1001234567890:topic:99");
    expect(payload.MessageThreadId).toBe(99);
    expect(payload.IsForum).toBe(true);
    expect(sendChatActionSpy).toHaveBeenCalledWith(-1001234567890, "typing", { message_thread_id: 99 });
  });
  it("falls back to General topic thread id for typing in forums", async () => {
    onSpy.mockReset();
    sendChatActionSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    loadConfig.mockReturnValue({ channels: { telegram: { groupPolicy: "open", groups: { "*": { requireMention: false } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: -1001234567890, type: "supergroup", title: "Forum Group", is_forum: true }, from: { id: 12345, username: "testuser" }, text: "hello", date: 1736380800, message_id: 42 }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(replySpy).toHaveBeenCalledTimes(1);
    expect(sendChatActionSpy).toHaveBeenCalledWith(-1001234567890, "typing", { message_thread_id: 1 });
  });
  it("routes General topic replies using thread id 1", async () => {
    onSpy.mockReset();
    sendMessageSpy.mockReset();
    const replySpy = replyModule.__replySpy;
    replySpy.mockReset();
    replySpy.mockResolvedValue({ text: "response" });
    loadConfig.mockReturnValue({ channels: { telegram: { groupPolicy: "open", groups: { "*": { requireMention: false } } } } });
    createTelegramBot({ token: "tok" });
    const handler = getOnHandler("message");
    await handler({ message: { chat: { id: -1001234567890, type: "supergroup", title: "Forum Group", is_forum: true }, from: { id: 12345, username: "testuser" }, text: "hello", date: 1736380800, message_id: 42 }, me: { username: "openclaw_bot" }, getFile: async () => { download: async () => new Uint8Array() } });
    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    const sendParams = sendMessageSpy.mock.calls[0]?.[2];
    expect(sendParams?.message_thread_id).toBeUndefined();
  });
});
