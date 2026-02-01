import { describe, expect, it } from "vitest";
import { getPublicKey } from "nostr-tools";
import { createProfileEvent, profileToContent, validateProfile, sanitizeProfileForDisplay } from "./nostr-profile.js";
const TEST_HEX_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const TEST_SK = new Uint8Array(TEST_HEX_KEY.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
describe("profile unicode attacks", () => {
  describe("zero-width characters", () => {
    it("handles zero-width space in name", () => {
      const profile = { name: "test​user" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.profile?.name).toBe("test​user");
    });
    it("handles zero-width joiner in name", () => {
      const profile = { name: "test‍user" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
    it("handles zero-width non-joiner in about", () => {
      const profile = { about: "test‌about" };
      const content = profileToContent(profile);
      expect(content.about).toBe("test‌about");
    });
  });
  describe("RTL override attacks", () => {
    it("handles RTL override in name", () => {
      const profile = { name: "‮evil‬" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
      const sanitized = sanitizeProfileForDisplay(result.profile);
      expect(sanitized.name).toBeDefined();
    });
    it("handles bidi embedding in about", () => {
      const profile = { about: "Normal ‫reversed‬ text" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
  });
  describe("homoglyph attacks", () => {
    it("handles Cyrillic homoglyphs", () => {
      const profile = { name: "аdmin" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
    it("handles Greek homoglyphs", () => {
      const profile = { name: "bοt" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
  });
  describe("combining characters", () => {
    it("handles combining diacritics", () => {
      const profile = { name: "café" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.profile?.name).toBe("café");
    });
    it("handles excessive combining characters (Zalgo text)", () => {
      const zalgo = "t̷̢̧̨̡̛̛̛͎̩̝̪̲̲̞̠̹̗̩͓̬̱̪̦͙̬̲̤͙̱̫̝̪̱̫̯̬̭̠̖̲̥̖̫̫̤͇̪̣̫̪̖̱̯̣͎̯̲̱̤̪̣̖̲̪̯͓̖̤̫̫̲̱̲̫̲̖̫̪̯̱̱̪̖̯e̶̡̧̨̧̛̛̛̖̪̯̱̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪s̶̨̧̛̛̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯̖̪̯̖̪̱̪̯t";
      const profile = { name: zalgo.slice(0, 256) };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
  });
  describe("CJK and other scripts", () => {
    it("handles Chinese characters", () => {
      const profile = { name: "中文用户", about: "我是一个机器人" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
    it("handles Japanese hiragana and katakana", () => {
      const profile = { name: "ボット", about: "これはテストです" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
    it("handles Korean characters", () => {
      const profile = { name: "한국어사용자" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
    it("handles Arabic text", () => {
      const profile = { name: "مستخدم", about: "مرحبا بالعالم" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
    it("handles Hebrew text", () => {
      const profile = { name: "משתמש" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
    it("handles Thai text", () => {
      const profile = { name: "ผู้ใช้" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
  });
  describe("emoji edge cases", () => {
    it("handles emoji sequences (ZWJ)", () => {
      const profile = { name: "👨‍👩‍👧‍👦" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
    it("handles flag emojis", () => {
      const profile = { name: "🇺🇸🇯🇵🇬🇧" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
    it("handles skin tone modifiers", () => {
      const profile = { name: "👋🏻👋🏽👋🏿" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
    });
  });
});
describe("profile XSS attacks", () => {
  describe("script injection", () => {
    it("escapes script tags", () => {
      const profile = { name: "<script>alert(\"xss\")</script>" };
      const sanitized = sanitizeProfileForDisplay(profile);
      expect(sanitized.name).not.toContain("<script>");
      expect(sanitized.name).toContain("&lt;script&gt;");
    });
    it("escapes nested script tags", () => {
      const profile = { about: "<<script>script>alert(\"xss\")<</script>/script>" };
      const sanitized = sanitizeProfileForDisplay(profile);
      expect(sanitized.about).not.toContain("<script>");
    });
  });
  describe("event handler injection", () => {
    it("escapes img onerror", () => {
      const profile = { about: "<img src=\"x\" onerror=\"alert(1)\">" };
      const sanitized = sanitizeProfileForDisplay(profile);
      expect(sanitized.about).toContain("&lt;img");
      expect(sanitized.about).not.toContain("onerror=\"alert");
    });
    it("escapes svg onload", () => {
      const profile = { about: "<svg onload=\"alert(1)\">" };
      const sanitized = sanitizeProfileForDisplay(profile);
      expect(sanitized.about).toContain("&lt;svg");
    });
    it("escapes body onload", () => {
      const profile = { about: "<body onload=\"alert(1)\">" };
      const sanitized = sanitizeProfileForDisplay(profile);
      expect(sanitized.about).toContain("&lt;body");
    });
  });
  describe("URL-based attacks", () => {
    it("rejects javascript: URL in picture", () => {
      const profile = { picture: "javascript:alert('xss')" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
    });
    it("rejects javascript: URL with encoding", () => {
      const profile = { picture: "java&#115;cript:alert('xss')" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
    });
    it("rejects data: URL", () => {
      const profile = { picture: "data:text/html,<script>alert('xss')</script>" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
    });
    it("rejects vbscript: URL", () => {
      const profile = { website: "vbscript:msgbox('xss')" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
    });
    it("rejects file: URL", () => {
      const profile = { picture: "file:///etc/passwd" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
    });
  });
  describe("HTML attribute injection", () => {
    it("escapes double quotes in fields", () => {
      const profile = { name: "\" onclick=\"alert(1)\" data-x=\"" };
      const sanitized = sanitizeProfileForDisplay(profile);
      expect(sanitized.name).toContain("&quot;");
      expect(sanitized.name).not.toContain("onclick=\"alert");
    });
    it("escapes single quotes in fields", () => {
      const profile = { name: "' onclick='alert(1)' data-x='" };
      const sanitized = sanitizeProfileForDisplay(profile);
      expect(sanitized.name).toContain("&#039;");
    });
  });
  describe("CSS injection", () => {
    it("escapes style tags", () => {
      const profile = { about: "<style>body{background:url(\"javascript:alert(1)\")}</style>" };
      const sanitized = sanitizeProfileForDisplay(profile);
      expect(sanitized.about).toContain("&lt;style&gt;");
    });
  });
});
describe("profile length boundaries", () => {
  describe("name field (max 256)", () => {
    it("accepts exactly 256 characters", () => {
      const result = validateProfile({ name: "a".repeat(256) });
      expect(result.valid).toBe(true);
    });
    it("rejects 257 characters", () => {
      const result = validateProfile({ name: "a".repeat(257) });
      expect(result.valid).toBe(false);
    });
    it("accepts empty string", () => {
      const result = validateProfile({ name: "" });
      expect(result.valid).toBe(true);
    });
  });
  describe("displayName field (max 256)", () => {
    it("accepts exactly 256 characters", () => {
      const result = validateProfile({ displayName: "b".repeat(256) });
      expect(result.valid).toBe(true);
    });
    it("rejects 257 characters", () => {
      const result = validateProfile({ displayName: "b".repeat(257) });
      expect(result.valid).toBe(false);
    });
  });
  describe("about field (max 2000)", () => {
    it("accepts exactly 2000 characters", () => {
      const result = validateProfile({ about: "c".repeat(2000) });
      expect(result.valid).toBe(true);
    });
    it("rejects 2001 characters", () => {
      const result = validateProfile({ about: "c".repeat(2001) });
      expect(result.valid).toBe(false);
    });
  });
  describe("URL fields", () => {
    it("accepts long valid HTTPS URLs", () => {
      const longPath = "a".repeat(1000);
      const result = validateProfile({ picture: "https://example.com/.png" });
      expect(result.valid).toBe(true);
    });
    it("rejects invalid URL format", () => {
      const result = validateProfile({ picture: "not-a-url" });
      expect(result.valid).toBe(false);
    });
    it("rejects URL without protocol", () => {
      const result = validateProfile({ picture: "example.com/pic.png" });
      expect(result.valid).toBe(false);
    });
  });
});
describe("profile type confusion", () => {
  it("rejects number as name", () => {
    const result = validateProfile({ name: 123 });
    expect(result.valid).toBe(false);
  });
  it("rejects array as about", () => {
    const result = validateProfile({ about: ["hello"] });
    expect(result.valid).toBe(false);
  });
  it("rejects object as picture", () => {
    const result = validateProfile({ picture: { url: "https://example.com" } });
    expect(result.valid).toBe(false);
  });
  it("rejects null as name", () => {
    const result = validateProfile({ name: null });
    expect(result.valid).toBe(false);
  });
  it("rejects boolean as about", () => {
    const result = validateProfile({ about: true });
    expect(result.valid).toBe(false);
  });
  it("rejects function as name", () => {
    const result = validateProfile({ name: () => "test" });
    expect(result.valid).toBe(false);
  });
  it("handles prototype pollution attempt", () => {
    const malicious = JSON.parse("{\"__proto__\": {\"polluted\": true}}");
    const result = validateProfile(malicious);
    expect({  }.polluted).toBeUndefined();
  });
});
describe("event creation edge cases", () => {
  it("handles profile with all fields at max length", () => {
    const profile = { name: "a".repeat(256), displayName: "b".repeat(256), about: "c".repeat(2000), nip05: ("d".repeat(200) + "@example.com"), lud16: ("e".repeat(200) + "@example.com") };
    const event = createProfileEvent(TEST_SK, profile);
    expect(event.kind).toBe(0);
    expect(() => JSON.parse(event.content)).not.toThrow();
  });
  it("handles rapid sequential events with monotonic timestamps", () => {
    const profile = { name: "rapid" };
    let lastTimestamp = 0;
    for (let i = 0; (i < 100); i++) {
      const event = createProfileEvent(TEST_SK, profile, lastTimestamp);
      expect(event.created_at).toBeGreaterThan(lastTimestamp);
      lastTimestamp = event.created_at;
    }
  });
  it("handles JSON special characters in content", () => {
    const profile = { name: "test\"user", about: "line1
line2	tab\\backslash" };
    const event = createProfileEvent(TEST_SK, profile);
    const parsed = JSON.parse(event.content);
    expect(parsed.name).toBe("test\"user");
    expect(parsed.about).toContain("
");
    expect(parsed.about).toContain("	");
    expect(parsed.about).toContain("\\");
  });
});
