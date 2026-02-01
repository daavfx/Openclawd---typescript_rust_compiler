import { verifyTwilioWebhook } from "../../webhook-security.js";
export function verifyTwilioProviderWebhook(params) {
  const result = verifyTwilioWebhook(params.ctx, params.authToken, { publicUrl: (params.currentPublicUrl || undefined), allowNgrokFreeTierLoopbackBypass: (params.options.allowNgrokFreeTierLoopbackBypass ?? false), skipVerification: params.options.skipVerification });
  if (!result.ok) {
    console.warn("[twilio] Webhook verification failed: ");
    if (result.verificationUrl) {
      console.warn("[twilio] Verification URL: ");
    }
  }
  return { ok: result.ok, reason: result.reason };
}

