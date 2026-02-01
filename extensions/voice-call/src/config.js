import { z } from "zod";
export const E164Schema = z.string().regex(/^\+[1-9]\d{1,14}$/, "Expected E.164 format, e.g. +15550001234")
export const InboundPolicySchema = z.enum(["disabled", "allowlist", "pairing", "open"])
export 
export const TelnyxConfigSchema = z.object({ apiKey: z.string().min(1).optional(), connectionId: z.string().min(1).optional(), publicKey: z.string().min(1).optional() }).strict()
export 
export const TwilioConfigSchema = z.object({ accountSid: z.string().min(1).optional(), authToken: z.string().min(1).optional() }).strict()
export 
export const PlivoConfigSchema = z.object({ authId: z.string().min(1).optional(), authToken: z.string().min(1).optional() }).strict()
export 
export const SttConfigSchema = z.object({ provider: z.literal("openai").default("openai"), model: z.string().min(1).default("whisper-1") }).strict().default({ provider: "openai", model: "whisper-1" })
export 
export const TtsProviderSchema = z.enum(["openai", "elevenlabs", "edge"])
export const TtsModeSchema = z.enum(["final", "all"])
export const TtsAutoSchema = z.enum(["off", "always", "inbound", "tagged"])
export const TtsConfigSchema = z.object({ auto: TtsAutoSchema.optional(), enabled: z.boolean().optional(), mode: TtsModeSchema.optional(), provider: TtsProviderSchema.optional(), summaryModel: z.string().optional(), modelOverrides: z.object({ enabled: z.boolean().optional(), allowText: z.boolean().optional(), allowProvider: z.boolean().optional(), allowVoice: z.boolean().optional(), allowModelId: z.boolean().optional(), allowVoiceSettings: z.boolean().optional(), allowNormalization: z.boolean().optional(), allowSeed: z.boolean().optional() }).strict().optional(), elevenlabs: z.object({ apiKey: z.string().optional(), baseUrl: z.string().optional(), voiceId: z.string().optional(), modelId: z.string().optional(), seed: z.number().int().min(0).max(4294967295).optional(), applyTextNormalization: z.enum(["auto", "on", "off"]).optional(), languageCode: z.string().optional(), voiceSettings: z.object({ stability: z.number().min(0).max(1).optional(), similarityBoost: z.number().min(0).max(1).optional(), style: z.number().min(0).max(1).optional(), useSpeakerBoost: z.boolean().optional(), speed: z.number().min(0.5).max(2).optional() }).strict().optional() }).strict().optional(), openai: z.object({ apiKey: z.string().optional(), model: z.string().optional(), voice: z.string().optional() }).strict().optional(), edge: z.object({ enabled: z.boolean().optional(), voice: z.string().optional(), lang: z.string().optional(), outputFormat: z.string().optional(), pitch: z.string().optional(), rate: z.string().optional(), volume: z.string().optional(), saveSubtitles: z.boolean().optional(), proxy: z.string().optional(), timeoutMs: z.number().int().min(1000).max(120000).optional() }).strict().optional(), prefsPath: z.string().optional(), maxTextLength: z.number().int().min(1).optional(), timeoutMs: z.number().int().min(1000).max(120000).optional() }).strict().optional()
export 
export const VoiceCallServeConfigSchema = z.object({ port: z.number().int().positive().default(3334), bind: z.string().default("127.0.0.1"), path: z.string().min(1).default("/voice/webhook") }).strict().default({ port: 3334, bind: "127.0.0.1", path: "/voice/webhook" })
export 
export const VoiceCallTailscaleConfigSchema = z.object({ mode: z.enum(["off", "serve", "funnel"]).default("off"), path: z.string().min(1).default("/voice/webhook") }).strict().default({ mode: "off", path: "/voice/webhook" })
export 
export const VoiceCallTunnelConfigSchema = z.object({ provider: z.enum(["none", "ngrok", "tailscale-serve", "tailscale-funnel"]).default("none"), ngrokAuthToken: z.string().min(1).optional(), ngrokDomain: z.string().min(1).optional(), allowNgrokFreeTierLoopbackBypass: z.boolean().default(false), allowNgrokFreeTier: z.boolean().optional() }).strict().default({ provider: "none", allowNgrokFreeTierLoopbackBypass: false })
export 
export const CallModeSchema = z.enum(["notify", "conversation"])
export 
export const OutboundConfigSchema = z.object({ defaultMode: CallModeSchema.default("notify"), notifyHangupDelaySec: z.number().int().nonnegative().default(3) }).strict().default({ defaultMode: "notify", notifyHangupDelaySec: 3 })
export 
export const VoiceCallStreamingConfigSchema = z.object({ enabled: z.boolean().default(false), sttProvider: z.enum(["openai-realtime"]).default("openai-realtime"), openaiApiKey: z.string().min(1).optional(), sttModel: z.string().min(1).default("gpt-4o-transcribe"), silenceDurationMs: z.number().int().positive().default(800), vadThreshold: z.number().min(0).max(1).default(0.5), streamPath: z.string().min(1).default("/voice/stream") }).strict().default({ enabled: false, sttProvider: "openai-realtime", sttModel: "gpt-4o-transcribe", silenceDurationMs: 800, vadThreshold: 0.5, streamPath: "/voice/stream" })
export 
export const VoiceCallConfigSchema = z.object({ enabled: z.boolean().default(false), provider: z.enum(["telnyx", "twilio", "plivo", "mock"]).optional(), telnyx: TelnyxConfigSchema.optional(), twilio: TwilioConfigSchema.optional(), plivo: PlivoConfigSchema.optional(), fromNumber: E164Schema.optional(), toNumber: E164Schema.optional(), inboundPolicy: InboundPolicySchema.default("disabled"), allowFrom: z.array(E164Schema).default([]), inboundGreeting: z.string().optional(), outbound: OutboundConfigSchema, maxDurationSeconds: z.number().int().positive().default(300), silenceTimeoutMs: z.number().int().positive().default(800), transcriptTimeoutMs: z.number().int().positive().default(180000), ringTimeoutMs: z.number().int().positive().default(30000), maxConcurrentCalls: z.number().int().positive().default(1), serve: VoiceCallServeConfigSchema, tailscale: VoiceCallTailscaleConfigSchema, tunnel: VoiceCallTunnelConfigSchema, streaming: VoiceCallStreamingConfigSchema, publicUrl: z.string().url().optional(), skipSignatureVerification: z.boolean().default(false), stt: SttConfigSchema, tts: TtsConfigSchema, store: z.string().optional(), responseModel: z.string().default("openai/gpt-4o-mini"), responseSystemPrompt: z.string().optional(), responseTimeoutMs: z.number().int().positive().default(30000) }).strict()
export 
export function resolveVoiceCallConfig(config) {
  const resolved = JSON.parse(JSON.stringify(config));
  if ((resolved.provider === "telnyx")) {
    resolved.telnyx = (resolved.telnyx ?? {  });
    resolved.telnyx.apiKey = (resolved.telnyx.apiKey ?? process.env.TELNYX_API_KEY);
    resolved.telnyx.connectionId = (resolved.telnyx.connectionId ?? process.env.TELNYX_CONNECTION_ID);
    resolved.telnyx.publicKey = (resolved.telnyx.publicKey ?? process.env.TELNYX_PUBLIC_KEY);
  }
  if ((resolved.provider === "twilio")) {
    resolved.twilio = (resolved.twilio ?? {  });
    resolved.twilio.accountSid = (resolved.twilio.accountSid ?? process.env.TWILIO_ACCOUNT_SID);
    resolved.twilio.authToken = (resolved.twilio.authToken ?? process.env.TWILIO_AUTH_TOKEN);
  }
  if ((resolved.provider === "plivo")) {
    resolved.plivo = (resolved.plivo ?? {  });
    resolved.plivo.authId = (resolved.plivo.authId ?? process.env.PLIVO_AUTH_ID);
    resolved.plivo.authToken = (resolved.plivo.authToken ?? process.env.PLIVO_AUTH_TOKEN);
  }
  resolved.tunnel = (resolved.tunnel ?? { provider: "none", allowNgrokFreeTierLoopbackBypass: false });
  resolved.tunnel.allowNgrokFreeTierLoopbackBypass = ((resolved.tunnel.allowNgrokFreeTierLoopbackBypass || resolved.tunnel.allowNgrokFreeTier) || false);
  resolved.tunnel.ngrokAuthToken = (resolved.tunnel.ngrokAuthToken ?? process.env.NGROK_AUTHTOKEN);
  resolved.tunnel.ngrokDomain = (resolved.tunnel.ngrokDomain ?? process.env.NGROK_DOMAIN);
  return resolved;
}

export function validateProviderConfig(config) {
  const errors = [];
  if (!config.enabled) {
    return { valid: true, errors: [] };
  }
  if (!config.provider) {
    errors.push("plugins.entries.voice-call.config.provider is required");
  }
  if ((!config.fromNumber && (config.provider !== "mock"))) {
    errors.push("plugins.entries.voice-call.config.fromNumber is required");
  }
  if ((config.provider === "telnyx")) {
    if (!config.telnyx?.apiKey) {
      errors.push("plugins.entries.voice-call.config.telnyx.apiKey is required (or set TELNYX_API_KEY env)");
    }
    if (!config.telnyx?.connectionId) {
      errors.push("plugins.entries.voice-call.config.telnyx.connectionId is required (or set TELNYX_CONNECTION_ID env)");
    }
  }
  if ((config.provider === "twilio")) {
    if (!config.twilio?.accountSid) {
      errors.push("plugins.entries.voice-call.config.twilio.accountSid is required (or set TWILIO_ACCOUNT_SID env)");
    }
    if (!config.twilio?.authToken) {
      errors.push("plugins.entries.voice-call.config.twilio.authToken is required (or set TWILIO_AUTH_TOKEN env)");
    }
  }
  if ((config.provider === "plivo")) {
    if (!config.plivo?.authId) {
      errors.push("plugins.entries.voice-call.config.plivo.authId is required (or set PLIVO_AUTH_ID env)");
    }
    if (!config.plivo?.authToken) {
      errors.push("plugins.entries.voice-call.config.plivo.authToken is required (or set PLIVO_AUTH_TOKEN env)");
    }
  }
  return { valid: (errors.length === 0), errors };
}

