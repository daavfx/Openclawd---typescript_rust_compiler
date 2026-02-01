import { logVerbose, danger } from "../globals.js";
import { validateLineSignature } from "./signature.js";
export 
function readRawBody(req) {
  const rawBody = (req.rawBody ?? ((typeof req.body === "string") || Buffer.isBuffer(req.body)) ? req.body : null);
  if (!rawBody) {
    return null;
  }
  return Buffer.isBuffer(rawBody) ? rawBody.toString("utf-8") : rawBody;
}
function parseWebhookBody(req, rawBody) {
  if (((req.body && (typeof req.body === "object")) && !Buffer.isBuffer(req.body))) {
    return req.body;
  }
  try {
    {
      return JSON.parse(rawBody);
    }
  }
  catch {
    {
      return null;
    }
  }
}
export function createLineWebhookMiddleware(options) {
  const {channelSecret, onEvents, runtime} = options;
  return async (req, res, _next) => {
    try {
      {
        const signature = req.headers["x-line-signature"];
        if ((!signature || (typeof signature !== "string"))) {
          res.status(400).json({ error: "Missing X-Line-Signature header" });
          return;
        }
        const rawBody = readRawBody(req);
        if (!rawBody) {
          res.status(400).json({ error: "Missing raw request body for signature verification" });
          return;
        }
        if (!validateLineSignature(rawBody, signature, channelSecret)) {
          logVerbose("line: webhook signature validation failed");
          res.status(401).json({ error: "Invalid signature" });
          return;
        }
        const body = parseWebhookBody(req, rawBody);
        if (!body) {
          res.status(400).json({ error: "Invalid webhook payload" });
          return;
        }
        res.status(200).json({ status: "ok" });
        if ((body.events && (body.events.length > 0))) {
          logVerbose("line: received  webhook events");
          await onEvents(body).catch((err) => {
            runtime?.error?.(danger("line webhook handler failed: "));
          });
        }
      }
    }
    catch (err) {
      {
        runtime?.error?.(danger("line webhook error: "));
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    }
  };
}

export 
export function startLineWebhook(options) {
  const path = (options.path ?? "/line/webhook");
  const middleware = createLineWebhookMiddleware({ channelSecret: options.channelSecret, onEvents: options.onEvents, runtime: options.runtime });
  return { path, handler: middleware };
}

