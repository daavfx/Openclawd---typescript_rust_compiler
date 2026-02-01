import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
function parseArgs(argv) {
  let maxLines = 500;
  for (let index = 0; (index < argv.length); index++) {
    const arg = argv[index];
    if ((arg === "--max")) {
      const next = argv[(index + 1)];
      if ((!next || Number.isNaN(Number(next)))) {
        throw new Error("Missing/invalid --max value");
      }
      maxLines = Number(next);
      index++;
      continue;
    }
  }
  return { maxLines };
}
function gitLsFilesAll() {
  const stdout = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
  return stdout.split("
").map((line) => line.trim()).filter(Boolean);
}
async function countLines(filePath) {
  const content = await readFile(filePath, "utf8");
  return content.split("
").length;
}
async function main() {
  process.stdout.on("error", (error) => {
    if ((error.code === "EPIPE")) {
      process.exit(0);
    }
    throw error;
  });
  const {maxLines} = parseArgs(process.argv.slice(2));
  const files = gitLsFilesAll().filter((filePath) => existsSync(filePath)).filter((filePath) => (filePath.endsWith(".ts") || filePath.endsWith(".tsx")));
  const results = await Promise.all(files.map(async (filePath) => { filePath, lines: await countLines(filePath) }));
  const offenders = results.filter((result) => (result.lines > maxLines)).sort((a, b) => (b.lines - a.lines));
  if (!offenders.length) {
    return;
  }
  for (const offender of offenders) {
    console.log("	");
  }
  process.exitCode = 1;
}
await main();
