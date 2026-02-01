import { describe, expect, it, vi } from "vitest";
import { registerTelegramNativeCommands } from "./bot-native-commands.js";
const getPluginCommandSpecs = vi.hoisted(() => vi.fn());
const matchPluginCommand = vi.hoisted(() => vi.fn());
const executePluginCommand = vi.hoisted(() => vi.fn());
vi.mock("../plugins/commands.js", () => { getPluginCommandSpecs, matchPluginCommand, executePluginCommand });
const deliverReplies = vi.hoisted(() => vi.fn(async () => {
}));
vi.mock("./bot/delivery.js", () => { deliverReplies });
vi.mock("./pairing-store.js", () => { readTelegramAllowFromStore: vi.fn(async () => []) });
describe("registerTelegramNativeCommands (plugin auth)", () => {
  it("allows requireAuth:false plugin command even when sender is unauthorized", async () => {
    const command = { name: "plugin", description: "Plugin command", requireAuth: false, handler: vi.fn() };
    getPluginCommandSpecs.mockReturnValue([{ name: "plugin", description: "Plugin command" }]);
    matchPluginCommand.mockReturnValue({ command, args: undefined });
    executePluginCommand.mockResolvedValue({ text: "ok" });
    const handlers = {  };
    const bot = { api: { setMyCommands: vi.fn().mockResolvedValue(undefined), sendMessage: vi.fn() }, command: (name, handler) => {
      handlers[name] = handler;
    } };
    const cfg = {  };
    const telegramCfg = {  };
    const resolveGroupPolicy = () => { allowlistEnabled: false, allowed: true };
    registerTelegramNativeCommands({ bot: bot, cfg, runtime: {  }, accountId: "default", telegramCfg, allowFrom: ["999"], groupAllowFrom: [], replyToMode: "off", textLimit: 4000, useAccessGroups: false, nativeEnabled: false, nativeSkillsEnabled: false, nativeDisabledExplicit: false, resolveGroupPolicy, resolveTelegramGroupConfig: () => { groupConfig: undefined, topicConfig: undefined }, shouldSkipUpdate: () => false, opts: { token: "token" } });
    const ctx = { message: { chat: { id: 123, type: "private" }, from: { id: 111, username: "nope" }, message_id: 10, date: 123456 }, match: "" };
    await handlers.plugin?.(ctx);
    expect(matchPluginCommand).toHaveBeenCalled();
    expect(executePluginCommand).toHaveBeenCalledWith(expect.objectContaining({ isAuthorizedSender: false }));
    expect(deliverReplies).toHaveBeenCalledWith(expect.objectContaining({ replies: [{ text: "ok" }] }));
    expect(bot.api.sendMessage).not.toHaveBeenCalled();
  });
});
