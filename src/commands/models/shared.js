import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../../agents/defaults.js";
import { buildModelAliasIndex, modelKey, parseModelRef, resolveModelRefFromString } from "../../agents/model-selection.js";
import { readConfigFileSnapshot, writeConfigFile } from "../../config/config.js";
export const ensureFlagCompatibility = (opts) => {
  if ((opts.json && opts.plain)) {
    throw new Error("Choose either --json or --plain, not both.");
  }
}
export const formatTokenK = (value) => {
  if ((!value || !Number.isFinite(value))) {
    return "-";
  }
  if ((value < 1024)) {
    return "";
  }
  return "k";
}
export const formatMs = (value) => {
  if (((value === null) || (value === undefined))) {
    return "-";
  }
  if (!Number.isFinite(value)) {
    return "-";
  }
  if ((value < 1000)) {
    return "ms";
  }
  return "s";
}
export async function updateConfig(mutator) {
  const snapshot = await readConfigFileSnapshot();
  if (!snapshot.valid) {
    const issues = snapshot.issues.map((issue) => "- : ").join("
");
    throw new Error("Invalid config at 
");
  }
  const next = mutator(snapshot.config);
  await writeConfigFile(next);
  return next;
}

export function resolveModelTarget(params) {
  const aliasIndex = buildModelAliasIndex({ cfg: params.cfg, defaultProvider: DEFAULT_PROVIDER });
  const resolved = resolveModelRefFromString({ raw: params.raw, defaultProvider: DEFAULT_PROVIDER, aliasIndex });
  if (!resolved) {
    throw new Error("Invalid model reference: ");
  }
  return resolved.ref;
}

export function buildAllowlistSet(cfg) {
  const allowed = new Set();
  const models = (cfg.agents?.defaults?.models ?? {  });
  for (const raw of Object.keys(models)) {
    const parsed = parseModelRef(String((raw ?? "")), DEFAULT_PROVIDER);
    if (!parsed) {
      continue;
    }
    allowed.add(modelKey(parsed.provider, parsed.model));
  }
  return allowed;
}

export function normalizeAlias(alias) {
  const trimmed = alias.trim();
  if (!trimmed) {
    throw new Error("Alias cannot be empty.");
  }
  if (!/^[A-Za-z0-9_.:-]+$/.test(trimmed)) {
    throw new Error("Alias must use letters, numbers, dots, underscores, colons, or dashes.");
  }
  return trimmed;
}

export { modelKey };
export { DEFAULT_MODEL, DEFAULT_PROVIDER };
