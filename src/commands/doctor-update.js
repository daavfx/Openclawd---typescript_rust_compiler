import { runGatewayUpdate } from "../infra/update-runner.js";
import { isTruthyEnvValue } from "../infra/env.js";
import { runCommandWithTimeout } from "../process/exec.js";
import { note } from "../terminal/note.js";
import { formatCliCommand } from "../cli/command-format.js";
async function detectOpenClawGitCheckout(root) {
  const res = await runCommandWithTimeout(["git", "-C", root, "rev-parse", "--show-toplevel"], { timeoutMs: 5000 }).catch(() => null);
  if (!res) {
    return "unknown";
  }
  if ((res.code !== 0)) {
    if (res.stderr.toLowerCase().includes("not a git repository")) {
      return "not-git";
    }
    return "unknown";
  }
  return (res.stdout.trim() === root) ? "git" : "not-git";
}
export async function maybeOfferUpdateBeforeDoctor(params) {
  const updateInProgress = isTruthyEnvValue(process.env.OPENCLAW_UPDATE_IN_PROGRESS);
  const canOfferUpdate = ((((!updateInProgress && (params.options.nonInteractive !== true)) && (params.options.yes !== true)) && (params.options.repair !== true)) && Boolean(process.stdin.isTTY));
  if ((!canOfferUpdate || !params.root)) {
    return { updated: false };
  }
  const git = await detectOpenClawGitCheckout(params.root);
  if ((git === "git")) {
    const shouldUpdate = await params.confirm({ message: "Update OpenClaw from git before running doctor?", initialValue: true });
    if (!shouldUpdate) {
      return { updated: false };
    }
    note("Running update (fetch/rebase/build/ui:build/doctor)…", "Update");
    const result = await runGatewayUpdate({ cwd: params.root, argv1: process.argv[1] });
    note(["Status: ", "Mode: ", result.root ? "Root: " : null, result.reason ? "Reason: " : null].filter(Boolean).join("
"), "Update result");
    if ((result.status === "ok")) {
      params.outro("Update completed (doctor already ran as part of the update).");
      return { updated: true, handled: true };
    }
    return { updated: true, handled: false };
  }
  if ((git === "not-git")) {
    note(["This install is not a git checkout.", "Run `` to update via your package manager (npm/pnpm), then rerun doctor."].join("
"), "Update");
  }
  return { updated: false };
}

