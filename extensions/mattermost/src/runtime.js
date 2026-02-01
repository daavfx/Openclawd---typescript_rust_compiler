let runtime = null;
export function setMattermostRuntime(next) {
  runtime = next;
}

export function getMattermostRuntime() {
  if (!runtime) {
    throw new Error("Mattermost runtime not initialized");
  }
  return runtime;
}

