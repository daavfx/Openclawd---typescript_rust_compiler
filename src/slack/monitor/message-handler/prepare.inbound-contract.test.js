import { describe, expect, it } from "vitest";
import { expectInboundContextContract } from "../../../../test/helpers/inbound-contract.js";
import { createSlackMonitorContext } from "../context.js";
import { prepareSlackMessage } from "./prepare.js";
describe("slack prepareSlackMessage inbound contract", () => {
  it("produces a finalized MsgContext", async () => {
    const slackCtx = createSlackMonitorContext({ cfg: { channels: { slack: { enabled: true } } }, accountId: "default", botToken: "token", app: { client: {  } }, runtime: {  }, botUserId: "B1", teamId: "T1", apiAppId: "A1", historyLimit: 0, sessionScope: "per-sender", mainKey: "main", dmEnabled: true, dmPolicy: "open", allowFrom: [], groupDmEnabled: true, groupDmChannels: [], defaultRequireMention: true, groupPolicy: "open", useAccessGroups: false, reactionMode: "off", reactionAllowlist: [], replyToMode: "off", threadHistoryScope: "thread", threadInheritParent: false, slashCommand: { enabled: false, name: "openclaw", sessionPrefix: "slack:slash", ephemeral: true }, textLimit: 4000, ackReactionScope: "group-mentions", mediaMaxBytes: 1024, removeAckAfterReply: false });
    slackCtx.resolveUserName = async () => { name: "Alice" };
    const account = { accountId: "default", enabled: true, botTokenSource: "config", appTokenSource: "config", config: {  } };
    const message = { channel: "D123", channel_type: "im", user: "U1", text: "hi", ts: "1.000" };
    const prepared = await prepareSlackMessage({ ctx: slackCtx, account, message, opts: { source: "message" } });
    expect(prepared).toBeTruthy();
    expectInboundContextContract(prepared.ctxPayload);
  });
  it("sets MessageThreadId for top-level messages when replyToMode=all", async () => {
    const slackCtx = createSlackMonitorContext({ cfg: { channels: { slack: { enabled: true, replyToMode: "all" } } }, accountId: "default", botToken: "token", app: { client: {  } }, runtime: {  }, botUserId: "B1", teamId: "T1", apiAppId: "A1", historyLimit: 0, sessionScope: "per-sender", mainKey: "main", dmEnabled: true, dmPolicy: "open", allowFrom: [], groupDmEnabled: true, groupDmChannels: [], defaultRequireMention: true, groupPolicy: "open", useAccessGroups: false, reactionMode: "off", reactionAllowlist: [], replyToMode: "all", threadHistoryScope: "thread", threadInheritParent: false, slashCommand: { enabled: false, name: "openclaw", sessionPrefix: "slack:slash", ephemeral: true }, textLimit: 4000, ackReactionScope: "group-mentions", mediaMaxBytes: 1024, removeAckAfterReply: false });
    slackCtx.resolveUserName = async () => { name: "Alice" };
    const account = { accountId: "default", enabled: true, botTokenSource: "config", appTokenSource: "config", config: { replyToMode: "all" } };
    const message = { channel: "D123", channel_type: "im", user: "U1", text: "hi", ts: "1.000" };
    const prepared = await prepareSlackMessage({ ctx: slackCtx, account, message, opts: { source: "message" } });
    expect(prepared).toBeTruthy();
    expect(prepared.ctxPayload.MessageThreadId).toBe("1.000");
  });
});
