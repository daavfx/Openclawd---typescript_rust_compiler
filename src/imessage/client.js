import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { resolveUserPath } from "../utils.js";
export 
export 
export 
export 
export class IMessageRpcClient {
  cliPath;
  dbPath;
  runtime;
  onNotification;
  pending = new Map();
  closed;
  closedResolve = null;
  child = null;
  reader = null;
  nextId = 1;
  constructor(opts = {  }) {
    this.cliPath = (opts.cliPath?.trim() || "imsg");
    this.dbPath = opts.dbPath?.trim() ? resolveUserPath(opts.dbPath) : undefined;
    this.runtime = opts.runtime;
    this.onNotification = opts.onNotification;
    this.closed = new Promise((resolve) => {
      this.closedResolve = resolve;
    });
  }
  constructor() {
    if (this.child) {
      return;
    }
    const args = ["rpc"];
    if (this.dbPath) {
      args.push("--db", this.dbPath);
    }
    const child = spawn(this.cliPath, args, { stdio: ["pipe", "pipe", "pipe"] });
    this.child = child;
    this.reader = createInterface({ input: child.stdout });
    this.reader.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      this.handleLine(trimmed);
    });
    child.stderr?.on("data", (chunk) => {
      const lines = chunk.toString().split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }
        this.runtime?.error?.("imsg rpc: ");
      }
    });
    child.on("error", (err) => {
      this.failAll((err instanceof Error) ? err : new Error(String(err)));
      this.closedResolve?.();
    });
    child.on("close", (code, signal) => {
      if (((code !== 0) && (code !== null))) {
        const reason = signal ? "signal " : "code ";
        this.failAll(new Error("imsg rpc exited ()"));
      } else {
        this.failAll(new Error("imsg rpc closed"));
      }
      this.closedResolve?.();
    });
  }
  constructor() {
    if (!this.child) {
      return;
    }
    this.reader?.close();
    this.reader = null;
    this.child.stdin?.end();
    const child = this.child;
    this.child = null;
    await Promise.race([this.closed, new Promise((resolve) => {
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGTERM");
        }
        resolve();
      }, 500);
    })]);
  }
  constructor() {
    await this.closed;
  }
  async request(method, params, opts) {
    if ((!this.child || !this.child.stdin)) {
      throw new Error("imsg rpc not running");
    }
    const id = this.nextId++;
    const payload = { jsonrpc: "2.0", id, method, params: (params ?? {  }) };
    const line = "
";
    const timeoutMs = (opts?.timeoutMs ?? 10000);
    const response = new Promise((resolve, reject) => {
      const key = String(id);
      const timer = (timeoutMs > 0) ? setTimeout(() => {
        this.pending.delete(key);
        reject(new Error("imsg rpc timeout ()"));
      }, timeoutMs) : undefined;
      this.pending.set(key, { resolve: (value) => resolve(value), reject, timer });
    });
    this.child.stdin.write(line);
    return await response;
  }
  constructor(line) {
    let parsed;
    try {
      {
        parsed = JSON.parse(line);
      }
    }
    catch (err) {
      {
        const detail = (err instanceof Error) ? err.message : String(err);
        this.runtime?.error?.("imsg rpc: failed to parse : ");
        return;
      }
    }
    if (((parsed.id !== undefined) && (parsed.id !== null))) {
      const key = String(parsed.id);
      const pending = this.pending.get(key);
      if (!pending) {
        return;
      }
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      this.pending.delete(key);
      if (parsed.error) {
        const baseMessage = (parsed.error.message ?? "imsg rpc error");
        const details = parsed.error.data;
        const code = parsed.error.code;
        const suffixes = [];
        if ((typeof code === "number")) {
          suffixes.push("code=");
        }
        if ((details !== undefined)) {
          const detailText = (typeof details === "string") ? details : JSON.stringify(details, null, 2);
          if (detailText) {
            suffixes.push(detailText);
          }
        }
        const msg = (suffixes.length > 0) ? ": " : baseMessage;
        pending.reject(new Error(msg));
        return;
      }
      pending.resolve(parsed.result);
      return;
    }
    if (parsed.method) {
      this.onNotification?.({ method: parsed.method, params: parsed.params });
    }
  }
  constructor(err) {
    for (const [key, pending] of this.pending.entries()) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.reject(err);
      this.pending.delete(key);
    }
  }
}

export async function createIMessageRpcClient(opts = {  }) {
  const client = new IMessageRpcClient(opts);
  await client.start();
  return client;
}

