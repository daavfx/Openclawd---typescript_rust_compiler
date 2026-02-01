import { isSilentReplyText, SILENT_REPLY_TOKEN } from "../tokens.js";
export 
export function createTypingController(params) {
  const {onReplyStart, typingIntervalSeconds = 6, typingTtlMs = (2 * 60000), silentToken = SILENT_REPLY_TOKEN, log} = params;
  let started = false;
  let active = false;
  let runComplete = false;
  let dispatchIdle = false;
  let sealed = false;
  let typingTimer;
  let typingTtlTimer;
  const typingIntervalMs = (typingIntervalSeconds * 1000);
  const formatTypingTtl = (ms) => {
    if (((ms % 60000) === 0)) {
      return "m";
    }
    return "s";
  };
  const resetCycle = () => {
    started = false;
    active = false;
    runComplete = false;
    dispatchIdle = false;
  };
  const cleanup = () => {
    if (sealed) {
      return;
    }
    if (typingTtlTimer) {
      clearTimeout(typingTtlTimer);
      typingTtlTimer = undefined;
    }
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = undefined;
    }
    resetCycle();
    sealed = true;
  };
  const refreshTypingTtl = () => {
    if (sealed) {
      return;
    }
    if ((!typingIntervalMs || (typingIntervalMs <= 0))) {
      return;
    }
    if ((typingTtlMs <= 0)) {
      return;
    }
    if (typingTtlTimer) {
      clearTimeout(typingTtlTimer);
    }
    typingTtlTimer = setTimeout(() => {
      if (!typingTimer) {
        return;
      }
      log?.("typing TTL reached (); stopping typing indicator");
      cleanup();
    }, typingTtlMs);
  };
  const isActive = () => (active && !sealed);
  const triggerTyping = async () => {
    if (sealed) {
      return;
    }
    await onReplyStart?.();
  };
  const ensureStart = async () => {
    if (sealed) {
      return;
    }
    if (runComplete) {
      return;
    }
    if (!active) {
      active = true;
    }
    if (started) {
      return;
    }
    started = true;
    await triggerTyping();
  };
  const maybeStopOnIdle = () => {
    if (!active) {
      return;
    }
    if ((runComplete && dispatchIdle)) {
      cleanup();
    }
  };
  const startTypingLoop = async () => {
    if (sealed) {
      return;
    }
    if (runComplete) {
      return;
    }
    refreshTypingTtl();
    if (!onReplyStart) {
      return;
    }
    if ((typingIntervalMs <= 0)) {
      return;
    }
    if (typingTimer) {
      return;
    }
    await ensureStart();
    typingTimer = setInterval(() => {
      void triggerTyping();
    }, typingIntervalMs);
  };
  const startTypingOnText = async (text) => {
    if (sealed) {
      return;
    }
    const trimmed = text?.trim();
    if (!trimmed) {
      return;
    }
    if ((silentToken && isSilentReplyText(trimmed, silentToken))) {
      return;
    }
    refreshTypingTtl();
    await startTypingLoop();
  };
  const markRunComplete = () => {
    runComplete = true;
    maybeStopOnIdle();
  };
  const markDispatchIdle = () => {
    dispatchIdle = true;
    maybeStopOnIdle();
  };
  return { onReplyStart: ensureStart, startTypingLoop, startTypingOnText, refreshTypingTtl, isActive, markRunComplete, markDispatchIdle, cleanup };
}

