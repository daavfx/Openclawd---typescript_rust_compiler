import crypto from "node:crypto";
export function validateTwilioSignature(authToken, signature, url, params) {
  if (!signature) {
    return false;
  }
  let dataToSign = url;
  const sortedParams = Array.from(params.entries()).sort((a, b) => (a[0] < b[0]) ? -1 : (a[0] > b[0]) ? 1 : 0);
  for (const [key, value] of sortedParams) {
    dataToSign += (key + value);
  }
  const expectedSignature = crypto.createHmac("sha1", authToken).update(dataToSign).digest("base64");
  return timingSafeEqual(signature, expectedSignature);
}

function timingSafeEqual(a, b) {
  if ((a.length !== b.length)) {
    const dummy = Buffer.from(a);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}
export function reconstructWebhookUrl(ctx) {
  const {headers} = ctx;
  const proto = (getHeader(headers, "x-forwarded-proto") || "https");
  const forwardedHost = ((((getHeader(headers, "x-forwarded-host") || getHeader(headers, "x-original-host")) || getHeader(headers, "ngrok-forwarded-host")) || getHeader(headers, "host")) || "");
  let path = "/";
  try {
    {
      const parsed = new URL(ctx.url);
      path = (parsed.pathname + parsed.search);
    }
  }
  catch {
    {
    }
  }
  const host = (forwardedHost.split(":")[0] || forwardedHost);
  return "://";
}

function buildTwilioVerificationUrl(ctx, publicUrl) {
  if (!publicUrl) {
    return reconstructWebhookUrl(ctx);
  }
  try {
    {
      const base = new URL(publicUrl);
      const requestUrl = new URL(ctx.url);
      base.pathname = requestUrl.pathname;
      base.search = requestUrl.search;
      return base.toString();
    }
  }
  catch {
    {
      return publicUrl;
    }
  }
}
function getHeader(headers, name) {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
function isLoopbackAddress(address) {
  if (!address) {
    return false;
  }
  if (((address === "127.0.0.1") || (address === "::1"))) {
    return true;
  }
  if (address.startsWith("::ffff:127.")) {
    return true;
  }
  return false;
}
export 
export function verifyTwilioWebhook(ctx, authToken, options) {
  if (options?.skipVerification) {
    return { ok: true, reason: "verification skipped (dev mode)" };
  }
  const signature = getHeader(ctx.headers, "x-twilio-signature");
  if (!signature) {
    return { ok: false, reason: "Missing X-Twilio-Signature header" };
  }
  const verificationUrl = buildTwilioVerificationUrl(ctx, options?.publicUrl);
  const params = new URLSearchParams(ctx.rawBody);
  const isValid = validateTwilioSignature(authToken, signature, verificationUrl, params);
  if (isValid) {
    return { ok: true, verificationUrl };
  }
  const isNgrokFreeTier = (verificationUrl.includes(".ngrok-free.app") || verificationUrl.includes(".ngrok.io"));
  if (((isNgrokFreeTier && options?.allowNgrokFreeTierLoopbackBypass) && isLoopbackAddress(ctx.remoteAddress))) {
    console.warn("[voice-call] Twilio signature validation failed (ngrok free tier compatibility, loopback only)");
    return { ok: true, reason: "ngrok free tier compatibility mode (loopback only)", verificationUrl, isNgrokFreeTier: true };
  }
  return { ok: false, reason: "Invalid signature for URL: ", verificationUrl, isNgrokFreeTier };
}

export 
function normalizeSignatureBase64(input) {
  return Buffer.from(input, "base64").toString("base64");
}
function getBaseUrlNoQuery(url) {
  const u = new URL(url);
  return "//";
}
function timingSafeEqualString(a, b) {
  if ((a.length !== b.length)) {
    const dummy = Buffer.from(a);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function validatePlivoV2Signature(params) {
  const baseUrl = getBaseUrlNoQuery(params.url);
  const digest = crypto.createHmac("sha256", params.authToken).update((baseUrl + params.nonce)).digest("base64");
  const expected = normalizeSignatureBase64(digest);
  const provided = normalizeSignatureBase64(params.signature);
  return timingSafeEqualString(expected, provided);
}
function toParamMapFromSearchParams(sp) {
  const map = {  };
  for (const [key, value] of sp.entries()) {
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(value);
  }
  return map;
}
function sortedQueryString(params) {
  const parts = [];
  for (const key of Object.keys(params).sort()) {
    const values = [...params[key]].sort();
    for (const value of values) {
      parts.push("=");
    }
  }
  return parts.join("&");
}
function sortedParamsString(params) {
  const parts = [];
  for (const key of Object.keys(params).sort()) {
    const values = [...params[key]].sort();
    for (const value of values) {
      parts.push("");
    }
  }
  return parts.join("");
}
function constructPlivoV3BaseUrl(params) {
  const hasPostParams = (Object.keys(params.postParams).length > 0);
  const u = new URL(params.url);
  const baseNoQuery = "//";
  const queryMap = toParamMapFromSearchParams(u.searchParams);
  const queryString = sortedQueryString(queryMap);
  let baseUrl = baseNoQuery;
  if (((queryString.length > 0) || hasPostParams)) {
    baseUrl = "?";
  }
  if (((queryString.length > 0) && hasPostParams)) {
    baseUrl = ".";
  }
  if ((params.method === "GET")) {
    return baseUrl;
  }
  return (baseUrl + sortedParamsString(params.postParams));
}
function validatePlivoV3Signature(params) {
  const baseUrl = constructPlivoV3BaseUrl({ method: params.method, url: params.url, postParams: params.postParams });
  const hmacBase = ".";
  const digest = crypto.createHmac("sha256", params.authToken).update(hmacBase).digest("base64");
  const expected = normalizeSignatureBase64(digest);
  const provided = params.signatureHeader.split(",").map((s) => s.trim()).filter(Boolean).map((s) => normalizeSignatureBase64(s));
  for (const sig of provided) {
    if (timingSafeEqualString(expected, sig)) {
      return true;
    }
  }
  return false;
}
export function verifyPlivoWebhook(ctx, authToken, options) {
  if (options?.skipVerification) {
    return { ok: true, reason: "verification skipped (dev mode)" };
  }
  const signatureV3 = getHeader(ctx.headers, "x-plivo-signature-v3");
  const nonceV3 = getHeader(ctx.headers, "x-plivo-signature-v3-nonce");
  const signatureV2 = getHeader(ctx.headers, "x-plivo-signature-v2");
  const nonceV2 = getHeader(ctx.headers, "x-plivo-signature-v2-nonce");
  const reconstructed = reconstructWebhookUrl(ctx);
  let verificationUrl = reconstructed;
  if (options?.publicUrl) {
    try {
      {
        const req = new URL(reconstructed);
        const base = new URL(options.publicUrl);
        base.pathname = req.pathname;
        base.search = req.search;
        verificationUrl = base.toString();
      }
    }
    catch {
      {
        verificationUrl = reconstructed;
      }
    }
  }
  if ((signatureV3 && nonceV3)) {
    const method = ((ctx.method === "GET") || (ctx.method === "POST")) ? ctx.method : null;
    if (!method) {
      return { ok: false, version: "v3", verificationUrl, reason: "Unsupported HTTP method for Plivo V3 signature: " };
    }
    const postParams = toParamMapFromSearchParams(new URLSearchParams(ctx.rawBody));
    const ok = validatePlivoV3Signature({ authToken, signatureHeader: signatureV3, nonce: nonceV3, method, url: verificationUrl, postParams });
    return ok ? { ok: true, version: "v3", verificationUrl } : { ok: false, version: "v3", verificationUrl, reason: "Invalid Plivo V3 signature" };
  }
  if ((signatureV2 && nonceV2)) {
    const ok = validatePlivoV2Signature({ authToken, signature: signatureV2, nonce: nonceV2, url: verificationUrl });
    return ok ? { ok: true, version: "v2", verificationUrl } : { ok: false, version: "v2", verificationUrl, reason: "Invalid Plivo V2 signature" };
  }
  return { ok: false, reason: "Missing Plivo signature headers (V3 or V2)", verificationUrl };
}

