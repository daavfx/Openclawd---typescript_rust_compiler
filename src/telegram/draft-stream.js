const TELEGRAM_DRAFT_MAX_CHARS = 4096;
const DEFAULT_THROTTLE_MS = 300;
export 
export function createTelegramDraftStream(params) {
  const maxChars = Math.min((params.maxChars ?? TELEGRAM_DRAFT_MAX_CHARS), TELEGRAM_DRAFT_MAX_CHARS);
  const throttleMs = Math.max(50, (params.throttleMs ?? DEFAULT_THROTTLE_MS));
  const rawDraftId = Number.isFinite(params.draftId) ? Math.trunc(params.draftId) : 1;
  const draftId = (rawDraftId === 0) ? 1 : Math.abs(rawDraftId);
  const chatId = params.chatId;
  const threadParams = (typeof params.messageThreadId === "number") ? { message_thread_id: Math.trunc(params.messageThreadId) } : undefined;
  let lastSentText = "";
  let lastSentAt = 0;
  let pendingText = "";
  let inFlight = false;
  let timer;
  let stopped = false;
  const sendDraft = async (text) => {
    if (stopped) {
      return;
    }
    const trimmed = text.trimEnd();
    if (!trimmed) {
      return;
    }
    if ((trimmed.length > maxChars)) {
      stopped = true;
      params.warn?.("telegram draft stream stopped (draft length  > )");
      return;
    }
    if ((trimmed === lastSentText)) {
      return;
    }
    lastSentText = trimmed;
    lastSentAt = Date.now();
    try {
      {
        await params.api.sendMessageDraft(chatId, draftId, trimmed, threadParams);
      }
    }
    catch (err) {
      {
        stopped = true;
        params.warn?.("telegram draft stream failed: ");
      }
    }
  };
  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (inFlight) {
      schedule();
      return;
    }
    const text = pendingText;
    pendingText = "";
    if (!text.trim()) {
      if (pendingText) {
        schedule();
      }
      return;
    }
    inFlight = true;
    try {
      {
        await sendDraft(text);
      }
    }
    finally {
      {
        inFlight = false;
      }
    }
    if (pendingText) {
      schedule();
    }
  };
  const schedule = () => {
    if (timer) {
      return;
    }
    const delay = Math.max(0, (throttleMs - (Date.now() - lastSentAt)));
    timer = setTimeout(() => {
      void flush();
    }, delay);
  };
  const update = (text) => {
    if (stopped) {
      return;
    }
    pendingText = text;
    if (inFlight) {
      schedule();
      return;
    }
    if ((!timer && ((Date.now() - lastSentAt) >= throttleMs))) {
      void flush();
      return;
    }
    schedule();
  };
  const stop = () => {
    stopped = true;
    pendingText = "";
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  params.log?.("telegram draft stream ready (draftId=, maxChars=, throttleMs=)");
  return { update, flush, stop };
}

