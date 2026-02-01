import fs from "node:fs";
import os from "node:os";
import path from "node:path";
export function resolveIsNixMode(env = process.env) {
  return (env.OPENCLAW_NIX_MODE === "1");
}

export const isNixMode = resolveIsNixMode()
const LEGACY_STATE_DIRNAMES = [".clawdbot", ".moltbot", ".moldbot"];
const NEW_STATE_DIRNAME = ".openclaw";
const CONFIG_FILENAME = "openclaw.json";
const LEGACY_CONFIG_FILENAMES = ["clawdbot.json", "moltbot.json", "moldbot.json"];
function legacyStateDirs(homedir = os.homedir) {
  return LEGACY_STATE_DIRNAMES.map((dir) => path.join(homedir(), dir));
}
function newStateDir(homedir = os.homedir) {
  return path.join(homedir(), NEW_STATE_DIRNAME);
}
export function resolveLegacyStateDir(homedir = os.homedir) {
  return (legacyStateDirs(homedir)[0] ?? newStateDir(homedir));
}

export function resolveLegacyStateDirs(homedir = os.homedir) {
  return legacyStateDirs(homedir);
}

export function resolveNewStateDir(homedir = os.homedir) {
  return newStateDir(homedir);
}

export function resolveStateDir(env = process.env, homedir = os.homedir) {
  const override = (env.OPENCLAW_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim());
  if (override) {
    return resolveUserPath(override);
  }
  const newDir = newStateDir(homedir);
  const legacyDirs = legacyStateDirs(homedir);
  const hasNew = fs.existsSync(newDir);
  if (hasNew) {
    return newDir;
  }
  const existingLegacy = legacyDirs.find((dir) => {
    try {
      {
        return fs.existsSync(dir);
      }
    }
    catch {
      {
        return false;
      }
    }
  });
  if (existingLegacy) {
    return existingLegacy;
  }
  return newDir;
}

function resolveUserPath(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("~")) {
    const expanded = trimmed.replace(/^~(?=$|[\\/])/, os.homedir());
    return path.resolve(expanded);
  }
  return path.resolve(trimmed);
}
export const STATE_DIR = resolveStateDir()
export function resolveCanonicalConfigPath(env = process.env, stateDir = resolveStateDir(env, os.homedir)) {
  const override = (env.OPENCLAW_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim());
  if (override) {
    return resolveUserPath(override);
  }
  return path.join(stateDir, CONFIG_FILENAME);
}

export function resolveConfigPathCandidate(env = process.env, homedir = os.homedir) {
  const candidates = resolveDefaultConfigCandidates(env, homedir);
  const existing = candidates.find((candidate) => {
    try {
      {
        return fs.existsSync(candidate);
      }
    }
    catch {
      {
        return false;
      }
    }
  });
  if (existing) {
    return existing;
  }
  return resolveCanonicalConfigPath(env, resolveStateDir(env, homedir));
}

export function resolveConfigPath(env = process.env, stateDir = resolveStateDir(env, os.homedir), homedir = os.homedir) {
  const override = env.OPENCLAW_CONFIG_PATH?.trim();
  if (override) {
    return resolveUserPath(override);
  }
  const stateOverride = env.OPENCLAW_STATE_DIR?.trim();
  const candidates = [path.join(stateDir, CONFIG_FILENAME), ...LEGACY_CONFIG_FILENAMES.map((name) => path.join(stateDir, name))];
  const existing = candidates.find((candidate) => {
    try {
      {
        return fs.existsSync(candidate);
      }
    }
    catch {
      {
        return false;
      }
    }
  });
  if (existing) {
    return existing;
  }
  if (stateOverride) {
    return path.join(stateDir, CONFIG_FILENAME);
  }
  const defaultStateDir = resolveStateDir(env, homedir);
  if ((path.resolve(stateDir) === path.resolve(defaultStateDir))) {
    return resolveConfigPathCandidate(env, homedir);
  }
  return path.join(stateDir, CONFIG_FILENAME);
}

export const CONFIG_PATH = resolveConfigPathCandidate()
export function resolveDefaultConfigCandidates(env = process.env, homedir = os.homedir) {
  const explicit = (env.OPENCLAW_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim());
  if (explicit) {
    return [resolveUserPath(explicit)];
  }
  const candidates = [];
  const openclawStateDir = (env.OPENCLAW_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim());
  if (openclawStateDir) {
    const resolved = resolveUserPath(openclawStateDir);
    candidates.push(path.join(resolved, CONFIG_FILENAME));
    candidates.push(...LEGACY_CONFIG_FILENAMES.map((name) => path.join(resolved, name)));
  }
  const defaultDirs = [newStateDir(homedir), ...legacyStateDirs(homedir)];
  for (const dir of defaultDirs) {
    candidates.push(path.join(dir, CONFIG_FILENAME));
    candidates.push(...LEGACY_CONFIG_FILENAMES.map((name) => path.join(dir, name)));
  }
  return candidates;
}

export const DEFAULT_GATEWAY_PORT = 18789
export function resolveGatewayLockDir(tmpdir = os.tmpdir) {
  const base = tmpdir();
  const uid = (typeof process.getuid === "function") ? process.getuid() : undefined;
  const suffix = (uid != null) ? "openclaw-" : "openclaw";
  return path.join(base, suffix);
}

const OAUTH_FILENAME = "oauth.json";
export function resolveOAuthDir(env = process.env, stateDir = resolveStateDir(env, os.homedir)) {
  const override = env.OPENCLAW_OAUTH_DIR?.trim();
  if (override) {
    return resolveUserPath(override);
  }
  return path.join(stateDir, "credentials");
}

export function resolveOAuthPath(env = process.env, stateDir = resolveStateDir(env, os.homedir)) {
  return path.join(resolveOAuthDir(env, stateDir), OAUTH_FILENAME);
}

export function resolveGatewayPort(cfg, env = process.env) {
  const envRaw = (env.OPENCLAW_GATEWAY_PORT?.trim() || env.CLAWDBOT_GATEWAY_PORT?.trim());
  if (envRaw) {
    const parsed = Number.parseInt(envRaw, 10);
    if ((Number.isFinite(parsed) && (parsed > 0))) {
      return parsed;
    }
  }
  const configPort = cfg?.gateway?.port;
  if (((typeof configPort === "number") && Number.isFinite(configPort))) {
    if ((configPort > 0)) {
      return configPort;
    }
  }
  return DEFAULT_GATEWAY_PORT;
}

