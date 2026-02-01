export 
const REGISTRY = new WeakMap();
export function setContextPruningRuntime(sessionManager, value) {
  if ((!sessionManager || (typeof sessionManager !== "object"))) {
    return;
  }
  const key = sessionManager;
  if ((value === null)) {
    REGISTRY.delete(key);
    return;
  }
  REGISTRY.set(key, value);
}

export function getContextPruningRuntime(sessionManager) {
  if ((!sessionManager || (typeof sessionManager !== "object"))) {
    return null;
  }
  return (REGISTRY.get(sessionManager) ?? null);
}

