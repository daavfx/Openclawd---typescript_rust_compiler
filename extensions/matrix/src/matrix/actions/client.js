import { getMatrixRuntime } from "../../runtime.js";
import { getActiveMatrixClient } from "../active-client.js";
import { createMatrixClient, isBunRuntime, resolveMatrixAuth, resolveSharedMatrixClient } from "../client.js";
export function ensureNodeRuntime() {
  if (isBunRuntime()) {
    throw new Error("Matrix support requires Node (bun runtime not supported)");
  }
}

export async function resolveActionClient(opts = {  }) {
  ensureNodeRuntime();
  if (opts.client) {
    return { client: opts.client, stopOnDone: false };
  }
  const active = getActiveMatrixClient();
  if (active) {
    return { client: active, stopOnDone: false };
  }
  const shouldShareClient = Boolean(process.env.OPENCLAW_GATEWAY_PORT);
  if (shouldShareClient) {
    const client = await resolveSharedMatrixClient({ cfg: getMatrixRuntime().config.loadConfig(), timeoutMs: opts.timeoutMs });
    return { client, stopOnDone: false };
  }
  const auth = await resolveMatrixAuth({ cfg: getMatrixRuntime().config.loadConfig() });
  const client = await createMatrixClient({ homeserver: auth.homeserver, userId: auth.userId, accessToken: auth.accessToken, encryption: auth.encryption, localTimeoutMs: opts.timeoutMs });
  if ((auth.encryption && client.crypto)) {
    try {
      {
        const joinedRooms = await client.getJoinedRooms();
        await client.crypto.prepare(joinedRooms);
      }
    }
    catch {
      {
      }
    }
  }
  await client.start();
  return { client, stopOnDone: true };
}

