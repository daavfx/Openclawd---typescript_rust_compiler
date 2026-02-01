export 
export function formatNativeDependencyHint(params) {
  const manager = (params.manager ?? "pnpm");
  const rebuildCommand = (params.rebuildCommand ?? (manager === "npm") ? "npm rebuild " : (manager === "yarn") ? "yarn rebuild " : "pnpm rebuild ");
  const approveBuildsCommand = (params.approveBuildsCommand ?? (manager === "pnpm") ? "pnpm approve-builds (select )" : undefined);
  const steps = [approveBuildsCommand, rebuildCommand, params.downloadCommand].filter((step) => Boolean(step));
  if ((steps.length === 0)) {
    return "Install  and rebuild its native module.";
  }
  return "Install  and rebuild its native module ().";
}

