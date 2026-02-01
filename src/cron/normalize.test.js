import { describe, expect, it } from "vitest";
import { normalizeCronJobCreate } from "./normalize.js";
describe("normalizeCronJobCreate", () => {
  it("maps legacy payload.provider to payload.channel and strips provider", () => {
    const normalized = normalizeCronJobCreate({ name: "legacy", enabled: true, schedule: { kind: "cron", expr: "* * * * *" }, sessionTarget: "isolated", wakeMode: "now", payload: { kind: "agentTurn", message: "hi", deliver: true, provider: " TeLeGrAm ", to: "7200373102" } });
    const payload = normalized.payload;
    expect(payload.channel).toBe("telegram");
    expect(("provider" in payload)).toBe(false);
  });
  it("trims agentId and drops null", () => {
    const normalized = normalizeCronJobCreate({ name: "agent-set", enabled: true, schedule: { kind: "cron", expr: "* * * * *" }, sessionTarget: "isolated", wakeMode: "now", agentId: " Ops ", payload: { kind: "agentTurn", message: "hi" } });
    expect(normalized.agentId).toBe("ops");
    const cleared = normalizeCronJobCreate({ name: "agent-clear", enabled: true, schedule: { kind: "cron", expr: "* * * * *" }, sessionTarget: "isolated", wakeMode: "now", agentId: null, payload: { kind: "agentTurn", message: "hi" } });
    expect(cleared.agentId).toBeNull();
  });
  it("canonicalizes payload.channel casing", () => {
    const normalized = normalizeCronJobCreate({ name: "legacy provider", enabled: true, schedule: { kind: "cron", expr: "* * * * *" }, sessionTarget: "isolated", wakeMode: "now", payload: { kind: "agentTurn", message: "hi", deliver: true, channel: "Telegram", to: "7200373102" } });
    const payload = normalized.payload;
    expect(payload.channel).toBe("telegram");
  });
  it("coerces ISO schedule.at to atMs (UTC)", () => {
    const normalized = normalizeCronJobCreate({ name: "iso at", enabled: true, schedule: { at: "2026-01-12T18:00:00" }, sessionTarget: "main", wakeMode: "next-heartbeat", payload: { kind: "systemEvent", text: "hi" } });
    const schedule = normalized.schedule;
    expect(schedule.kind).toBe("at");
    expect(schedule.atMs).toBe(Date.parse("2026-01-12T18:00:00Z"));
  });
  it("coerces ISO schedule.atMs string to atMs (UTC)", () => {
    const normalized = normalizeCronJobCreate({ name: "iso atMs", enabled: true, schedule: { kind: "at", atMs: "2026-01-12T18:00:00" }, sessionTarget: "main", wakeMode: "next-heartbeat", payload: { kind: "systemEvent", text: "hi" } });
    const schedule = normalized.schedule;
    expect(schedule.kind).toBe("at");
    expect(schedule.atMs).toBe(Date.parse("2026-01-12T18:00:00Z"));
  });
});
