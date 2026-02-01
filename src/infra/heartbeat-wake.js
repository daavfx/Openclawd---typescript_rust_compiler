export 
export 
let handler = null;
let pendingReason = null;
let scheduled = false;
let running = false;
let timer = null;
const DEFAULT_COALESCE_MS = 250;
const DEFAULT_RETRY_MS = 1000;
function schedule(coalesceMs) {
  if (timer) {
    return;
  }
  timer = setTimeout(async () => {
    timer = null;
    scheduled = false;
    const active = handler;
    if (!active) {
      return;
    }
    if (running) {
      scheduled = true;
      schedule(coalesceMs);
      return;
    }
    const reason = pendingReason;
    pendingReason = null;
    running = true;
    try {
      {
        const res = await active({ reason: (reason ?? undefined) });
        if (((res.status === "skipped") && (res.reason === "requests-in-flight"))) {
          pendingReason = (reason ?? "retry");
          schedule(DEFAULT_RETRY_MS);
        }
      }
    }
    catch {
      {
        pendingReason = (reason ?? "retry");
        schedule(DEFAULT_RETRY_MS);
      }
    }
    finally {
      {
        running = false;
        if ((pendingReason || scheduled)) {
          schedule(coalesceMs);
        }
      }
    }
  }, coalesceMs);
  timer.unref?.();
}
export function setHeartbeatWakeHandler(next) {
  handler = next;
  if ((handler && pendingReason)) {
    schedule(DEFAULT_COALESCE_MS);
  }
}

export function requestHeartbeatNow(opts) {
  pendingReason = ((opts?.reason ?? pendingReason) ?? "requested");
  schedule((opts?.coalesceMs ?? DEFAULT_COALESCE_MS));
}

export function hasHeartbeatWakeHandler() {
  return (handler !== null);
}

export function hasPendingHeartbeatWake() {
  return (((pendingReason !== null) || Boolean(timer)) || scheduled);
}

