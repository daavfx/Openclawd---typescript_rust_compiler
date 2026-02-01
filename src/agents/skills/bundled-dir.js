import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function resolveBundledSkillsDir() {
  const override = process.env.OPENCLAW_BUNDLED_SKILLS_DIR?.trim();
  if (override) {
    return override;
  }
  try {
    {
      const execDir = path.dirname(process.execPath);
      const sibling = path.join(execDir, "skills");
      if (fs.existsSync(sibling)) {
        return sibling;
      }
    }
  }
  catch {
    {
    }
  }
  try {
    {
      const moduleDir = path.dirname(fileURLToPath(import.meta.url));
      const root = path.resolve(moduleDir, "..", "..", "..");
      const candidate = path.join(root, "skills");
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  catch {
    {
    }
  }
  return undefined;
}

