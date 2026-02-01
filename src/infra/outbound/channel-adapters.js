export 
const DEFAULT_ADAPTER = { supportsEmbeds: false };
const DISCORD_ADAPTER = { supportsEmbeds: true, buildCrossContextEmbeds: (originLabel) => [{ description: "From " }] };
export function getChannelMessageAdapter(channel) {
  if ((channel === "discord")) {
    return DISCORD_ADAPTER;
  }
  return DEFAULT_ADAPTER;
}

