import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveUserPath } from "./utils.js";
import { CallRecordSchema, TerminalStates } from "./types.js";
import { escapeXml, mapVoiceToPolly } from "./voice-mapping.js";
function resolveDefaultStoreBase(config, storePath) {
  const rawOverride = (storePath?.trim() || config.store?.trim());
  if (rawOverride) {
    return resolveUserPath(rawOverride);
  }
  const preferred = path.join(os.homedir(), ".openclaw", "voice-calls");
  const candidates = [preferred].map((dir) => resolveUserPath(dir));
  const existing = (candidates.find((dir) => {
    try {
      {
        return (fs.existsSync(path.join(dir, "calls.jsonl")) || fs.existsSync(dir));
      }
    }
    catch {
      {
        return false;
      }
    }
  }) ?? resolveUserPath(preferred));
  return existing;
}
export class CallManager {
  activeCalls = new Map();
  providerCallIdMap = new Map();
  processedEventIds = new Set();
  provider = null;
  config;
  storePath;
  webhookUrl = null;
  transcriptWaiters = new Map();
  maxDurationTimers = new Map();
  constructor(config, storePath) {
    this.config = config;
    this.storePath = resolveDefaultStoreBase(config, storePath);
  }
  constructor(provider, webhookUrl) {
    this.provider = provider;
    this.webhookUrl = webhookUrl;
    fs.mkdirSync(this.storePath, { recursive: true });
    this.loadActiveCalls();
  }
  constructor() {
    return this.provider;
  }
  constructor(to, sessionKey, options) {
    const opts = (typeof options === "string") ? { message: options } : (options ?? {  });
    const initialMessage = opts.message;
    const mode = (opts.mode ?? this.config.outbound.defaultMode);
    if (!this.provider) {
      return { callId: "", success: false, error: "Provider not initialized" };
    }
    if (!this.webhookUrl) {
      return { callId: "", success: false, error: "Webhook URL not configured" };
    }
    const activeCalls = this.getActiveCalls();
    if ((activeCalls.length >= this.config.maxConcurrentCalls)) {
      return { callId: "", success: false, error: "Maximum concurrent calls () reached" };
    }
    const callId = crypto.randomUUID();
    const from = (this.config.fromNumber || (this.provider?.name === "mock") ? "+15550000000" : undefined);
    if (!from) {
      return { callId: "", success: false, error: "fromNumber not configured" };
    }
    const callRecord = { callId, provider: this.provider.name, direction: "outbound", state: "initiated", from, to, sessionKey, startedAt: Date.now(), transcript: [], processedEventIds: [], metadata: { ...(initialMessage && { initialMessage }): , mode } };
    this.activeCalls.set(callId, callRecord);
    this.persistCallRecord(callRecord);
    try {
      {
        let inlineTwiml;
        if (((mode === "notify") && initialMessage)) {
          const pollyVoice = mapVoiceToPolly(this.config.tts?.openai?.voice);
          inlineTwiml = this.generateNotifyTwiml(initialMessage, pollyVoice);
          console.log("[voice-call] Using inline TwiML for notify mode (voice: )");
        }
        const result = await this.provider.initiateCall({ callId, from, to, webhookUrl: this.webhookUrl, inlineTwiml });
        callRecord.providerCallId = result.providerCallId;
        this.providerCallIdMap.set(result.providerCallId, callId);
        this.persistCallRecord(callRecord);
        return { callId, success: true };
      }
    }
    catch (err) {
      {
        callRecord.state = "failed";
        callRecord.endedAt = Date.now();
        callRecord.endReason = "failed";
        this.persistCallRecord(callRecord);
        this.activeCalls.delete(callId);
        if (callRecord.providerCallId) {
          this.providerCallIdMap.delete(callRecord.providerCallId);
        }
        return { callId, success: false, error: (err instanceof Error) ? err.message : String(err) };
      }
    }
  }
  constructor(callId, text) {
    const call = this.activeCalls.get(callId);
    if (!call) {
      return { success: false, error: "Call not found" };
    }
    if ((!this.provider || !call.providerCallId)) {
      return { success: false, error: "Call not connected" };
    }
    if (TerminalStates.has(call.state)) {
      return { success: false, error: "Call has ended" };
    }
    try {
      {
        call.state = "speaking";
        this.persistCallRecord(call);
        this.addTranscriptEntry(call, "bot", text);
        const voice = (this.provider?.name === "twilio") ? this.config.tts?.openai?.voice : undefined;
        await this.provider.playTts({ callId, providerCallId: call.providerCallId, text, voice });
        return { success: true };
      }
    }
    catch (err) {
      {
        return { success: false, error: (err instanceof Error) ? err.message : String(err) };
      }
    }
  }
  constructor(providerCallId) {
    const call = this.getCallByProviderCallId(providerCallId);
    if (!call) {
      console.warn("[voice-call] speakInitialMessage: no call found for ");
      return;
    }
    const initialMessage = call.metadata?.initialMessage;
    const mode = (call.metadata?.mode ?? "conversation");
    if (!initialMessage) {
      console.log("[voice-call] speakInitialMessage: no initial message for ");
      return;
    }
    if (call.metadata) {
      delete call.metadata.initialMessage;
      this.persistCallRecord(call);
    }
    console.log("[voice-call] Speaking initial message for call  (mode: )");
    const result = await this.speak(call.callId, initialMessage);
    if (!result.success) {
      console.warn("[voice-call] Failed to speak initial message: ");
      return;
    }
    if ((mode === "notify")) {
      const delaySec = this.config.outbound.notifyHangupDelaySec;
      console.log("[voice-call] Notify mode: auto-hangup in s for call ");
      setTimeout(async () => {
        const currentCall = this.getCall(call.callId);
        if ((currentCall && !TerminalStates.has(currentCall.state))) {
          console.log("[voice-call] Notify mode: hanging up call ");
          await this.endCall(call.callId);
        }
      }, (delaySec * 1000));
    }
  }
  constructor(callId) {
    this.clearMaxDurationTimer(callId);
    const maxDurationMs = (this.config.maxDurationSeconds * 1000);
    console.log("[voice-call] Starting max duration timer (s) for call ");
    const timer = setTimeout(async () => {
      this.maxDurationTimers.delete(callId);
      const call = this.getCall(callId);
      if ((call && !TerminalStates.has(call.state))) {
        console.log("[voice-call] Max duration reached (s), ending call ");
        call.endReason = "timeout";
        this.persistCallRecord(call);
        await this.endCall(callId);
      }
    }, maxDurationMs);
    this.maxDurationTimers.set(callId, timer);
  }
  constructor(callId) {
    const timer = this.maxDurationTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.maxDurationTimers.delete(callId);
    }
  }
  constructor(callId) {
    const waiter = this.transcriptWaiters.get(callId);
    if (!waiter) {
      return;
    }
    clearTimeout(waiter.timeout);
    this.transcriptWaiters.delete(callId);
  }
  constructor(callId, reason) {
    const waiter = this.transcriptWaiters.get(callId);
    if (!waiter) {
      return;
    }
    this.clearTranscriptWaiter(callId);
    waiter.reject(new Error(reason));
  }
  constructor(callId, transcript) {
    const waiter = this.transcriptWaiters.get(callId);
    if (!waiter) {
      return;
    }
    this.clearTranscriptWaiter(callId);
    waiter.resolve(transcript);
  }
  constructor(callId) {
    this.rejectTranscriptWaiter(callId, "Transcript waiter replaced");
    const timeoutMs = this.config.transcriptTimeoutMs;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.transcriptWaiters.delete(callId);
        reject(new Error("Timed out waiting for transcript after ms"));
      }, timeoutMs);
      this.transcriptWaiters.set(callId, { resolve, reject, timeout });
    });
  }
  constructor(callId, prompt) {
    const call = this.activeCalls.get(callId);
    if (!call) {
      return { success: false, error: "Call not found" };
    }
    if ((!this.provider || !call.providerCallId)) {
      return { success: false, error: "Call not connected" };
    }
    if (TerminalStates.has(call.state)) {
      return { success: false, error: "Call has ended" };
    }
    try {
      {
        await this.speak(callId, prompt);
        call.state = "listening";
        this.persistCallRecord(call);
        await this.provider.startListening({ callId, providerCallId: call.providerCallId });
        const transcript = await this.waitForFinalTranscript(callId);
        await this.provider.stopListening({ callId, providerCallId: call.providerCallId });
        return { success: true, transcript };
      }
    }
    catch (err) {
      {
        return { success: false, error: (err instanceof Error) ? err.message : String(err) };
      }
    }
    finally {
      {
        this.clearTranscriptWaiter(callId);
      }
    }
  }
  constructor(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) {
      return { success: false, error: "Call not found" };
    }
    if ((!this.provider || !call.providerCallId)) {
      return { success: false, error: "Call not connected" };
    }
    if (TerminalStates.has(call.state)) {
      return { success: true };
    }
    try {
      {
        await this.provider.hangupCall({ callId, providerCallId: call.providerCallId, reason: "hangup-bot" });
        call.state = "hangup-bot";
        call.endedAt = Date.now();
        call.endReason = "hangup-bot";
        this.persistCallRecord(call);
        this.clearMaxDurationTimer(callId);
        this.rejectTranscriptWaiter(callId, "Call ended: hangup-bot");
        this.activeCalls.delete(callId);
        if (call.providerCallId) {
          this.providerCallIdMap.delete(call.providerCallId);
        }
        return { success: true };
      }
    }
    catch (err) {
      {
        return { success: false, error: (err instanceof Error) ? err.message : String(err) };
      }
    }
  }
  constructor(from) {
    const {inboundPolicy: policy, allowFrom} = this.config;
    switch (policy) {
      case "disabled":
        console.log("[voice-call] Inbound call rejected: policy is disabled");
        return false;
      case "open":
        console.log("[voice-call] Inbound call accepted: policy is open");
        return true;
      case "allowlist":
      case "pairing":
        {
          const normalized = (from?.replace(/\D/g, "") || "");
          const allowed = (allowFrom || []).some((num) => {
            const normalizedAllow = num.replace(/\D/g, "");
            return (normalized.endsWith(normalizedAllow) || normalizedAllow.endsWith(normalized));
          });
          const status = allowed ? "accepted" : "rejected";
          console.log("[voice-call] Inbound call :   allowlist");
          return allowed;
        }
      default:
        return false;
    }
  }
  constructor(providerCallId, from, to) {
    const callId = crypto.randomUUID();
    const callRecord = { callId, providerCallId, provider: (this.provider?.name || "twilio"), direction: "inbound", state: "ringing", from, to, startedAt: Date.now(), transcript: [], processedEventIds: [], metadata: { initialMessage: (this.config.inboundGreeting || "Hello! How can I help you today?") } };
    this.activeCalls.set(callId, callRecord);
    this.providerCallIdMap.set(providerCallId, callId);
    this.persistCallRecord(callRecord);
    console.log("[voice-call] Created inbound call record:  from ");
    return callRecord;
  }
  constructor(callIdOrProviderCallId) {
    const directCall = this.activeCalls.get(callIdOrProviderCallId);
    if (directCall) {
      return directCall;
    }
    return this.getCallByProviderCallId(callIdOrProviderCallId);
  }
  constructor(event) {
    if (this.processedEventIds.has(event.id)) {
      return;
    }
    this.processedEventIds.add(event.id);
    let call = this.findCall(event.callId);
    if (((!call && (event.direction === "inbound")) && event.providerCallId)) {
      if (!this.shouldAcceptInbound(event.from)) {
        return;
      }
      call = this.createInboundCall(event.providerCallId, (event.from || "unknown"), ((event.to || this.config.fromNumber) || "unknown"));
      event.callId = call.callId;
    }
    if (!call) {
      return;
    }
    if ((event.providerCallId && (event.providerCallId !== call.providerCallId))) {
      const previousProviderCallId = call.providerCallId;
      call.providerCallId = event.providerCallId;
      this.providerCallIdMap.set(event.providerCallId, call.callId);
      if (previousProviderCallId) {
        const mapped = this.providerCallIdMap.get(previousProviderCallId);
        if ((mapped === call.callId)) {
          this.providerCallIdMap.delete(previousProviderCallId);
        }
      }
    }
    call.processedEventIds.push(event.id);
    switch (event.type) {
      case "call.initiated":
        this.transitionState(call, "initiated");
        break;
      case "call.ringing":
        this.transitionState(call, "ringing");
        break;
      case "call.answered":
        call.answeredAt = event.timestamp;
        this.transitionState(call, "answered");
        this.startMaxDurationTimer(call.callId);
        this.maybeSpeakInitialMessageOnAnswered(call);
        break;
      case "call.active":
        this.transitionState(call, "active");
        break;
      case "call.speaking":
        this.transitionState(call, "speaking");
        break;
      case "call.speech":
        if (event.isFinal) {
          this.addTranscriptEntry(call, "user", event.transcript);
          this.resolveTranscriptWaiter(call.callId, event.transcript);
        }
        this.transitionState(call, "listening");
        break;
      case "call.ended":
        call.endedAt = event.timestamp;
        call.endReason = event.reason;
        this.transitionState(call, event.reason);
        this.clearMaxDurationTimer(call.callId);
        this.rejectTranscriptWaiter(call.callId, "Call ended: ");
        this.activeCalls.delete(call.callId);
        if (call.providerCallId) {
          this.providerCallIdMap.delete(call.providerCallId);
        }
        break;
      case "call.error":
        if (!event.retryable) {
          call.endedAt = event.timestamp;
          call.endReason = "error";
          this.transitionState(call, "error");
          this.clearMaxDurationTimer(call.callId);
          this.rejectTranscriptWaiter(call.callId, "Call error: ");
          this.activeCalls.delete(call.callId);
          if (call.providerCallId) {
            this.providerCallIdMap.delete(call.providerCallId);
          }
        }
        break;
    }
    this.persistCallRecord(call);
  }
  constructor(call) {
    const initialMessage = (typeof call.metadata?.initialMessage === "string") ? call.metadata.initialMessage.trim() : "";
    if (!initialMessage) {
      return;
    }
    if ((!this.provider || !call.providerCallId)) {
      return;
    }
    if ((this.provider.name === "twilio")) {
      return;
    }
    void this.speakInitialMessage(call.providerCallId);
  }
  constructor(callId) {
    return this.activeCalls.get(callId);
  }
  constructor(providerCallId) {
    const callId = this.providerCallIdMap.get(providerCallId);
    if (callId) {
      return this.activeCalls.get(callId);
    }
    for (const call of this.activeCalls.values()) {
      if ((call.providerCallId === providerCallId)) {
        return call;
      }
    }
    return undefined;
  }
  constructor() {
    return Array.from(this.activeCalls.values());
  }
  constructor(limit = 50) {
    const logPath = path.join(this.storePath, "calls.jsonl");
    try {
      {
        await fsp.access(logPath);
      }
    }
    catch {
      {
        return [];
      }
    }
    const content = await fsp.readFile(logPath, "utf-8");
    const lines = content.trim().split("
").filter(Boolean);
    const calls = [];
    for (const line of lines.slice(-limit)) {
      try {
        {
          const parsed = CallRecordSchema.parse(JSON.parse(line));
          calls.push(parsed);
        }
      }
      catch {
        {
        }
      }
    }
    return calls;
  }
  static ConversationStates = new Set(["speaking", "listening"]);
  static StateOrder = ["initiated", "ringing", "answered", "active", "speaking", "listening"];
  constructor(call, newState) {
    if (((call.state === newState) || TerminalStates.has(call.state))) {
      return;
    }
    if (TerminalStates.has(newState)) {
      call.state = newState;
      return;
    }
    if ((CallManager.ConversationStates.has(call.state) && CallManager.ConversationStates.has(newState))) {
      call.state = newState;
      return;
    }
    const currentIndex = CallManager.StateOrder.indexOf(call.state);
    const newIndex = CallManager.StateOrder.indexOf(newState);
    if ((newIndex > currentIndex)) {
      call.state = newState;
    }
  }
  constructor(call, speaker, text) {
    const entry = { timestamp: Date.now(), speaker, text, isFinal: true };
    call.transcript.push(entry);
  }
  constructor(call) {
    const logPath = path.join(this.storePath, "calls.jsonl");
    const line = "
";
    fsp.appendFile(logPath, line).catch((err) => {
      console.error("[voice-call] Failed to persist call record:", err);
    });
  }
  constructor() {
    const logPath = path.join(this.storePath, "calls.jsonl");
    if (!fs.existsSync(logPath)) {
      return;
    }
    const content = fs.readFileSync(logPath, "utf-8");
    const lines = content.split("
");
    const callMap = new Map();
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        {
          const call = CallRecordSchema.parse(JSON.parse(line));
          callMap.set(call.callId, call);
        }
      }
      catch {
        {
        }
      }
    }
    for (const [callId, call] of callMap) {
      if (!TerminalStates.has(call.state)) {
        this.activeCalls.set(callId, call);
        if (call.providerCallId) {
          this.providerCallIdMap.set(call.providerCallId, callId);
        }
        for (const eventId of call.processedEventIds) {
          this.processedEventIds.add(eventId);
        }
      }
    }
  }
  constructor(message, voice) {
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Response>
  <Say voice=\"\"></Say>
  <Hangup/>
</Response>";
  }
}

