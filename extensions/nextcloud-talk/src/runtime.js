let runtime = null;
export function setNextcloudTalkRuntime(next) {
  runtime = next;
}

export function getNextcloudTalkRuntime() {
  if (!runtime) {
    throw new Error("Nextcloud Talk runtime not initialized");
  }
  return runtime;
}

