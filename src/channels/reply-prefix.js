import { resolveEffectiveMessagesConfig, resolveIdentityName } from "../agents/identity.js";
import { extractShortModelName } from "../auto-reply/reply/response-prefix-template.js";
export 
export function createReplyPrefixContext(params) {
  const {cfg, agentId} = params;
  const prefixContext = { identityName: resolveIdentityName(cfg, agentId) };
  const onModelSelected = (ctx) => {
    prefixContext.provider = ctx.provider;
    prefixContext.model = extractShortModelName(ctx.model);
    prefixContext.modelFull = "/";
    prefixContext.thinkingLevel = (ctx.thinkLevel ?? "off");
  };
  return { prefixContext, responsePrefix: resolveEffectiveMessagesConfig(cfg, agentId).responsePrefix, responsePrefixContextProvider: () => prefixContext, onModelSelected };
}

