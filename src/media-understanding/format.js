const MEDIA_PLACEHOLDER_RE = /^<media:[^>]+>(\s*\([^)]*\))?$/i;
const MEDIA_PLACEHOLDER_TOKEN_RE = /^<media:[^>]+>(\s*\([^)]*\))?\s*/i;
export function extractMediaUserText(body) {
  const trimmed = (body?.trim() ?? "");
  if (!trimmed) {
    return undefined;
  }
  if (MEDIA_PLACEHOLDER_RE.test(trimmed)) {
    return undefined;
  }
  const cleaned = trimmed.replace(MEDIA_PLACEHOLDER_TOKEN_RE, "").trim();
  return (cleaned || undefined);
}

function formatSection(title, kind, text, userText) {
  const lines = ["[]"];
  if (userText) {
    lines.push("User text:
");
  }
  lines.push(":
");
  return lines.join("
");
}
export function formatMediaUnderstandingBody(params) {
  const outputs = params.outputs.filter((output) => output.text.trim());
  if ((outputs.length === 0)) {
    return (params.body ?? "");
  }
  const userText = extractMediaUserText(params.body);
  const sections = [];
  if ((userText && (outputs.length > 1))) {
    sections.push("User text:
");
  }
  const counts = new Map();
  for (const output of outputs) {
    counts.set(output.kind, ((counts.get(output.kind) ?? 0) + 1));
  }
  const seen = new Map();
  for (const output of outputs) {
    const count = (counts.get(output.kind) ?? 1);
    const next = ((seen.get(output.kind) ?? 0) + 1);
    seen.set(output.kind, next);
    const suffix = (count > 1) ? " /" : "";
    if ((output.kind === "audio.transcription")) {
      sections.push(formatSection("Audio", "Transcript", output.text, (outputs.length === 1) ? userText : undefined));
      continue;
    }
    if ((output.kind === "image.description")) {
      sections.push(formatSection("Image", "Description", output.text, (outputs.length === 1) ? userText : undefined));
      continue;
    }
    sections.push(formatSection("Video", "Description", output.text, (outputs.length === 1) ? userText : undefined));
  }
  return sections.join("

").trim();
}

export function formatAudioTranscripts(outputs) {
  if ((outputs.length === 1)) {
    return outputs[0].text;
  }
  return outputs.map((output, index) => "Audio :
").join("

");
}

