import crypto from "node:crypto";
export class TelnyxProvider {
  name = "telnyx";
  apiKey;
  connectionId;
  publicKey;
  baseUrl = "https://api.telnyx.com/v2";
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("Telnyx API key is required");
    }
    if (!config.connectionId) {
      throw new Error("Telnyx connection ID is required");
    }
    this.apiKey = config.apiKey;
    this.connectionId = config.connectionId;
    this.publicKey = config.publicKey;
  }
  async apiRequest(endpoint, body, options) {
    const response = await fetch("", { method: "POST", headers: { Authorization: "Bearer ", "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) {
      if ((options?.allowNotFound && (response.status === 404))) {
        return undefined;
      }
      const errorText = await response.text();
      throw new Error("Telnyx API error:  ");
    }
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
  }
  constructor(ctx) {
    if (!this.publicKey) {
      return { ok: true };
    }
    const signature = ctx.headers["telnyx-signature-ed25519"];
    const timestamp = ctx.headers["telnyx-timestamp"];
    if ((!signature || !timestamp)) {
      return { ok: false, reason: "Missing signature or timestamp header" };
    }
    const signatureStr = Array.isArray(signature) ? signature[0] : signature;
    const timestampStr = Array.isArray(timestamp) ? timestamp[0] : timestamp;
    if ((!signatureStr || !timestampStr)) {
      return { ok: false, reason: "Empty signature or timestamp" };
    }
    try {
      {
        const signedPayload = "|";
        const signatureBuffer = Buffer.from(signatureStr, "base64");
        const publicKeyBuffer = Buffer.from(this.publicKey, "base64");
        const isValid = crypto.verify(null, Buffer.from(signedPayload), { key: publicKeyBuffer, format: "der", type: "spki" }, signatureBuffer);
        if (!isValid) {
          return { ok: false, reason: "Invalid signature" };
        }
        const eventTime = (parseInt(timestampStr, 10) * 1000);
        const now = Date.now();
        if ((Math.abs((now - eventTime)) > ((5 * 60) * 1000))) {
          return { ok: false, reason: "Timestamp too old" };
        }
        return { ok: true };
      }
    }
    catch (err) {
      {
        return { ok: false, reason: "Verification error: " };
      }
    }
  }
  constructor(ctx) {
    try {
      {
        const payload = JSON.parse(ctx.rawBody);
        const data = payload.data;
        if ((!data || !data.event_type)) {
          return { events: [], statusCode: 200 };
        }
        const event = this.normalizeEvent(data);
        return { events: event ? [event] : [], statusCode: 200 };
      }
    }
    catch {
      {
        return { events: [], statusCode: 400 };
      }
    }
  }
  constructor(data) {
    let callId = "";
    if (data.payload?.client_state) {
      try {
        {
          callId = Buffer.from(data.payload.client_state, "base64").toString("utf8");
        }
      }
      catch {
        {
          callId = data.payload.client_state;
        }
      }
    }
    if (!callId) {
      callId = (data.payload?.call_control_id || "");
    }
    const baseEvent = { id: (data.id || crypto.randomUUID()), callId, providerCallId: data.payload?.call_control_id, timestamp: Date.now() };
    switch (data.event_type) {
      case "call.initiated":
        return { ...baseEvent: , type: "call.initiated" };
      case "call.ringing":
        return { ...baseEvent: , type: "call.ringing" };
      case "call.answered":
        return { ...baseEvent: , type: "call.answered" };
      case "call.bridged":
        return { ...baseEvent: , type: "call.active" };
      case "call.speak.started":
        return { ...baseEvent: , type: "call.speaking", text: (data.payload?.text || "") };
      case "call.transcription":
        return { ...baseEvent: , type: "call.speech", transcript: (data.payload?.transcription || ""), isFinal: (data.payload?.is_final ?? true), confidence: data.payload?.confidence };
      case "call.hangup":
        return { ...baseEvent: , type: "call.ended", reason: this.mapHangupCause(data.payload?.hangup_cause) };
      case "call.dtmf.received":
        return { ...baseEvent: , type: "call.dtmf", digits: (data.payload?.digit || "") };
      default:
        return null;
    }
  }
  constructor(cause) {
    switch (cause) {
      case "normal_clearing":
      case "normal_unspecified":
        return "completed";
      case "originator_cancel":
        return "hangup-bot";
      case "call_rejected":
      case "user_busy":
        return "busy";
      case "no_answer":
      case "no_user_response":
        return "no-answer";
      case "destination_out_of_order":
      case "network_out_of_order":
      case "service_unavailable":
      case "recovery_on_timer_expire":
        return "failed";
      case "machine_detected":
      case "fax_detected":
        return "voicemail";
      case "user_hangup":
      case "subscriber_absent":
        return "hangup-user";
      default:
        if (cause) {
          console.warn("[telnyx] Unknown hangup cause: ");
        }
        return "completed";
    }
  }
  constructor(input) {
    const result = await this.apiRequest("/calls", { connection_id: this.connectionId, to: input.to, from: input.from, webhook_url: input.webhookUrl, webhook_url_method: "POST", client_state: Buffer.from(input.callId).toString("base64"), timeout_secs: 30 });
    return { providerCallId: result.data.call_control_id, status: "initiated" };
  }
  constructor(input) {
    await this.apiRequest("/calls//actions/hangup", { command_id: crypto.randomUUID() }, { allowNotFound: true });
  }
  constructor(input) {
    await this.apiRequest("/calls//actions/speak", { command_id: crypto.randomUUID(), payload: input.text, voice: (input.voice || "female"), language: (input.locale || "en-US") });
  }
  constructor(input) {
    await this.apiRequest("/calls//actions/transcription_start", { command_id: crypto.randomUUID(), language: (input.language || "en") });
  }
  constructor(input) {
    await this.apiRequest("/calls//actions/transcription_stop", { command_id: crypto.randomUUID() }, { allowNotFound: true });
  }
}

