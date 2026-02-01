import { describe, expect, it, vi } from "vitest";
import { subscribeEmbeddedPiSession } from "./pi-embedded-subscribe.js";
describe("subscribeEmbeddedPiSession", () => {
  const THINKING_TAG_CASES = [{ tag: "think", open: "<think>", close: "</think>" }, { tag: "thinking", open: "<thinking>", close: "</thinking>" }, { tag: "thought", open: "<thought>", close: "</thought>" }, { tag: "antthinking", open: "<antthinking>", close: "</antthinking>" }];
  it.each(THINKING_TAG_CASES)("streams <%s> reasoning via onReasoningStream without leaking into final text", ({open, close}) => {
    let handler;
    const session = { subscribe: (fn) => {
      handler = fn;
      return () => {
      };
    } };
    const onReasoningStream = vi.fn();
    const onBlockReply = vi.fn();
    subscribeEmbeddedPiSession({ session: session, runId: "run", onReasoningStream, onBlockReply, blockReplyBreak: "message_end", reasoningMode: "stream" });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "
Because" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: " it helps


Final answer" } });
    const assistantMessage = { role: "assistant", content: [{ type: "text", text: "
Because it helps


Final answer" }] };
    handler?.({ type: "message_end", message: assistantMessage });
    expect(onBlockReply).toHaveBeenCalledTimes(1);
    expect(onBlockReply.mock.calls[0][0].text).toBe("Final answer");
    const streamTexts = onReasoningStream.mock.calls.map((call) => call[0]?.text).filter((value) => (typeof value === "string"));
    expect(streamTexts.at(-1)).toBe("Reasoning:
_Because it helps_");
    expect(assistantMessage.content).toEqual([{ type: "thinking", thinking: "Because it helps" }, { type: "text", text: "Final answer" }]);
  });
  it.each(THINKING_TAG_CASES)("suppresses <%s> blocks across chunk boundaries", ({open, close}) => {
    let handler;
    const session = { subscribe: (fn) => {
      handler = fn;
      return () => {
      };
    } };
    const onBlockReply = vi.fn();
    subscribeEmbeddedPiSession({ session: session, runId: "run", onBlockReply, blockReplyBreak: "text_end", blockReplyChunking: { minChars: 5, maxChars: 50, breakPreference: "newline" } });
    handler?.({ type: "message_start", message: { role: "assistant" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "Reasoning chunk that should not leak" } });
    expect(onBlockReply).not.toHaveBeenCalled();
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "

Final answer" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_end" } });
    const payloadTexts = onBlockReply.mock.calls.map((call) => call[0]?.text).filter((value) => (typeof value === "string"));
    expect(payloadTexts.length).toBeGreaterThan(0);
    for (const text of payloadTexts) {
      expect(text).not.toContain("Reasoning");
      expect(text).not.toContain(open);
    }
    const combined = payloadTexts.join(" ").replace(/\s+/g, " ").trim();
    expect(combined).toBe("Final answer");
  });
  it("emits delta chunks in agent events for streaming assistant text", () => {
    let handler;
    const session = { subscribe: (fn) => {
      handler = fn;
      return () => {
      };
    } };
    const onAgentEvent = vi.fn();
    subscribeEmbeddedPiSession({ session: session, runId: "run", onAgentEvent });
    handler?.({ type: "message_start", message: { role: "assistant" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "Hello" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: " world" } });
    const payloads = onAgentEvent.mock.calls.map((call) => call[0]?.data).filter((value) => Boolean(value));
    expect(payloads[0]?.text).toBe("Hello");
    expect(payloads[0]?.delta).toBe("Hello");
    expect(payloads[1]?.text).toBe("Hello world");
    expect(payloads[1]?.delta).toBe(" world");
  });
  it("skips agent events when cleaned text rewinds mid-stream", () => {
    let handler;
    const session = { subscribe: (fn) => {
      handler = fn;
      return () => {
      };
    } };
    const onAgentEvent = vi.fn();
    subscribeEmbeddedPiSession({ session: session, runId: "run", onAgentEvent });
    handler?.({ type: "message_start", message: { role: "assistant" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "MEDIA:" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: " https://example.com/a.png
Caption" } });
    const payloads = onAgentEvent.mock.calls.map((call) => call[0]?.data).filter((value) => Boolean(value));
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.text).toBe("MEDIA:");
  });
  it("emits agent events when media arrives without text", () => {
    let handler;
    const session = { subscribe: (fn) => {
      handler = fn;
      return () => {
      };
    } };
    const onAgentEvent = vi.fn();
    subscribeEmbeddedPiSession({ session: session, runId: "run", onAgentEvent });
    handler?.({ type: "message_start", message: { role: "assistant" } });
    handler?.({ type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "MEDIA: https://example.com/a.png" } });
    const payloads = onAgentEvent.mock.calls.map((call) => call[0]?.data).filter((value) => Boolean(value));
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.text).toBe("");
    expect(payloads[0]?.mediaUrls).toEqual(["https://example.com/a.png"]);
  });
});
