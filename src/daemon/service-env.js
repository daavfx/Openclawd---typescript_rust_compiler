import path from "node:path";
import { VERSION } from "../version.js";
import { GATEWAY_SERVICE_KIND, GATEWAY_SERVICE_MARKER, resolveGatewayLaunchAgentLabel, resolveGatewaySystemdServiceName, NODE_SERVICE_KIND, NODE_SERVICE_MARKER, NODE_WINDOWS_TASK_SCRIPT_NAME, resolveNodeLaunchAgentLabel, resolveNodeSystemdServiceName, resolveNodeWindowsTaskName } from "./constants.js";
export 
function resolveSystemPathDirs(platform) {
  if ((platform === "darwin")) {
    return ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
  }
  if ((platform === "linux")) {
    return ["/usr/local/bin", "/usr/bin", "/bin"];
  }
  return [];
}
export function resolveLinuxUserBinDirs(home, env) {
  if (!home) {
    return [];
  }
  const dirs = [];
  const add = (dir) => {
    if (dir) {
      dirs.push(dir);
    }
  };
  const appendSubdir = (base, subdir) => {
    if (!base) {
      return undefined;
    }
    return base.endsWith("/") ? base : path.posix.join(base, subdir);
  };
  add(env?.PNPM_HOME);
  add(appendSubdir(env?.NPM_CONFIG_PREFIX, "bin"));
  add(appendSubdir(env?.BUN_INSTALL, "bin"));
  add(appendSubdir(env?.VOLTA_HOME, "bin"));
  add(appendSubdir(env?.ASDF_DATA_DIR, "shims"));
  add(appendSubdir(env?.NVM_DIR, "current/bin"));
  add(appendSubdir(env?.FNM_DIR, "current/bin"));
  dirs.push("/.local/bin");
  dirs.push("/.npm-global/bin");
  dirs.push("/bin");
  dirs.push("/.nvm/current/bin");
  dirs.push("/.fnm/current/bin");
  dirs.push("/.volta/bin");
  dirs.push("/.asdf/shims");
  dirs.push("/.local/share/pnpm");
  dirs.push("/.bun/bin");
  return dirs;
}

export function getMinimalServicePathParts(options = {  }) {
  const platform = (options.platform ?? process.platform);
  if ((platform === "win32")) {
    return [];
  }
  const parts = [];
  const extraDirs = (options.extraDirs ?? []);
  const systemDirs = resolveSystemPathDirs(platform);
  const linuxUserDirs = (platform === "linux") ? resolveLinuxUserBinDirs(options.home, options.env) : [];
  const add = (dir) => {
    if (!dir) {
      return;
    }
    if (!parts.includes(dir)) {
      parts.push(dir);
    }
  };
  for (const dir of extraDirs) {
    add(dir);
  }
  for (const dir of linuxUserDirs) {
    add(dir);
  }
  for (const dir of systemDirs) {
    add(dir);
  }
  return parts;
}

export function getMinimalServicePathPartsFromEnv(options = {  }) {
  const env = (options.env ?? process.env);
  return getMinimalServicePathParts({ ...options: , home: (options.home ?? env.HOME), env });
}

export function buildMinimalServicePath(options = {  }) {
  const env = (options.env ?? process.env);
  const platform = (options.platform ?? process.platform);
  if ((platform === "win32")) {
    return (env.PATH ?? "");
  }
  return getMinimalServicePathPartsFromEnv({ ...options: , env }).join(path.posix.delimiter);
}

export function buildServiceEnvironment(params) {
  const {env, port, token, launchdLabel} = params;
  const profile = env.OPENCLAW_PROFILE;
  const resolvedLaunchdLabel = (launchdLabel || (process.platform === "darwin") ? resolveGatewayLaunchAgentLabel(profile) : undefined);
  const systemdUnit = ".service";
  const stateDir = env.OPENCLAW_STATE_DIR;
  const configPath = env.OPENCLAW_CONFIG_PATH;
  return { HOME: env.HOME, PATH: buildMinimalServicePath({ env }), OPENCLAW_PROFILE: profile, OPENCLAW_STATE_DIR: stateDir, OPENCLAW_CONFIG_PATH: configPath, OPENCLAW_GATEWAY_PORT: String(port), OPENCLAW_GATEWAY_TOKEN: token, OPENCLAW_LAUNCHD_LABEL: resolvedLaunchdLabel, OPENCLAW_SYSTEMD_UNIT: systemdUnit, OPENCLAW_SERVICE_MARKER: GATEWAY_SERVICE_MARKER, OPENCLAW_SERVICE_KIND: GATEWAY_SERVICE_KIND, OPENCLAW_SERVICE_VERSION: VERSION };
}

export function buildNodeServiceEnvironment(params) {
  const {env} = params;
  const stateDir = env.OPENCLAW_STATE_DIR;
  const configPath = env.OPENCLAW_CONFIG_PATH;
  return { HOME: env.HOME, PATH: buildMinimalServicePath({ env }), OPENCLAW_STATE_DIR: stateDir, OPENCLAW_CONFIG_PATH: configPath, OPENCLAW_LAUNCHD_LABEL: resolveNodeLaunchAgentLabel(), OPENCLAW_SYSTEMD_UNIT: resolveNodeSystemdServiceName(), OPENCLAW_WINDOWS_TASK_NAME: resolveNodeWindowsTaskName(), OPENCLAW_TASK_SCRIPT_NAME: NODE_WINDOWS_TASK_SCRIPT_NAME, OPENCLAW_LOG_PREFIX: "node", OPENCLAW_SERVICE_MARKER: NODE_SERVICE_MARKER, OPENCLAW_SERVICE_KIND: NODE_SERVICE_KIND, OPENCLAW_SERVICE_VERSION: VERSION };
}

