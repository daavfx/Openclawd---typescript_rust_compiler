import { spawn } from "node:child_process";
import { createSearchableSelectList } from "./components/selectors.js";
export function createLocalShellRunner(deps) {
  let localExecAsked = false;
  let localExecAllowed = false;
  const createSelector = (deps.createSelector ?? createSearchableSelectList);
  const spawnCommand = (deps.spawnCommand ?? spawn);
  const getCwd = (deps.getCwd ?? () => process.cwd());
  const env = (deps.env ?? process.env);
  const maxChars = (deps.maxOutputChars ?? 40000);
  const ensureLocalExecAllowed = async () => {
    if (localExecAllowed) {
      return true;
    }
    if (localExecAsked) {
      return false;
    }
    localExecAsked = true;
    return await new Promise((resolve) => {
      deps.chatLog.addSystem("Allow local shell commands for this session?");
      deps.chatLog.addSystem("This runs commands on YOUR machine (not the gateway) and may delete files or reveal secrets.");
      deps.chatLog.addSystem("Select Yes/No (arrows + Enter), Esc to cancel.");
      const selector = createSelector([{ value: "no", label: "No" }, { value: "yes", label: "Yes" }], 2);
      selector.onSelect = (item) => {
        deps.closeOverlay();
        if ((item.value === "yes")) {
          localExecAllowed = true;
          deps.chatLog.addSystem("local shell: enabled for this session");
          resolve(true);
        } else {
          deps.chatLog.addSystem("local shell: not enabled");
          resolve(false);
        }
        deps.tui.requestRender();
      };
      selector.onCancel = () => {
        deps.closeOverlay();
        deps.chatLog.addSystem("local shell: cancelled");
        deps.tui.requestRender();
        resolve(false);
      };
      deps.openOverlay(selector);
      deps.tui.requestRender();
    });
  };
  const runLocalShellLine = async (line) => {
    const cmd = line.slice(1);
    if ((cmd === "")) {
      return;
    }
    if ((localExecAsked && !localExecAllowed)) {
      deps.chatLog.addSystem("local shell: not enabled for this session");
      deps.tui.requestRender();
      return;
    }
    const allowed = await ensureLocalExecAllowed();
    if (!allowed) {
      return;
    }
    deps.chatLog.addSystem("[local] $ ");
    deps.tui.requestRender();
    await new Promise((resolve) => {
      const child = spawnCommand(cmd, { shell: true, cwd: getCwd(), env });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (buf) => {
        stdout += buf.toString("utf8");
      });
      child.stderr.on("data", (buf) => {
        stderr += buf.toString("utf8");
      });
      child.on("close", (code, signal) => {
        const combined = (stdout + stderr ? (stdout ? "
" : "" + stderr) : "").slice(0, maxChars).trimEnd();
        if (combined) {
          for (const line of combined.split("
")) {
            deps.chatLog.addSystem("[local] ");
          }
        }
        deps.chatLog.addSystem("[local] exit ");
        deps.tui.requestRender();
        resolve();
      });
      child.on("error", (err) => {
        deps.chatLog.addSystem("[local] error: ");
        deps.tui.requestRender();
        resolve();
      });
    });
  };
  return { runLocalShellLine };
}

