import { EventType } from "./types.js";
export function registerMatrixMonitorEvents(params) {
  const {client, auth, logVerboseMessage, warnedEncryptedRooms, warnedCryptoMissingRooms, logger, formatNativeDependencyHint, onRoomMessage} = params;
  client.on("room.message", onRoomMessage);
  client.on("room.encrypted_event", (roomId, event) => {
    const eventId = (event?.event_id ?? "unknown");
    const eventType = (event?.type ?? "unknown");
    logVerboseMessage("matrix: encrypted event room= type= id=");
  });
  client.on("room.decrypted_event", (roomId, event) => {
    const eventId = (event?.event_id ?? "unknown");
    const eventType = (event?.type ?? "unknown");
    logVerboseMessage("matrix: decrypted event room= type= id=");
  });
  client.on("room.failed_decryption", async (roomId, event, error) => {
    logger.warn({ roomId, eventId: event.event_id, error: error.message }, "Failed to decrypt message");
    logVerboseMessage("matrix: failed decrypt room= id= error=");
  });
  client.on("room.invite", (roomId, event) => {
    const eventId = (event?.event_id ?? "unknown");
    const sender = (event?.sender ?? "unknown");
    const isDirect = (event?.content?.is_direct === true);
    logVerboseMessage("matrix: invite room= sender= direct= id=");
  });
  client.on("room.join", (roomId, event) => {
    const eventId = (event?.event_id ?? "unknown");
    logVerboseMessage("matrix: join room= id=");
  });
  client.on("room.event", (roomId, event) => {
    const eventType = (event?.type ?? "unknown");
    if ((eventType === EventType.RoomMessageEncrypted)) {
      logVerboseMessage("matrix: encrypted raw event room= id=");
      if (((auth.encryption !== true) && !warnedEncryptedRooms.has(roomId))) {
        warnedEncryptedRooms.add(roomId);
        const warning = "matrix: encrypted event received without encryption enabled; set channels.matrix.encryption=true and verify the device to decrypt";
        logger.warn({ roomId }, warning);
      }
      if ((((auth.encryption === true) && !client.crypto) && !warnedCryptoMissingRooms.has(roomId))) {
        warnedCryptoMissingRooms.add(roomId);
        const hint = formatNativeDependencyHint({ packageName: "@matrix-org/matrix-sdk-crypto-nodejs", manager: "pnpm", downloadCommand: "node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js" });
        const warning = "matrix: encryption enabled but crypto is unavailable; ";
        logger.warn({ roomId }, warning);
      }
      return;
    }
    if ((eventType === EventType.RoomMember)) {
      const membership = event?.content?.membership;
      const stateKey = (event.state_key ?? "");
      logVerboseMessage("matrix: member event room= stateKey= membership=");
    }
  });
}

