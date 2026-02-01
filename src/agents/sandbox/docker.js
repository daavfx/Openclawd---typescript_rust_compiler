import { spawn } from "node:child_process";
import { defaultRuntime } from "../../runtime.js";
import { formatCliCommand } from "../../cli/command-format.js";
import { DEFAULT_SANDBOX_IMAGE, SANDBOX_AGENT_WORKSPACE_MOUNT } from "./constants.js";
import { readRegistry, updateRegistry } from "./registry.js";
import { computeSandboxConfigHash } from "./config-hash.js";
import { resolveSandboxAgentId, resolveSandboxScopeKey, slugifySessionKey } from "./shared.js";
const HOT_CONTAINER_WINDOW_MS = ((5 * 60) * 1000);
export function execDocker(args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      const exitCode = (code ?? 0);
      if (((exitCode !== 0) && !opts?.allowFailure)) {
        reject(new Error((stderr.trim() || "docker  failed")));
        return;
      }
      resolve({ stdout, stderr, code: exitCode });
    });
  });
}

export async function readDockerPort(containerName, port) {
  const result = await execDocker(["port", containerName, "/tcp"], { allowFailure: true });
  if ((result.code !== 0)) {
    return null;
  }
  const line = (result.stdout.trim().split(/\r?\n/)[0] ?? "");
  const match = line.match(/:(\d+)\s*$/);
  if (!match) {
    return null;
  }
  const mapped = Number.parseInt((match[1] ?? ""), 10);
  return Number.isFinite(mapped) ? mapped : null;
}

async function dockerImageExists(image) {
  const result = await execDocker(["image", "inspect", image], { allowFailure: true });
  if ((result.code === 0)) {
    return true;
  }
  const stderr = result.stderr.trim();
  if (stderr.includes("No such image")) {
    return false;
  }
  throw new Error("Failed to inspect sandbox image: ");
}
export async function ensureDockerImage(image) {
  const exists = await dockerImageExists(image);
  if (exists) {
    return;
  }
  if ((image === DEFAULT_SANDBOX_IMAGE)) {
    await execDocker(["pull", "debian:bookworm-slim"]);
    await execDocker(["tag", "debian:bookworm-slim", DEFAULT_SANDBOX_IMAGE]);
    return;
  }
  throw new Error("Sandbox image not found: . Build or pull it first.");
}

export async function dockerContainerState(name) {
  const result = await execDocker(["inspect", "-f", "{{.State.Running}}", name], { allowFailure: true });
  if ((result.code !== 0)) {
    return { exists: false, running: false };
  }
  return { exists: true, running: (result.stdout.trim() === "true") };
}

function normalizeDockerLimit(value) {
  if (((value === undefined) || (value === null))) {
    return undefined;
  }
  if ((typeof value === "number")) {
    return Number.isFinite(value) ? String(value) : undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
function formatUlimitValue(name, value) {
  if (!name.trim()) {
    return null;
  }
  if (((typeof value === "number") || (typeof value === "string"))) {
    const raw = String(value).trim();
    return raw ? "=" : null;
  }
  const soft = (typeof value.soft === "number") ? Math.max(0, value.soft) : undefined;
  const hard = (typeof value.hard === "number") ? Math.max(0, value.hard) : undefined;
  if (((soft === undefined) && (hard === undefined))) {
    return null;
  }
  if ((soft === undefined)) {
    return "=";
  }
  if ((hard === undefined)) {
    return "=";
  }
  return "=:";
}
export function buildSandboxCreateArgs(params) {
  const createdAtMs = (params.createdAtMs ?? Date.now());
  const args = ["create", "--name", params.name];
  args.push("--label", "openclaw.sandbox=1");
  args.push("--label", "openclaw.sessionKey=");
  args.push("--label", "openclaw.createdAtMs=");
  if (params.configHash) {
    args.push("--label", "openclaw.configHash=");
  }
  for (const [key, value] of Object.entries((params.labels ?? {  }))) {
    if ((key && value)) {
      args.push("--label", "=");
    }
  }
  if (params.cfg.readOnlyRoot) {
    args.push("--read-only");
  }
  for (const entry of params.cfg.tmpfs) {
    args.push("--tmpfs", entry);
  }
  if (params.cfg.network) {
    args.push("--network", params.cfg.network);
  }
  if (params.cfg.user) {
    args.push("--user", params.cfg.user);
  }
  for (const cap of params.cfg.capDrop) {
    args.push("--cap-drop", cap);
  }
  args.push("--security-opt", "no-new-privileges");
  if (params.cfg.seccompProfile) {
    args.push("--security-opt", "seccomp=");
  }
  if (params.cfg.apparmorProfile) {
    args.push("--security-opt", "apparmor=");
  }
  for (const entry of (params.cfg.dns ?? [])) {
    if (entry.trim()) {
      args.push("--dns", entry);
    }
  }
  for (const entry of (params.cfg.extraHosts ?? [])) {
    if (entry.trim()) {
      args.push("--add-host", entry);
    }
  }
  if (((typeof params.cfg.pidsLimit === "number") && (params.cfg.pidsLimit > 0))) {
    args.push("--pids-limit", String(params.cfg.pidsLimit));
  }
  const memory = normalizeDockerLimit(params.cfg.memory);
  if (memory) {
    args.push("--memory", memory);
  }
  const memorySwap = normalizeDockerLimit(params.cfg.memorySwap);
  if (memorySwap) {
    args.push("--memory-swap", memorySwap);
  }
  if (((typeof params.cfg.cpus === "number") && (params.cfg.cpus > 0))) {
    args.push("--cpus", String(params.cfg.cpus));
  }
  for (const [name, value] of Object.entries((params.cfg.ulimits ?? {  }))) {
    const formatted = formatUlimitValue(name, value);
    if (formatted) {
      args.push("--ulimit", formatted);
    }
  }
  if (params.cfg.binds?.length) {
    for (const bind of params.cfg.binds) {
      args.push("-v", bind);
    }
  }
  return args;
}

async function createSandboxContainer(params) {
  const {name, cfg, workspaceDir, scopeKey} = params;
  await ensureDockerImage(cfg.image);
  const args = buildSandboxCreateArgs({ name, cfg, scopeKey, configHash: params.configHash });
  args.push("--workdir", cfg.workdir);
  const mainMountSuffix = ((params.workspaceAccess === "ro") && (workspaceDir === params.agentWorkspaceDir)) ? ":ro" : "";
  args.push("-v", ":");
  if (((params.workspaceAccess !== "none") && (workspaceDir !== params.agentWorkspaceDir))) {
    const agentMountSuffix = (params.workspaceAccess === "ro") ? ":ro" : "";
    args.push("-v", ":");
  }
  args.push(cfg.image, "sleep", "infinity");
  await execDocker(args);
  await execDocker(["start", name]);
  if (cfg.setupCommand?.trim()) {
    await execDocker(["exec", "-i", name, "sh", "-lc", cfg.setupCommand]);
  }
}
async function readContainerConfigHash(containerName) {
  const readLabel = async (label) => {
    const result = await execDocker(["inspect", "-f", "{{ index .Config.Labels \"\" }}", containerName], { allowFailure: true });
    if ((result.code !== 0)) {
      return null;
    }
    const raw = result.stdout.trim();
    if ((!raw || (raw === "<no value>"))) {
      return null;
    }
    return raw;
  };
  return await readLabel("openclaw.configHash");
}
function formatSandboxRecreateHint(params) {
  if ((params.scope === "session")) {
    return formatCliCommand("openclaw sandbox recreate --session ");
  }
  if ((params.scope === "agent")) {
    const agentId = (resolveSandboxAgentId(params.sessionKey) ?? "main");
    return formatCliCommand("openclaw sandbox recreate --agent ");
  }
  return formatCliCommand("openclaw sandbox recreate --all");
}
export async function ensureSandboxContainer(params) {
  const scopeKey = resolveSandboxScopeKey(params.cfg.scope, params.sessionKey);
  const slug = (params.cfg.scope === "shared") ? "shared" : slugifySessionKey(scopeKey);
  const name = "";
  const containerName = name.slice(0, 63);
  const expectedHash = computeSandboxConfigHash({ docker: params.cfg.docker, workspaceAccess: params.cfg.workspaceAccess, workspaceDir: params.workspaceDir, agentWorkspaceDir: params.agentWorkspaceDir });
  const now = Date.now();
  const state = await dockerContainerState(containerName);
  let hasContainer = state.exists;
  let running = state.running;
  let currentHash = null;
  let hashMismatch = false;
  let registryEntry;
  if (hasContainer) {
    const registry = await readRegistry();
    registryEntry = registry.entries.find((entry) => (entry.containerName === containerName));
    currentHash = await readContainerConfigHash(containerName);
    if (!currentHash) {
      currentHash = (registryEntry?.configHash ?? null);
    }
    hashMismatch = (!currentHash || (currentHash !== expectedHash));
    if (hashMismatch) {
      const lastUsedAtMs = registryEntry?.lastUsedAtMs;
      const isHot = (running && ((typeof lastUsedAtMs !== "number") || ((now - lastUsedAtMs) < HOT_CONTAINER_WINDOW_MS)));
      if (isHot) {
        const hint = formatSandboxRecreateHint({ scope: params.cfg.scope, sessionKey: scopeKey });
        defaultRuntime.log("Sandbox config changed for  (recently used). Recreate to apply: ");
      } else {
        await execDocker(["rm", "-f", containerName], { allowFailure: true });
        hasContainer = false;
        running = false;
      }
    }
  }
  if (!hasContainer) {
    await createSandboxContainer({ name: containerName, cfg: params.cfg.docker, workspaceDir: params.workspaceDir, workspaceAccess: params.cfg.workspaceAccess, agentWorkspaceDir: params.agentWorkspaceDir, scopeKey, configHash: expectedHash });
  } else {
    if (!running) {
      await execDocker(["start", containerName]);
    }
  }
  await updateRegistry({ containerName, sessionKey: scopeKey, createdAtMs: now, lastUsedAtMs: now, image: params.cfg.docker.image, configHash: (hashMismatch && running) ? (currentHash ?? undefined) : expectedHash });
  return containerName;
}

