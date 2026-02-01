export 
export 
function getHooksForName(registry, hookName) {
  return registry.typedHooks.filter((h) => (h.hookName === hookName)).sort((a, b) => ((b.priority ?? 0) - (a.priority ?? 0)));
}
export function createHookRunner(registry, options = {  }) {
  const logger = options.logger;
  const catchErrors = (options.catchErrors ?? true);
  async function runVoidHook(hookName, event, ctx) {
    const hooks = getHooksForName(registry, hookName);
    if ((hooks.length === 0)) {
      return;
    }
    logger?.debug?.("[hooks] running  ( handlers)");
    const promises = hooks.map(async (hook) => {
      try {
        {
          await hook.handler(event, ctx);
        }
      }
      catch (err) {
        {
          const msg = "[hooks]  handler from  failed: ";
          if (catchErrors) {
            logger?.error(msg);
          } else {
            throw new Error(msg);
          }
        }
      }
    });
    await Promise.all(promises);
  }
  async function runModifyingHook(hookName, event, ctx, mergeResults) {
    const hooks = getHooksForName(registry, hookName);
    if ((hooks.length === 0)) {
      return undefined;
    }
    logger?.debug?.("[hooks] running  ( handlers, sequential)");
    let result;
    for (const hook of hooks) {
      try {
        {
          const handlerResult = await hook.handler(event, ctx);
          if (((handlerResult !== undefined) && (handlerResult !== null))) {
            if ((mergeResults && (result !== undefined))) {
              result = mergeResults(result, handlerResult);
            } else {
              result = handlerResult;
            }
          }
        }
      }
      catch (err) {
        {
          const msg = "[hooks]  handler from  failed: ";
          if (catchErrors) {
            logger?.error(msg);
          } else {
            throw new Error(msg);
          }
        }
      }
    }
    return result;
  }
  async function runBeforeAgentStart(event, ctx) {
    return runModifyingHook("before_agent_start", event, ctx, (acc, next) => { systemPrompt: (next.systemPrompt ?? acc?.systemPrompt), prependContext: (acc?.prependContext && next.prependContext) ? "

" : (next.prependContext ?? acc?.prependContext) });
  }
  async function runAgentEnd(event, ctx) {
    return runVoidHook("agent_end", event, ctx);
  }
  async function runBeforeCompaction(event, ctx) {
    return runVoidHook("before_compaction", event, ctx);
  }
  async function runAfterCompaction(event, ctx) {
    return runVoidHook("after_compaction", event, ctx);
  }
  async function runMessageReceived(event, ctx) {
    return runVoidHook("message_received", event, ctx);
  }
  async function runMessageSending(event, ctx) {
    return runModifyingHook("message_sending", event, ctx, (acc, next) => { content: (next.content ?? acc?.content), cancel: (next.cancel ?? acc?.cancel) });
  }
  async function runMessageSent(event, ctx) {
    return runVoidHook("message_sent", event, ctx);
  }
  async function runBeforeToolCall(event, ctx) {
    return runModifyingHook("before_tool_call", event, ctx, (acc, next) => { params: (next.params ?? acc?.params), block: (next.block ?? acc?.block), blockReason: (next.blockReason ?? acc?.blockReason) });
  }
  async function runAfterToolCall(event, ctx) {
    return runVoidHook("after_tool_call", event, ctx);
  }
  function runToolResultPersist(event, ctx) {
    const hooks = getHooksForName(registry, "tool_result_persist");
    if ((hooks.length === 0)) {
      return undefined;
    }
    let current = event.message;
    for (const hook of hooks) {
      try {
        {
          const out = hook.handler({ ...event: , message: current }, ctx);
          if ((out && (typeof out.then === "function"))) {
            const msg = ("[hooks] tool_result_persist handler from  returned a Promise; " + "this hook is synchronous and the result was ignored.");
            if (catchErrors) {
              logger?.warn?.(msg);
              continue;
            }
            throw new Error(msg);
          }
          const next = out?.message;
          if (next) {
            current = next;
          }
        }
      }
      catch (err) {
        {
          const msg = "[hooks] tool_result_persist handler from  failed: ";
          if (catchErrors) {
            logger?.error(msg);
          } else {
            throw new Error(msg);
          }
        }
      }
    }
    return { message: current };
  }
  async function runSessionStart(event, ctx) {
    return runVoidHook("session_start", event, ctx);
  }
  async function runSessionEnd(event, ctx) {
    return runVoidHook("session_end", event, ctx);
  }
  async function runGatewayStart(event, ctx) {
    return runVoidHook("gateway_start", event, ctx);
  }
  async function runGatewayStop(event, ctx) {
    return runVoidHook("gateway_stop", event, ctx);
  }
  function hasHooks(hookName) {
    return registry.typedHooks.some((h) => (h.hookName === hookName));
  }
  function getHookCount(hookName) {
    return registry.typedHooks.filter((h) => (h.hookName === hookName)).length;
  }
  return { runBeforeAgentStart, runAgentEnd, runBeforeCompaction, runAfterCompaction, runMessageReceived, runMessageSending, runMessageSent, runBeforeToolCall, runAfterToolCall, runToolResultPersist, runSessionStart, runSessionEnd, runGatewayStart, runGatewayStop, hasHooks, getHookCount };
}

export 
