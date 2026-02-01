import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { resolveArchiveKind } from "../infra/archive.js";
import { buildWorkspaceHookStatus } from "../hooks/hooks-status.js";
import { loadWorkspaceHookEntries } from "../hooks/workspace.js";
import { loadConfig, writeConfigFile } from "../config/io.js";
import { installHooksFromNpmSpec, installHooksFromPath, resolveHookInstallDir } from "../hooks/install.js";
import { recordHookInstall } from "../hooks/installs.js";
import { buildPluginStatusReport } from "../plugins/status.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { formatCliCommand } from "./command-format.js";
import { resolveUserPath, shortenHomePath } from "../utils.js";
export 
export 
export 
export 
function mergeHookEntries(pluginEntries, workspaceEntries) {
  const merged = new Map();
  for (const entry of pluginEntries) {
    merged.set(entry.hook.name, entry);
  }
  for (const entry of workspaceEntries) {
    merged.set(entry.hook.name, entry);
  }
  return Array.from(merged.values());
}
function buildHooksReport(config) {
  const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
  const workspaceEntries = loadWorkspaceHookEntries(workspaceDir, { config });
  const pluginReport = buildPluginStatusReport({ config, workspaceDir });
  const pluginEntries = pluginReport.hooks.map((hook) => hook.entry);
  const entries = mergeHookEntries(pluginEntries, workspaceEntries);
  return buildWorkspaceHookStatus(workspaceDir, { config, entries });
}
function formatHookStatus(hook) {
  if (hook.eligible) {
    return theme.success("✓ ready");
  }
  if (hook.disabled) {
    return theme.warn("⏸ disabled");
  }
  return theme.error("✗ missing");
}
function formatHookName(hook) {
  const emoji = (hook.emoji ?? "🔗");
  return " ";
}
function formatHookSource(hook) {
  if (!hook.managedByPlugin) {
    return hook.source;
  }
  return "plugin:";
}
function formatHookMissingSummary(hook) {
  const missing = [];
  if ((hook.missing.bins.length > 0)) {
    missing.push("bins: ");
  }
  if ((hook.missing.anyBins.length > 0)) {
    missing.push("anyBins: ");
  }
  if ((hook.missing.env.length > 0)) {
    missing.push("env: ");
  }
  if ((hook.missing.config.length > 0)) {
    missing.push("config: ");
  }
  if ((hook.missing.os.length > 0)) {
    missing.push("os: ");
  }
  return missing.join("; ");
}
async function readInstalledPackageVersion(dir) {
  try {
    {
      const raw = await fsp.readFile(path.join(dir, "package.json"), "utf-8");
      const parsed = JSON.parse(raw);
      return (typeof parsed.version === "string") ? parsed.version : undefined;
    }
  }
  catch {
    {
      return undefined;
    }
  }
}
export function formatHooksList(report, opts) {
  const hooks = opts.eligible ? report.hooks.filter((h) => h.eligible) : report.hooks;
  if (opts.json) {
    const jsonReport = { workspaceDir: report.workspaceDir, managedHooksDir: report.managedHooksDir, hooks: hooks.map((h) => { name: h.name, description: h.description, emoji: h.emoji, eligible: h.eligible, disabled: h.disabled, source: h.source, pluginId: h.pluginId, events: h.events, homepage: h.homepage, missing: h.missing, managedByPlugin: h.managedByPlugin }) };
    return JSON.stringify(jsonReport, null, 2);
  }
  if ((hooks.length === 0)) {
    const message = opts.eligible ? "No eligible hooks found. Run `` to see all hooks." : "No hooks found.";
    return message;
  }
  const eligible = hooks.filter((h) => h.eligible);
  const tableWidth = Math.max(60, ((process.stdout.columns ?? 120) - 1));
  const rows = hooks.map((hook) => {
    const missing = formatHookMissingSummary(hook);
    return { Status: formatHookStatus(hook), Hook: formatHookName(hook), Description: theme.muted(hook.description), Source: formatHookSource(hook), Missing: missing ? theme.warn(missing) : "" };
  });
  const columns = [{ key: "Status", header: "Status", minWidth: 10 }, { key: "Hook", header: "Hook", minWidth: 18, flex: true }, { key: "Description", header: "Description", minWidth: 24, flex: true }, { key: "Source", header: "Source", minWidth: 12, flex: true }];
  if (opts.verbose) {
    columns.push({ key: "Missing", header: "Missing", minWidth: 18, flex: true });
  }
  const lines = [];
  lines.push(" ");
  lines.push(renderTable({ width: tableWidth, columns, rows }).trimEnd());
  return lines.join("
");
}

export function formatHookInfo(report, hookName, opts) {
  const hook = report.hooks.find((h) => ((h.name === hookName) || (h.hookKey === hookName)));
  if (!hook) {
    if (opts.json) {
      return JSON.stringify({ error: "not found", hook: hookName }, null, 2);
    }
    return "Hook \"\" not found. Run `` to see available hooks.";
  }
  if (opts.json) {
    return JSON.stringify(hook, null, 2);
  }
  const lines = [];
  const emoji = (hook.emoji ?? "🔗");
  const status = hook.eligible ? theme.success("✓ Ready") : hook.disabled ? theme.warn("⏸ Disabled") : theme.error("✗ Missing requirements");
  lines.push("  ");
  lines.push("");
  lines.push(hook.description);
  lines.push("");
  lines.push(theme.heading("Details:"));
  if (hook.managedByPlugin) {
    lines.push("  ()");
  } else {
    lines.push(" ");
  }
  lines.push(" ");
  lines.push(" ");
  if (hook.homepage) {
    lines.push(" ");
  }
  if ((hook.events.length > 0)) {
    lines.push(" ");
  }
  if (hook.managedByPlugin) {
    lines.push(theme.muted("  Managed by plugin; enable/disable via hooks CLI not available."));
  }
  const hasRequirements = (((((hook.requirements.bins.length > 0) || (hook.requirements.anyBins.length > 0)) || (hook.requirements.env.length > 0)) || (hook.requirements.config.length > 0)) || (hook.requirements.os.length > 0));
  if (hasRequirements) {
    lines.push("");
    lines.push(theme.heading("Requirements:"));
    if ((hook.requirements.bins.length > 0)) {
      const binsStatus = hook.requirements.bins.map((bin) => {
        const missing = hook.missing.bins.includes(bin);
        return missing ? theme.error("✗ ") : theme.success("✓ ");
      });
      lines.push(" ");
    }
    if ((hook.requirements.anyBins.length > 0)) {
      const anyBinsStatus = (hook.missing.anyBins.length > 0) ? theme.error("✗ (any of: )") : theme.success("✓ (any of: )");
      lines.push(" ");
    }
    if ((hook.requirements.env.length > 0)) {
      const envStatus = hook.requirements.env.map((env) => {
        const missing = hook.missing.env.includes(env);
        return missing ? theme.error("✗ ") : theme.success("✓ ");
      });
      lines.push(" ");
    }
    if ((hook.requirements.config.length > 0)) {
      const configStatus = hook.configChecks.map((check) => {
        return check.satisfied ? theme.success("✓ ") : theme.error("✗ ");
      });
      lines.push(" ");
    }
    if ((hook.requirements.os.length > 0)) {
      const osStatus = (hook.missing.os.length > 0) ? theme.error("✗ ()") : theme.success("✓ ()");
      lines.push(" ");
    }
  }
  return lines.join("
");
}

export function formatHooksCheck(report, opts) {
  if (opts.json) {
    const eligible = report.hooks.filter((h) => h.eligible);
    const notEligible = report.hooks.filter((h) => !h.eligible);
    return JSON.stringify({ total: report.hooks.length, eligible: eligible.length, notEligible: notEligible.length, hooks: { eligible: eligible.map((h) => h.name), notEligible: notEligible.map((h) => { name: h.name, missing: h.missing }) } }, null, 2);
  }
  const eligible = report.hooks.filter((h) => h.eligible);
  const notEligible = report.hooks.filter((h) => !h.eligible);
  const lines = [];
  lines.push(theme.heading("Hooks Status"));
  lines.push("");
  lines.push(" ");
  lines.push(" ");
  lines.push(" ");
  if ((notEligible.length > 0)) {
    lines.push("");
    lines.push(theme.heading("Hooks not ready:"));
    for (const hook of notEligible) {
      const reasons = [];
      if (hook.disabled) {
        reasons.push("disabled");
      }
      if ((hook.missing.bins.length > 0)) {
        reasons.push("bins: ");
      }
      if ((hook.missing.anyBins.length > 0)) {
        reasons.push("anyBins: ");
      }
      if ((hook.missing.env.length > 0)) {
        reasons.push("env: ");
      }
      if ((hook.missing.config.length > 0)) {
        reasons.push("config: ");
      }
      if ((hook.missing.os.length > 0)) {
        reasons.push("os: ");
      }
      lines.push("    - ");
    }
  }
  return lines.join("
");
}

export async function enableHook(hookName) {
  const config = loadConfig();
  const report = buildHooksReport(config);
  const hook = report.hooks.find((h) => (h.name === hookName));
  if (!hook) {
    throw new Error("Hook \"\" not found");
  }
  if (hook.managedByPlugin) {
    throw new Error("Hook \"\" is managed by plugin \"\" and cannot be enabled/disabled.");
  }
  if (!hook.eligible) {
    throw new Error("Hook \"\" is not eligible (missing requirements)");
  }
  const entries = { ...config.hooks?.internal?.entries:  };
  entries[hookName] = { ...entries[hookName]: , enabled: true };
  const nextConfig = { ...config: , hooks: { ...config.hooks: , internal: { ...config.hooks?.internal: , enabled: true, entries } } };
  await writeConfigFile(nextConfig);
  defaultRuntime.log(" Enabled hook:  ");
}

export async function disableHook(hookName) {
  const config = loadConfig();
  const report = buildHooksReport(config);
  const hook = report.hooks.find((h) => (h.name === hookName));
  if (!hook) {
    throw new Error("Hook \"\" not found");
  }
  if (hook.managedByPlugin) {
    throw new Error("Hook \"\" is managed by plugin \"\" and cannot be enabled/disabled.");
  }
  const entries = { ...config.hooks?.internal?.entries:  };
  entries[hookName] = { ...entries[hookName]: , enabled: false };
  const nextConfig = { ...config: , hooks: { ...config.hooks: , internal: { ...config.hooks?.internal: , entries } } };
  await writeConfigFile(nextConfig);
  defaultRuntime.log(" Disabled hook:  ");
}

export function registerHooksCli(program) {
  const hooks = program.command("hooks").description("Manage internal agent hooks").addHelpText("after", () => "
 
");
  hooks.command("list").description("List all hooks").option("--eligible", "Show only eligible hooks", false).option("--json", "Output as JSON", false).option("-v, --verbose", "Show more details including missing requirements", false).action(async (opts) => {
    try {
      {
        const config = loadConfig();
        const report = buildHooksReport(config);
        defaultRuntime.log(formatHooksList(report, opts));
      }
    }
    catch (err) {
      {
        defaultRuntime.error(" ");
        process.exit(1);
      }
    }
  });
  hooks.command("info <name>").description("Show detailed information about a hook").option("--json", "Output as JSON", false).action(async (name, opts) => {
    try {
      {
        const config = loadConfig();
        const report = buildHooksReport(config);
        defaultRuntime.log(formatHookInfo(report, name, opts));
      }
    }
    catch (err) {
      {
        defaultRuntime.error(" ");
        process.exit(1);
      }
    }
  });
  hooks.command("check").description("Check hooks eligibility status").option("--json", "Output as JSON", false).action(async (opts) => {
    try {
      {
        const config = loadConfig();
        const report = buildHooksReport(config);
        defaultRuntime.log(formatHooksCheck(report, opts));
      }
    }
    catch (err) {
      {
        defaultRuntime.error(" ");
        process.exit(1);
      }
    }
  });
  hooks.command("enable <name>").description("Enable a hook").action(async (name) => {
    try {
      {
        await enableHook(name);
      }
    }
    catch (err) {
      {
        defaultRuntime.error(" ");
        process.exit(1);
      }
    }
  });
  hooks.command("disable <name>").description("Disable a hook").action(async (name) => {
    try {
      {
        await disableHook(name);
      }
    }
    catch (err) {
      {
        defaultRuntime.error(" ");
        process.exit(1);
      }
    }
  });
  hooks.command("install").description("Install a hook pack (path, archive, or npm spec)").argument("<path-or-spec>", "Path to a hook pack or npm package spec").option("-l, --link", "Link a local path instead of copying", false).action(async (raw, opts) => {
    const resolved = resolveUserPath(raw);
    const cfg = loadConfig();
    if (fs.existsSync(resolved)) {
      if (opts.link) {
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) {
          defaultRuntime.error("Linked hook paths must be directories.");
          process.exit(1);
        }
        const existing = (cfg.hooks?.internal?.load?.extraDirs ?? []);
        const merged = Array.from(new Set([...existing, resolved]));
        const probe = await installHooksFromPath({ path: resolved, dryRun: true });
        if (!probe.ok) {
          defaultRuntime.error(probe.error);
          process.exit(1);
        }
        let next = { ...cfg: , hooks: { ...cfg.hooks: , internal: { ...cfg.hooks?.internal: , enabled: true, load: { ...cfg.hooks?.internal?.load: , extraDirs: merged } } } };
        for (const hookName of probe.hooks) {
          next = { ...next: , hooks: { ...next.hooks: , internal: { ...next.hooks?.internal: , entries: { ...next.hooks?.internal?.entries: , [hookName]: { ...next.hooks?.internal?.entries?.[hookName]: , enabled: true } } } } };
        }
        next = recordHookInstall(next, { hookId: probe.hookPackId, source: "path", sourcePath: resolved, installPath: resolved, version: probe.version, hooks: probe.hooks });
        await writeConfigFile(next);
        defaultRuntime.log("Linked hook path: ");
        defaultRuntime.log("Restart the gateway to load hooks.");
        return;
      }
      const result = await installHooksFromPath({ path: resolved, logger: { info: (msg) => defaultRuntime.log(msg), warn: (msg) => defaultRuntime.log(theme.warn(msg)) } });
      if (!result.ok) {
        defaultRuntime.error(result.error);
        process.exit(1);
      }
      let next = { ...cfg: , hooks: { ...cfg.hooks: , internal: { ...cfg.hooks?.internal: , enabled: true, entries: { ...cfg.hooks?.internal?.entries:  } } } };
      for (const hookName of result.hooks) {
        next = { ...next: , hooks: { ...next.hooks: , internal: { ...next.hooks?.internal: , entries: { ...next.hooks?.internal?.entries: , [hookName]: { ...next.hooks?.internal?.entries?.[hookName]: , enabled: true } } } } };
      }
      const source = resolveArchiveKind(resolved) ? "archive" : "path";
      next = recordHookInstall(next, { hookId: result.hookPackId, source, sourcePath: resolved, installPath: result.targetDir, version: result.version, hooks: result.hooks });
      await writeConfigFile(next);
      defaultRuntime.log("Installed hooks: ");
      defaultRuntime.log("Restart the gateway to load hooks.");
      return;
    }
    if (opts.link) {
      defaultRuntime.error("`--link` requires a local path.");
      process.exit(1);
    }
    const looksLikePath = ((((((raw.startsWith(".") || raw.startsWith("~")) || path.isAbsolute(raw)) || raw.endsWith(".zip")) || raw.endsWith(".tgz")) || raw.endsWith(".tar.gz")) || raw.endsWith(".tar"));
    if (looksLikePath) {
      defaultRuntime.error("Path not found: ");
      process.exit(1);
    }
    const result = await installHooksFromNpmSpec({ spec: raw, logger: { info: (msg) => defaultRuntime.log(msg), warn: (msg) => defaultRuntime.log(theme.warn(msg)) } });
    if (!result.ok) {
      defaultRuntime.error(result.error);
      process.exit(1);
    }
    let next = { ...cfg: , hooks: { ...cfg.hooks: , internal: { ...cfg.hooks?.internal: , enabled: true, entries: { ...cfg.hooks?.internal?.entries:  } } } };
    for (const hookName of result.hooks) {
      next = { ...next: , hooks: { ...next.hooks: , internal: { ...next.hooks?.internal: , entries: { ...next.hooks?.internal?.entries: , [hookName]: { ...next.hooks?.internal?.entries?.[hookName]: , enabled: true } } } } };
    }
    next = recordHookInstall(next, { hookId: result.hookPackId, source: "npm", spec: raw, installPath: result.targetDir, version: result.version, hooks: result.hooks });
    await writeConfigFile(next);
    defaultRuntime.log("Installed hooks: ");
    defaultRuntime.log("Restart the gateway to load hooks.");
  });
  hooks.command("update").description("Update installed hooks (npm installs only)").argument("[id]", "Hook pack id (omit with --all)").option("--all", "Update all tracked hooks", false).option("--dry-run", "Show what would change without writing", false).action(async (id, opts) => {
    const cfg = loadConfig();
    const installs = (cfg.hooks?.internal?.installs ?? {  });
    const targets = opts.all ? Object.keys(installs) : id ? [id] : [];
    if ((targets.length === 0)) {
      defaultRuntime.error("Provide a hook id or use --all.");
      process.exit(1);
    }
    let nextCfg = cfg;
    let updatedCount = 0;
    for (const hookId of targets) {
      const record = installs[hookId];
      if (!record) {
        defaultRuntime.log(theme.warn("No install record for \"\"."));
        continue;
      }
      if ((record.source !== "npm")) {
        defaultRuntime.log(theme.warn("Skipping \"\" (source: )."));
        continue;
      }
      if (!record.spec) {
        defaultRuntime.log(theme.warn("Skipping \"\" (missing npm spec)."));
        continue;
      }
      const installPath = (record.installPath ?? resolveHookInstallDir(hookId));
      const currentVersion = await readInstalledPackageVersion(installPath);
      if (opts.dryRun) {
        const probe = await installHooksFromNpmSpec({ spec: record.spec, mode: "update", dryRun: true, expectedHookPackId: hookId, logger: { info: (msg) => defaultRuntime.log(msg), warn: (msg) => defaultRuntime.log(theme.warn(msg)) } });
        if (!probe.ok) {
          defaultRuntime.log(theme.error("Failed to check : "));
          continue;
        }
        const nextVersion = (probe.version ?? "unknown");
        const currentLabel = (currentVersion ?? "unknown");
        if (((currentVersion && probe.version) && (currentVersion === probe.version))) {
          defaultRuntime.log(" is up to date ().");
        } else {
          defaultRuntime.log("Would update :  → .");
        }
        continue;
      }
      const result = await installHooksFromNpmSpec({ spec: record.spec, mode: "update", expectedHookPackId: hookId, logger: { info: (msg) => defaultRuntime.log(msg), warn: (msg) => defaultRuntime.log(theme.warn(msg)) } });
      if (!result.ok) {
        defaultRuntime.log(theme.error("Failed to update : "));
        continue;
      }
      const nextVersion = (result.version ?? await readInstalledPackageVersion(result.targetDir));
      nextCfg = recordHookInstall(nextCfg, { hookId, source: "npm", spec: record.spec, installPath: result.targetDir, version: nextVersion, hooks: result.hooks });
      updatedCount += 1;
      const currentLabel = (currentVersion ?? "unknown");
      const nextLabel = (nextVersion ?? "unknown");
      if (((currentVersion && nextVersion) && (currentVersion === nextVersion))) {
        defaultRuntime.log(" already at .");
      } else {
        defaultRuntime.log("Updated :  → .");
      }
    }
    if ((updatedCount > 0)) {
      await writeConfigFile(nextCfg);
      defaultRuntime.log("Restart the gateway to load hooks.");
    }
  });
  hooks.action(async () => {
    try {
      {
        const config = loadConfig();
        const report = buildHooksReport(config);
        defaultRuntime.log(formatHooksList(report, {  }));
      }
    }
    catch (err) {
      {
        defaultRuntime.error(" ");
        process.exit(1);
      }
    }
  });
}

