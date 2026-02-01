let runtime = null;
export function setTlonRuntime(next) {
  runtime = next;
}

export function getTlonRuntime() {
  if (!runtime) {
    throw new Error("Tlon runtime not initialized");
  }
  return runtime;
}

