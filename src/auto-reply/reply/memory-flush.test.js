import { describe, expect, it } from "vitest";
import { DEFAULT_MEMORY_FLUSH_SOFT_TOKENS, resolveMemoryFlushContextWindowTokens, resolveMemoryFlushSettings, shouldRunMemoryFlush } from "./memory-flush.js";
describe("memory flush settings", () => {
  it("defaults to enabled with fallback prompt and system prompt", () => {
    const settings = resolveMemoryFlushSettings();
    expect(settings).not.toBeNull();
    expect(settings?.enabled).toBe(true);
    expect(settings?.prompt.length).toBeGreaterThan(0);
    expect(settings?.systemPrompt.length).toBeGreaterThan(0);
  });
  it("respects disable flag", () => {
    expect(resolveMemoryFlushSettings({ agents: { defaults: { compaction: { memoryFlush: { enabled: false } } } } })).toBeNull();
  });
  it("appends NO_REPLY hint when missing", () => {
    const settings = resolveMemoryFlushSettings({ agents: { defaults: { compaction: { memoryFlush: { prompt: "Write memories now.", systemPrompt: "Flush memory." } } } } });
    expect(settings?.prompt).toContain("NO_REPLY");
    expect(settings?.systemPrompt).toContain("NO_REPLY");
  });
});
describe("shouldRunMemoryFlush", () => {
  it("requires totalTokens and threshold", () => {
    expect(shouldRunMemoryFlush({ entry: { totalTokens: 0 }, contextWindowTokens: 16000, reserveTokensFloor: 20000, softThresholdTokens: DEFAULT_MEMORY_FLUSH_SOFT_TOKENS })).toBe(false);
  });
  it("skips when entry is missing", () => {
    expect(shouldRunMemoryFlush({ entry: undefined, contextWindowTokens: 16000, reserveTokensFloor: 1000, softThresholdTokens: DEFAULT_MEMORY_FLUSH_SOFT_TOKENS })).toBe(false);
  });
  it("skips when under threshold", () => {
    expect(shouldRunMemoryFlush({ entry: { totalTokens: 10000 }, contextWindowTokens: 100000, reserveTokensFloor: 20000, softThresholdTokens: 10000 })).toBe(false);
  });
  it("triggers at the threshold boundary", () => {
    expect(shouldRunMemoryFlush({ entry: { totalTokens: 85 }, contextWindowTokens: 100, reserveTokensFloor: 10, softThresholdTokens: 5 })).toBe(true);
  });
  it("skips when already flushed for current compaction count", () => {
    expect(shouldRunMemoryFlush({ entry: { totalTokens: 90000, compactionCount: 2, memoryFlushCompactionCount: 2 }, contextWindowTokens: 100000, reserveTokensFloor: 5000, softThresholdTokens: 2000 })).toBe(false);
  });
  it("runs when above threshold and not flushed", () => {
    expect(shouldRunMemoryFlush({ entry: { totalTokens: 96000, compactionCount: 1 }, contextWindowTokens: 100000, reserveTokensFloor: 5000, softThresholdTokens: 2000 })).toBe(true);
  });
});
describe("resolveMemoryFlushContextWindowTokens", () => {
  it("falls back to agent config or default tokens", () => {
    expect(resolveMemoryFlushContextWindowTokens({ agentCfgContextTokens: 42000 })).toBe(42000);
  });
});
