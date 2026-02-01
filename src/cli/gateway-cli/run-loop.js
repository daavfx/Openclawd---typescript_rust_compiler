import { acquireGatewayLock } from "../../infra/gateway-lock.js";
import { consumeGatewaySigusr1RestartAuthorization, isGatewaySigusr1RestartExternallyAllowed } from "../../infra/restart.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
const gatewayLog = createSubsystemLogger("gateway");
export async function runGatewayLoop(params) {
  const lock = await acquireGatewayLock();
  let server = null;
  let shuttingDown = false;
  let restartResolver = null;
  const cleanupSignals = () => {
    process.removeListener("SIGTERM", onSigterm);
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGUSR1", onSigusr1);
  };
  const request = (action, signal) => {
    if (shuttingDown) {
      gatewayLog.info("received  during shutdown; ignoring");
      return;
    }
    shuttingDown = true;
    const isRestart = (action === "restart");
    gatewayLog.info("received ; ");
    const forceExitTimer = setTimeout(() => {
      gatewayLog.error("shutdown timed out; exiting without full cleanup");
      cleanupSignals();
      params.runtime.exit(0);
    }, 5000);
    void async () => {
      try {
        {
          await server?.close({ reason: isRestart ? "gateway restarting" : "gateway stopping", restartExpectedMs: isRestart ? 1500 : null });
        }
      }
      catch (err) {
        {
          gatewayLog.error("shutdown error: ");
        }
      }
      finally {
        {
          clearTimeout(forceExitTimer);
          server = null;
          if (isRestart) {
            shuttingDown = false;
            restartResolver?.();
          } else {
            cleanupSignals();
            params.runtime.exit(0);
          }
        }
      }
    }();
  };
  const onSigterm = () => {
    gatewayLog.info("signal SIGTERM received");
    request("stop", "SIGTERM");
  };
  const onSigint = () => {
    gatewayLog.info("signal SIGINT received");
    request("stop", "SIGINT");
  };
  const onSigusr1 = () => {
    gatewayLog.info("signal SIGUSR1 received");
    const authorized = consumeGatewaySigusr1RestartAuthorization();
    if ((!authorized && !isGatewaySigusr1RestartExternallyAllowed())) {
      gatewayLog.warn("SIGUSR1 restart ignored (not authorized; enable commands.restart or use gateway tool).");
      return;
    }
    request("restart", "SIGUSR1");
  };
  process.on("SIGTERM", onSigterm);
  process.on("SIGINT", onSigint);
  process.on("SIGUSR1", onSigusr1);
  try {
    {
      while (true) {
        server = await params.start();
        await new Promise((resolve) => {
          restartResolver = resolve;
        });
      }
    }
  }
  finally {
    {
      await lock?.release();
      cleanupSignals();
    }
  }
}

