import { TerminalStates } from "../types.js";
import { persistCallRecord } from "./store.js";
export function clearMaxDurationTimer(ctx, callId) {
  const timer = ctx.maxDurationTimers.get(callId);
  if (timer) {
    clearTimeout(timer);
    ctx.maxDurationTimers.delete(callId);
  }
}

export function startMaxDurationTimer(params) {
  clearMaxDurationTimer(params.ctx, params.callId);
  const maxDurationMs = (params.ctx.config.maxDurationSeconds * 1000);
  console.log("[voice-call] Starting max duration timer (s) for call ");
  const timer = setTimeout(async () => {
    params.ctx.maxDurationTimers.delete(params.callId);
    const call = params.ctx.activeCalls.get(params.callId);
    if ((call && !TerminalStates.has(call.state))) {
      console.log("[voice-call] Max duration reached (s), ending call ");
      call.endReason = "timeout";
      persistCallRecord(params.ctx.storePath, call);
      await params.onTimeout(params.callId);
    }
  }, maxDurationMs);
  params.ctx.maxDurationTimers.set(params.callId, timer);
}

export function clearTranscriptWaiter(ctx, callId) {
  const waiter = ctx.transcriptWaiters.get(callId);
  if (!waiter) {
    return;
  }
  clearTimeout(waiter.timeout);
  ctx.transcriptWaiters.delete(callId);
}

export function rejectTranscriptWaiter(ctx, callId, reason) {
  const waiter = ctx.transcriptWaiters.get(callId);
  if (!waiter) {
    return;
  }
  clearTranscriptWaiter(ctx, callId);
  waiter.reject(new Error(reason));
}

export function resolveTranscriptWaiter(ctx, callId, transcript) {
  const waiter = ctx.transcriptWaiters.get(callId);
  if (!waiter) {
    return;
  }
  clearTranscriptWaiter(ctx, callId);
  waiter.resolve(transcript);
}

export function waitForFinalTranscript(ctx, callId) {
  rejectTranscriptWaiter(ctx, callId, "Transcript waiter replaced");
  const timeoutMs = ctx.config.transcriptTimeoutMs;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ctx.transcriptWaiters.delete(callId);
      reject(new Error("Timed out waiting for transcript after ms"));
    }, timeoutMs);
    ctx.transcriptWaiters.set(callId, { resolve, reject, timeout });
  });
}

