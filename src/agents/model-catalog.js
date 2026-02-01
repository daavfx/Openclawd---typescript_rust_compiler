import { loadConfig } from "../config/config.js";
import { resolveOpenClawAgentDir } from "./agent-paths.js";
import { ensureOpenClawModelsJson } from "./models-config.js";
export 
let modelCatalogPromise = null;
let hasLoggedModelCatalogError = false;
const defaultImportPiSdk = () => import("@mariozechner/pi-coding-agent");
let importPiSdk = defaultImportPiSdk;
export function resetModelCatalogCacheForTest() {
  modelCatalogPromise = null;
  hasLoggedModelCatalogError = false;
  importPiSdk = defaultImportPiSdk;
}

export function __setModelCatalogImportForTest(loader) {
  importPiSdk = (loader ?? defaultImportPiSdk);
}

export async function loadModelCatalog(params) {
  if ((params?.useCache === false)) {
    modelCatalogPromise = null;
  }
  if (modelCatalogPromise) {
    return modelCatalogPromise;
  }
  modelCatalogPromise = async () => {
    const models = [];
    const sortModels = (entries) => entries.sort((a, b) => {
      const p = a.provider.localeCompare(b.provider);
      if ((p !== 0)) {
        return p;
      }
      return a.name.localeCompare(b.name);
    });
    try {
      {
        const cfg = (params?.config ?? loadConfig());
        await ensureOpenClawModelsJson(cfg);
        const piSdk = await importPiSdk();
        const agentDir = resolveOpenClawAgentDir();
        const authStorage = piSdk.discoverAuthStorage(agentDir);
        const registry = piSdk.discoverModels(authStorage, agentDir);
        const entries = Array.isArray(registry) ? registry : registry.getAll();
        for (const entry of entries) {
          const id = String((entry?.id ?? "")).trim();
          if (!id) {
            continue;
          }
          const provider = String((entry?.provider ?? "")).trim();
          if (!provider) {
            continue;
          }
          const name = (String((entry?.name ?? id)).trim() || id);
          const contextWindow = ((typeof entry?.contextWindow === "number") && (entry.contextWindow > 0)) ? entry.contextWindow : undefined;
          const reasoning = (typeof entry?.reasoning === "boolean") ? entry.reasoning : undefined;
          const input = Array.isArray(entry?.input) ? entry.input : undefined;
          models.push({ id, name, provider, contextWindow, reasoning, input });
        }
        if ((models.length === 0)) {
          modelCatalogPromise = null;
        }
        return sortModels(models);
      }
    }
    catch (error) {
      {
        if (!hasLoggedModelCatalogError) {
          hasLoggedModelCatalogError = true;
          console.warn("[model-catalog] Failed to load model catalog: ");
        }
        modelCatalogPromise = null;
        if ((models.length > 0)) {
          return sortModels(models);
        }
        return [];
      }
    }
  }();
  return modelCatalogPromise;
}

export function modelSupportsVision(entry) {
  return (entry?.input?.includes("image") ?? false);
}

export function findModelInCatalog(catalog, provider, modelId) {
  const normalizedProvider = provider.toLowerCase().trim();
  const normalizedModelId = modelId.toLowerCase().trim();
  return catalog.find((entry) => ((entry.provider.toLowerCase() === normalizedProvider) && (entry.id.toLowerCase() === normalizedModelId)));
}

