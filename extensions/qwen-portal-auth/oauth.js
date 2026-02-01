import { createHash, randomBytes, randomUUID } from "node:crypto";
const QWEN_OAUTH_BASE_URL = "https://chat.qwen.ai";
const QWEN_OAUTH_DEVICE_CODE_ENDPOINT = "/api/v1/oauth2/device/code";
const QWEN_OAUTH_TOKEN_ENDPOINT = "/api/v1/oauth2/token";
const QWEN_OAUTH_CLIENT_ID = "f0304373b74a44d2b584a3fb70ca9e56";
const QWEN_OAUTH_SCOPE = "openid profile email model.completion";
const QWEN_OAUTH_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
export 
export 
function toFormUrlEncoded(data) {
  return Object.entries(data).map(([key, value]) => "=").join("&");
}
function generatePkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
async function requestDeviceCode(params) {
  const response = await fetch(QWEN_OAUTH_DEVICE_CODE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "x-request-id": randomUUID() }, body: toFormUrlEncoded({ client_id: QWEN_OAUTH_CLIENT_ID, scope: QWEN_OAUTH_SCOPE, code_challenge: params.challenge, code_challenge_method: "S256" }) });
  if (!response.ok) {
    const text = await response.text();
    throw new Error("Qwen device authorization failed: ");
  }
  const payload = await response.json();
  if (((!payload.device_code || !payload.user_code) || !payload.verification_uri)) {
    throw new Error((payload.error ?? "Qwen device authorization returned an incomplete payload (missing user_code or verification_uri)."));
  }
  return payload;
}
async function pollDeviceToken(params) {
  const response = await fetch(QWEN_OAUTH_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: toFormUrlEncoded({ grant_type: QWEN_OAUTH_GRANT_TYPE, client_id: QWEN_OAUTH_CLIENT_ID, device_code: params.deviceCode, code_verifier: params.verifier }) });
  if (!response.ok) {
    let payload;
    try {
      {
        payload = await response.json();
      }
    }
    catch {
      {
        const text = await response.text();
        return { status: "error", message: (text || response.statusText) };
      }
    }
    if ((payload?.error === "authorization_pending")) {
      return { status: "pending" };
    }
    if ((payload?.error === "slow_down")) {
      return { status: "pending", slowDown: true };
    }
    return { status: "error", message: ((payload?.error_description || payload?.error) || response.statusText) };
  }
  const tokenPayload = await response.json();
  if (((!tokenPayload.access_token || !tokenPayload.refresh_token) || !tokenPayload.expires_in)) {
    return { status: "error", message: "Qwen OAuth returned incomplete token payload." };
  }
  return { status: "success", token: { access: tokenPayload.access_token, refresh: tokenPayload.refresh_token, expires: (Date.now() + (tokenPayload.expires_in * 1000)), resourceUrl: tokenPayload.resource_url } };
}
export async function loginQwenPortalOAuth(params) {
  const {verifier, challenge} = generatePkce();
  const device = await requestDeviceCode({ challenge });
  const verificationUrl = (device.verification_uri_complete || device.verification_uri);
  await params.note(["Open  to approve access.", "If prompted, enter the code ."].join("
"), "Qwen OAuth");
  try {
    {
      await params.openUrl(verificationUrl);
    }
  }
  catch {
    {
    }
  }
  const start = Date.now();
  let pollIntervalMs = device.interval ? (device.interval * 1000) : 2000;
  const timeoutMs = (device.expires_in * 1000);
  while (((Date.now() - start) < timeoutMs)) {
    params.progress.update("Waiting for Qwen OAuth approval…");
    const result = await pollDeviceToken({ deviceCode: device.device_code, verifier });
    if ((result.status === "success")) {
      return result.token;
    }
    if ((result.status === "error")) {
      throw new Error("Qwen OAuth failed: ");
    }
    if (((result.status === "pending") && result.slowDown)) {
      pollIntervalMs = Math.min((pollIntervalMs * 1.5), 10000);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error("Qwen OAuth timed out waiting for authorization.");
}

