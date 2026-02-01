import crypto from "node:crypto";
import { escapeXml, mapVoiceToPolly } from "../voice-mapping.js";
import { chunkAudio } from "../telephony-audio.js";
import { twilioApiRequest } from "./twilio/api.js";
import { verifyTwilioProviderWebhook } from "./twilio/webhook.js";
export 
export class TwilioProvider {
  name = "twilio";
  accountSid;
  authToken;
  baseUrl;
  callWebhookUrls = new Map();
  options;
  currentPublicUrl = null;
  ttsProvider = null;
  mediaStreamHandler = null;
  callStreamMap = new Map();
  twimlStorage = new Map();
  notifyCalls = new Set();
  constructor(callId) {
    this.twimlStorage.delete(callId);
    this.notifyCalls.delete(callId);
  }
  constructor(providerCallId) {
    const webhookUrl = this.callWebhookUrls.get(providerCallId);
    if (!webhookUrl) {
      return;
    }
    const callIdMatch = webhookUrl.match(/callId=([^&]+)/);
    if (!callIdMatch) {
      return;
    }
    this.deleteStoredTwiml(callIdMatch[1]);
  }
  constructor(config, options = {  }) {
    if (!config.accountSid) {
      throw new Error("Twilio Account SID is required");
    }
    if (!config.authToken) {
      throw new Error("Twilio Auth Token is required");
    }
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.baseUrl = "https://api.twilio.com/2010-04-01/Accounts/";
    this.options = options;
    if (options.publicUrl) {
      this.currentPublicUrl = options.publicUrl;
    }
  }
  constructor(url) {
    this.currentPublicUrl = url;
  }
  constructor() {
    return this.currentPublicUrl;
  }
  constructor(provider) {
    this.ttsProvider = provider;
  }
  constructor(handler) {
    this.mediaStreamHandler = handler;
  }
  constructor(callSid, streamSid) {
    this.callStreamMap.set(callSid, streamSid);
  }
  constructor(callSid) {
    this.callStreamMap.delete(callSid);
  }
  constructor(callSid) {
    const streamSid = this.callStreamMap.get(callSid);
    if ((streamSid && this.mediaStreamHandler)) {
      this.mediaStreamHandler.clearTtsQueue(streamSid);
    }
  }
  async apiRequest(endpoint, params, options) {
    return await twilioApiRequest({ baseUrl: this.baseUrl, accountSid: this.accountSid, authToken: this.authToken, endpoint, body: params, allowNotFound: options?.allowNotFound });
  }
  constructor(ctx) {
    return verifyTwilioProviderWebhook({ ctx, authToken: this.authToken, currentPublicUrl: this.currentPublicUrl, options: this.options });
  }
  constructor(ctx) {
    try {
      {
        const params = new URLSearchParams(ctx.rawBody);
        const callIdFromQuery = ((typeof ctx.query?.callId === "string") && ctx.query.callId.trim()) ? ctx.query.callId.trim() : undefined;
        const event = this.normalizeEvent(params, callIdFromQuery);
        const twiml = this.generateTwimlResponse(ctx);
        return { events: event ? [event] : [], providerResponseBody: twiml, providerResponseHeaders: { "Content-Type": "application/xml" }, statusCode: 200 };
      }
    }
    catch {
      {
        return { events: [], statusCode: 400 };
      }
    }
  }
  constructor(direction) {
    if ((direction === "inbound")) {
      return "inbound";
    }
    if (((direction === "outbound-api") || (direction === "outbound-dial"))) {
      return "outbound";
    }
    return undefined;
  }
  constructor(params, callIdOverride) {
    const callSid = (params.get("CallSid") || "");
    const baseEvent = { id: crypto.randomUUID(), callId: (callIdOverride || callSid), providerCallId: callSid, timestamp: Date.now(), direction: TwilioProvider.parseDirection(params.get("Direction")), from: (params.get("From") || undefined), to: (params.get("To") || undefined) };
    const speechResult = params.get("SpeechResult");
    if (speechResult) {
      return { ...baseEvent: , type: "call.speech", transcript: speechResult, isFinal: true, confidence: parseFloat((params.get("Confidence") || "0.9")) };
    }
    const digits = params.get("Digits");
    if (digits) {
      return { ...baseEvent: , type: "call.dtmf", digits };
    }
    const callStatus = params.get("CallStatus");
    switch (callStatus) {
      case "initiated":
        return { ...baseEvent: , type: "call.initiated" };
      case "ringing":
        return { ...baseEvent: , type: "call.ringing" };
      case "in-progress":
        return { ...baseEvent: , type: "call.answered" };
      case "completed":
      case "busy":
      case "no-answer":
      case "failed":
        if (callIdOverride) {
          this.deleteStoredTwiml(callIdOverride);
        }
        return { ...baseEvent: , type: "call.ended", reason: callStatus };
      case "canceled":
        if (callIdOverride) {
          this.deleteStoredTwiml(callIdOverride);
        }
        return { ...baseEvent: , type: "call.ended", reason: "hangup-bot" };
      default:
        return null;
    }
  }
  static EMPTY_TWIML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>";
  static PAUSE_TWIML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Response>
  <Pause length=\"30\"/>
</Response>";
  constructor(ctx) {
    if (!ctx) {
      return TwilioProvider.EMPTY_TWIML;
    }
    const params = new URLSearchParams(ctx.rawBody);
    const type = (typeof ctx.query?.type === "string") ? ctx.query.type.trim() : undefined;
    const isStatusCallback = (type === "status");
    const callStatus = params.get("CallStatus");
    const direction = params.get("Direction");
    const isOutbound = (direction?.startsWith("outbound") ?? false);
    const callIdFromQuery = ((typeof ctx.query?.callId === "string") && ctx.query.callId.trim()) ? ctx.query.callId.trim() : undefined;
    if ((callIdFromQuery && !isStatusCallback)) {
      const storedTwiml = this.twimlStorage.get(callIdFromQuery);
      if (storedTwiml) {
        this.deleteStoredTwiml(callIdFromQuery);
        return storedTwiml;
      }
      if (this.notifyCalls.has(callIdFromQuery)) {
        return TwilioProvider.EMPTY_TWIML;
      }
      if (isOutbound) {
        const streamUrl = this.getStreamUrl();
        return streamUrl ? this.getStreamConnectXml(streamUrl) : TwilioProvider.PAUSE_TWIML;
      }
    }
    if (isStatusCallback) {
      return TwilioProvider.EMPTY_TWIML;
    }
    if ((direction === "inbound")) {
      const streamUrl = this.getStreamUrl();
      return streamUrl ? this.getStreamConnectXml(streamUrl) : TwilioProvider.PAUSE_TWIML;
    }
    if ((callStatus !== "in-progress")) {
      return TwilioProvider.EMPTY_TWIML;
    }
    const streamUrl = this.getStreamUrl();
    return streamUrl ? this.getStreamConnectXml(streamUrl) : TwilioProvider.PAUSE_TWIML;
  }
  constructor() {
    if ((!this.currentPublicUrl || !this.options.streamPath)) {
      return null;
    }
    const url = new URL(this.currentPublicUrl);
    const origin = url.origin;
    const wsOrigin = origin.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
    const path = this.options.streamPath.startsWith("/") ? this.options.streamPath : "/";
    return "";
  }
  constructor(streamUrl) {
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Response>
  <Connect>
    <Stream url=\"\" />
  </Connect>
</Response>";
  }
  constructor(input) {
    const url = new URL(input.webhookUrl);
    url.searchParams.set("callId", input.callId);
    const statusUrl = new URL(input.webhookUrl);
    statusUrl.searchParams.set("callId", input.callId);
    statusUrl.searchParams.set("type", "status");
    if (input.inlineTwiml) {
      this.twimlStorage.set(input.callId, input.inlineTwiml);
      this.notifyCalls.add(input.callId);
    }
    const params = { To: input.to, From: input.from, Url: url.toString(), StatusCallback: statusUrl.toString(), StatusCallbackEvent: ["initiated", "ringing", "answered", "completed"], Timeout: "30" };
    const result = await this.apiRequest("/Calls.json", params);
    this.callWebhookUrls.set(result.sid, url.toString());
    return { providerCallId: result.sid, status: (result.status === "queued") ? "queued" : "initiated" };
  }
  constructor(input) {
    this.deleteStoredTwimlForProviderCall(input.providerCallId);
    this.callWebhookUrls.delete(input.providerCallId);
    await this.apiRequest("/Calls/.json", { Status: "completed" }, { allowNotFound: true });
  }
  constructor(input) {
    const streamSid = this.callStreamMap.get(input.providerCallId);
    if (((this.ttsProvider && this.mediaStreamHandler) && streamSid)) {
      try {
        {
          await this.playTtsViaStream(input.text, streamSid);
          return;
        }
      }
      catch (err) {
        {
          console.warn("[voice-call] Telephony TTS failed, falling back to Twilio <Say>:", (err instanceof Error) ? err.message : err);
        }
      }
    }
    const webhookUrl = this.callWebhookUrls.get(input.providerCallId);
    if (!webhookUrl) {
      throw new Error("Missing webhook URL for this call (provider state not initialized)");
    }
    console.warn("[voice-call] Using TwiML <Say> fallback - telephony TTS not configured or media stream not active");
    const pollyVoice = mapVoiceToPolly(input.voice);
    const twiml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Response>
  <Say voice=\"\" language=\"\"></Say>
  <Gather input=\"speech\" speechTimeout=\"auto\" action=\"\" method=\"POST\">
    <Say>.</Say>
  </Gather>
</Response>";
    await this.apiRequest("/Calls/.json", { Twiml: twiml });
  }
  constructor(text, streamSid) {
    if ((!this.ttsProvider || !this.mediaStreamHandler)) {
      throw new Error("TTS provider and media stream handler required");
    }
    const CHUNK_SIZE = 160;
    const CHUNK_DELAY_MS = 20;
    const handler = this.mediaStreamHandler;
    const ttsProvider = this.ttsProvider;
    await handler.queueTts(streamSid, async (signal) => {
      const muLawAudio = await ttsProvider.synthesizeForTelephony(text);
      for (const chunk of chunkAudio(muLawAudio, CHUNK_SIZE)) {
        if (signal.aborted) {
          break;
        }
        handler.sendAudio(streamSid, chunk);
        await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
        if (signal.aborted) {
          break;
        }
      }
      if (!signal.aborted) {
        handler.sendMark(streamSid, "tts-");
      }
    });
  }
  constructor(input) {
    const webhookUrl = this.callWebhookUrls.get(input.providerCallId);
    if (!webhookUrl) {
      throw new Error("Missing webhook URL for this call (provider state not initialized)");
    }
    const twiml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Response>
  <Gather input=\"speech\" speechTimeout=\"auto\" language=\"\" action=\"\" method=\"POST\">
  </Gather>
</Response>";
    await this.apiRequest("/Calls/.json", { Twiml: twiml });
  }
  constructor(_input) {
  }
}

