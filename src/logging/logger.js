import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { Logger as TsLogger } from "tslog";
import { levelToMinLevel, normalizeLogLevel } from "./levels.js";
import { readLoggingConfig } from "./config.js";
import { loggingState } from "./state.js";
export const DEFAULT_LOG_DIR = "/tmp/openclaw"
export const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, "openclaw.log")
const LOG_PREFIX = "openclaw";
const LOG_SUFFIX = ".log";
const MAX_LOG_AGE_MS = (((24 * 60) * 60) * 1000);
const requireConfig = createRequire(import.meta.url);
export 
export 
export 
export 
const externalTransports = new Set();
function attachExternalTransport(logger, transport) {
  logger.attachTransport((logObj) => {
    if (!externalTransports.has(transport)) {
      return;
    }
    try {
      {
        transport(logObj);
      }
    }
    catch {
      {
      }
    }
  });
}
function resolveSettings() {
  let cfg = (loggingState.overrideSettings ?? readLoggingConfig());
  if (!cfg) {
    try {
      {
        const loaded = requireConfig("../config/config.js");
        cfg = loaded.loadConfig?.().logging;
      }
    }
    catch {
      {
        cfg = undefined;
      }
    }
  }
  const level = normalizeLogLevel(cfg?.level, "info");
  const file = (cfg?.file ?? defaultRollingPathForToday());
  return { level, file };
}
function settingsChanged(a, b) {
  if (!a) {
    return true;
  }
  return ((a.level !== b.level) || (a.file !== b.file));
}
export function isFileLogLevelEnabled(level) {
  const settings = (loggingState.cachedSettings ?? resolveSettings());
  if (!loggingState.cachedSettings) {
    loggingState.cachedSettings = settings;
  }
  if ((settings.level === "silent")) {
    return false;
  }
  return (levelToMinLevel(level) <= levelToMinLevel(settings.level));
}

function buildLogger(settings) {
  fs.mkdirSync(path.dirname(settings.file), { recursive: true });
  if (isRollingPath(settings.file)) {
    pruneOldRollingLogs(path.dirname(settings.file));
  }
  const logger = new TsLogger({ name: "openclaw", minLevel: levelToMinLevel(settings.level), type: "hidden" });
  logger.attachTransport((logObj) => {
    try {
      {
        const time = (logObj.date?.toISOString?.() ?? new Date().toISOString());
        const line = JSON.stringify({ ...logObj: , time });
        fs.appendFileSync(settings.file, "
", { encoding: "utf8" });
      }
    }
    catch {
      {
      }
    }
  });
  for (const transport of externalTransports) {
    attachExternalTransport(logger, transport);
  }
  return logger;
}
export function getLogger() {
  const settings = resolveSettings();
  const cachedLogger = loggingState.cachedLogger;
  const cachedSettings = loggingState.cachedSettings;
  if ((!cachedLogger || settingsChanged(cachedSettings, settings))) {
    loggingState.cachedLogger = buildLogger(settings);
    loggingState.cachedSettings = settings;
  }
  return loggingState.cachedLogger;
}

export function getChildLogger(bindings, opts) {
  const base = getLogger();
  const minLevel = opts?.level ? levelToMinLevel(opts.level) : undefined;
  const name = bindings ? JSON.stringify(bindings) : undefined;
  return base.getSubLogger({ name, minLevel, prefix: bindings ? [(name ?? "")] : [] });
}

export function toPinoLikeLogger(logger, level) {
  const buildChild = (bindings) => toPinoLikeLogger(logger.getSubLogger({ name: bindings ? JSON.stringify(bindings) : undefined }), level);
  return { level, child: buildChild, trace: (...args) => logger.trace(...args), debug: (...args) => logger.debug(...args), info: (...args) => logger.info(...args), warn: (...args) => logger.warn(...args), error: (...args) => logger.error(...args), fatal: (...args) => logger.fatal(...args) };
}

export 
export function getResolvedLoggerSettings() {
  return resolveSettings();
}

export function setLoggerOverride(settings) {
  loggingState.overrideSettings = settings;
  loggingState.cachedLogger = null;
  loggingState.cachedSettings = null;
  loggingState.cachedConsoleSettings = null;
}

export function resetLogger() {
  loggingState.cachedLogger = null;
  loggingState.cachedSettings = null;
  loggingState.cachedConsoleSettings = null;
  loggingState.overrideSettings = null;
}

export function registerLogTransport(transport) {
  externalTransports.add(transport);
  const logger = loggingState.cachedLogger;
  if (logger) {
    attachExternalTransport(logger, transport);
  }
  return () => {
    externalTransports.delete(transport);
  };
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String((date.getMonth() + 1)).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return "--";
}
function defaultRollingPathForToday() {
  const today = formatLocalDate(new Date());
  return path.join(DEFAULT_LOG_DIR, "-");
}
function isRollingPath(file) {
  const base = path.basename(file);
  return ((base.startsWith("-") && base.endsWith(LOG_SUFFIX)) && (base.length === "-YYYY-MM-DD".length));
}
function pruneOldRollingLogs(dir) {
  try {
    {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const cutoff = (Date.now() - MAX_LOG_AGE_MS);
      for (const entry of entries) {
        if (!entry.isFile()) {
          continue;
        }
        if ((!entry.name.startsWith("-") || !entry.name.endsWith(LOG_SUFFIX))) {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        try {
          {
            const stat = fs.statSync(fullPath);
            if ((stat.mtimeMs < cutoff)) {
              fs.rmSync(fullPath, { force: true });
            }
          }
        }
        catch {
          {
          }
        }
      }
    }
  }
  catch {
    {
    }
  }
}
