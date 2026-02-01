import { expect, test } from "vitest";
import { buildCursorPositionResponse, stripDsrRequests } from "./pty-dsr.js";
test("stripDsrRequests removes cursor queries and counts them", () => {
  const input = "hi[6nthere[?6n";
  const {cleaned, requests} = stripDsrRequests(input);
  expect(cleaned).toBe("hithere");
  expect(requests).toBe(2);
});
test("buildCursorPositionResponse returns CPR sequence", () => {
  expect(buildCursorPositionResponse()).toBe("[1;1R");
  expect(buildCursorPositionResponse(12, 34)).toBe("[12;34R");
});
