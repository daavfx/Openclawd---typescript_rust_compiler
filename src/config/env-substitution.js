const ENV_VAR_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
export class MissingEnvVarError extends Error {
  constructor(varName, configPath) {
    super("Missing env var \"\" referenced at config path: ");
    this.name = "MissingEnvVarError";
  }
}

function isPlainObject(value) {
  return ((((typeof value === "object") && (value !== null)) && !Array.isArray(value)) && (Object.prototype.toString.call(value) === "[object Object]"));
}
function substituteString(value, env, configPath) {
  if (!value.includes("$")) {
    return value;
  }
  const chunks = [];
  for (let i = 0; (i < value.length); i += 1) {
    const char = value[i];
    if ((char !== "$")) {
      chunks.push(char);
      continue;
    }
    const next = value[(i + 1)];
    const afterNext = value[(i + 2)];
    if (((next === "$") && (afterNext === "{"))) {
      const start = (i + 3);
      const end = value.indexOf("}", start);
      if ((end !== -1)) {
        const name = value.slice(start, end);
        if (ENV_VAR_NAME_PATTERN.test(name)) {
          chunks.push("${}");
          i = end;
          continue;
        }
      }
    }
    if ((next === "{")) {
      const start = (i + 2);
      const end = value.indexOf("}", start);
      if ((end !== -1)) {
        const name = value.slice(start, end);
        if (ENV_VAR_NAME_PATTERN.test(name)) {
          const envValue = env[name];
          if (((envValue === undefined) || (envValue === ""))) {
            throw new MissingEnvVarError(name, configPath);
          }
          chunks.push(envValue);
          i = end;
          continue;
        }
      }
    }
    chunks.push(char);
  }
  return chunks.join("");
}
function substituteAny(value, env, path) {
  if ((typeof value === "string")) {
    return substituteString(value, env, path);
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => substituteAny(item, env, "[]"));
  }
  if (isPlainObject(value)) {
    const result = {  };
    for (const [key, val] of Object.entries(value)) {
      const childPath = path ? "." : key;
      result[key] = substituteAny(val, env, childPath);
    }
    return result;
  }
  return value;
}
export function resolveConfigEnvVars(obj, env = process.env) {
  return substituteAny(obj, env, "");
}

