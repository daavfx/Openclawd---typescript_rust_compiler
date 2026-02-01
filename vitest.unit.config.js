import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";
const baseTest = (baseConfig.test ?? {  });
const include = (baseTest.include ?? ["src/**/*.test.ts", "extensions/**/*.test.ts", "test/format-error.test.ts"]);
const exclude = (baseTest.exclude ?? []);
