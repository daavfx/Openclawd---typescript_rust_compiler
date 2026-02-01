import { disableTailscaleFunnel, disableTailscaleServe, enableTailscaleFunnel, enableTailscaleServe, getTailnetHostname } from "../infra/tailscale.js";
export async function startGatewayTailscaleExposure(params) {
  if ((params.tailscaleMode === "off")) {
    return null;
  }
  try {
    {
      if ((params.tailscaleMode === "serve")) {
        await enableTailscaleServe(params.port);
      } else {
        await enableTailscaleFunnel(params.port);
      }
      const host = await getTailnetHostname().catch(() => null);
      if (host) {
        const uiPath = params.controlUiBasePath ? "/" : "/";
        params.logTailscale.info(" enabled: https:// (WS via wss://)");
      } else {
        params.logTailscale.info(" enabled");
      }
    }
  }
  catch (err) {
    {
      params.logTailscale.warn(" failed: ");
    }
  }
  if (!params.resetOnExit) {
    return null;
  }
  return async () => {
    try {
      {
        if ((params.tailscaleMode === "serve")) {
          await disableTailscaleServe();
        } else {
          await disableTailscaleFunnel();
        }
      }
    }
    catch (err) {
      {
        params.logTailscale.warn(" cleanup failed: ");
      }
    }
  };
}

