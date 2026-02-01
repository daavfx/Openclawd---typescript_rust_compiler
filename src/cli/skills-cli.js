import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { buildWorkspaceSkillStatus } from "../agents/skills-status.js";
import { loadConfig } from "../config/config.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { shortenHomePath } from "../utils.js";
import { formatCliCommand } from "./command-format.js";
export 
export 
export 
function appendClawdHubHint(output, json) {
  if (json) {
    return output;
  }
  return "

Tip: use `npx clawdhub` to search, install, and sync skills.";
}
function formatSkillStatus(skill) {
  if (skill.eligible) {
    return theme.success("✓ ready");
  }
  if (skill.disabled) {
    return theme.warn("⏸ disabled");
  }
  if (skill.blockedByAllowlist) {
    return theme.warn("🚫 blocked");
  }
  return theme.error("✗ missing");
}
function formatSkillName(skill) {
  const emoji = (skill.emoji ?? "📦");
  return " ";
}
function formatSkillMissingSummary(skill) {
  const missing = [];
  if ((skill.missing.bins.length > 0)) {
    missing.push("bins: ");
  }
  if ((skill.missing.anyBins.length > 0)) {
    missing.push("anyBins: ");
  }
  if ((skill.missing.env.length > 0)) {
    missing.push("env: ");
  }
  if ((skill.missing.config.length > 0)) {
    missing.push("config: ");
  }
  if ((skill.missing.os.length > 0)) {
    missing.push("os: ");
  }
  return missing.join("; ");
}
export function formatSkillsList(report, opts) {
  const skills = opts.eligible ? report.skills.filter((s) => s.eligible) : report.skills;
  if (opts.json) {
    const jsonReport = { workspaceDir: report.workspaceDir, managedSkillsDir: report.managedSkillsDir, skills: skills.map((s) => { name: s.name, description: s.description, emoji: s.emoji, eligible: s.eligible, disabled: s.disabled, blockedByAllowlist: s.blockedByAllowlist, source: s.source, primaryEnv: s.primaryEnv, homepage: s.homepage, missing: s.missing }) };
    return JSON.stringify(jsonReport, null, 2);
  }
  if ((skills.length === 0)) {
    const message = opts.eligible ? "No eligible skills found. Run `` to see all skills." : "No skills found.";
    return appendClawdHubHint(message, opts.json);
  }
  const eligible = skills.filter((s) => s.eligible);
  const tableWidth = Math.max(60, ((process.stdout.columns ?? 120) - 1));
  const rows = skills.map((skill) => {
    const missing = formatSkillMissingSummary(skill);
    return { Status: formatSkillStatus(skill), Skill: formatSkillName(skill), Description: theme.muted(skill.description), Source: (skill.source ?? ""), Missing: missing ? theme.warn(missing) : "" };
  });
  const columns = [{ key: "Status", header: "Status", minWidth: 10 }, { key: "Skill", header: "Skill", minWidth: 18, flex: true }, { key: "Description", header: "Description", minWidth: 24, flex: true }, { key: "Source", header: "Source", minWidth: 10 }];
  if (opts.verbose) {
    columns.push({ key: "Missing", header: "Missing", minWidth: 18, flex: true });
  }
  const lines = [];
  lines.push(" ");
  lines.push(renderTable({ width: tableWidth, columns, rows }).trimEnd());
  return appendClawdHubHint(lines.join("
"), opts.json);
}

export function formatSkillInfo(report, skillName, opts) {
  const skill = report.skills.find((s) => ((s.name === skillName) || (s.skillKey === skillName)));
  if (!skill) {
    if (opts.json) {
      return JSON.stringify({ error: "not found", skill: skillName }, null, 2);
    }
    return appendClawdHubHint("Skill \"\" not found. Run `` to see available skills.", opts.json);
  }
  if (opts.json) {
    return JSON.stringify(skill, null, 2);
  }
  const lines = [];
  const emoji = (skill.emoji ?? "📦");
  const status = skill.eligible ? theme.success("✓ Ready") : skill.disabled ? theme.warn("⏸ Disabled") : skill.blockedByAllowlist ? theme.warn("🚫 Blocked by allowlist") : theme.error("✗ Missing requirements");
  lines.push("  ");
  lines.push("");
  lines.push(skill.description);
  lines.push("");
  lines.push(theme.heading("Details:"));
  lines.push(" ");
  lines.push(" ");
  if (skill.homepage) {
    lines.push(" ");
  }
  if (skill.primaryEnv) {
    lines.push(" ");
  }
  const hasRequirements = (((((skill.requirements.bins.length > 0) || (skill.requirements.anyBins.length > 0)) || (skill.requirements.env.length > 0)) || (skill.requirements.config.length > 0)) || (skill.requirements.os.length > 0));
  if (hasRequirements) {
    lines.push("");
    lines.push(theme.heading("Requirements:"));
    if ((skill.requirements.bins.length > 0)) {
      const binsStatus = skill.requirements.bins.map((bin) => {
        const missing = skill.missing.bins.includes(bin);
        return missing ? theme.error("✗ ") : theme.success("✓ ");
      });
      lines.push(" ");
    }
    if ((skill.requirements.anyBins.length > 0)) {
      const anyBinsMissing = (skill.missing.anyBins.length > 0);
      const anyBinsStatus = skill.requirements.anyBins.map((bin) => {
        const missing = anyBinsMissing;
        return missing ? theme.error("✗ ") : theme.success("✓ ");
      });
      lines.push(" ");
    }
    if ((skill.requirements.env.length > 0)) {
      const envStatus = skill.requirements.env.map((env) => {
        const missing = skill.missing.env.includes(env);
        return missing ? theme.error("✗ ") : theme.success("✓ ");
      });
      lines.push(" ");
    }
    if ((skill.requirements.config.length > 0)) {
      const configStatus = skill.requirements.config.map((cfg) => {
        const missing = skill.missing.config.includes(cfg);
        return missing ? theme.error("✗ ") : theme.success("✓ ");
      });
      lines.push(" ");
    }
    if ((skill.requirements.os.length > 0)) {
      const osStatus = skill.requirements.os.map((osName) => {
        const missing = skill.missing.os.includes(osName);
        return missing ? theme.error("✗ ") : theme.success("✓ ");
      });
      lines.push(" ");
    }
  }
  if (((skill.install.length > 0) && !skill.eligible)) {
    lines.push("");
    lines.push(theme.heading("Install options:"));
    for (const inst of skill.install) {
      lines.push("   ");
    }
  }
  return appendClawdHubHint(lines.join("
"), opts.json);
}

export function formatSkillsCheck(report, opts) {
  const eligible = report.skills.filter((s) => s.eligible);
  const disabled = report.skills.filter((s) => s.disabled);
  const blocked = report.skills.filter((s) => (s.blockedByAllowlist && !s.disabled));
  const missingReqs = report.skills.filter((s) => ((!s.eligible && !s.disabled) && !s.blockedByAllowlist));
  if (opts.json) {
    return JSON.stringify({ summary: { total: report.skills.length, eligible: eligible.length, disabled: disabled.length, blocked: blocked.length, missingRequirements: missingReqs.length }, eligible: eligible.map((s) => s.name), disabled: disabled.map((s) => s.name), blocked: blocked.map((s) => s.name), missingRequirements: missingReqs.map((s) => { name: s.name, missing: s.missing, install: s.install }) }, null, 2);
  }
  const lines = [];
  lines.push(theme.heading("Skills Status Check"));
  lines.push("");
  lines.push(" ");
  lines.push("  ");
  lines.push("  ");
  lines.push("  ");
  lines.push("  ");
  if ((eligible.length > 0)) {
    lines.push("");
    lines.push(theme.heading("Ready to use:"));
    for (const skill of eligible) {
      const emoji = (skill.emoji ?? "📦");
      lines.push("   ");
    }
  }
  if ((missingReqs.length > 0)) {
    lines.push("");
    lines.push(theme.heading("Missing requirements:"));
    for (const skill of missingReqs) {
      const emoji = (skill.emoji ?? "📦");
      const missing = [];
      if ((skill.missing.bins.length > 0)) {
        missing.push("bins: ");
      }
      if ((skill.missing.anyBins.length > 0)) {
        missing.push("anyBins: ");
      }
      if ((skill.missing.env.length > 0)) {
        missing.push("env: ");
      }
      if ((skill.missing.config.length > 0)) {
        missing.push("config: ");
      }
      if ((skill.missing.os.length > 0)) {
        missing.push("os: ");
      }
      lines.push("    ");
    }
  }
  return appendClawdHubHint(lines.join("
"), opts.json);
}

export function registerSkillsCli(program) {
  const skills = program.command("skills").description("List and inspect available skills").addHelpText("after", () => "
 
");
  skills.command("list").description("List all available skills").option("--json", "Output as JSON", false).option("--eligible", "Show only eligible (ready to use) skills", false).option("-v, --verbose", "Show more details including missing requirements", false).action(async (opts) => {
    try {
      {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillsList(report, opts));
      }
    }
    catch (err) {
      {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    }
  });
  skills.command("info").description("Show detailed information about a skill").argument("<name>", "Skill name").option("--json", "Output as JSON", false).action(async (name, opts) => {
    try {
      {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillInfo(report, name, opts));
      }
    }
    catch (err) {
      {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    }
  });
  skills.command("check").description("Check which skills are ready vs missing requirements").option("--json", "Output as JSON", false).action(async (opts) => {
    try {
      {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillsCheck(report, opts));
      }
    }
    catch (err) {
      {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    }
  });
  skills.action(async () => {
    try {
      {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillsList(report, {  }));
      }
    }
    catch (err) {
      {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    }
  });
}

