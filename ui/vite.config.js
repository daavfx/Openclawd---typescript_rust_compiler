import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
const here = path.dirname(fileURLToPath(import.meta.url));
function normalizeBase(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "/";
  }
  if ((trimmed === "./")) {
    return "./";
  }
  if (trimmed.endsWith("/")) {
    return trimmed;
  }
  return "/";
}
