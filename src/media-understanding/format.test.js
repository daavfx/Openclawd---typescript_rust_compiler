import { describe, expect, it } from "vitest";
import { formatMediaUnderstandingBody } from "./format.js";
describe("formatMediaUnderstandingBody", () => {
  it("replaces placeholder body with transcript", () => {
    const body = formatMediaUnderstandingBody({ body: "<media:audio>", outputs: [{ kind: "audio.transcription", attachmentIndex: 0, text: "hello world", provider: "groq" }] });
    expect(body).toBe("[Audio]
Transcript:
hello world");
  });
  it("includes user text when body is meaningful", () => {
    const body = formatMediaUnderstandingBody({ body: "caption here", outputs: [{ kind: "audio.transcription", attachmentIndex: 0, text: "transcribed", provider: "groq" }] });
    expect(body).toBe("[Audio]
User text:
caption here
Transcript:
transcribed");
  });
  it("strips leading media placeholders from user text", () => {
    const body = formatMediaUnderstandingBody({ body: "<media:audio> caption here", outputs: [{ kind: "audio.transcription", attachmentIndex: 0, text: "transcribed", provider: "groq" }] });
    expect(body).toBe("[Audio]
User text:
caption here
Transcript:
transcribed");
  });
  it("keeps user text once when multiple outputs exist", () => {
    const body = formatMediaUnderstandingBody({ body: "caption here", outputs: [{ kind: "audio.transcription", attachmentIndex: 0, text: "audio text", provider: "groq" }, { kind: "video.description", attachmentIndex: 1, text: "video text", provider: "google" }] });
    expect(body).toBe(["User text:
caption here", "[Audio]
Transcript:
audio text", "[Video]
Description:
video text"].join("

"));
  });
  it("formats image outputs", () => {
    const body = formatMediaUnderstandingBody({ body: "<media:image>", outputs: [{ kind: "image.description", attachmentIndex: 0, text: "a cat", provider: "openai" }] });
    expect(body).toBe("[Image]
Description:
a cat");
  });
});
