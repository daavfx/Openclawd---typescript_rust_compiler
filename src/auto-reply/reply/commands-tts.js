import { logVerbose } from "../../globals.js";
import { getLastTtsAttempt, getTtsMaxLength, getTtsProvider, isSummarizationEnabled, isTtsEnabled, isTtsProviderConfigured, resolveTtsApiKey, resolveTtsConfig, resolveTtsPrefsPath, setLastTtsAttempt, setSummarizationEnabled, setTtsEnabled, setTtsMaxLength, setTtsProvider, textToSpeech } from "../../tts/tts.js";
function parseTtsCommand(normalized) {
  if ((normalized === "/tts")) {
    return { action: "status", args: "" };
  }
  if (!normalized.startsWith("/tts ")) {
    return null;
  }
  const rest = normalized.slice(5).trim();
  if (!rest) {
    return { action: "status", args: "" };
  }
  const [action, ...tail] = rest.split(/\s+/);
  return { action: action.toLowerCase(), args: tail.join(" ").trim() };
}
function ttsUsage() {
  return { text: (((((((((((((((((((("🔊 **TTS (Text-to-Speech) Help**

" + "**Commands:**
") + "• /tts on — Enable automatic TTS for replies
") + "• /tts off — Disable TTS
") + "• /tts status — Show current settings
") + "• /tts provider [name] — View/change provider
") + "• /tts limit [number] — View/change text limit
") + "• /tts summary [on|off] — View/change auto-summary
") + "• /tts audio <text> — Generate audio from text

") + "**Providers:**
") + "• edge — Free, fast (default)
") + "• openai — High quality (requires API key)
") + "• elevenlabs — Premium voices (requires API key)

") + "**Text Limit (default: 1500, max: 4096):**
") + "When text exceeds the limit:
") + "• Summary ON: AI summarizes, then generates audio
") + "• Summary OFF: Truncates text, then generates audio

") + "**Examples:**
") + "/tts provider edge
") + "/tts limit 2000
") + "/tts audio Hello, this is a test!") };
}
export const handleTtsCommands = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const parsed = parseTtsCommand(params.command.commandBodyNormalized);
  if (!parsed) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    logVerbose("Ignoring TTS command from unauthorized sender: ");
    return { shouldContinue: false };
  }
  const config = resolveTtsConfig(params.cfg);
  const prefsPath = resolveTtsPrefsPath(config);
  const action = parsed.action;
  const args = parsed.args;
  if ((action === "help")) {
    return { shouldContinue: false, reply: ttsUsage() };
  }
  if ((action === "on")) {
    setTtsEnabled(prefsPath, true);
    return { shouldContinue: false, reply: { text: "🔊 TTS enabled." } };
  }
  if ((action === "off")) {
    setTtsEnabled(prefsPath, false);
    return { shouldContinue: false, reply: { text: "🔇 TTS disabled." } };
  }
  if ((action === "audio")) {
    if (!args.trim()) {
      return { shouldContinue: false, reply: { text: (("🎤 Generate audio from text.

" + "Usage: /tts audio <text>
") + "Example: /tts audio Hello, this is a test!") } };
    }
    const start = Date.now();
    const result = await textToSpeech({ text: args, cfg: params.cfg, channel: params.command.channel, prefsPath });
    if ((result.success && result.audioPath)) {
      setLastTtsAttempt({ timestamp: Date.now(), success: true, textLength: args.length, summarized: false, provider: result.provider, latencyMs: result.latencyMs });
      const payload = { mediaUrl: result.audioPath, audioAsVoice: (result.voiceCompatible === true) };
      return { shouldContinue: false, reply: payload };
    }
    setLastTtsAttempt({ timestamp: Date.now(), success: false, textLength: args.length, summarized: false, error: result.error, latencyMs: (Date.now() - start) });
    return { shouldContinue: false, reply: { text: "❌ Error generating audio: " } };
  }
  if ((action === "provider")) {
    const currentProvider = getTtsProvider(config, prefsPath);
    if (!args.trim()) {
      const hasOpenAI = Boolean(resolveTtsApiKey(config, "openai"));
      const hasElevenLabs = Boolean(resolveTtsApiKey(config, "elevenlabs"));
      const hasEdge = isTtsProviderConfigured(config, "edge");
      return { shouldContinue: false, reply: { text: ((((("🎙️ TTS provider
" + "Primary: 
") + "OpenAI key: 
") + "ElevenLabs key: 
") + "Edge enabled: 
") + "Usage: /tts provider openai | elevenlabs | edge") } };
    }
    const requested = args.trim().toLowerCase();
    if ((((requested !== "openai") && (requested !== "elevenlabs")) && (requested !== "edge"))) {
      return { shouldContinue: false, reply: ttsUsage() };
    }
    setTtsProvider(prefsPath, requested);
    return { shouldContinue: false, reply: { text: "✅ TTS provider set to ." } };
  }
  if ((action === "limit")) {
    if (!args.trim()) {
      const currentLimit = getTtsMaxLength(prefsPath);
      return { shouldContinue: false, reply: { text: (((("📏 TTS limit:  characters.

" + "Text longer than this triggers summary (if enabled).
") + "Range: 100-4096 chars (Telegram max).

") + "To change: /tts limit <number>
") + "Example: /tts limit 2000") } };
    }
    const next = Number.parseInt(args.trim(), 10);
    if (((!Number.isFinite(next) || (next < 100)) || (next > 4096))) {
      return { shouldContinue: false, reply: { text: "❌ Limit must be between 100 and 4096 characters." } };
    }
    setTtsMaxLength(prefsPath, next);
    return { shouldContinue: false, reply: { text: "✅ TTS limit set to  characters." } };
  }
  if ((action === "summary")) {
    if (!args.trim()) {
      const enabled = isSummarizationEnabled(prefsPath);
      const maxLen = getTtsMaxLength(prefsPath);
      return { shouldContinue: false, reply: { text: (((("📝 TTS auto-summary: .

" + "When text exceeds  chars:
") + "• ON: summarizes text, then generates audio
") + "• OFF: truncates text, then generates audio

") + "To change: /tts summary on | off") } };
    }
    const requested = args.trim().toLowerCase();
    if (((requested !== "on") && (requested !== "off"))) {
      return { shouldContinue: false, reply: ttsUsage() };
    }
    setSummarizationEnabled(prefsPath, (requested === "on"));
    return { shouldContinue: false, reply: { text: (requested === "on") ? "✅ TTS auto-summary enabled." : "❌ TTS auto-summary disabled." } };
  }
  if ((action === "status")) {
    const enabled = isTtsEnabled(config, prefsPath);
    const provider = getTtsProvider(config, prefsPath);
    const hasKey = isTtsProviderConfigured(config, provider);
    const maxLength = getTtsMaxLength(prefsPath);
    const summarize = isSummarizationEnabled(prefsPath);
    const last = getLastTtsAttempt();
    const lines = ["📊 TTS status", "State: ", "Provider:  ()", "Text limit:  chars", "Auto-summary: "];
    if (last) {
      const timeAgo = Math.round(((Date.now() - last.timestamp) / 1000));
      lines.push("");
      lines.push("Last attempt (s ago): ");
      lines.push("Text:  chars");
      if (last.success) {
        lines.push("Provider: ");
        lines.push("Latency: ms");
      } else {
        if (last.error) {
          lines.push("Error: ");
        }
      }
    }
    return { shouldContinue: false, reply: { text: lines.join("
") } };
  }
  return { shouldContinue: false, reply: ttsUsage() };
}
