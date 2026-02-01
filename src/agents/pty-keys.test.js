import { expect, test } from "vitest";
import { BRACKETED_PASTE_END, BRACKETED_PASTE_START, encodeKeySequence, encodePaste } from "./pty-keys.js";
test("encodeKeySequence maps common keys and modifiers", () => {
  const enter = encodeKeySequence({ keys: ["Enter"] });
  expect(enter.data).toBe("");
  const ctrlC = encodeKeySequence({ keys: ["C-c"] });
  expect(ctrlC.data).toBe("");
  const altX = encodeKeySequence({ keys: ["M-x"] });
  expect(altX.data).toBe("x");
  const shiftTab = encodeKeySequence({ keys: ["S-Tab"] });
  expect(shiftTab.data).toBe("[Z");
  const kpEnter = encodeKeySequence({ keys: ["KPEnter"] });
  expect(kpEnter.data).toBe("OM");
});
test("encodeKeySequence supports hex + literal with warnings", () => {
  const result = encodeKeySequence({ literal: "hi", hex: ["0d", "0x0a", "zz"], keys: ["Enter"] });
  expect(result.data).toBe("hi
");
  expect(result.warnings.length).toBe(1);
});
test("encodePaste wraps bracketed sequences by default", () => {
  const payload = encodePaste("line1
line2
");
  expect(payload.startsWith(BRACKETED_PASTE_START)).toBe(true);
  expect(payload.endsWith(BRACKETED_PASTE_END)).toBe(true);
});
