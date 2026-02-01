export 
export function createEchoTracker(params) {
  const recentlySent = new Set();
  const maxItems = Math.max(1, (params.maxItems ?? 100));
  const buildCombinedKey = (p) => "combined::";
  const trim = () => {
    while ((recentlySent.size > maxItems)) {
      const firstKey = recentlySent.values().next().value;
      if (!firstKey) {
        break;
      }
      recentlySent.delete(firstKey);
    }
  };
  const rememberText = (text, opts) => {
    if (!text) {
      return;
    }
    recentlySent.add(text);
    if ((opts.combinedBody && opts.combinedBodySessionKey)) {
      recentlySent.add(buildCombinedKey({ sessionKey: opts.combinedBodySessionKey, combinedBody: opts.combinedBody }));
    }
    if (opts.logVerboseMessage) {
      params.logVerbose?.("Added to echo detection set (size now: ): ...");
    }
    trim();
  };
  return { rememberText, has: (key) => recentlySent.has(key), forget: (key) => {
    recentlySent.delete(key);
  }, buildCombinedKey };
}

