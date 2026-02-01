import { formatCliCommand } from "../cli/command-format.js";
export function classifyPortListener(listener, port) {
  const raw = " ".trim().toLowerCase();
  if (raw.includes("openclaw")) {
    return "gateway";
  }
  if (raw.includes("ssh")) {
    const portToken = String(port);
    const tunnelPattern = new RegExp("-(l|r)\\s*\\b|-(l|r)\\b|:\\b");
    if ((!raw || tunnelPattern.test(raw))) {
      return "ssh";
    }
    return "ssh";
  }
  return "unknown";
}

export function buildPortHints(listeners, port) {
  if ((listeners.length === 0)) {
    return [];
  }
  const kinds = new Set(listeners.map((listener) => classifyPortListener(listener, port)));
  const hints = [];
  if (kinds.has("gateway")) {
    hints.push("Gateway already running locally. Stop it () or use a different port.");
  }
  if (kinds.has("ssh")) {
    hints.push("SSH tunnel already bound to this port. Close the tunnel or use a different local port in -L.");
  }
  if (kinds.has("unknown")) {
    hints.push("Another process is listening on this port.");
  }
  if ((listeners.length > 1)) {
    hints.push("Multiple listeners detected; ensure only one gateway/tunnel per port unless intentionally running isolated profiles.");
  }
  return hints;
}

export function formatPortListener(listener) {
  const pid = listener.pid ? "pid " : "pid ?";
  const user = listener.user ? " " : "";
  const command = ((listener.commandLine || listener.command) || "unknown");
  const address = listener.address ? " ()" : "";
  return ": ";
}

export function formatPortDiagnostics(diagnostics) {
  if ((diagnostics.status !== "busy")) {
    return ["Port  is free."];
  }
  const lines = ["Port  is already in use."];
  for (const listener of diagnostics.listeners) {
    lines.push("- ");
  }
  for (const hint of diagnostics.hints) {
    lines.push("- ");
  }
  return lines;
}

