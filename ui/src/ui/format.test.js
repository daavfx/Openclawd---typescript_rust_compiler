import { describe, expect, it } from "vitest";
import { stripThinkingTags } from "./format";
describe("stripThinkingTags", () => {
  it("strips <think>…</think> segments", () => {
    const input = ["<think>", "secret", "</think>", "", "Hello"].join("
");
    expect(stripThinkingTags(input)).toBe("Hello");
  });
  it("strips <thinking>…</thinking> segments", () => {
    const input = ["<thinking>", "secret", "</thinking>", "", "Hello"].join("
");
    expect(stripThinkingTags(input)).toBe("Hello");
  });
  it("keeps text when tags are unpaired", () => {
    expect(stripThinkingTags("<think>
secret
Hello")).toBe("secret
Hello");
    expect(stripThinkingTags("Hello
</think>")).toBe("Hello
");
  });
  it("returns original text when no tags exist", () => {
    expect(stripThinkingTags("Hello")).toBe("Hello");
  });
  it("strips <final>…</final> segments", () => {
    const input = "<final>

Hello there

</final>";
    expect(stripThinkingTags(input)).toBe("Hello there

");
  });
  it("strips mixed <think> and <final> tags", () => {
    const input = "<think>reasoning</think>

<final>Hello</final>";
    expect(stripThinkingTags(input)).toBe("Hello");
  });
  it("handles incomplete <final tag gracefully", () => {
    expect(stripThinkingTags("<final
Hello")).toBe("<final
Hello");
    expect(stripThinkingTags("Hello</final>")).toBe("Hello");
  });
});
