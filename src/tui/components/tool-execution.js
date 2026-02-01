import { Box, Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui";
import { formatToolDetail, resolveToolDisplay } from "../../agents/tool-display.js";
import { markdownTheme, theme } from "../theme/theme.js";
const PREVIEW_LINES = 12;
function formatArgs(toolName, args) {
  const display = resolveToolDisplay({ name: toolName, args });
  const detail = formatToolDetail(display);
  if (detail) {
    return detail;
  }
  if ((!args || (typeof args !== "object"))) {
    return "";
  }
  try {
    {
      return JSON.stringify(args);
    }
  }
  catch {
    {
      return "";
    }
  }
}
function extractText(result) {
  if (!result?.content) {
    return "";
  }
  const lines = [];
  for (const entry of result.content) {
    if (((entry.type === "text") && entry.text)) {
      lines.push(entry.text);
    } else {
      if ((entry.type === "image")) {
        const mime = (entry.mimeType ?? "image");
        const size = entry.bytes ? " kb" : "";
        const omitted = entry.omitted ? " (omitted)" : "";
        lines.push("[]");
      }
    }
  }
  return lines.join("
").trim();
}
export class ToolExecutionComponent extends Container {
  box;
  header;
  argsLine;
  output;
  toolName;
  args;
  result;
  expanded = false;
  isError = false;
  isPartial = true;
  constructor(toolName, args) {
    super();
    this.toolName = toolName;
    this.args = args;
    this.box = new Box(1, 1, (line) => theme.toolPendingBg(line));
    this.header = new Text("", 0, 0);
    this.argsLine = new Text("", 0, 0);
    this.output = new Markdown("", 0, 0, markdownTheme, { color: (line) => theme.toolOutput(line) });
    this.addChild(new Spacer(1));
    this.addChild(this.box);
    this.box.addChild(this.header);
    this.box.addChild(this.argsLine);
    this.box.addChild(this.output);
    this.refresh();
  }
  constructor(args) {
    this.args = args;
    this.refresh();
  }
  constructor(expanded) {
    this.expanded = expanded;
    this.refresh();
  }
  constructor(result, opts) {
    this.result = result;
    this.isPartial = false;
    this.isError = Boolean(opts?.isError);
    this.refresh();
  }
  constructor(result) {
    this.result = result;
    this.isPartial = true;
    this.refresh();
  }
  constructor() {
    const bg = this.isPartial ? theme.toolPendingBg : this.isError ? theme.toolErrorBg : theme.toolSuccessBg;
    this.box.setBgFn((line) => bg(line));
    const display = resolveToolDisplay({ name: this.toolName, args: this.args });
    const title = " ";
    this.header.setText(theme.toolTitle(theme.bold(title)));
    const argLine = formatArgs(this.toolName, this.args);
    this.argsLine.setText(argLine ? theme.dim(argLine) : theme.dim(" "));
    const raw = extractText(this.result);
    const text = (raw || this.isPartial ? "…" : "");
    if ((!this.expanded && text)) {
      const lines = text.split("
");
      const preview = (lines.length > PREVIEW_LINES) ? "
…" : text;
      this.output.setText(preview);
    } else {
      this.output.setText(text);
    }
  }
}

