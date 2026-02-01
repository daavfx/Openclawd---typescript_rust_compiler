import { logDebug, logError } from "../logger.js";
import { normalizeToolName } from "./tool-policy.js";
import { jsonResult } from "./tools/common.js";
function describeToolExecutionError(err) {
  if ((err instanceof Error)) {
    const message = err.message?.trim() ? err.message : String(err);
    return { message, stack: err.stack };
  }
  return { message: String(err) };
}
export function toToolDefinitions(tools) {
  return tools.map((tool) => {
    const name = (tool.name || "tool");
    const normalizedName = normalizeToolName(name);
    return { name, label: (tool.label ?? name), description: (tool.description ?? ""), parameters: tool.parameters, execute: async (toolCallId, params, onUpdate, _ctx, signal) => {
      try {
        {
          return await tool.execute(toolCallId, params, signal, onUpdate);
        }
      }
      catch (err) {
        {
          if (signal?.aborted) {
            throw err;
          }
          const name = ((err && (typeof err === "object")) && ("name" in err)) ? String(err.name) : "";
          if ((name === "AbortError")) {
            throw err;
          }
          const described = describeToolExecutionError(err);
          if ((described.stack && (described.stack !== described.message))) {
            logDebug("tools:  failed stack:
");
          }
          logError("[tools]  failed: ");
          return jsonResult({ status: "error", tool: normalizedName, error: described.message });
        }
      }
    } };
  });
}

export function toClientToolDefinitions(tools, onClientToolCall) {
  return tools.map((tool) => {
    const func = tool.function;
    return { name: func.name, label: func.name, description: (func.description ?? ""), parameters: func.parameters, execute: async (toolCallId, params, _onUpdate, _ctx, _signal) => {
      if (onClientToolCall) {
        onClientToolCall(func.name, params);
      }
      return jsonResult({ status: "pending", tool: func.name, message: "Tool execution delegated to client" });
    } };
  });
}

