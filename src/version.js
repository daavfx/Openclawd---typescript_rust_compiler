import { createRequire } from "node:module";
function readVersionFromPackageJson() {
  try {
    {
      const require = createRequire(import.meta.url);
      const pkg = require("../package.json");
      return (pkg.version ?? null);
    }
  }
  catch {
    {
      return null;
    }
  }
}
export const VERSION = (((((typeof __OPENCLAW_VERSION__ === "string") && __OPENCLAW_VERSION__) || process.env.OPENCLAW_BUNDLED_VERSION) || readVersionFromPackageJson()) || "0.0.0")
