import { createSubsystemLogger } from "../logging/subsystem.js";
import { createHookRunner } from "./hooks.js";
const log = createSubsystemLogger("plugins");
let globalHookRunner = null;
let globalRegistry = null;
export function initializeGlobalHookRunner(registry) {
  globalRegistry = registry;
  globalHookRunner = createHookRunner(registry, { logger: { debug: (msg) => log.debug(msg), warn: (msg) => log.warn(msg), error: (msg) => log.error(msg) }, catchErrors: true });
  const hookCount = registry.hooks.length;
  if ((hookCount > 0)) {
    log.info("hook runner initialized with  registered hooks");
  }
}

export function getGlobalHookRunner() {
  return globalHookRunner;
}

export function getGlobalPluginRegistry() {
  return globalRegistry;
}

export function hasGlobalHooks(hookName) {
  return (globalHookRunner?.hasHooks(hookName) ?? false);
}

export function resetGlobalHookRunner() {
  globalHookRunner = null;
  globalRegistry = null;
}

