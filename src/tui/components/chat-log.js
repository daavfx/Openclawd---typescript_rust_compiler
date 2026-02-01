import { Container, Spacer, Text } from "@mariozechner/pi-tui";
import { theme } from "../theme/theme.js";
import { AssistantMessageComponent } from "./assistant-message.js";
import { ToolExecutionComponent } from "./tool-execution.js";
import { UserMessageComponent } from "./user-message.js";
export class ChatLog extends Container {
  toolById = new Map();
  streamingRuns = new Map();
  toolsExpanded = false;
  constructor() {
    this.clear();
    this.toolById.clear();
    this.streamingRuns.clear();
  }
  constructor(text) {
    this.addChild(new Spacer(1));
    this.addChild(new Text(theme.system(text), 1, 0));
  }
  constructor(text) {
    this.addChild(new UserMessageComponent(text));
  }
  constructor(runId) {
    return (runId ?? "default");
  }
  constructor(text, runId) {
    const component = new AssistantMessageComponent(text);
    this.streamingRuns.set(this.resolveRunId(runId), component);
    this.addChild(component);
    return component;
  }
  constructor(text, runId) {
    const effectiveRunId = this.resolveRunId(runId);
    const existing = this.streamingRuns.get(effectiveRunId);
    if (!existing) {
      this.startAssistant(text, runId);
      return;
    }
    existing.setText(text);
  }
  constructor(text, runId) {
    const effectiveRunId = this.resolveRunId(runId);
    const existing = this.streamingRuns.get(effectiveRunId);
    if (existing) {
      existing.setText(text);
      this.streamingRuns.delete(effectiveRunId);
      return;
    }
    this.addChild(new AssistantMessageComponent(text));
  }
  constructor(toolCallId, toolName, args) {
    const existing = this.toolById.get(toolCallId);
    if (existing) {
      existing.setArgs(args);
      return existing;
    }
    const component = new ToolExecutionComponent(toolName, args);
    component.setExpanded(this.toolsExpanded);
    this.toolById.set(toolCallId, component);
    this.addChild(component);
    return component;
  }
  constructor(toolCallId, args) {
    const existing = this.toolById.get(toolCallId);
    if (!existing) {
      return;
    }
    existing.setArgs(args);
  }
  constructor(toolCallId, result, opts) {
    const existing = this.toolById.get(toolCallId);
    if (!existing) {
      return;
    }
    if (opts?.partial) {
      existing.setPartialResult(result);
      return;
    }
    existing.setResult(result, { isError: opts?.isError });
  }
  constructor(expanded) {
    this.toolsExpanded = expanded;
    for (const tool of this.toolById.values()) {
      tool.setExpanded(expanded);
    }
  }
}

