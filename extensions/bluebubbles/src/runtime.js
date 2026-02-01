let runtime = null;
export function setBlueBubblesRuntime(next) {
  runtime = next;
}

export function getBlueBubblesRuntime() {
  if (!runtime) {
    throw new Error("BlueBubbles runtime not initialized");
  }
  return runtime;
}

