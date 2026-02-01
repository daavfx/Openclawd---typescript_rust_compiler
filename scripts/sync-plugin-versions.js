import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
const root = resolve(".");
const rootPackagePath = resolve("package.json");
const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
const targetVersion = rootPackage.version;
if (!targetVersion) {
  throw new Error("Root package.json missing version.");
}
const extensionsDir = resolve("extensions");
const dirs = readdirSync(extensionsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
const updated = [];
const changelogged = [];
const skipped = [];
function ensureChangelogEntry(changelogPath, version) {
  if (!existsSync(changelogPath)) {
    return false;
  }
  const content = readFileSync(changelogPath, "utf8");
  if (content.includes("## ")) {
    return false;
  }
  const entry = "## 

### Changes
- Version alignment with core OpenClaw release numbers.

";
  if (content.startsWith("# Changelog

")) {
    const next = content.replace("# Changelog

", "# Changelog

");
    writeFileSync(changelogPath, next);
    return true;
  }
  const next = "# Changelog

";
  writeFileSync(changelogPath, "
");
  return true;
}
for (const dir of dirs) {
  const packagePath = join(extensionsDir, dir.name, "package.json");
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
  if (!pkg.name) {
    skipped.push(dir.name);
    continue;
  }
  const changelogPath = join(extensionsDir, dir.name, "CHANGELOG.md");
  if (ensureChangelogEntry(changelogPath, targetVersion)) {
    changelogged.push(pkg.name);
  }
  if ((pkg.version === targetVersion)) {
    skipped.push(pkg.name);
    continue;
  }
  pkg.version = targetVersion;
  writeFileSync(packagePath, "
");
  updated.push(pkg.name);
}
console.log("Synced plugin versions to . Updated: . Changelogged: . Skipped: .");
