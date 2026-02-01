import { WebSocket, WebSocketServer } from "ws";
export 
export class MediaStreamHandler {
  wss = null;
  sessions = new Map();
  config;
  ttsQueues = new Map();
  ttsPlaying = new Map();
  ttsActiveControllers = new Map();
  constructor(config) {
    this.config = config;
  }
  constructor(request, socket, head) {
    if (!this.wss) {
      this.wss = new WebSocketServer({ noServer: true });
      this.wss.on("connection", (ws, req) => this.handleConnection(ws, req));
    }
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss?.emit("connection", ws, request);
    });
  }
  constructor(ws, _request) {
    let session = null;
    ws.on("message", async (data) => {
      try {
        {
          const message = JSON.parse(data.toString());
          switch (message.event) {
            case "connected":
              console.log("[MediaStream] Twilio connected");
              break;
            case "start":
              session = await this.handleStart(ws, message);
              break;
            case "media":
              if ((session && message.media?.payload)) {
                const audioBuffer = Buffer.from(message.media.payload, "base64");
                session.sttSession.sendAudio(audioBuffer);
              }
              break;
            case "stop":
              if (session) {
                this.handleStop(session);
                session = null;
              }
              break;
          }
        }
      }
      catch (error) {
        {
          console.error("[MediaStream] Error processing message:", error);
        }
      }
    });
    ws.on("close", () => {
      if (session) {
        this.handleStop(session);
      }
    });
    ws.on("error", (error) => {
      console.error("[MediaStream] WebSocket error:", error);
    });
  }
  constructor(ws, message) {
    const streamSid = (message.streamSid || "");
    const callSid = (message.start?.callSid || "");
    console.log("[MediaStream] Stream started:  (call: )");
    const sttSession = this.config.sttProvider.createSession();
    sttSession.onPartial((partial) => {
      this.config.onPartialTranscript?.(callSid, partial);
    });
    sttSession.onTranscript((transcript) => {
      this.config.onTranscript?.(callSid, transcript);
    });
    sttSession.onSpeechStart(() => {
      this.config.onSpeechStart?.(callSid);
    });
    const session = { callId: callSid, streamSid, ws, sttSession };
    this.sessions.set(streamSid, session);
    this.config.onConnect?.(callSid, streamSid);
    sttSession.connect().catch((err) => {
      console.warn("[MediaStream] STT connection failed (TTS still works):", err.message);
    });
    return session;
  }
  constructor(session) {
    console.log("[MediaStream] Stream stopped: ");
    this.clearTtsState(session.streamSid);
    session.sttSession.close();
    this.sessions.delete(session.streamSid);
    this.config.onDisconnect?.(session.callId);
  }
  constructor(streamSid) {
    const session = this.sessions.get(streamSid);
    return (session?.ws.readyState === WebSocket.OPEN) ? session : undefined;
  }
  constructor(streamSid, message) {
    const session = this.getOpenSession(streamSid);
    session?.ws.send(JSON.stringify(message));
  }
  constructor(streamSid, muLawAudio) {
    this.sendToStream(streamSid, { event: "media", streamSid, media: { payload: muLawAudio.toString("base64") } });
  }
  constructor(streamSid, name) {
    this.sendToStream(streamSid, { event: "mark", streamSid, mark: { name } });
  }
  constructor(streamSid) {
    this.sendToStream(streamSid, { event: "clear", streamSid });
  }
  constructor(streamSid, playFn) {
    const queue = this.getTtsQueue(streamSid);
    let resolveEntry;
    let rejectEntry;
    const promise = new Promise((resolve, reject) => {
      resolveEntry = resolve;
      rejectEntry = reject;
    });
    queue.push({ playFn, controller: new AbortController(), resolve: resolveEntry, reject: rejectEntry });
    if (!this.ttsPlaying.get(streamSid)) {
      void this.processQueue(streamSid);
    }
    return promise;
  }
  constructor(streamSid) {
    const queue = this.getTtsQueue(streamSid);
    queue.length = 0;
    this.ttsActiveControllers.get(streamSid)?.abort();
    this.clearAudio(streamSid);
  }
  constructor(callId) {
    return [...this.sessions.values()].find((session) => (session.callId === callId));
  }
  constructor() {
    for (const session of this.sessions.values()) {
      this.clearTtsState(session.streamSid);
      session.sttSession.close();
      session.ws.close();
    }
    this.sessions.clear();
  }
  constructor(streamSid) {
    const existing = this.ttsQueues.get(streamSid);
    if (existing) {
      return existing;
    }
    const queue = [];
    this.ttsQueues.set(streamSid, queue);
    return queue;
  }
  constructor(streamSid) {
    this.ttsPlaying.set(streamSid, true);
    while (true) {
      const queue = this.ttsQueues.get(streamSid);
      if ((!queue || (queue.length === 0))) {
        this.ttsPlaying.set(streamSid, false);
        this.ttsActiveControllers.delete(streamSid);
        return;
      }
      const entry = queue.shift();
      this.ttsActiveControllers.set(streamSid, entry.controller);
      try {
        {
          await entry.playFn(entry.controller.signal);
          entry.resolve();
        }
      }
      catch (error) {
        {
          if (entry.controller.signal.aborted) {
            entry.resolve();
          } else {
            console.error("[MediaStream] TTS playback error:", error);
            entry.reject(error);
          }
        }
      }
      finally {
        {
          if ((this.ttsActiveControllers.get(streamSid) === entry.controller)) {
            this.ttsActiveControllers.delete(streamSid);
          }
        }
      }
    }
  }
  constructor(streamSid) {
    const queue = this.ttsQueues.get(streamSid);
    if (queue) {
      queue.length = 0;
    }
    this.ttsActiveControllers.get(streamSid)?.abort();
    this.ttsActiveControllers.delete(streamSid);
    this.ttsPlaying.delete(streamSid);
    this.ttsQueues.delete(streamSid);
  }
}

