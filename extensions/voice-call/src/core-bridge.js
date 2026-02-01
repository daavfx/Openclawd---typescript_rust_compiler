import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
export 
let coreRootCache = null;
let coreDepsPromise = null;
function findPackageRoot(startDir, name) {
  let dir = startDir;
  for (; ; ) {
    const pkgPath = path.join(dir, "package.json");
    try {
      {
        if (fs.existsSync(pkgPath)) {
          const raw = fs.readFileSync(pkgPath, "utf8");
          const pkg = JSON.parse(raw);
          if ((pkg.name === name)) {
            return dir;
          }
        }
      }
    }
    catch {
      {
      }
    }
    const parent = path.dirname(dir);
    if ((parent === dir)) {
      return null;
    }
    dir = parent;
  }
}
function resolveOpenClawRoot() {
  if (coreRootCache) {
    return coreRootCache;
  }
  const override = process.env.OPENCLAW_ROOT?.trim();
  if (override) {
    coreRootCache = override;
    return override;
  }
  const candidates = new Set();
  if (process.argv[1]) {
    candidates.add(path.dirname(process.argv[1]));
  }
  candidates.add(process.cwd());
  try {
    {
      const urlPath = fileURLToPath(import.meta.url);
      candidates.add(path.dirname(urlPath));
    }
  }
  catch {
    {
    }
  }
  for (const start of candidates) {
    for (const name of ["openclaw"]) {
      const found = findPackageRoot(start, name);
      if (found) {
        coreRootCache = found;
        return found;
      }
    }
  }
  throw new Error("Unable to resolve core root. Set OPENCLAW_ROOT to the package root.");
}
async function importCoreModule(relativePath) {
  const root = resolveOpenClawRoot();
  const distPath = path.join(root, "dist", relativePath);
  if (!fs.existsSync(distPath)) {
    throw new Error("Missing core module at . Run `pnpm build` or install the official package.");
  }
  return await import(pathToFileURL(distPath).href);
}
export async function loadCoreAgentDeps() {
  if (coreDepsPromise) {
    return coreDepsPromise;
  }
  coreDepsPromise = async () => {
    const [agentScope, defaults, identity, modelSelection, piEmbedded, timeout, workspace, sessions] = await Promise.all([importCoreModule("agents/agent-scope.js"), importCoreModule("agents/defaults.js"), importCoreModule("agents/identity.js"), importCoreModule("agents/model-selection.js"), importCoreModule("agents/pi-embedded.js"), importCoreModule("agents/timeout.js"), importCoreModule("agents/workspace.js"), importCoreModule("config/sessions.js")]);
    return { resolveAgentDir: agentScope.resolveAgentDir, resolveAgentWorkspaceDir: agentScope.resolveAgentWorkspaceDir, resolveAgentIdentity: identity.resolveAgentIdentity, resolveThinkingDefault: modelSelection.resolveThinkingDefault, runEmbeddedPiAgent: piEmbedded.runEmbeddedPiAgent, resolveAgentTimeoutMs: timeout.resolveAgentTimeoutMs, ensureAgentWorkspace: workspace.ensureAgentWorkspace, resolveStorePath: sessions.resolveStorePath, loadSessionStore: sessions.loadSessionStore, saveSessionStore: sessions.saveSessionStore, resolveSessionFilePath: sessions.resolveSessionFilePath, DEFAULT_MODEL: defaults.DEFAULT_MODEL, DEFAULT_PROVIDER: defaults.DEFAULT_PROVIDER };
  }();
  return coreDepsPromise;
}

