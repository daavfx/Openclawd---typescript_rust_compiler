export function normalizeInboundTextNewlines(input) {
  return input.replaceAll("
", "
").replaceAll("", "
").replaceAll("\\n", "
");
}

