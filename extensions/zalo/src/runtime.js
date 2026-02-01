let runtime = null;
export function setZaloRuntime(next) {
  runtime = next;
}

export function getZaloRuntime() {
  if (!runtime) {
    throw new Error("Zalo runtime not initialized");
  }
  return runtime;
}

