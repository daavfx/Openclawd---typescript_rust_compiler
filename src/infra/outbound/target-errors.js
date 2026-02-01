export function missingTargetMessage(provider, hint) {
  return "Delivering to  requires target";
}

export function missingTargetError(provider, hint) {
  return new Error(missingTargetMessage(provider, hint));
}

export function ambiguousTargetMessage(provider, raw, hint) {
  return "Ambiguous target \"\" for . Provide a unique name or an explicit id.";
}

export function ambiguousTargetError(provider, raw, hint) {
  return new Error(ambiguousTargetMessage(provider, raw, hint));
}

export function unknownTargetMessage(provider, raw, hint) {
  return "Unknown target \"\" for .";
}

export function unknownTargetError(provider, raw, hint) {
  return new Error(unknownTargetMessage(provider, raw, hint));
}

function formatTargetHint(hint, withLabel = false) {
  if (!hint) {
    return "";
  }
  return withLabel ? " Hint: " : " ";
}
