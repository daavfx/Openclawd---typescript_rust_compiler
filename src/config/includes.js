import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";
export const INCLUDE_KEY = "$include"
export const MAX_INCLUDE_DEPTH = 10
export 
export class ConfigIncludeError extends Error {
  constructor(message, includePath, cause) {
    super(message);
    this.name = "ConfigIncludeError";
  }
}

export class CircularIncludeError extends ConfigIncludeError {
  constructor(chain) {
    super("Circular include detected: ", chain[(chain.length - 1)]);
    this.name = "CircularIncludeError";
  }
}

function isPlainObject(value) {
  return ((((typeof value === "object") && (value !== null)) && !Array.isArray(value)) && (Object.prototype.toString.call(value) === "[object Object]"));
}
export function deepMerge(target, source) {
  if ((Array.isArray(target) && Array.isArray(source))) {
    return [...target, ...source];
  }
  if ((isPlainObject(target) && isPlainObject(source))) {
    const result = { ...target:  };
    for (const key of Object.keys(source)) {
      result[key] = (key in result) ? deepMerge(result[key], source[key]) : source[key];
    }
    return result;
  }
  return source;
}

class IncludeProcessor {
  visited = new Set();
  depth = 0;
  constructor(basePath, resolver) {
    this.visited.add(path.normalize(basePath));
  }
  constructor(obj) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.process(item));
    }
    if (!isPlainObject(obj)) {
      return obj;
    }
    if (!(INCLUDE_KEY in obj)) {
      return this.processObject(obj);
    }
    return this.processInclude(obj);
  }
  constructor(obj) {
    const result = {  };
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.process(value);
    }
    return result;
  }
  constructor(obj) {
    const includeValue = obj[INCLUDE_KEY];
    const otherKeys = Object.keys(obj).filter((k) => (k !== INCLUDE_KEY));
    const included = this.resolveInclude(includeValue);
    if ((otherKeys.length === 0)) {
      return included;
    }
    if (!isPlainObject(included)) {
      throw new ConfigIncludeError("Sibling keys require included content to be an object", (typeof includeValue === "string") ? includeValue : INCLUDE_KEY);
    }
    const rest = {  };
    for (const key of otherKeys) {
      rest[key] = this.process(obj[key]);
    }
    return deepMerge(included, rest);
  }
  constructor(value) {
    if ((typeof value === "string")) {
      return this.loadFile(value);
    }
    if (Array.isArray(value)) {
      return value.reduce((merged, item) => {
        if ((typeof item !== "string")) {
          throw new ConfigIncludeError("Invalid $include array item: expected string, got ", String(item));
        }
        return deepMerge(merged, this.loadFile(item));
      }, {  });
    }
    throw new ConfigIncludeError("Invalid $include value: expected string or array of strings, got ", String(value));
  }
  constructor(includePath) {
    const resolvedPath = this.resolvePath(includePath);
    this.checkCircular(resolvedPath);
    this.checkDepth(includePath);
    const raw = this.readFile(includePath, resolvedPath);
    const parsed = this.parseFile(includePath, resolvedPath, raw);
    return this.processNested(resolvedPath, parsed);
  }
  constructor(includePath) {
    const resolved = path.isAbsolute(includePath) ? includePath : path.resolve(path.dirname(this.basePath), includePath);
    return path.normalize(resolved);
  }
  constructor(resolvedPath) {
    if (this.visited.has(resolvedPath)) {
      throw new CircularIncludeError([...this.visited, resolvedPath]);
    }
  }
  constructor(includePath) {
    if ((this.depth >= MAX_INCLUDE_DEPTH)) {
      throw new ConfigIncludeError("Maximum include depth () exceeded at: ", includePath);
    }
  }
  constructor(includePath, resolvedPath) {
    try {
      {
        return this.resolver.readFile(resolvedPath);
      }
    }
    catch (err) {
      {
        throw new ConfigIncludeError("Failed to read include file:  (resolved: )", includePath, (err instanceof Error) ? err : undefined);
      }
    }
  }
  constructor(includePath, resolvedPath, raw) {
    try {
      {
        return this.resolver.parseJson(raw);
      }
    }
    catch (err) {
      {
        throw new ConfigIncludeError("Failed to parse include file:  (resolved: )", includePath, (err instanceof Error) ? err : undefined);
      }
    }
  }
  constructor(resolvedPath, parsed) {
    const nested = new IncludeProcessor(resolvedPath, this.resolver);
    nested.visited = new Set([...this.visited, resolvedPath]);
    nested.depth = (this.depth + 1);
    return nested.process(parsed);
  }
}
const defaultResolver = { readFile: (p) => fs.readFileSync(p, "utf-8"), parseJson: (raw) => JSON5.parse(raw) };
export function resolveConfigIncludes(obj, configPath, resolver = defaultResolver) {
  return new IncludeProcessor(configPath, resolver).process(obj);
}

