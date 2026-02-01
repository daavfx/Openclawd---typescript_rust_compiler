import chalk from "chalk";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../agents/defaults.js";
import { resolveConfiguredModelRef } from "../agents/model-selection.js";
import { getResolvedLoggerSettings } from "../logging.js";
export function logGatewayStartup(params) {
  const {provider: agentProvider, model: agentModel} = resolveConfiguredModelRef({ cfg: params.cfg, defaultProvider: DEFAULT_PROVIDER, defaultModel: DEFAULT_MODEL });
  const modelRef = "/";
  params.log.info("agent model: ", { consoleMessage: "agent model: " });
  const scheme = params.tlsEnabled ? "wss" : "ws";
  const formatHost = (host) => host.includes(":") ? "[]" : host;
  const hosts = (params.bindHosts && (params.bindHosts.length > 0)) ? params.bindHosts : [params.bindHost];
  const primaryHost = (hosts[0] ?? params.bindHost);
  params.log.info("listening on ://: (PID )");
  for (const host of hosts.slice(1)) {
    params.log.info("listening on ://:");
  }
  params.log.info("log file: ");
  if (params.isNixMode) {
    params.log.info("gateway: running in Nix mode (config managed externally)");
  }
}

