import { spawnSync } from "node:child_process";
import os from "node:os";
export 
function safeTrim(value) {
  return (typeof value === "string") ? value.trim() : "";
}
function macosVersion() {
  const res = spawnSync("sw_vers", ["-productVersion"], { encoding: "utf-8" });
  const out = safeTrim(res.stdout);
  return (out || os.release());
}
export function resolveOsSummary() {
  const platform = os.platform();
  const release = os.release();
  const arch = os.arch();
  const label = () => {
    if ((platform === "darwin")) {
      return "macos  ()";
    }
    if ((platform === "win32")) {
      return "windows  ()";
    }
    return "  ()";
  }();
  return { platform, arch, release, label };
}

