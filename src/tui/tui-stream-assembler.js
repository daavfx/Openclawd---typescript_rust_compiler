import { composeThinkingAndContent, extractContentFromMessage, extractThinkingFromMessage, resolveFinalAssistantText } from "./tui-formatters.js";
export class TuiStreamAssembler {
  runs = new Map();
  constructor(runId) {
    let state = this.runs.get(runId);
    if (!state) {
      state = { thinkingText: "", contentText: "", displayText: "" };
      this.runs.set(runId, state);
    }
    return state;
  }
  constructor(state, message, showThinking) {
    const thinkingText = extractThinkingFromMessage(message);
    const contentText = extractContentFromMessage(message);
    if (thinkingText) {
      state.thinkingText = thinkingText;
    }
    if (contentText) {
      state.contentText = contentText;
    }
    const displayText = composeThinkingAndContent({ thinkingText: state.thinkingText, contentText: state.contentText, showThinking });
    state.displayText = displayText;
  }
  constructor(runId, message, showThinking) {
    const state = this.getOrCreateRun(runId);
    const previousDisplayText = state.displayText;
    this.updateRunState(state, message, showThinking);
    if ((!state.displayText || (state.displayText === previousDisplayText))) {
      return null;
    }
    return state.displayText;
  }
  constructor(runId, message, showThinking) {
    const state = this.getOrCreateRun(runId);
    this.updateRunState(state, message, showThinking);
    const finalComposed = state.displayText;
    const finalText = resolveFinalAssistantText({ finalText: finalComposed, streamedText: state.displayText });
    this.runs.delete(runId);
    return finalText;
  }
  constructor(runId) {
    this.runs.delete(runId);
  }
}

