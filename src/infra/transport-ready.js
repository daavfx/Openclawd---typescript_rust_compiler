import { danger } from "../globals.js";
import { sleepWithAbort } from "./backoff.js";
export 
export 
export async function waitForTransportReady(params) {
  const started = Date.now();
  const timeoutMs = Math.max(0, params.timeoutMs);
  const deadline = (started + timeoutMs);
  const logAfterMs = Math.max(0, (params.logAfterMs ?? timeoutMs));
  const logIntervalMs = Math.max(1000, (params.logIntervalMs ?? 30000));
  const pollIntervalMs = Math.max(50, (params.pollIntervalMs ?? 150));
  let nextLogAt = (started + logAfterMs);
  let lastError = null;
  while (true) {
    if (params.abortSignal?.aborted) {
      return;
    }
    const res = await params.check();
    if (res.ok) {
      return;
    }
    lastError = (res.error ?? null);
    const now = Date.now();
    if ((now >= deadline)) {
      break;
    }
    if ((now >= nextLogAt)) {
      const elapsedMs = (now - started);
      params.runtime.error?.(danger(" not ready after ms ()"));
      nextLogAt = (now + logIntervalMs);
    }
    try {
      {
        await sleepWithAbort(pollIntervalMs, params.abortSignal);
      }
    }
    catch (err) {
      {
        if (params.abortSignal?.aborted) {
          return;
        }
        throw err;
      }
    }
  }
  params.runtime.error?.(danger(" not ready after ms ()"));
  throw new Error(" not ready ()");
}

