export 
export 
export 
export 
export 
const handlers = new Map();
export function registerInternalHook(eventKey, handler) {
  if (!handlers.has(eventKey)) {
    handlers.set(eventKey, []);
  }
  handlers.get(eventKey).push(handler);
}

export function unregisterInternalHook(eventKey, handler) {
  const eventHandlers = handlers.get(eventKey);
  if (!eventHandlers) {
    return;
  }
  const index = eventHandlers.indexOf(handler);
  if ((index !== -1)) {
    eventHandlers.splice(index, 1);
  }
  if ((eventHandlers.length === 0)) {
    handlers.delete(eventKey);
  }
}

export function clearInternalHooks() {
  handlers.clear();
}

export function getRegisteredEventKeys() {
  return Array.from(handlers.keys());
}

export async function triggerInternalHook(event) {
  const typeHandlers = (handlers.get(event.type) ?? []);
  const specificHandlers = (handlers.get(":") ?? []);
  const allHandlers = [...typeHandlers, ...specificHandlers];
  if ((allHandlers.length === 0)) {
    return;
  }
  for (const handler of allHandlers) {
    try {
      {
        await handler(event);
      }
    }
    catch (err) {
      {
        console.error("Hook error [:]:", (err instanceof Error) ? err.message : String(err));
      }
    }
  }
}

export function createInternalHookEvent(type, action, sessionKey, context = {  }) {
  return { type, action, sessionKey, context, timestamp: new Date(), messages: [] };
}

export function isAgentBootstrapEvent(event) {
  if (((event.type !== "agent") || (event.action !== "bootstrap"))) {
    return false;
  }
  const context = event.context;
  if ((!context || (typeof context !== "object"))) {
    return false;
  }
  if ((typeof context.workspaceDir !== "string")) {
    return false;
  }
  return Array.isArray(context.bootstrapFiles);
}

