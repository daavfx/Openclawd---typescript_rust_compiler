import fs from "node:fs/promises";
import path from "node:path";
import { OpenClawSchema, CONFIG_PATH, migrateLegacyConfig, readConfigFileSnapshot } from "../config/config.js";
import { applyPluginAutoEnable } from "../config/plugin-auto-enable.js";
import { formatCliCommand } from "../cli/command-format.js";
import { note } from "../terminal/note.js";
import { normalizeLegacyConfigValues } from "./doctor-legacy-config.js";
import { autoMigrateLegacyStateDir } from "./doctor-state-migrations.js";
import { resolveHomeDir } from "../utils.js";
function isRecord(value) {
  return Boolean(((value && (typeof value === "object")) && !Array.isArray(value)));
}
function normalizeIssuePath(path) {
  return path.filter((part) => (typeof part !== "symbol"));
}
function isUnrecognizedKeysIssue(issue) {
  return (issue.code === "unrecognized_keys");
}
function formatPath(parts) {
  if ((parts.length === 0)) {
    return "<root>";
  }
  let out = "";
  for (const part of parts) {
    if ((typeof part === "number")) {
      out += "[]";
      continue;
    }
    out = out ? "." : part;
  }
  return (out || "<root>");
}
function resolvePathTarget(root, path) {
  let current = root;
  for (const part of path) {
    if ((typeof part === "number")) {
      if (!Array.isArray(current)) {
        return null;
      }
      if (((part < 0) || (part >= current.length))) {
        return null;
      }
      current = current[part];
      continue;
    }
    if (((!current || (typeof current !== "object")) || Array.isArray(current))) {
      return null;
    }
    const record = current;
    if (!(part in record)) {
      return null;
    }
    current = record[part];
  }
  return current;
}
function stripUnknownConfigKeys(config) {
  const parsed = OpenClawSchema.safeParse(config);
  if (parsed.success) {
    return { config, removed: [] };
  }
  const next = structuredClone(config);
  const removed = [];
  for (const issue of parsed.error.issues) {
    if (!isUnrecognizedKeysIssue(issue)) {
      continue;
    }
    const path = normalizeIssuePath(issue.path);
    const target = resolvePathTarget(next, path);
    if (((!target || (typeof target !== "object")) || Array.isArray(target))) {
      continue;
    }
    const record = target;
    for (const key of issue.keys) {
      if ((typeof key !== "string")) {
        continue;
      }
      if (!(key in record)) {
        continue;
      }
      delete record[key];
      removed.push(formatPath([...path, key]));
    }
  }
  return { config: next, removed };
}
function noteOpencodeProviderOverrides(cfg) {
  const providers = cfg.models?.providers;
  if (!providers) {
    return;
  }
  const overrides = [];
  if (providers.opencode) {
    overrides.push("opencode");
  }
  if (providers["opencode-zen"]) {
    overrides.push("opencode-zen");
  }
  if ((overrides.length === 0)) {
    return;
  }
  const lines = overrides.flatMap((id) => {
    const providerEntry = providers[id];
    const api = (isRecord(providerEntry) && (typeof providerEntry.api === "string")) ? providerEntry.api : undefined;
    return ["- models.providers. is set; this overrides the built-in OpenCode Zen catalog.", api ? "- models.providers..api=" : null].filter((line) => Boolean(line));
  });
  lines.push("- Remove these entries to restore per-model API routing + costs (then re-run onboarding if needed).");
  note(lines.join("
"), "OpenCode Zen");
}
async function maybeMigrateLegacyConfig() {
  const changes = [];
  const home = resolveHomeDir();
  if (!home) {
    return changes;
  }
  const targetDir = path.join(home, ".openclaw");
  const targetPath = path.join(targetDir, "openclaw.json");
  try {
    {
      await fs.access(targetPath);
      return changes;
    }
  }
  catch {
    {
    }
  }
  const legacyCandidates = [path.join(home, ".clawdbot", "clawdbot.json"), path.join(home, ".moltbot", "moltbot.json"), path.join(home, ".moldbot", "moldbot.json")];
  let legacyPath = null;
  for (const candidate of legacyCandidates) {
    try {
      {
        await fs.access(candidate);
        legacyPath = candidate;
        break;
      }
    }
    catch {
      {
      }
    }
  }
  if (!legacyPath) {
    return changes;
  }
  await fs.mkdir(targetDir, { recursive: true });
  try {
    {
      await fs.copyFile(legacyPath, targetPath, fs.constants.COPYFILE_EXCL);
      changes.push("Migrated legacy config:  -> ");
    }
  }
  catch {
    {
    }
  }
  return changes;
}
export async function loadAndMaybeMigrateDoctorConfig(params) {
  const shouldRepair = ((params.options.repair === true) || (params.options.yes === true));
  const stateDirResult = await autoMigrateLegacyStateDir({ env: process.env });
  if ((stateDirResult.changes.length > 0)) {
    note(stateDirResult.changes.map((entry) => "- ").join("
"), "Doctor changes");
  }
  if ((stateDirResult.warnings.length > 0)) {
    note(stateDirResult.warnings.map((entry) => "- ").join("
"), "Doctor warnings");
  }
  const legacyConfigChanges = await maybeMigrateLegacyConfig();
  if ((legacyConfigChanges.length > 0)) {
    note(legacyConfigChanges.map((entry) => "- ").join("
"), "Doctor changes");
  }
  let snapshot = await readConfigFileSnapshot();
  const baseCfg = (snapshot.config ?? {  });
  let cfg = baseCfg;
  let candidate = structuredClone(baseCfg);
  let pendingChanges = false;
  let shouldWriteConfig = false;
  const fixHints = [];
  if (((snapshot.exists && !snapshot.valid) && (snapshot.legacyIssues.length === 0))) {
    note("Config invalid; doctor will run with best-effort config.", "Config");
  }
  const warnings = (snapshot.warnings ?? []);
  if ((warnings.length > 0)) {
    const lines = warnings.map((issue) => "- : ").join("
");
    note(lines, "Config warnings");
  }
  if ((snapshot.legacyIssues.length > 0)) {
    note(snapshot.legacyIssues.map((issue) => "- : ").join("
"), "Legacy config keys detected");
    const {config: migrated, changes} = migrateLegacyConfig(snapshot.parsed);
    if ((changes.length > 0)) {
      note(changes.join("
"), "Doctor changes");
    }
    if (migrated) {
      candidate = migrated;
      pendingChanges = (pendingChanges || (changes.length > 0));
    }
    if (shouldRepair) {
      if (migrated) {
        cfg = migrated;
      }
    } else {
      fixHints.push("Run \"\" to apply legacy migrations.");
    }
  }
  const normalized = normalizeLegacyConfigValues(candidate);
  if ((normalized.changes.length > 0)) {
    note(normalized.changes.join("
"), "Doctor changes");
    candidate = normalized.config;
    pendingChanges = true;
    if (shouldRepair) {
      cfg = normalized.config;
    } else {
      fixHints.push("Run \"\" to apply these changes.");
    }
  }
  const autoEnable = applyPluginAutoEnable({ config: candidate, env: process.env });
  if ((autoEnable.changes.length > 0)) {
    note(autoEnable.changes.join("
"), "Doctor changes");
    candidate = autoEnable.config;
    pendingChanges = true;
    if (shouldRepair) {
      cfg = autoEnable.config;
    } else {
      fixHints.push("Run \"\" to apply these changes.");
    }
  }
  const unknown = stripUnknownConfigKeys(candidate);
  if ((unknown.removed.length > 0)) {
    const lines = unknown.removed.map((path) => "- ").join("
");
    candidate = unknown.config;
    pendingChanges = true;
    if (shouldRepair) {
      cfg = unknown.config;
      note(lines, "Doctor changes");
    } else {
      note(lines, "Unknown config keys");
      fixHints.push("Run \"openclaw doctor --fix\" to remove these keys.");
    }
  }
  if ((!shouldRepair && pendingChanges)) {
    const shouldApply = await params.confirm({ message: "Apply recommended config repairs now?", initialValue: true });
    if (shouldApply) {
      cfg = candidate;
      shouldWriteConfig = true;
    } else {
      if ((fixHints.length > 0)) {
        note(fixHints.join("
"), "Doctor");
      }
    }
  }
  noteOpencodeProviderOverrides(cfg);
  return { cfg, path: (snapshot.path ?? CONFIG_PATH), shouldWriteConfig };
}

