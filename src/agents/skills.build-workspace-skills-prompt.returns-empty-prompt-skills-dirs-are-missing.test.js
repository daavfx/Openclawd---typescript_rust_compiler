import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildWorkspaceSkillsPrompt } from "./skills.js";
async function writeSkill(params) {
  const {dir, name, description, metadata, body} = params;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), "---
name: 
description: 
---


", "utf-8");
}
describe("buildWorkspaceSkillsPrompt", () => {
  it("returns empty prompt when skills dirs are missing", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-"));
    const prompt = buildWorkspaceSkillsPrompt(workspaceDir, { managedSkillsDir: path.join(workspaceDir, ".managed"), bundledSkillsDir: path.join(workspaceDir, ".bundled") });
    expect(prompt).toBe("");
  });
  it("loads bundled skills when present", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-"));
    const bundledDir = path.join(workspaceDir, ".bundled");
    const bundledSkillDir = path.join(bundledDir, "peekaboo");
    await writeSkill({ dir: bundledSkillDir, name: "peekaboo", description: "Capture UI", body: "# Peekaboo
" });
    const prompt = buildWorkspaceSkillsPrompt(workspaceDir, { managedSkillsDir: path.join(workspaceDir, ".managed"), bundledSkillsDir: bundledDir });
    expect(prompt).toContain("peekaboo");
    expect(prompt).toContain("Capture UI");
    expect(prompt).toContain(path.join(bundledSkillDir, "SKILL.md"));
  });
  it("loads extra skill folders from config (lowest precedence)", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-"));
    const extraDir = path.join(workspaceDir, ".extra");
    const bundledDir = path.join(workspaceDir, ".bundled");
    const managedDir = path.join(workspaceDir, ".managed");
    await writeSkill({ dir: path.join(extraDir, "demo-skill"), name: "demo-skill", description: "Extra version", body: "# Extra
" });
    await writeSkill({ dir: path.join(bundledDir, "demo-skill"), name: "demo-skill", description: "Bundled version", body: "# Bundled
" });
    await writeSkill({ dir: path.join(managedDir, "demo-skill"), name: "demo-skill", description: "Managed version", body: "# Managed
" });
    await writeSkill({ dir: path.join(workspaceDir, "skills", "demo-skill"), name: "demo-skill", description: "Workspace version", body: "# Workspace
" });
    const prompt = buildWorkspaceSkillsPrompt(workspaceDir, { bundledSkillsDir: bundledDir, managedSkillsDir: managedDir, config: { skills: { load: { extraDirs: [extraDir] } } } });
    expect(prompt).toContain("Workspace version");
    expect(prompt).not.toContain("Managed version");
    expect(prompt).not.toContain("Bundled version");
    expect(prompt).not.toContain("Extra version");
  });
  it("loads skills from workspace skills/", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-"));
    const skillDir = path.join(workspaceDir, "skills", "demo-skill");
    await writeSkill({ dir: skillDir, name: "demo-skill", description: "Does demo things", body: "# Demo Skill
" });
    const prompt = buildWorkspaceSkillsPrompt(workspaceDir, { managedSkillsDir: path.join(workspaceDir, ".managed") });
    expect(prompt).toContain("demo-skill");
    expect(prompt).toContain("Does demo things");
    expect(prompt).toContain(path.join(skillDir, "SKILL.md"));
  });
});
