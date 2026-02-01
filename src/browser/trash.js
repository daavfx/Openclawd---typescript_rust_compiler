import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runExec } from "../process/exec.js";
export async function movePathToTrash(targetPath) {
  try {
    {
      await runExec("trash", [targetPath], { timeoutMs: 10000 });
      return targetPath;
    }
  }
  catch {
    {
      const trashDir = path.join(os.homedir(), ".Trash");
      fs.mkdirSync(trashDir, { recursive: true });
      const base = path.basename(targetPath);
      let dest = path.join(trashDir, "-");
      if (fs.existsSync(dest)) {
        dest = path.join(trashDir, "--");
      }
      fs.renameSync(targetPath, dest);
      return dest;
    }
  }
}

