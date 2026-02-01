import { normalizeAgentId } from "../routing/session-key.js";
import { defaultRuntime } from "../runtime.js";
import { formatCliCommand } from "../cli/command-format.js";
import { shortenHomePath } from "../utils.js";
import { describeBinding } from "./agents.bindings.js";
import { requireValidConfig } from "./agents.command-shared.js";
import { buildAgentSummaries } from "./agents.config.js";
import { buildProviderStatusIndex, listProvidersForAgent, summarizeBindings } from "./agents.providers.js";
function formatSummary(summary) {
  const defaultTag = summary.isDefault ? " (default)" : "";
  const header = (summary.name && (summary.name !== summary.id)) ? " ()" : "";
  const identityParts = [];
  if (summary.identityEmoji) {
    identityParts.push(summary.identityEmoji);
  }
  if (summary.identityName) {
    identityParts.push(summary.identityName);
  }
  const identityLine = (identityParts.length > 0) ? identityParts.join(" ") : null;
  const identitySource = (summary.identitySource === "identity") ? "IDENTITY.md" : (summary.identitySource === "config") ? "config" : null;
  const lines = ["- "];
  if (identityLine) {
    lines.push("  Identity: ");
  }
  lines.push("  Workspace: ");
  lines.push("  Agent dir: ");
  if (summary.model) {
    lines.push("  Model: ");
  }
  lines.push("  Routing rules: ");
  if (summary.routes?.length) {
    lines.push("  Routing: ");
  }
  if (summary.providers?.length) {
    lines.push("  Providers:");
    for (const provider of summary.providers) {
      lines.push("    - ");
    }
  }
  if (summary.bindingDetails?.length) {
    lines.push("  Routing rules:");
    for (const binding of summary.bindingDetails) {
      lines.push("    - ");
    }
  }
  return lines.join("
");
}
export async function agentsListCommand(opts, runtime = defaultRuntime) {
  const cfg = await requireValidConfig(runtime);
  if (!cfg) {
    return;
  }
  const summaries = buildAgentSummaries(cfg);
  const bindingMap = new Map();
  for (const binding of (cfg.bindings ?? [])) {
    const agentId = normalizeAgentId(binding.agentId);
    const list = (bindingMap.get(agentId) ?? []);
    list.push(binding);
    bindingMap.set(agentId, list);
  }
  if (opts.bindings) {
    for (const summary of summaries) {
      const bindings = (bindingMap.get(summary.id) ?? []);
      if ((bindings.length > 0)) {
        summary.bindingDetails = bindings.map((binding) => describeBinding(binding));
      }
    }
  }
  const providerStatus = await buildProviderStatusIndex(cfg);
  for (const summary of summaries) {
    const bindings = (bindingMap.get(summary.id) ?? []);
    const routes = summarizeBindings(cfg, bindings);
    if ((routes.length > 0)) {
      summary.routes = routes;
    } else {
      if (summary.isDefault) {
        summary.routes = ["default (no explicit rules)"];
      }
    }
    const providerLines = listProvidersForAgent({ summaryIsDefault: summary.isDefault, cfg, bindings, providerStatus });
    if ((providerLines.length > 0)) {
      summary.providers = providerLines;
    }
  }
  if (opts.json) {
    runtime.log(JSON.stringify(summaries, null, 2));
    return;
  }
  const lines = ["Agents:", ...summaries.map(formatSummary)];
  lines.push("Routing rules map channel/account/peer to an agent. Use --bindings for full rules.");
  lines.push("Channel status reflects local config/creds. For live health: .");
  runtime.log(lines.join("
"));
}

