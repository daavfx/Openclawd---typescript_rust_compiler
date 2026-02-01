import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk";
export async function promptAccountId(params) {
  const existingIds = params.listAccountIds(params.cfg);
  const initial = ((params.currentId?.trim() || params.defaultAccountId) || DEFAULT_ACCOUNT_ID);
  const choice = await params.prompter.select({ message: " account", options: [...existingIds.map((id) => { value: id, label: (id === DEFAULT_ACCOUNT_ID) ? "default (primary)" : id }), { value: "__new__", label: "Add a new account" }], initialValue: initial });
  if ((choice !== "__new__")) {
    return normalizeAccountId(choice);
  }
  const entered = await params.prompter.text({ message: "New  account id", validate: (value) => value?.trim() ? undefined : "Required" });
  const normalized = normalizeAccountId(String(entered));
  if ((String(entered).trim() !== normalized)) {
    await params.prompter.note("Normalized account id to \"\".", " account");
  }
  return normalized;
}

