import fs from "node:fs";
import path from "node:path";
import { loadConfig, writeConfigFile } from "../config/config.js";
import { resolveArchiveKind } from "../infra/archive.js";
import { installPluginFromNpmSpec, installPluginFromPath } from "../plugins/install.js";
import { recordPluginInstall } from "../plugins/installs.js";
import { applyExclusiveSlotSelection } from "../plugins/slots.js";
import { buildPluginStatusReport } from "../plugins/status.js";
import { updateNpmInstalledPlugins } from "../plugins/update.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { resolveUserPath, shortenHomeInString, shortenHomePath } from "../utils.js";
export 
export 
export 
function formatPluginLine(plugin, verbose = false) {
  const status = (plugin.status === "loaded") ? theme.success("loaded") : (plugin.status === "disabled") ? theme.warn("disabled") : theme.error("error");
  const name = theme.command((plugin.name || plugin.id));
  const idSuffix = (plugin.name && (plugin.name !== plugin.id)) ? theme.muted(" ()") : "";
  const desc = plugin.description ? theme.muted((plugin.description.length > 60) ? "..." : plugin.description) : theme.muted("(no description)");
  if (!verbose) {
    return "  - ";
  }
  const parts = [" ", "  source: ", "  origin: "];
  if (plugin.version) {
    parts.push("  version: ");
  }
  if ((plugin.providerIds.length > 0)) {
    parts.push("  providers: ");
  }
  if (plugin.error) {
    parts.push(theme.error("  error: "));
  }
  return parts.join("
");
}
function applySlotSelectionForPlugin(config, pluginId) {
  const report = buildPluginStatusReport({ config });
  const plugin = report.plugins.find((entry) => (entry.id === pluginId));
  if (!plugin) {
    return { config, warnings: [] };
  }
  const result = applyExclusiveSlotSelection({ config, selectedId: plugin.id, selectedKind: plugin.kind, registry: report });
  return { config: result.config, warnings: result.warnings };
}
function logSlotWarnings(warnings) {
  if ((warnings.length === 0)) {
    return;
  }
  for (const warning of warnings) {
    defaultRuntime.log(theme.warn(warning));
  }
}
export function registerPluginsCli(program) {
  const plugins = program.command("plugins").description("Manage OpenClaw plugins/extensions").addHelpText("after", () => "
 
");
  plugins.command("list").description("List discovered plugins").option("--json", "Print JSON").option("--enabled", "Only show enabled plugins", false).option("--verbose", "Show detailed entries", false).action((opts) => {
    const report = buildPluginStatusReport();
    const list = opts.enabled ? report.plugins.filter((p) => (p.status === "loaded")) : report.plugins;
    if (opts.json) {
      const payload = { workspaceDir: report.workspaceDir, plugins: list, diagnostics: report.diagnostics };
      defaultRuntime.log(JSON.stringify(payload, null, 2));
      return;
    }
    if ((list.length === 0)) {
      defaultRuntime.log(theme.muted("No plugins found."));
      return;
    }
    const loaded = list.filter((p) => (p.status === "loaded")).length;
    defaultRuntime.log(" ");
    if (!opts.verbose) {
      const tableWidth = Math.max(60, ((process.stdout.columns ?? 120) - 1));
      const rows = list.map((plugin) => {
        const desc = plugin.description ? theme.muted(plugin.description) : "";
        const sourceLine = desc ? "
" : plugin.source;
        return { Name: (plugin.name || plugin.id), ID: (plugin.name && (plugin.name !== plugin.id)) ? plugin.id : "", Status: (plugin.status === "loaded") ? theme.success("loaded") : (plugin.status === "disabled") ? theme.warn("disabled") : theme.error("error"), Source: sourceLine, Version: (plugin.version ?? "") };
      });
      defaultRuntime.log(renderTable({ width: tableWidth, columns: [{ key: "Name", header: "Name", minWidth: 14, flex: true }, { key: "ID", header: "ID", minWidth: 10, flex: true }, { key: "Status", header: "Status", minWidth: 10 }, { key: "Source", header: "Source", minWidth: 26, flex: true }, { key: "Version", header: "Version", minWidth: 8 }], rows }).trimEnd());
      return;
    }
    const lines = [];
    for (const plugin of list) {
      lines.push(formatPluginLine(plugin, true));
      lines.push("");
    }
    defaultRuntime.log(lines.join("
").trim());
  });
  plugins.command("info").description("Show plugin details").argument("<id>", "Plugin id").option("--json", "Print JSON").action((id, opts) => {
    const report = buildPluginStatusReport();
    const plugin = report.plugins.find((p) => ((p.id === id) || (p.name === id)));
    if (!plugin) {
      defaultRuntime.error("Plugin not found: ");
      process.exit(1);
    }
    const cfg = loadConfig();
    const install = cfg.plugins?.installs?.[plugin.id];
    if (opts.json) {
      defaultRuntime.log(JSON.stringify(plugin, null, 2));
      return;
    }
    const lines = [];
    lines.push(theme.heading((plugin.name || plugin.id)));
    if ((plugin.name && (plugin.name !== plugin.id))) {
      lines.push(theme.muted("id: "));
    }
    if (plugin.description) {
      lines.push(plugin.description);
    }
    lines.push("");
    lines.push(" ");
    lines.push(" ");
    lines.push(" ");
    if (plugin.version) {
      lines.push(" ");
    }
    if ((plugin.toolNames.length > 0)) {
      lines.push(" ");
    }
    if ((plugin.hookNames.length > 0)) {
      lines.push(" ");
    }
    if ((plugin.gatewayMethods.length > 0)) {
      lines.push(" ");
    }
    if ((plugin.providerIds.length > 0)) {
      lines.push(" ");
    }
    if ((plugin.cliCommands.length > 0)) {
      lines.push(" ");
    }
    if ((plugin.services.length > 0)) {
      lines.push(" ");
    }
    if (plugin.error) {
      lines.push(" ");
    }
    if (install) {
      lines.push("");
      lines.push(" ");
      if (install.spec) {
        lines.push(" ");
      }
      if (install.sourcePath) {
        lines.push(" ");
      }
      if (install.installPath) {
        lines.push(" ");
      }
      if (install.version) {
        lines.push(" ");
      }
      if (install.installedAt) {
        lines.push(" ");
      }
    }
    defaultRuntime.log(lines.join("
"));
  });
  plugins.command("enable").description("Enable a plugin in config").argument("<id>", "Plugin id").action(async (id) => {
    const cfg = loadConfig();
    let next = { ...cfg: , plugins: { ...cfg.plugins: , entries: { ...cfg.plugins?.entries: , [id]: { ...cfg.plugins?.entries?.[id]: , enabled: true } } } };
    const slotResult = applySlotSelectionForPlugin(next, id);
    next = slotResult.config;
    await writeConfigFile(next);
    logSlotWarnings(slotResult.warnings);
    defaultRuntime.log("Enabled plugin \"\". Restart the gateway to apply.");
  });
  plugins.command("disable").description("Disable a plugin in config").argument("<id>", "Plugin id").action(async (id) => {
    const cfg = loadConfig();
    const next = { ...cfg: , plugins: { ...cfg.plugins: , entries: { ...cfg.plugins?.entries: , [id]: { ...cfg.plugins?.entries?.[id]: , enabled: false } } } };
    await writeConfigFile(next);
    defaultRuntime.log("Disabled plugin \"\". Restart the gateway to apply.");
  });
  plugins.command("install").description("Install a plugin (path, archive, or npm spec)").argument("<path-or-spec>", "Path (.ts/.js/.zip/.tgz/.tar.gz) or an npm package spec").option("-l, --link", "Link a local path instead of copying", false).action(async (raw, opts) => {
    const resolved = resolveUserPath(raw);
    const cfg = loadConfig();
    if (fs.existsSync(resolved)) {
      if (opts.link) {
        const existing = (cfg.plugins?.load?.paths ?? []);
        const merged = Array.from(new Set([...existing, resolved]));
        const probe = await installPluginFromPath({ path: resolved, dryRun: true });
        if (!probe.ok) {
          defaultRuntime.error(probe.error);
          process.exit(1);
        }
        let next = { ...cfg: , plugins: { ...cfg.plugins: , load: { ...cfg.plugins?.load: , paths: merged }, entries: { ...cfg.plugins?.entries: , [probe.pluginId]: { ...cfg.plugins?.entries?.[probe.pluginId]: , enabled: true } } } };
        next = recordPluginInstall(next, { pluginId: probe.pluginId, source: "path", sourcePath: resolved, installPath: resolved, version: probe.version });
        const slotResult = applySlotSelectionForPlugin(next, probe.pluginId);
        next = slotResult.config;
        await writeConfigFile(next);
        logSlotWarnings(slotResult.warnings);
        defaultRuntime.log("Linked plugin path: ");
        defaultRuntime.log("Restart the gateway to load plugins.");
        return;
      }
      const result = await installPluginFromPath({ path: resolved, logger: { info: (msg) => defaultRuntime.log(msg), warn: (msg) => defaultRuntime.log(theme.warn(msg)) } });
      if (!result.ok) {
        defaultRuntime.error(result.error);
        process.exit(1);
      }
      let next = { ...cfg: , plugins: { ...cfg.plugins: , entries: { ...cfg.plugins?.entries: , [result.pluginId]: { ...cfg.plugins?.entries?.[result.pluginId]: , enabled: true } } } };
      const source = resolveArchiveKind(resolved) ? "archive" : "path";
      next = recordPluginInstall(next, { pluginId: result.pluginId, source, sourcePath: resolved, installPath: result.targetDir, version: result.version });
      const slotResult = applySlotSelectionForPlugin(next, result.pluginId);
      next = slotResult.config;
      await writeConfigFile(next);
      logSlotWarnings(slotResult.warnings);
      defaultRuntime.log("Installed plugin: ");
      defaultRuntime.log("Restart the gateway to load plugins.");
      return;
    }
    if (opts.link) {
      defaultRuntime.error("`--link` requires a local path.");
      process.exit(1);
    }
    const looksLikePath = ((((((((((raw.startsWith(".") || raw.startsWith("~")) || path.isAbsolute(raw)) || raw.endsWith(".ts")) || raw.endsWith(".js")) || raw.endsWith(".mjs")) || raw.endsWith(".cjs")) || raw.endsWith(".tgz")) || raw.endsWith(".tar.gz")) || raw.endsWith(".tar")) || raw.endsWith(".zip"));
    if (looksLikePath) {
      defaultRuntime.error("Path not found: ");
      process.exit(1);
    }
    const result = await installPluginFromNpmSpec({ spec: raw, logger: { info: (msg) => defaultRuntime.log(msg), warn: (msg) => defaultRuntime.log(theme.warn(msg)) } });
    if (!result.ok) {
      defaultRuntime.error(result.error);
      process.exit(1);
    }
    let next = { ...cfg: , plugins: { ...cfg.plugins: , entries: { ...cfg.plugins?.entries: , [result.pluginId]: { ...cfg.plugins?.entries?.[result.pluginId]: , enabled: true } } } };
    next = recordPluginInstall(next, { pluginId: result.pluginId, source: "npm", spec: raw, installPath: result.targetDir, version: result.version });
    const slotResult = applySlotSelectionForPlugin(next, result.pluginId);
    next = slotResult.config;
    await writeConfigFile(next);
    logSlotWarnings(slotResult.warnings);
    defaultRuntime.log("Installed plugin: ");
    defaultRuntime.log("Restart the gateway to load plugins.");
  });
  plugins.command("update").description("Update installed plugins (npm installs only)").argument("[id]", "Plugin id (omit with --all)").option("--all", "Update all tracked plugins", false).option("--dry-run", "Show what would change without writing", false).action(async (id, opts) => {
    const cfg = loadConfig();
    const installs = (cfg.plugins?.installs ?? {  });
    const targets = opts.all ? Object.keys(installs) : id ? [id] : [];
    if ((targets.length === 0)) {
      if (opts.all) {
        defaultRuntime.log("No npm-installed plugins to update.");
        return;
      }
      defaultRuntime.error("Provide a plugin id or use --all.");
      process.exit(1);
    }
    const result = await updateNpmInstalledPlugins({ config: cfg, pluginIds: targets, dryRun: opts.dryRun, logger: { info: (msg) => defaultRuntime.log(msg), warn: (msg) => defaultRuntime.log(theme.warn(msg)) } });
    for (const outcome of result.outcomes) {
      if ((outcome.status === "error")) {
        defaultRuntime.log(theme.error(outcome.message));
        continue;
      }
      if ((outcome.status === "skipped")) {
        defaultRuntime.log(theme.warn(outcome.message));
        continue;
      }
      defaultRuntime.log(outcome.message);
    }
    if ((!opts.dryRun && result.changed)) {
      await writeConfigFile(result.config);
      defaultRuntime.log("Restart the gateway to load plugins.");
    }
  });
  plugins.command("doctor").description("Report plugin load issues").action(() => {
    const report = buildPluginStatusReport();
    const errors = report.plugins.filter((p) => (p.status === "error"));
    const diags = report.diagnostics.filter((d) => (d.level === "error"));
    if (((errors.length === 0) && (diags.length === 0))) {
      defaultRuntime.log("No plugin issues detected.");
      return;
    }
    const lines = [];
    if ((errors.length > 0)) {
      lines.push(theme.error("Plugin errors:"));
      for (const entry of errors) {
        lines.push("- :  ()");
      }
    }
    if ((diags.length > 0)) {
      if ((lines.length > 0)) {
        lines.push("");
      }
      lines.push(theme.warn("Diagnostics:"));
      for (const diag of diags) {
        const target = diag.pluginId ? ": " : "";
        lines.push("- ");
      }
    }
    const docs = formatDocsLink("/plugin", "docs.openclaw.ai/plugin");
    lines.push("");
    lines.push(" ");
    defaultRuntime.log(lines.join("
"));
  });
}

