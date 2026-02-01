import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { resolveOAuthDir, resolveStateDir } from "../config/paths.js";
import { loadSessionStore, resolveMainSessionKey, resolveSessionFilePath, resolveSessionTranscriptsDirForAgent, resolveStorePath } from "../config/sessions.js";
import { note } from "../terminal/note.js";
import { shortenHomePath } from "../utils.js";
function existsDir(dir) {
  try {
    {
      return (fs.existsSync(dir) && fs.statSync(dir).isDirectory());
    }
  }
  catch {
    {
      return false;
    }
  }
}
function existsFile(filePath) {
  try {
    {
      return (fs.existsSync(filePath) && fs.statSync(filePath).isFile());
    }
  }
  catch {
    {
      return false;
    }
  }
}
function canWriteDir(dir) {
  try {
    {
      fs.accessSync(dir, fs.constants.W_OK);
      return true;
    }
  }
  catch {
    {
      return false;
    }
  }
}
function ensureDir(dir) {
  try {
    {
      fs.mkdirSync(dir, { recursive: true });
      return { ok: true };
    }
  }
  catch (err) {
    {
      return { ok: false, error: String(err) };
    }
  }
}
function dirPermissionHint(dir) {
  const uid = (typeof process.getuid === "function") ? process.getuid() : null;
  const gid = (typeof process.getgid === "function") ? process.getgid() : null;
  try {
    {
      const stat = fs.statSync(dir);
      if (((uid !== null) && (stat.uid !== uid))) {
        return "Owner mismatch (uid ). Run: sudo chown -R $USER \"\"";
      }
      if (((gid !== null) && (stat.gid !== gid))) {
        return "Group mismatch (gid ). If access fails, run: sudo chown -R $USER \"\"";
      }
    }
  }
  catch {
    {
      return null;
    }
  }
  return null;
}
function addUserRwx(mode) {
  const perms = (mode & 511);
  return (perms | 448);
}
function countJsonlLines(filePath) {
  try {
    {
      const raw = fs.readFileSync(filePath, "utf-8");
      if (!raw) {
        return 0;
      }
      let count = 0;
      for (let i = 0; (i < raw.length); i += 1) {
        if ((raw[i] === "
")) {
          count += 1;
        }
      }
      if (!raw.endsWith("
")) {
        count += 1;
      }
      return count;
    }
  }
  catch {
    {
      return 0;
    }
  }
}
function findOtherStateDirs(stateDir) {
  const resolvedState = path.resolve(stateDir);
  const roots = (process.platform === "darwin") ? ["/Users"] : (process.platform === "linux") ? ["/home"] : [];
  const found = [];
  for (const root of roots) {
    let entries = [];
    try {
      {
        entries = fs.readdirSync(root, { withFileTypes: true });
      }
    }
    catch {
      {
        continue;
      }
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (entry.name.startsWith(".")) {
        continue;
      }
      const candidates = [".openclaw"].map((dir) => path.resolve(root, entry.name, dir));
      for (const candidate of candidates) {
        if ((candidate === resolvedState)) {
          continue;
        }
        if (existsDir(candidate)) {
          found.push(candidate);
        }
      }
    }
  }
  return found;
}
export async function noteStateIntegrity(cfg, prompter, configPath) {
  const warnings = [];
  const changes = [];
  const env = process.env;
  const homedir = os.homedir;
  const stateDir = resolveStateDir(env, homedir);
  const defaultStateDir = path.join(homedir(), ".openclaw");
  const oauthDir = resolveOAuthDir(env, stateDir);
  const agentId = resolveDefaultAgentId(cfg);
  const sessionsDir = resolveSessionTranscriptsDirForAgent(agentId, env, homedir);
  const storePath = resolveStorePath(cfg.session?.store, { agentId });
  const storeDir = path.dirname(storePath);
  const displayStateDir = shortenHomePath(stateDir);
  const displayOauthDir = shortenHomePath(oauthDir);
  const displaySessionsDir = shortenHomePath(sessionsDir);
  const displayStoreDir = shortenHomePath(storeDir);
  const displayConfigPath = configPath ? shortenHomePath(configPath) : undefined;
  let stateDirExists = existsDir(stateDir);
  if (!stateDirExists) {
    warnings.push("- CRITICAL: state directory missing (). Sessions, credentials, logs, and config are stored there.");
    if ((cfg.gateway?.mode === "remote")) {
      warnings.push("- Gateway is in remote mode; run doctor on the remote host where the gateway runs.");
    }
    const create = await prompter.confirmSkipInNonInteractive({ message: "Create  now?", initialValue: false });
    if (create) {
      const created = ensureDir(stateDir);
      if (created.ok) {
        changes.push("- Created ");
        stateDirExists = true;
      } else {
        warnings.push("- Failed to create : ");
      }
    }
  }
  if ((stateDirExists && !canWriteDir(stateDir))) {
    warnings.push("- State directory not writable ().");
    const hint = dirPermissionHint(stateDir);
    if (hint) {
      warnings.push("  ");
    }
    const repair = await prompter.confirmSkipInNonInteractive({ message: "Repair permissions on ?", initialValue: true });
    if (repair) {
      try {
        {
          const stat = fs.statSync(stateDir);
          const target = addUserRwx(stat.mode);
          fs.chmodSync(stateDir, target);
          changes.push("- Repaired permissions on ");
        }
      }
      catch (err) {
        {
          warnings.push("- Failed to repair : ");
        }
      }
    }
  }
  if ((stateDirExists && (process.platform !== "win32"))) {
    try {
      {
        const stat = fs.statSync(stateDir);
        if (((stat.mode & 63) !== 0)) {
          warnings.push("- State directory permissions are too open (). Recommend chmod 700.");
          const tighten = await prompter.confirmSkipInNonInteractive({ message: "Tighten permissions on  to 700?", initialValue: true });
          if (tighten) {
            fs.chmodSync(stateDir, 448);
            changes.push("- Tightened permissions on  to 700");
          }
        }
      }
    }
    catch (err) {
      {
        warnings.push("- Failed to read  permissions: ");
      }
    }
  }
  if (((configPath && existsFile(configPath)) && (process.platform !== "win32"))) {
    try {
      {
        const stat = fs.statSync(configPath);
        if (((stat.mode & 63) !== 0)) {
          warnings.push("- Config file is group/world readable (). Recommend chmod 600.");
          const tighten = await prompter.confirmSkipInNonInteractive({ message: "Tighten permissions on  to 600?", initialValue: true });
          if (tighten) {
            fs.chmodSync(configPath, 384);
            changes.push("- Tightened permissions on  to 600");
          }
        }
      }
    }
    catch (err) {
      {
        warnings.push("- Failed to read config permissions (): ");
      }
    }
  }
  if (stateDirExists) {
    const dirCandidates = new Map();
    dirCandidates.set(sessionsDir, "Sessions dir");
    dirCandidates.set(storeDir, "Session store dir");
    dirCandidates.set(oauthDir, "OAuth dir");
    const displayDirFor = (dir) => {
      if ((dir === sessionsDir)) {
        return displaySessionsDir;
      }
      if ((dir === storeDir)) {
        return displayStoreDir;
      }
      if ((dir === oauthDir)) {
        return displayOauthDir;
      }
      return shortenHomePath(dir);
    };
    for (const [dir, label] of dirCandidates) {
      const displayDir = displayDirFor(dir);
      if (!existsDir(dir)) {
        warnings.push("- CRITICAL:  missing ().");
        const create = await prompter.confirmSkipInNonInteractive({ message: "Create  at ?", initialValue: true });
        if (create) {
          const created = ensureDir(dir);
          if (created.ok) {
            changes.push("- Created : ");
          } else {
            warnings.push("- Failed to create : ");
          }
        }
        continue;
      }
      if (!canWriteDir(dir)) {
        warnings.push("-  not writable ().");
        const hint = dirPermissionHint(dir);
        if (hint) {
          warnings.push("  ");
        }
        const repair = await prompter.confirmSkipInNonInteractive({ message: "Repair permissions on ?", initialValue: true });
        if (repair) {
          try {
            {
              const stat = fs.statSync(dir);
              const target = addUserRwx(stat.mode);
              fs.chmodSync(dir, target);
              changes.push("- Repaired permissions on : ");
            }
          }
          catch (err) {
            {
              warnings.push("- Failed to repair : ");
            }
          }
        }
      }
    }
  }
  const extraStateDirs = new Set();
  if ((path.resolve(stateDir) !== path.resolve(defaultStateDir))) {
    if (existsDir(defaultStateDir)) {
      extraStateDirs.add(defaultStateDir);
    }
  }
  for (const other of findOtherStateDirs(stateDir)) {
    extraStateDirs.add(other);
  }
  if ((extraStateDirs.size > 0)) {
    warnings.push(["- Multiple state directories detected. This can split session history.", ...Array.from(extraStateDirs).map((dir) => "  - "), "  Active state dir: "].join("
"));
  }
  const store = loadSessionStore(storePath);
  const entries = Object.entries(store).filter(([, entry]) => (entry && (typeof entry === "object")));
  if ((entries.length > 0)) {
    const recent = entries.slice().sort((a, b) => {
      const aUpdated = (typeof a[1].updatedAt === "number") ? a[1].updatedAt : 0;
      const bUpdated = (typeof b[1].updatedAt === "number") ? b[1].updatedAt : 0;
      return (bUpdated - aUpdated);
    }).slice(0, 5);
    const missing = recent.filter(([, entry]) => {
      const sessionId = entry.sessionId;
      if (!sessionId) {
        return false;
      }
      const transcriptPath = resolveSessionFilePath(sessionId, entry, { agentId });
      return !existsFile(transcriptPath);
    });
    if ((missing.length > 0)) {
      warnings.push("- / recent sessions are missing transcripts. Check for deleted session files or split state dirs.");
    }
    const mainKey = resolveMainSessionKey(cfg);
    const mainEntry = store[mainKey];
    if (mainEntry?.sessionId) {
      const transcriptPath = resolveSessionFilePath(mainEntry.sessionId, mainEntry, { agentId });
      if (!existsFile(transcriptPath)) {
        warnings.push("- Main session transcript missing (). History will appear to reset.");
      } else {
        const lineCount = countJsonlLines(transcriptPath);
        if ((lineCount <= 1)) {
          warnings.push("- Main session transcript has only  line. Session history may not be appending.");
        }
      }
    }
  }
  if ((warnings.length > 0)) {
    note(warnings.join("
"), "State integrity");
  }
  if ((changes.length > 0)) {
    note(changes.join("
"), "Doctor changes");
  }
}

export function noteWorkspaceBackupTip(workspaceDir) {
  if (!existsDir(workspaceDir)) {
    return;
  }
  const gitMarker = path.join(workspaceDir, ".git");
  if (fs.existsSync(gitMarker)) {
    return;
  }
  note(["- Tip: back up the workspace in a private git repo (GitHub or GitLab).", "- Keep ~/.openclaw out of git; it contains credentials and session history.", "- Details: /concepts/agent-workspace#git-backup-recommended"].join("
"), "Workspace");
}

