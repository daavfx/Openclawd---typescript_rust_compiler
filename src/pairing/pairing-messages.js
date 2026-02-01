import { formatCliCommand } from "../cli/command-format.js";
export function buildPairingReply(params) {
  const {channel, idLine, code} = params;
  return ["OpenClaw: access not configured.", "", idLine, "", "Pairing code: ", "", "Ask the bot owner to approve with:", formatCliCommand("openclaw pairing approve  <code>")].join("
");
}

