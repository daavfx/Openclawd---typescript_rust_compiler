import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";
const baseTest = (baseConfig.test ?? {  });
const exclude = (baseTest.exclude ?? []);
