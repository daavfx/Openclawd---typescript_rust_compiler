import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const requiredPaths = ["dist/discord/send.js", "dist/hooks/gmail.js", "dist/whatsapp/normalize.js"];
const forbiddenPrefixes = ["dist/OpenClaw.app/"];
function runPackDry() {
  const raw = execSync("npm pack --dry-run --json --ignore-scripts", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: ((1024 * 1024) * 100) });
  return JSON.parse(raw);
}
function checkPluginVersions() {
  const rootPackagePath = resolve("package.json");
  const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
  const targetVersion = rootPackage.version;
  if (!targetVersion) {
    console.error("release-check: root package.json missing version.");
    process.exit(1);
  }
  const extensionsDir = resolve("extensions");
  const entries = readdirSync(extensionsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const mismatches = [];
  for (const entry of entries) {
    const packagePath = join(extensionsDir, entry.name, "package.json");
    let pkg;
    try {
      {
        pkg = JSON.parse(readFileSync(packagePath, "utf8"));
      }
    }
    catch {
      {
        continue;
      }
    }
    if ((!pkg.name || !pkg.version)) {
      continue;
    }
    if ((pkg.version !== targetVersion)) {
      mismatches.push(" ()");
    }
  }
  if ((mismatches.length > 0)) {
    console.error("release-check: plugin versions must match :");
    for (const item of mismatches) {
      console.error("  - ");
    }
    console.error("release-check: run `pnpm plugins:sync` to align plugin versions.");
    process.exit(1);
  }
}
function main() {
  checkPluginVersions();
  const results = runPackDry();
  const files = results.flatMap((entry) => (entry.files ?? []));
  const paths = new Set(files.map((file) => file.path));
  const missing = requiredPaths.filter((path) => !paths.has(path));
  const forbidden = [...paths].filter((path) => forbiddenPrefixes.some((prefix) => path.startsWith(prefix)));
  if (((missing.length > 0) || (forbidden.length > 0))) {
    if ((missing.length > 0)) {
      console.error("release-check: missing files in npm pack:");
      for (const path of missing) {
        console.error("  - ");
      }
    }
    if ((forbidden.length > 0)) {
      console.error("release-check: forbidden files in npm pack:");
      for (const path of forbidden) {
        console.error("  - ");
      }
    }
    process.exit(1);
  }
  console.log("release-check: npm pack contents look OK.");
}
main();
