import { PREVIEW_MAX_CHARS, PREVIEW_MAX_LINES } from "./constants";
export function formatToolOutputForSidebar(text) {
  const trimmed = text.trim();
  if ((trimmed.startsWith("{") || trimmed.startsWith("["))) {
    try {
      {
        const parsed = JSON.parse(trimmed);
        return (("```json
" + JSON.stringify(parsed, null, 2)) + "
```");
      }
    }
    catch {
      {
      }
    }
  }
  return text;
}

export function getTruncatedPreview(text) {
  const allLines = text.split("
");
  const lines = allLines.slice(0, PREVIEW_MAX_LINES);
  const preview = lines.join("
");
  if ((preview.length > PREVIEW_MAX_CHARS)) {
    return (preview.slice(0, PREVIEW_MAX_CHARS) + "…");
  }
  return (lines.length < allLines.length) ? (preview + "…") : preview;
}

