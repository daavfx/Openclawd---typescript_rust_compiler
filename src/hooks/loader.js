import { pathToFileURL } from "node:url";
import path from "node:path";
import { registerInternalHook } from "./internal-hooks.js";
import { loadWorkspaceHookEntries } from "./workspace.js";
import { resolveHookConfig } from "./config.js";
import { shouldIncludeHook } from "./config.js";
export async function loadInternalHooks(cfg, workspaceDir) {
  if (!cfg.hooks?.internal?.enabled) {
    return 0;
  }
  let loadedCount = 0;
  try {
    {
      const hookEntries = loadWorkspaceHookEntries(workspaceDir, { config: cfg });
      const eligible = hookEntries.filter((entry) => shouldIncludeHook({ entry, config: cfg }));
      for (const entry of eligible) {
        const hookConfig = resolveHookConfig(cfg, entry.hook.name);
        if ((hookConfig?.enabled === false)) {
          continue;
        }
        try {
          {
            const url = pathToFileURL(entry.hook.handlerPath).href;
            const cacheBustedUrl = "?t=";
            const mod = await import(cacheBustedUrl);
            const exportName = (entry.metadata?.export ?? "default");
            const handler = mod[exportName];
            if ((typeof handler !== "function")) {
              console.error("Hook error: Handler '' from  is not a function");
              continue;
            }
            const events = (entry.metadata?.events ?? []);
            if ((events.length === 0)) {
              console.warn("Hook warning: Hook '' has no events defined in metadata");
              continue;
            }
            for (const event of events) {
              registerInternalHook(event, handler);
            }
            console.log("Registered hook:  -> ");
            loadedCount++;
          }
        }
        catch (err) {
          {
            console.error("Failed to load hook :", (err instanceof Error) ? err.message : String(err));
          }
        }
      }
    }
  }
  catch (err) {
    {
      console.error("Failed to load directory-based hooks:", (err instanceof Error) ? err.message : String(err));
    }
  }
  const handlers = (cfg.hooks.internal.handlers ?? []);
  for (const handlerConfig of handlers) {
    try {
      {
        const modulePath = path.isAbsolute(handlerConfig.module) ? handlerConfig.module : path.join(process.cwd(), handlerConfig.module);
        const url = pathToFileURL(modulePath).href;
        const cacheBustedUrl = "?t=";
        const mod = await import(cacheBustedUrl);
        const exportName = (handlerConfig.export ?? "default");
        const handler = mod[exportName];
        if ((typeof handler !== "function")) {
          console.error("Hook error: Handler '' from  is not a function");
          continue;
        }
        registerInternalHook(handlerConfig.event, handler);
        console.log("Registered hook (legacy):  -> ");
        loadedCount++;
      }
    }
    catch (err) {
      {
        console.error("Failed to load hook handler from :", (err instanceof Error) ? err.message : String(err));
      }
    }
  }
  return loadedCount;
}

