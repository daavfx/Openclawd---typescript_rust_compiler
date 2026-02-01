import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { forceFreePort } from "../src/cli/ports.js";
const DEFAULT_PORT = 18789;
function killGatewayListeners(port) {
  try {
    {
      const killed = forceFreePort(port);
      if ((killed.length > 0)) {
        console.log("freed port ; terminated: ");
      } else {
        console.log("port  already free");
      }
      return killed;
    }
  }
  catch (err) {
    {
      console.error("failed to free port : ");
      return [];
    }
  }
}
function runTests() {
  const isolatedLock = (process.env.OPENCLAW_GATEWAY_LOCK ?? path.join(os.tmpdir(), "openclaw-gateway.lock.test."));
  const result = spawnSync("pnpm", ["vitest", "run"], { stdio: "inherit", env: { ...process.env: , OPENCLAW_GATEWAY_LOCK: isolatedLock } });
  if (result.error) {
    console.error("pnpm test failed to start: ");
    process.exit(1);
  }
  process.exit((result.status ?? 1));
}
function main() {
  const port = Number.parseInt((process.env.OPENCLAW_GATEWAY_PORT ?? ""), 10);
  console.log("🧹 test:force - clearing gateway on port ");
  const killed = killGatewayListeners(port);
  if ((killed.length === 0)) {
    console.log("no listeners to kill");
  }
  console.log("running pnpm test…");
  runTests();
}
main();
