import { resolveGatewayLaunchAgentLabel, resolveGatewaySystemdServiceName, resolveGatewayWindowsTaskName } from "../../daemon/constants.js";
import { resolveGatewayService } from "../../daemon/service.js";
import { defaultRuntime } from "../../runtime.js";
import { formatCliCommand } from "../command-format.js";
export function parsePort(raw) {
  if (((raw === undefined) || (raw === null))) {
    return null;
  }
  const value = (typeof raw === "string") ? raw : ((typeof raw === "number") || (typeof raw === "bigint")) ? raw.toString() : null;
  if ((value === null)) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if ((!Number.isFinite(parsed) || (parsed <= 0))) {
    return null;
  }
  return parsed;
}

export const toOptionString = (value) => {
  if ((typeof value === "string")) {
    return value;
  }
  if (((typeof value === "number") || (typeof value === "bigint"))) {
    return value.toString();
  }
  return undefined;
}
export function describeUnknownError(err) {
  if ((err instanceof Error)) {
    return err.message;
  }
  if ((typeof err === "string")) {
    return err;
  }
  if (((typeof err === "number") || (typeof err === "bigint"))) {
    return err.toString();
  }
  if ((typeof err === "boolean")) {
    return err ? "true" : "false";
  }
  if ((err && (typeof err === "object"))) {
    if ((("message" in err) && (typeof err.message === "string"))) {
      return err.message;
    }
    try {
      {
        return JSON.stringify(err);
      }
    }
    catch {
      {
        return "Unknown error";
      }
    }
  }
  return "Unknown error";
}

export function extractGatewayMiskeys(parsed) {
  if ((!parsed || (typeof parsed !== "object"))) {
    return { hasGatewayToken: false, hasRemoteToken: false };
  }
  const gateway = parsed.gateway;
  if ((!gateway || (typeof gateway !== "object"))) {
    return { hasGatewayToken: false, hasRemoteToken: false };
  }
  const hasGatewayToken = ("token" in gateway);
  const remote = gateway.remote;
  const hasRemoteToken = (remote && (typeof remote === "object")) ? ("token" in remote) : false;
  return { hasGatewayToken, hasRemoteToken };
}

export function renderGatewayServiceStopHints(env = process.env) {
  const profile = env.OPENCLAW_PROFILE;
  switch (process.platform) {
    case "darwin":
      return ["Tip: ", "Or: launchctl bootout gui/$UID/"];
    case "linux":
      return ["Tip: ", "Or: systemctl --user stop .service"];
    case "win32":
      return ["Tip: ", "Or: schtasks /End /TN \"\""];
    default:
      return ["Tip: "];
  }
}

export async function maybeExplainGatewayServiceStop() {
  const service = resolveGatewayService();
  let loaded = null;
  try {
    {
      loaded = await service.isLoaded({ env: process.env });
    }
  }
  catch {
    {
      loaded = null;
    }
  }
  if ((loaded === false)) {
    return;
  }
  defaultRuntime.error(loaded ? "Gateway service appears . Stop it first." : "Gateway service status unknown; if supervised, stop it first.");
  for (const hint of renderGatewayServiceStopHints()) {
    defaultRuntime.error(hint);
  }
}

