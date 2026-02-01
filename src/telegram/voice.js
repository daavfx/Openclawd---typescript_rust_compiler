import { isVoiceCompatibleAudio } from "../media/audio.js";
export function isTelegramVoiceCompatible(opts) {
  return isVoiceCompatibleAudio(opts);
}

export function resolveTelegramVoiceDecision(opts) {
  if (!opts.wantsVoice) {
    return { useVoice: false };
  }
  if (isTelegramVoiceCompatible(opts)) {
    return { useVoice: true };
  }
  const contentType = (opts.contentType ?? "unknown");
  const fileName = (opts.fileName ?? "unknown");
  return { useVoice: false, reason: "media is  ()" };
}

export function resolveTelegramVoiceSend(opts) {
  const decision = resolveTelegramVoiceDecision(opts);
  if ((decision.reason && opts.logFallback)) {
    opts.logFallback("Telegram voice requested but ; sending as audio file instead.");
  }
  return { useVoice: decision.useVoice };
}

