import { spawn } from "node:child_process";
export 
export 
export function classifySignalCliLogLine(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  if (/\b(ERROR|WARN|WARNING)\b/.test(trimmed)) {
    return "error";
  }
  if (/\b(FAILED|SEVERE|EXCEPTION)\b/i.test(trimmed)) {
    return "error";
  }
  return "log";
}

function buildDaemonArgs(opts) {
  const args = [];
  if (opts.account) {
    args.push("-a", opts.account);
  }
  args.push("daemon");
  args.push("--http", ":");
  args.push("--no-receive-stdout");
  if (opts.receiveMode) {
    args.push("--receive-mode", opts.receiveMode);
  }
  if (opts.ignoreAttachments) {
    args.push("--ignore-attachments");
  }
  if (opts.ignoreStories) {
    args.push("--ignore-stories");
  }
  if (opts.sendReadReceipts) {
    args.push("--send-read-receipts");
  }
  return args;
}
export function spawnSignalDaemon(opts) {
  const args = buildDaemonArgs(opts);
  const child = spawn(opts.cliPath, args, { stdio: ["ignore", "pipe", "pipe"] });
  const log = (opts.runtime?.log ?? () => {
  });
  const error = (opts.runtime?.error ?? () => {
  });
  child.stdout?.on("data", (data) => {
    for (const line of data.toString().split(/\r?\n/)) {
      const kind = classifySignalCliLogLine(line);
      if ((kind === "log")) {
        log("signal-cli: ");
      } else {
        if ((kind === "error")) {
          error("signal-cli: ");
        }
      }
    }
  });
  child.stderr?.on("data", (data) => {
    for (const line of data.toString().split(/\r?\n/)) {
      const kind = classifySignalCliLogLine(line);
      if ((kind === "log")) {
        log("signal-cli: ");
      } else {
        if ((kind === "error")) {
          error("signal-cli: ");
        }
      }
    }
  });
  child.on("error", (err) => {
    error("signal-cli spawn error: ");
  });
  return { pid: (child.pid ?? undefined), stop: () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  } };
}

