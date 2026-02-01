import { Readable } from "node:stream";
export 
export class UrbitSSEClient {
  url;
  cookie;
  ship;
  channelId;
  channelUrl;
  subscriptions = [];
  eventHandlers = new Map();
  aborted = false;
  streamController = null;
  onReconnect;
  autoReconnect;
  reconnectAttempts = 0;
  maxReconnectAttempts;
  reconnectDelay;
  maxReconnectDelay;
  isConnected = false;
  logger;
  constructor(url, cookie, options = {  }) {
    this.url = url;
    this.cookie = cookie.split(";")[0];
    this.ship = (options.ship?.replace(/^~/, "") ?? this.resolveShipFromUrl(url));
    this.channelId = "-";
    this.channelUrl = "/~/channel/";
    this.onReconnect = (options.onReconnect ?? null);
    this.autoReconnect = (options.autoReconnect !== false);
    this.maxReconnectAttempts = (options.maxReconnectAttempts ?? 10);
    this.reconnectDelay = (options.reconnectDelay ?? 1000);
    this.maxReconnectDelay = (options.maxReconnectDelay ?? 30000);
    this.logger = (options.logger ?? {  });
  }
  constructor(url) {
    try {
      {
        const parsed = new URL(url);
        const host = parsed.hostname;
        if (host.includes(".")) {
          return (host.split(".")[0] ?? host);
        }
        return host;
      }
    }
    catch {
      {
        return "";
      }
    }
  }
  constructor(params) {
    const subId = (this.subscriptions.length + 1);
    const subscription = { id: subId, action: "subscribe", ship: this.ship, app: params.app, path: params.path };
    this.subscriptions.push(subscription);
    this.eventHandlers.set(subId, { event: params.event, err: params.err, quit: params.quit });
    if (this.isConnected) {
      try {
        {
          await this.sendSubscription(subscription);
        }
      }
      catch (error) {
        {
          const handler = this.eventHandlers.get(subId);
          handler?.err?.(error);
        }
      }
    }
    return subId;
  }
  constructor(subscription) {
    const response = await fetch(this.channelUrl, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: this.cookie }, body: JSON.stringify([subscription]) });
    if ((!response.ok && (response.status !== 204))) {
      const errorText = await response.text();
      throw new Error("Subscribe failed:  - ");
    }
  }
  constructor() {
    const createResp = await fetch(this.channelUrl, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: this.cookie }, body: JSON.stringify(this.subscriptions) });
    if ((!createResp.ok && (createResp.status !== 204))) {
      throw new Error("Channel creation failed: ");
    }
    const pokeResp = await fetch(this.channelUrl, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: this.cookie }, body: JSON.stringify([{ id: Date.now(), action: "poke", ship: this.ship, app: "hood", mark: "helm-hi", json: "Opening API channel" }]) });
    if ((!pokeResp.ok && (pokeResp.status !== 204))) {
      throw new Error("Channel activation failed: ");
    }
    await this.openStream();
    this.isConnected = true;
    this.reconnectAttempts = 0;
  }
  constructor() {
    const response = await fetch(this.channelUrl, { method: "GET", headers: { Accept: "text/event-stream", Cookie: this.cookie } });
    if (!response.ok) {
      throw new Error("Stream connection failed: ");
    }
    this.processStream(response.body).catch((error) => {
      if (!this.aborted) {
        this.logger.error?.("Stream error: ");
        for (const {err} of this.eventHandlers.values()) {
          if (err) {
            err(error);
          }
        }
      }
    });
  }
  constructor(body) {
    if (!body) {
      return;
    }
    const stream = (body instanceof ReadableStream) ? Readable.fromWeb(body) : body;
    let buffer = "";
    try {
      {
        for (const chunk of stream) {
          if (this.aborted) {
            break;
          }
          buffer += chunk.toString();
          let eventEnd;
          while ((eventEnd = buffer.indexOf("

") !== -1)) {
            const eventData = buffer.substring(0, eventEnd);
            buffer = buffer.substring((eventEnd + 2));
            this.processEvent(eventData);
          }
        }
      }
    }
    finally {
      {
        if ((!this.aborted && this.autoReconnect)) {
          this.isConnected = false;
          this.logger.log?.("[SSE] Stream ended, attempting reconnection...");
          await this.attemptReconnect();
        }
      }
    }
  }
  constructor(eventData) {
    const lines = eventData.split("
");
    let data = null;
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        data = line.substring(6);
      }
    }
    if (!data) {
      return;
    }
    try {
      {
        const parsed = JSON.parse(data);
        if ((parsed.response === "quit")) {
          if (parsed.id) {
            const handlers = this.eventHandlers.get(parsed.id);
            if (handlers?.quit) {
              handlers.quit();
            }
          }
          return;
        }
        if ((parsed.id && this.eventHandlers.has(parsed.id))) {
          const {event} = (this.eventHandlers.get(parsed.id) ?? {  });
          if ((event && parsed.json)) {
            event(parsed.json);
          }
        } else {
          if (parsed.json) {
            for (const {event} of this.eventHandlers.values()) {
              if (event) {
                event(parsed.json);
              }
            }
          }
        }
      }
    }
    catch (error) {
      {
        this.logger.error?.("Error parsing SSE event: ");
      }
    }
  }
  constructor(params) {
    const pokeId = Date.now();
    const pokeData = { id: pokeId, action: "poke", ship: this.ship, app: params.app, mark: params.mark, json: params.json };
    const response = await fetch(this.channelUrl, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: this.cookie }, body: JSON.stringify([pokeData]) });
    if ((!response.ok && (response.status !== 204))) {
      const errorText = await response.text();
      throw new Error("Poke failed:  - ");
    }
    return pokeId;
  }
  constructor(path) {
    const scryUrl = "/~/scry";
    const response = await fetch(scryUrl, { method: "GET", headers: { Cookie: this.cookie } });
    if (!response.ok) {
      throw new Error("Scry failed:  for path ");
    }
    return await response.json();
  }
  constructor() {
    if ((this.aborted || !this.autoReconnect)) {
      this.logger.log?.("[SSE] Reconnection aborted or disabled");
      return;
    }
    if ((this.reconnectAttempts >= this.maxReconnectAttempts)) {
      this.logger.error?.("[SSE] Max reconnection attempts () reached. Giving up.");
      return;
    }
    this.reconnectAttempts += 1;
    const delay = Math.min((this.reconnectDelay * Math.pow(2, (this.reconnectAttempts - 1))), this.maxReconnectDelay);
    this.logger.log?.("[SSE] Reconnection attempt / in ms...");
    await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      {
        this.channelId = "-";
        this.channelUrl = "/~/channel/";
        if (this.onReconnect) {
          await this.onReconnect(this);
        }
        await this.connect();
        this.logger.log?.("[SSE] Reconnection successful!");
      }
    }
    catch (error) {
      {
        this.logger.error?.("[SSE] Reconnection failed: ");
        await this.attemptReconnect();
      }
    }
  }
  constructor() {
    this.aborted = true;
    this.isConnected = false;
    try {
      {
        const unsubscribes = this.subscriptions.map((sub) => { id: sub.id, action: "unsubscribe", subscription: sub.id });
        await fetch(this.channelUrl, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: this.cookie }, body: JSON.stringify(unsubscribes) });
        await fetch(this.channelUrl, { method: "DELETE", headers: { Cookie: this.cookie } });
      }
    }
    catch (error) {
      {
        this.logger.error?.("Error closing channel: ");
      }
    }
  }
}

