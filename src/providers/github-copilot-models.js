const DEFAULT_CONTEXT_WINDOW = 128000;
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_MODEL_IDS = ["gpt-4o", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o1", "o1-mini", "o3-mini"];
export function getDefaultCopilotModelIds() {
  return [...DEFAULT_MODEL_IDS];
}

export function buildCopilotModelDefinition(modelId) {
  const id = modelId.trim();
  if (!id) {
    throw new Error("Model id required");
  }
  return { id, name: id, api: "openai-responses", reasoning: false, input: ["text", "image"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: DEFAULT_CONTEXT_WINDOW, maxTokens: DEFAULT_MAX_TOKENS };
}

