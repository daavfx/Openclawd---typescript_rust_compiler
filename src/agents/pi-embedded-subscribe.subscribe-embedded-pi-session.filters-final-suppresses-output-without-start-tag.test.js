import { describe, expect, it, vi } from "vitest";
import { subscribeEmbeddedPiSession } from "./pi-embedded-subscribe.js";
describe("subscribeEmbeddedPiSession", () => {
  const _THINKING_TAG_CASES = [{ tag: "think", open: "<think>", close: "</think>" }, { tag: "thinking", open: "<thinking>", close: "</thinking>" }, { tag: "thought", open: "<thought>", close: "</thought>" }, { tag: "antthinking", open: "<antthinking>", close: "</antthinking>" }];
  it("filters to <final> and suppresses output without a start tag", () => {
    let handler;
    const session = { subscribe: (fn) => {
      handler = fn;
      return () => {
      };
    } };
    const onPartialReply = vi.fn();
    const onAgentEvent = vi.fn();
    subscribeEmbeddedPiSession({ session: session, runId: "run", enforceFinalTag: true, onPartialReply, onAgentEvent });
    handler?.({ type: "message_start", message: { role: "assistant" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "<final>Hi there</final>" } });
    expect(onPartialReply).toHaveBeenCalled();
    const firstPayload = onPartialReply.mock.calls[0][0];
    expect(firstPayload.text).toBe("Hi there");
    onPartialReply.mockReset();
    handler?.({ type: "message_start", message: { role: "assistant" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "</final>Oops no start" } });
    expect(onPartialReply).not.toHaveBeenCalled();
  });
  it("does not require <final> when enforcement is off", () => {
    let handler;
    const session = { subscribe: (fn) => {
      handler = fn;
      return () => {
      };
    } };
    const onPartialReply = vi.fn();
    subscribeEmbeddedPiSession({ session: session, runId: "run", onPartialReply });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "Hello world" } });
    const payload = onPartialReply.mock.calls[0][0];
    expect(payload.text).toBe("Hello world");
  });
  it("emits block replies on message_end", () => {
    let handler;
    const session = { subscribe: (fn) => {
      handler = fn;
      return () => {
      };
    } };
    const onBlockReply = vi.fn();
    subscribeEmbeddedPiSession({ session: session, runId: "run", onBlockReply, blockReplyBreak: "message_end" });
    const assistantMessage = { role: "assistant", content: [{ type: "text", text: "Hello block" }] };
    handler?.({ type: "message_end", message: assistantMessage });
    expect(onBlockReply).toHaveBeenCalled();
    const payload = onBlockReply.mock.calls[0][0];
    expect(payload.text).toBe("Hello block");
  });
});
