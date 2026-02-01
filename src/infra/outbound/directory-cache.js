export 
export function buildDirectoryCacheKey(key) {
  const signature = (key.signature ?? "default");
  return "::::";
}

export class DirectoryCache {
  cache = new Map();
  lastConfigRef = null;
  constructor(ttlMs) {
  }
  get(key, cfg) {
    this.resetIfConfigChanged(cfg);
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    if (((Date.now() - entry.fetchedAt) > this.ttlMs)) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key, value, cfg) {
    this.resetIfConfigChanged(cfg);
    this.cache.set(key, { value, fetchedAt: Date.now() });
  }
  constructor(match) {
    for (const key of this.cache.keys()) {
      if (match(key)) {
        this.cache.delete(key);
      }
    }
  }
  constructor(cfg) {
    this.cache.clear();
    if (cfg) {
      this.lastConfigRef = cfg;
    }
  }
  constructor(cfg) {
    if ((this.lastConfigRef && (this.lastConfigRef !== cfg))) {
      this.cache.clear();
    }
    this.lastConfigRef = cfg;
  }
}

