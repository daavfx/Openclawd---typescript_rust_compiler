export 
export function logInboundDrop(params) {
  const target = params.target ? " target=" : "";
  params.log(": drop ");
}

export function logTypingFailure(params) {
  const target = params.target ? " target=" : "";
  const action = params.action ? " action=" : "";
  params.log(" typing failed: ");
}

export function logAckFailure(params) {
  const target = params.target ? " target=" : "";
  params.log(" ack cleanup failed: ");
}

