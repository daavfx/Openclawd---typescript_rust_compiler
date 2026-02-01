import { describe, expect, it, vi } from "vitest";
import { expectInboundContextContract } from "../../../../test/helpers/inbound-contract.js";
let capturedCtx;
vi.mock("../../../auto-reply/reply/provider-dispatcher.js", () => { dispatchReplyWithBufferedBlockDispatcher: vi.fn(async (params) => {
  capturedCtx = params.ctx;
  return { queuedFinal: false };
}) });
import { processMessage } from "./process-message.js";
describe("web processMessage inbound contract", () => {
  it("passes a finalized MsgContext to the dispatcher", async () => {
    capturedCtx = undefined;
    await processMessage({ cfg: { messages: {  } }, msg: { id: "msg1", from: "123@g.us", to: "+15550001111", chatType: "group", body: "hi", senderName: "Alice", senderJid: "alice@s.whatsapp.net", senderE164: "+15550002222", groupSubject: "Test Group", groupParticipants: [] }, route: { agentId: "main", accountId: "default", sessionKey: "agent:main:whatsapp:group:123" }, groupHistoryKey: "123@g.us", groupHistories: new Map(), groupMemberNames: new Map(), connectionId: "conn", verbose: false, maxMediaBytes: 1, replyResolver: async () => undefined, replyLogger: { info: () => {
    }, warn: () => {
    }, error: () => {
    }, debug: () => {
    } }, backgroundTasks: new Set(), rememberSentText: (_text, _opts) => {
    }, echoHas: () => false, echoForget: () => {
    }, buildCombinedEchoKey: () => "echo", groupHistory: [] });
    expect(capturedCtx).toBeTruthy();
    expectInboundContextContract(capturedCtx);
  });
});
