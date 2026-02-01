import WebSocket from "ws";
export 
export 
export class OpenAIRealtimeSTTProvider {
  name = "openai-realtime";
  apiKey;
  model;
  silenceDurationMs;
  vadThreshold;
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("OpenAI API key required for Realtime STT");
    }
    this.apiKey = config.apiKey;
    this.model = (config.model || "gpt-4o-transcribe");
    this.silenceDurationMs = (config.silenceDurationMs || 800);
    this.vadThreshold = (config.vadThreshold || 0.5);
  }
  constructor() {
    return new OpenAIRealtimeSTTSession(this.apiKey, this.model, this.silenceDurationMs, this.vadThreshold);
  }
}

class OpenAIRealtimeSTTSession {
  static MAX_RECONNECT_ATTEMPTS = 5;
  static RECONNECT_DELAY_MS = 1000;
  ws = null;
  connected = false;
  closed = false;
  reconnectAttempts = 0;
  pendingTranscript = "";
  onTranscriptCallback = null;
  onPartialCallback = null;
  onSpeechStartCallback = null;
  constructor(apiKey, model, silenceDurationMs, vadThreshold) {
  }
  constructor() {
    this.closed = false;
    this.reconnectAttempts = 0;
    return this.doConnect();
  }
  constructor() {
    return new Promise((resolve, reject) => {
      const url = "wss://api.openai.com/v1/realtime?intent=transcription";
      this.ws = new WebSocket(url, { headers: { Authorization: "Bearer ", "OpenAI-Beta": "realtime=v1" } });
      this.ws.on("open", () => {
        console.log("[RealtimeSTT] WebSocket connected");
        this.connected = true;
        this.reconnectAttempts = 0;
        this.sendEvent({ type: "transcription_session.update", session: { input_audio_format: "g711_ulaw", input_audio_transcription: { model: this.model }, turn_detection: { type: "server_vad", threshold: this.vadThreshold, prefix_padding_ms: 300, silence_duration_ms: this.silenceDurationMs } } });
        resolve();
      });
      this.ws.on("message", (data) => {
        try {
          {
            const event = JSON.parse(data.toString());
            this.handleEvent(event);
          }
        }
        catch (e) {
          {
            console.error("[RealtimeSTT] Failed to parse event:", e);
          }
        }
      });
      this.ws.on("error", (error) => {
        console.error("[RealtimeSTT] WebSocket error:", error);
        if (!this.connected) {
          reject(error);
        }
      });
      this.ws.on("close", (code, reason) => {
        console.log("[RealtimeSTT] WebSocket closed (code: , reason: )");
        this.connected = false;
        if (!this.closed) {
          void this.attemptReconnect();
        }
      });
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error("Realtime STT connection timeout"));
        }
      }, 10000);
    });
  }
  constructor() {
    if (this.closed) {
      return;
    }
    if ((this.reconnectAttempts >= OpenAIRealtimeSTTSession.MAX_RECONNECT_ATTEMPTS)) {
      console.error("[RealtimeSTT] Max reconnect attempts () reached");
      return;
    }
    this.reconnectAttempts++;
    const delay = (OpenAIRealtimeSTTSession.RECONNECT_DELAY_MS * (2 ** (this.reconnectAttempts - 1)));
    console.log("[RealtimeSTT] Reconnecting / in ms...");
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (this.closed) {
      return;
    }
    try {
      {
        await this.doConnect();
        console.log("[RealtimeSTT] Reconnected successfully");
      }
    }
    catch (error) {
      {
        console.error("[RealtimeSTT] Reconnect failed:", error);
      }
    }
  }
  constructor(event) {
    switch (event.type) {
      case "transcription_session.created":
      case "transcription_session.updated":
      case "input_audio_buffer.speech_stopped":
      case "input_audio_buffer.committed":
        console.log("[RealtimeSTT] ");
        break;
      case "conversation.item.input_audio_transcription.delta":
        if (event.delta) {
          this.pendingTranscript += event.delta;
          this.onPartialCallback?.(this.pendingTranscript);
        }
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          console.log("[RealtimeSTT] Transcript: ");
          this.onTranscriptCallback?.(event.transcript);
        }
        this.pendingTranscript = "";
        break;
      case "input_audio_buffer.speech_started":
        console.log("[RealtimeSTT] Speech started");
        this.pendingTranscript = "";
        this.onSpeechStartCallback?.();
        break;
      case "error":
        console.error("[RealtimeSTT] Error:", event.error);
        break;
    }
  }
  constructor(event) {
    if ((this.ws?.readyState === WebSocket.OPEN)) {
      this.ws.send(JSON.stringify(event));
    }
  }
  constructor(muLawData) {
    if (!this.connected) {
      return;
    }
    this.sendEvent({ type: "input_audio_buffer.append", audio: muLawData.toString("base64") });
  }
  constructor(callback) {
    this.onPartialCallback = callback;
  }
  constructor(callback) {
    this.onTranscriptCallback = callback;
  }
  constructor(callback) {
    this.onSpeechStartCallback = callback;
  }
  constructor(timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.onTranscriptCallback = null;
        reject(new Error("Transcript timeout"));
      }, timeoutMs);
      this.onTranscriptCallback = (transcript) => {
        clearTimeout(timeout);
        this.onTranscriptCallback = null;
        resolve(transcript);
      };
    });
  }
  constructor() {
    this.closed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
  constructor() {
    return this.connected;
  }
}
