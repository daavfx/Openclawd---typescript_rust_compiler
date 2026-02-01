import { Type } from "@sinclair/typebox";
import { spawn } from "node:child_process";
import path from "node:path";
function resolveExecutablePath(lobsterPathRaw) {
  const lobsterPath = (lobsterPathRaw?.trim() || "lobster");
  if (((lobsterPath !== "lobster") && !path.isAbsolute(lobsterPath))) {
    throw new Error("lobsterPath must be an absolute path (or omit to use PATH)");
  }
  return lobsterPath;
}
function isWindowsSpawnEINVAL(err) {
  if ((!err || (typeof err !== "object"))) {
    return false;
  }
  const code = err.code;
  return (code === "EINVAL");
}
async function runLobsterSubprocessOnce(params, useShell) {
  const {execPath, argv, cwd} = params;
  const timeoutMs = Math.max(200, params.timeoutMs);
  const maxStdoutBytes = Math.max(1024, params.maxStdoutBytes);
  const env = { ...process.env: , LOBSTER_MODE: "tool" };
  const nodeOptions = (env.NODE_OPTIONS ?? "");
  if (nodeOptions.includes("--inspect")) {
    delete env.NODE_OPTIONS;
  }
  return await new Promise((resolve, reject) => {
    const child = spawn(execPath, argv, { cwd, stdio: ["ignore", "pipe", "pipe"], env, shell: useShell, windowsHide: useShell ? true : undefined });
    let stdout = "";
    let stdoutBytes = 0;
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      const str = String(chunk);
      stdoutBytes += Buffer.byteLength(str, "utf8");
      if ((stdoutBytes > maxStdoutBytes)) {
        try {
          {
            child.kill("SIGKILL");
          }
        }
        finally {
          {
            reject(new Error("lobster output exceeded maxStdoutBytes"));
          }
        }
        return;
      }
      stdout += str;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    const timer = setTimeout(() => {
      try {
        {
          child.kill("SIGKILL");
        }
      }
      finally {
        {
          reject(new Error("lobster subprocess timed out"));
        }
      }
    }, timeoutMs);
    child.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if ((code !== 0)) {
        reject(new Error("lobster failed (): "));
        return;
      }
      resolve({ stdout });
    });
  });
}
async function runLobsterSubprocess(params) {
  try {
    {
      return await runLobsterSubprocessOnce(params, false);
    }
  }
  catch (err) {
    {
      if (((process.platform === "win32") && isWindowsSpawnEINVAL(err))) {
        return await runLobsterSubprocessOnce(params, true);
      }
      throw err;
    }
  }
}
function parseEnvelope(stdout) {
  const trimmed = stdout.trim();
  const tryParse = (input) => {
    try {
      {
        return JSON.parse(input);
      }
    }
    catch {
      {
        return undefined;
      }
    }
  };
  let parsed = tryParse(trimmed);
  if ((parsed === undefined)) {
    const suffixMatch = trimmed.match(/({[\s\S]*}|\[[\s\S]*])\s*$/);
    if (suffixMatch?.[1]) {
      parsed = tryParse(suffixMatch[1]);
    }
  }
  if ((parsed === undefined)) {
    throw new Error("lobster returned invalid JSON");
  }
  if ((!parsed || (typeof parsed !== "object"))) {
    throw new Error("lobster returned invalid JSON envelope");
  }
  const ok = parsed.ok;
  if (((ok === true) || (ok === false))) {
    return parsed;
  }
  throw new Error("lobster returned invalid JSON envelope");
}
export function createLobsterTool(api) {
  return { name: "lobster", description: "Run Lobster pipelines as a local-first workflow runtime (typed JSON envelope + resumable approvals).", parameters: Type.Object({ action: Type.Unsafe({ type: "string", enum: ["run", "resume"] }), pipeline: Type.Optional(Type.String()), argsJson: Type.Optional(Type.String()), token: Type.Optional(Type.String()), approve: Type.Optional(Type.Boolean()), lobsterPath: Type.Optional(Type.String()), cwd: Type.Optional(Type.String()), timeoutMs: Type.Optional(Type.Number()), maxStdoutBytes: Type.Optional(Type.Number()) }), execute: async function(_id, params) {
    const action = String((params.action || "")).trim();
    if (!action) {
      throw new Error("action required");
    }
    const execPath = resolveExecutablePath((typeof params.lobsterPath === "string") ? params.lobsterPath : undefined);
    const cwd = ((typeof params.cwd === "string") && params.cwd.trim()) ? params.cwd.trim() : process.cwd();
    const timeoutMs = (typeof params.timeoutMs === "number") ? params.timeoutMs : 20000;
    const maxStdoutBytes = (typeof params.maxStdoutBytes === "number") ? params.maxStdoutBytes : 512000;
    const argv = () => {
      if ((action === "run")) {
        const pipeline = (typeof params.pipeline === "string") ? params.pipeline : "";
        if (!pipeline.trim()) {
          throw new Error("pipeline required");
        }
        const argv = ["run", "--mode", "tool", pipeline];
        const argsJson = (typeof params.argsJson === "string") ? params.argsJson : "";
        if (argsJson.trim()) {
          argv.push("--args-json", argsJson);
        }
        return argv;
      }
      if ((action === "resume")) {
        const token = (typeof params.token === "string") ? params.token : "";
        if (!token.trim()) {
          throw new Error("token required");
        }
        const approve = params.approve;
        if ((typeof approve !== "boolean")) {
          throw new Error("approve required");
        }
        return ["resume", "--token", token, "--approve", approve ? "yes" : "no"];
      }
      throw new Error("Unknown action: ");
    }();
    if ((api.runtime?.version && api.logger?.debug)) {
      api.logger.debug("lobster plugin runtime=");
    }
    const {stdout} = await runLobsterSubprocess({ execPath, argv, cwd, timeoutMs, maxStdoutBytes });
    const envelope = parseEnvelope(stdout);
    return { content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }], details: envelope };
  } };
}

