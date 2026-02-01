import { describe, expect, it } from "vitest";
import { computeNextRunAtMs } from "./schedule.js";
describe("cron schedule", () => {
  it("computes next run for cron expression with timezone", () => {
    const nowMs = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs({ kind: "cron", expr: "0 9 * * 3", tz: "America/Los_Angeles" }, nowMs);
    expect(next).toBe(Date.parse("2025-12-17T17:00:00.000Z"));
  });
  it("computes next run for every schedule", () => {
    const anchor = Date.parse("2025-12-13T00:00:00.000Z");
    const now = (anchor + 10000);
    const next = computeNextRunAtMs({ kind: "every", everyMs: 30000, anchorMs: anchor }, now);
    expect(next).toBe((anchor + 30000));
  });
  it("computes next run for every schedule when anchorMs is not provided", () => {
    const now = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs({ kind: "every", everyMs: 30000 }, now);
    expect(next).toBe((now + 30000));
  });
  it("advances when now matches anchor for every schedule", () => {
    const anchor = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs({ kind: "every", everyMs: 30000, anchorMs: anchor }, anchor);
    expect(next).toBe((anchor + 30000));
  });
});
