import { enableSystemdUserLinger, isSystemdUserServiceAvailable, readSystemdUserLingerStatus } from "../daemon/systemd.js";
import { note } from "../terminal/note.js";
export 
export async function ensureSystemdUserLingerInteractive(params) {
  if ((process.platform !== "linux")) {
    return;
  }
  if ((params.prompt === false)) {
    return;
  }
  const env = (params.env ?? process.env);
  const prompter = (params.prompter ?? { note });
  const title = (params.title ?? "Systemd");
  if (!await isSystemdUserServiceAvailable()) {
    await prompter.note("Systemd user services are unavailable. Skipping lingering checks.", title);
    return;
  }
  const status = await readSystemdUserLingerStatus(env);
  if (!status) {
    await prompter.note("Unable to read loginctl linger status. Ensure systemd + loginctl are available.", title);
    return;
  }
  if ((status.linger === "yes")) {
    return;
  }
  const reason = (params.reason ?? "Systemd user services stop when you log out or go idle, which kills the Gateway.");
  const actionNote = params.requireConfirm ? "We can enable lingering now (may require sudo; writes /var/lib/systemd/linger)." : "Enabling lingering now (may require sudo; writes /var/lib/systemd/linger).";
  await prompter.note("
", title);
  if ((params.requireConfirm && prompter.confirm)) {
    const ok = await prompter.confirm({ message: "Enable systemd lingering for ?", initialValue: true });
    if (!ok) {
      await prompter.note("Without lingering, the Gateway will stop when you log out.", title);
      return;
    }
  }
  const resultNoSudo = await enableSystemdUserLinger({ env, user: status.user });
  if (resultNoSudo.ok) {
    await prompter.note("Enabled systemd lingering for .", title);
    return;
  }
  const result = await enableSystemdUserLinger({ env, user: status.user, sudoMode: "prompt" });
  if (result.ok) {
    await prompter.note("Enabled systemd lingering for .", title);
    return;
  }
  params.runtime.error("Failed to enable lingering: ");
  await prompter.note("Run manually: sudo loginctl enable-linger ", title);
}

export async function ensureSystemdUserLingerNonInteractive(params) {
  if ((process.platform !== "linux")) {
    return;
  }
  const env = (params.env ?? process.env);
  if (!await isSystemdUserServiceAvailable()) {
    return;
  }
  const status = await readSystemdUserLingerStatus(env);
  if ((!status || (status.linger === "yes"))) {
    return;
  }
  const result = await enableSystemdUserLinger({ env, user: status.user, sudoMode: "non-interactive" });
  if (result.ok) {
    params.runtime.log("Enabled systemd lingering for .");
    return;
  }
  params.runtime.log("Systemd lingering is disabled for . Run: sudo loginctl enable-linger ");
}

