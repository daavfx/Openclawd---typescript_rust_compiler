import { vi } from "vitest";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
export async function withTempHome(fn) {
  return withTempHomeBase(fn, { prefix: "openclaw-config-" });
}

export async function withEnvOverride(overrides, fn) {
  const saved = {  };
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if ((overrides[key] === undefined)) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  vi.resetModules();
  try {
    {
      return await fn();
    }
  }
  finally {
    {
      for (const key of Object.keys(saved)) {
        if ((saved[key] === undefined)) {
          delete process.env[key];
        } else {
          process.env[key] = saved[key];
        }
      }
      vi.resetModules();
    }
  }
}

