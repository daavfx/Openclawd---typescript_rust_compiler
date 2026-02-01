import { describe, expect, it } from "vitest";
import { chunkByNewline, chunkMarkdownText, chunkMarkdownTextWithMode, chunkText, chunkTextWithMode, resolveChunkMode, resolveTextChunkLimit } from "./chunk.js";
function expectFencesBalanced(chunks) {
  for (const chunk of chunks) {
    let open = null;
    for (const line of chunk.split("
")) {
      const match = line.match(/^( {0,3})(`{3,}|~{3,})(.*)$/);
      if (!match) {
        continue;
      }
      const marker = match[2];
      if (!open) {
        open = { markerChar: marker[0], markerLen: marker.length };
        continue;
      }
      if (((open.markerChar === marker[0]) && (marker.length >= open.markerLen))) {
        open = null;
      }
    }
    expect(open).toBe(null);
  }
}
function runChunkCases(chunker, cases) {
  for (const {name, text, limit, expected} of cases) {
    it(name, () => {
      expect(chunker(text, limit)).toEqual(expected);
    });
  }
}
const parentheticalCases = [{ name: "keeps parenthetical phrases together", text: "Heads up now (Though now I'm curious)ok", limit: 35, expected: ["Heads up now", "(Though now I'm curious)ok"] }, { name: "handles nested parentheses", text: "Hello (outer (inner) end) world", limit: 26, expected: ["Hello (outer (inner) end)", "world"] }, { name: "ignores unmatched closing parentheses", text: "Hello) world (ok)", limit: 12, expected: ["Hello)", "world (ok)"] }];
describe("chunkText", () => {
  it("keeps multi-line text in one chunk when under limit", () => {
    const text = "Line one

Line two

Line three";
    const chunks = chunkText(text, 1600);
    expect(chunks).toEqual([text]);
  });
  it("splits only when text exceeds the limit", () => {
    const part = "a".repeat(20);
    const text = part.repeat(5);
    const chunks = chunkText(text, 60);
    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBe(60);
    expect(chunks[1].length).toBe(40);
    expect(chunks.join("")).toBe(text);
  });
  it("prefers breaking at a newline before the limit", () => {
    const text = "paragraph one line

paragraph two starts here and continues";
    const chunks = chunkText(text, 40);
    expect(chunks).toEqual(["paragraph one line", "paragraph two starts here and continues"]);
  });
  it("otherwise breaks at the last whitespace under the limit", () => {
    const text = "This is a message that should break nicely near a word boundary.";
    const chunks = chunkText(text, 30);
    expect(chunks[0].length).toBeLessThanOrEqual(30);
    expect(chunks[1].length).toBeLessThanOrEqual(30);
    expect(chunks.join(" ").replace(/\s+/g, " ").trim()).toBe(text.replace(/\s+/g, " ").trim());
  });
  it("falls back to a hard break when no whitespace is present", () => {
    const text = "Supercalifragilisticexpialidocious";
    const chunks = chunkText(text, 10);
    expect(chunks).toEqual(["Supercalif", "ragilistic", "expialidoc", "ious"]);
  });
  runChunkCases(chunkText, [parentheticalCases[0]]);
});
describe("resolveTextChunkLimit", () => {
  it("uses per-provider defaults", () => {
    expect(resolveTextChunkLimit(undefined, "whatsapp")).toBe(4000);
    expect(resolveTextChunkLimit(undefined, "telegram")).toBe(4000);
    expect(resolveTextChunkLimit(undefined, "slack")).toBe(4000);
    expect(resolveTextChunkLimit(undefined, "signal")).toBe(4000);
    expect(resolveTextChunkLimit(undefined, "imessage")).toBe(4000);
    expect(resolveTextChunkLimit(undefined, "discord")).toBe(4000);
    expect(resolveTextChunkLimit(undefined, "discord", undefined, { fallbackLimit: 2000 })).toBe(2000);
  });
  it("supports provider overrides", () => {
    const cfg = { channels: { telegram: { textChunkLimit: 1234 } } };
    expect(resolveTextChunkLimit(cfg, "whatsapp")).toBe(4000);
    expect(resolveTextChunkLimit(cfg, "telegram")).toBe(1234);
  });
  it("prefers account overrides when provided", () => {
    const cfg = { channels: { telegram: { textChunkLimit: 2000, accounts: { default: { textChunkLimit: 1234 }, primary: { textChunkLimit: 777 } } } } };
    expect(resolveTextChunkLimit(cfg, "telegram", "primary")).toBe(777);
    expect(resolveTextChunkLimit(cfg, "telegram", "default")).toBe(1234);
  });
  it("uses the matching provider override", () => {
    const cfg = { channels: { discord: { textChunkLimit: 111 }, slack: { textChunkLimit: 222 } } };
    expect(resolveTextChunkLimit(cfg, "discord")).toBe(111);
    expect(resolveTextChunkLimit(cfg, "slack")).toBe(222);
    expect(resolveTextChunkLimit(cfg, "telegram")).toBe(4000);
  });
});
describe("chunkMarkdownText", () => {
  it("keeps fenced blocks intact when a safe break exists", () => {
    const prefix = "p".repeat(60);
    const fence = "```bash
line1
line2
```";
    const suffix = "s".repeat(60);
    const text = "



";
    const chunks = chunkMarkdownText(text, 40);
    expect(chunks.some((chunk) => (chunk.trimEnd() === fence))).toBe(true);
    expectFencesBalanced(chunks);
  });
  it("reopens fenced blocks when forced to split inside them", () => {
    const text = "```txt

```";
    const limit = 120;
    const chunks = chunkMarkdownText(text, limit);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(limit);
      expect(chunk.startsWith("```txt
")).toBe(true);
      expect(chunk.trimEnd().endsWith("```")).toBe(true);
    }
    expectFencesBalanced(chunks);
  });
  it("supports tilde fences", () => {
    const text = "~~~sh

~~~";
    const limit = 140;
    const chunks = chunkMarkdownText(text, limit);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(limit);
      expect(chunk.startsWith("~~~sh
")).toBe(true);
      expect(chunk.trimEnd().endsWith("~~~")).toBe(true);
    }
    expectFencesBalanced(chunks);
  });
  it("supports longer fence markers for close", () => {
    const text = "````md

````";
    const limit = 140;
    const chunks = chunkMarkdownText(text, limit);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(limit);
      expect(chunk.startsWith("````md
")).toBe(true);
      expect(chunk.trimEnd().endsWith("````")).toBe(true);
    }
    expectFencesBalanced(chunks);
  });
  it("preserves indentation for indented fences", () => {
    const text = "  ```js
  
  ```";
    const limit = 160;
    const chunks = chunkMarkdownText(text, limit);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(limit);
      expect(chunk.startsWith("  ```js
")).toBe(true);
      expect(chunk.trimEnd().endsWith("  ```")).toBe(true);
    }
    expectFencesBalanced(chunks);
  });
  it("never produces an empty fenced chunk when splitting", () => {
    const text = "```txt

```";
    const chunks = chunkMarkdownText(text, 60);
    for (const chunk of chunks) {
      const nonFenceLines = chunk.split("
").filter((line) => !/^( {0,3})(`{3,}|~{3,})(.*)$/.test(line));
      expect(nonFenceLines.join("
").trim()).not.toBe("");
    }
  });
  runChunkCases(chunkMarkdownText, parentheticalCases);
  it("hard-breaks when a parenthetical exceeds the limit", () => {
    const text = "()";
    const chunks = chunkMarkdownText(text, 20);
    expect(chunks[0]?.length).toBe(20);
    expect(chunks.join("")).toBe(text);
  });
});
describe("chunkByNewline", () => {
  it("splits text on newlines", () => {
    const text = "Line one
Line two
Line three";
    const chunks = chunkByNewline(text, 1000);
    expect(chunks).toEqual(["Line one", "Line two", "Line three"]);
  });
  it("preserves blank lines by folding into the next chunk", () => {
    const text = "Line one


Line two

Line three";
    const chunks = chunkByNewline(text, 1000);
    expect(chunks).toEqual(["Line one", "

Line two", "
Line three"]);
  });
  it("trims whitespace from lines", () => {
    const text = "  Line one  
  Line two  ";
    const chunks = chunkByNewline(text, 1000);
    expect(chunks).toEqual(["Line one", "Line two"]);
  });
  it("preserves leading blank lines on the first chunk", () => {
    const text = "

Line one
Line two";
    const chunks = chunkByNewline(text, 1000);
    expect(chunks).toEqual(["

Line one", "Line two"]);
  });
  it("falls back to length-based for long lines", () => {
    const text = (("Short line
" + "a".repeat(50)) + "
Another short");
    const chunks = chunkByNewline(text, 20);
    expect(chunks[0]).toBe("Short line");
    expect(chunks[1].length).toBe(20);
    expect(chunks[2].length).toBe(20);
    expect(chunks[3].length).toBe(10);
    expect(chunks[4]).toBe("Another short");
  });
  it("does not split long lines when splitLongLines is false", () => {
    const text = "a".repeat(50);
    const chunks = chunkByNewline(text, 20, { splitLongLines: false });
    expect(chunks).toEqual([text]);
  });
  it("returns empty array for empty input", () => {
    expect(chunkByNewline("", 100)).toEqual([]);
  });
  it("returns empty array for whitespace-only input", () => {
    expect(chunkByNewline("   

   ", 100)).toEqual([]);
  });
  it("preserves trailing blank lines on the last chunk", () => {
    const text = "Line one

";
    const chunks = chunkByNewline(text, 1000);
    expect(chunks).toEqual(["Line one

"]);
  });
  it("keeps whitespace when trimLines is false", () => {
    const text = "  indented line  
Next";
    const chunks = chunkByNewline(text, 1000, { trimLines: false });
    expect(chunks).toEqual(["  indented line  ", "Next"]);
  });
});
describe("chunkTextWithMode", () => {
  it("uses length-based chunking for length mode", () => {
    const text = "Line one
Line two";
    const chunks = chunkTextWithMode(text, 1000, "length");
    expect(chunks).toEqual(["Line one
Line two"]);
  });
  it("uses paragraph-based chunking for newline mode", () => {
    const text = "Line one
Line two";
    const chunks = chunkTextWithMode(text, 1000, "newline");
    expect(chunks).toEqual(["Line one
Line two"]);
  });
  it("splits on blank lines for newline mode", () => {
    const text = "Para one

Para two";
    const chunks = chunkTextWithMode(text, 1000, "newline");
    expect(chunks).toEqual(["Para one", "Para two"]);
  });
});
describe("chunkMarkdownTextWithMode", () => {
  it("uses markdown-aware chunking for length mode", () => {
    const text = "Line one
Line two";
    expect(chunkMarkdownTextWithMode(text, 1000, "length")).toEqual(chunkMarkdownText(text, 1000));
  });
  it("uses paragraph-based chunking for newline mode", () => {
    const text = "Line one
Line two";
    expect(chunkMarkdownTextWithMode(text, 1000, "newline")).toEqual(["Line one
Line two"]);
  });
  it("splits on blank lines for newline mode", () => {
    const text = "Para one

Para two";
    expect(chunkMarkdownTextWithMode(text, 1000, "newline")).toEqual(["Para one", "Para two"]);
  });
  it("does not split single-newline code fences in newline mode", () => {
    const text = "```js
const a = 1;
const b = 2;
```
After";
    expect(chunkMarkdownTextWithMode(text, 1000, "newline")).toEqual([text]);
  });
  it("defers long markdown paragraphs to markdown chunking in newline mode", () => {
    const text = "```js
```";
    expect(chunkMarkdownTextWithMode(text, 40, "newline")).toEqual(chunkMarkdownText(text, 40));
  });
  it("does not split on blank lines inside a fenced code block", () => {
    const text = "```python
def my_function():
    x = 1

    y = 2
    return x + y
```";
    expect(chunkMarkdownTextWithMode(text, 1000, "newline")).toEqual([text]);
  });
  it("splits on blank lines between a code fence and following paragraph", () => {
    const fence = "```python
def my_function():
    x = 1

    y = 2
    return x + y
```";
    const text = "

After";
    expect(chunkMarkdownTextWithMode(text, 1000, "newline")).toEqual([fence, "After"]);
  });
});
describe("resolveChunkMode", () => {
  it("returns length as default", () => {
    expect(resolveChunkMode(undefined, "telegram")).toBe("length");
    expect(resolveChunkMode({  }, "discord")).toBe("length");
    expect(resolveChunkMode(undefined, "bluebubbles")).toBe("length");
  });
  it("returns length for internal channel", () => {
    const cfg = { channels: { bluebubbles: { chunkMode: "newline" } } };
    expect(resolveChunkMode(cfg, "__internal__")).toBe("length");
  });
  it("supports provider-level overrides for slack", () => {
    const cfg = { channels: { slack: { chunkMode: "newline" } } };
    expect(resolveChunkMode(cfg, "slack")).toBe("newline");
    expect(resolveChunkMode(cfg, "discord")).toBe("length");
  });
  it("supports account-level overrides for slack", () => {
    const cfg = { channels: { slack: { chunkMode: "length", accounts: { primary: { chunkMode: "newline" } } } } };
    expect(resolveChunkMode(cfg, "slack", "primary")).toBe("newline");
    expect(resolveChunkMode(cfg, "slack", "other")).toBe("length");
  });
});
