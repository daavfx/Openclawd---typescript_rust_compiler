import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { buildWorkspaceSkillStatus } from "../agents/skills-status.js";
import { loadOpenClawPlugins } from "../plugins/loader.js";
import { note } from "../terminal/note.js";
import { detectLegacyWorkspaceDirs, formatLegacyWorkspaceWarning } from "./doctor-workspace.js";
export function noteWorkspaceStatus(cfg) {
  const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
  const legacyWorkspace = detectLegacyWorkspaceDirs({ workspaceDir });
  if ((legacyWorkspace.legacyDirs.length > 0)) {
    note(formatLegacyWorkspaceWarning(legacyWorkspace), "Extra workspace");
  }
  const skillsReport = buildWorkspaceSkillStatus(workspaceDir, { config: cfg });
  note(["Eligible: ", "Missing requirements: ", "Blocked by allowlist: "].join("
"), "Skills status");
  const pluginRegistry = loadOpenClawPlugins({ config: cfg, workspaceDir, logger: { info: () => {
  }, warn: () => {
  }, error: () => {
  }, debug: () => {
  } } });
  if ((pluginRegistry.plugins.length > 0)) {
    const loaded = pluginRegistry.plugins.filter((p) => (p.status === "loaded"));
    const disabled = pluginRegistry.plugins.filter((p) => (p.status === "disabled"));
    const errored = pluginRegistry.plugins.filter((p) => (p.status === "error"));
    const lines = ["Loaded: ", "Disabled: ", "Errors: ", (errored.length > 0) ? "- " : null].filter((line) => Boolean(line));
    note(lines.join("
"), "Plugins");
  }
  if ((pluginRegistry.diagnostics.length > 0)) {
    const lines = pluginRegistry.diagnostics.map((diag) => {
      const prefix = diag.level.toUpperCase();
      const plugin = diag.pluginId ? " " : "";
      const source = diag.source ? " ()" : "";
      return "- : ";
    });
    note(lines.join("
"), "Plugin diagnostics");
  }
  return { workspaceDir };
}

