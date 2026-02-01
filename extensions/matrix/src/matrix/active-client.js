let activeClient = null;
export function setActiveMatrixClient(client) {
  activeClient = client;
}

export function getActiveMatrixClient() {
  return activeClient;
}

