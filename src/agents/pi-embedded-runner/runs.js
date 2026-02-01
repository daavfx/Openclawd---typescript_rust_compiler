import { diagnosticLogger as diag, logMessageQueued, logSessionStateChange } from "../../logging/diagnostic.js";
const ACTIVE_EMBEDDED_RUNS = new Map();
const EMBEDDED_RUN_WAITERS = new Map();
export function queueEmbeddedPiMessage(sessionId, text) {
  const handle = ACTIVE_EMBEDDED_RUNS.get(sessionId);
  if (!handle) {
    diag.debug("queue message failed: sessionId= reason=no_active_run");
    return false;
  }
  if (!handle.isStreaming()) {
    diag.debug("queue message failed: sessionId= reason=not_streaming");
    return false;
  }
  if (handle.isCompacting()) {
    diag.debug("queue message failed: sessionId= reason=compacting");
    return false;
  }
  logMessageQueued({ sessionId, source: "pi-embedded-runner" });
  void handle.queueMessage(text);
  return true;
}

export function abortEmbeddedPiRun(sessionId) {
  const handle = ACTIVE_EMBEDDED_RUNS.get(sessionId);
  if (!handle) {
    diag.debug("abort failed: sessionId= reason=no_active_run");
    return false;
  }
  diag.debug("aborting run: sessionId=");
  handle.abort();
  return true;
}

export function isEmbeddedPiRunActive(sessionId) {
  const active = ACTIVE_EMBEDDED_RUNS.has(sessionId);
  if (active) {
    diag.debug("run active check: sessionId= active=true");
  }
  return active;
}

export function isEmbeddedPiRunStreaming(sessionId) {
  const handle = ACTIVE_EMBEDDED_RUNS.get(sessionId);
  if (!handle) {
    return false;
  }
  return handle.isStreaming();
}

export function waitForEmbeddedPiRunEnd(sessionId, timeoutMs = 15000) {
  if ((!sessionId || !ACTIVE_EMBEDDED_RUNS.has(sessionId))) {
    return Promise.resolve(true);
  }
  diag.debug("waiting for run end: sessionId= timeoutMs=");
  return new Promise((resolve) => {
    const waiters = (EMBEDDED_RUN_WAITERS.get(sessionId) ?? new Set());
    const waiter = { resolve, timer: setTimeout(() => {
      waiters.delete(waiter);
      if ((waiters.size === 0)) {
        EMBEDDED_RUN_WAITERS.delete(sessionId);
      }
      diag.warn("wait timeout: sessionId= timeoutMs=");
      resolve(false);
    }, Math.max(100, timeoutMs)) };
    waiters.add(waiter);
    EMBEDDED_RUN_WAITERS.set(sessionId, waiters);
    if (!ACTIVE_EMBEDDED_RUNS.has(sessionId)) {
      waiters.delete(waiter);
      if ((waiters.size === 0)) {
        EMBEDDED_RUN_WAITERS.delete(sessionId);
      }
      clearTimeout(waiter.timer);
      resolve(true);
    }
  });
}

function notifyEmbeddedRunEnded(sessionId) {
  const waiters = EMBEDDED_RUN_WAITERS.get(sessionId);
  if ((!waiters || (waiters.size === 0))) {
    return;
  }
  EMBEDDED_RUN_WAITERS.delete(sessionId);
  diag.debug("notifying waiters: sessionId= waiterCount=");
  for (const waiter of waiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(true);
  }
}
export function setActiveEmbeddedRun(sessionId, handle) {
  const wasActive = ACTIVE_EMBEDDED_RUNS.has(sessionId);
  ACTIVE_EMBEDDED_RUNS.set(sessionId, handle);
  logSessionStateChange({ sessionId, state: "processing", reason: wasActive ? "run_replaced" : "run_started" });
  if (!sessionId.startsWith("probe-")) {
    diag.debug("run registered: sessionId= totalActive=");
  }
}

export function clearActiveEmbeddedRun(sessionId, handle) {
  if ((ACTIVE_EMBEDDED_RUNS.get(sessionId) === handle)) {
    ACTIVE_EMBEDDED_RUNS.delete(sessionId);
    logSessionStateChange({ sessionId, state: "idle", reason: "run_completed" });
    if (!sessionId.startsWith("probe-")) {
      diag.debug("run cleared: sessionId= totalActive=");
    }
    notifyEmbeddedRunEnded(sessionId);
  } else {
    diag.debug("run clear skipped: sessionId= reason=handle_mismatch");
  }
}

