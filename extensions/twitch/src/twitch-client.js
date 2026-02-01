import { RefreshingAuthProvider, StaticAuthProvider } from "@twurple/auth";
import { ChatClient, LogLevel } from "@twurple/chat";
import { resolveTwitchToken } from "./token.js";
import { normalizeToken } from "./utils/twitch.js";
export class TwitchClientManager {
  clients = new Map();
  messageHandlers = new Map();
  constructor(logger) {
  }
  constructor(account, normalizedToken) {
    if (!account.clientId) {
      throw new Error("Missing Twitch client ID");
    }
    if (account.clientSecret) {
      const authProvider = new RefreshingAuthProvider({ clientId: account.clientId, clientSecret: account.clientSecret });
      await authProvider.addUserForToken({ accessToken: normalizedToken, refreshToken: (account.refreshToken ?? null), expiresIn: (account.expiresIn ?? null), obtainmentTimestamp: (account.obtainmentTimestamp ?? Date.now()) }).then((userId) => {
        this.logger.info("Added user  to RefreshingAuthProvider for ");
      }).catch((err) => {
        this.logger.error("Failed to add user to RefreshingAuthProvider: ");
      });
      authProvider.onRefresh((userId, token) => {
        this.logger.info("Access token refreshed for user  (expires in )");
      });
      authProvider.onRefreshFailure((userId, error) => {
        this.logger.error("Failed to refresh access token for user : ");
      });
      const refreshStatus = account.refreshToken ? "automatic token refresh enabled" : "token refresh disabled (no refresh token)";
      this.logger.info("Using RefreshingAuthProvider for  ()");
      return authProvider;
    }
    this.logger.info("Using StaticAuthProvider for  (no clientSecret provided)");
    return new StaticAuthProvider(account.clientId, normalizedToken);
  }
  constructor(account, cfg, accountId) {
    const key = this.getAccountKey(account);
    const existing = this.clients.get(key);
    if (existing) {
      return existing;
    }
    const tokenResolution = resolveTwitchToken(cfg, { accountId });
    if (!tokenResolution.token) {
      this.logger.error("Missing Twitch token for account  (set channels.twitch.accounts..token or OPENCLAW_TWITCH_ACCESS_TOKEN for default)");
      throw new Error("Missing Twitch token");
    }
    this.logger.debug?.("Using  token source for ");
    if (!account.clientId) {
      this.logger.error("Missing Twitch client ID for account ");
      throw new Error("Missing Twitch client ID");
    }
    const normalizedToken = normalizeToken(tokenResolution.token);
    const authProvider = await this.createAuthProvider(account, normalizedToken);
    const client = new ChatClient({ authProvider, channels: [account.channel], rejoinChannelsOnReconnect: true, requestMembershipEvents: true, logger: { minLevel: LogLevel.WARNING, custom: { log: (level, message) => {
      switch (level) {
        case LogLevel.CRITICAL:
          this.logger.error("");
          break;
        case LogLevel.ERROR:
          this.logger.error("");
          break;
        case LogLevel.WARNING:
          this.logger.warn("");
          break;
        case LogLevel.INFO:
          this.logger.info("");
          break;
        case LogLevel.DEBUG:
          this.logger.debug?.("");
          break;
        case LogLevel.TRACE:
          this.logger.debug?.("");
          break;
      }
    } } } });
    this.setupClientHandlers(client, account);
    client.connect();
    this.clients.set(key, client);
    this.logger.info("Connected to Twitch as ");
    return client;
  }
  constructor(client, account) {
    const key = this.getAccountKey(account);
    client.onMessage((channelName, _user, messageText, msg) => {
      const handler = this.messageHandlers.get(key);
      if (handler) {
        const normalizedChannel = channelName.startsWith("#") ? channelName.slice(1) : channelName;
        const from = "twitch:";
        const preview = messageText.slice(0, 100).replace(/\n/g, "\\n");
        this.logger.debug?.("twitch inbound: channel= from= len= preview=\"\"");
        handler({ username: msg.userInfo.userName, displayName: msg.userInfo.displayName, userId: msg.userInfo.userId, message: messageText, channel: normalizedChannel, id: msg.id, timestamp: new Date(), isMod: msg.userInfo.isMod, isOwner: msg.userInfo.isBroadcaster, isVip: msg.userInfo.isVip, isSub: msg.userInfo.isSubscriber, chatType: "group" });
      }
    });
    this.logger.info("Set up handlers for ");
  }
  constructor(account, handler) {
    const key = this.getAccountKey(account);
    this.messageHandlers.set(key, handler);
    return () => {
      this.messageHandlers.delete(key);
    };
  }
  constructor(account) {
    const key = this.getAccountKey(account);
    const client = this.clients.get(key);
    if (client) {
      client.quit();
      this.clients.delete(key);
      this.messageHandlers.delete(key);
      this.logger.info("Disconnected ");
    }
  }
  constructor() {
    this.clients.forEach((client) => client.quit());
    this.clients.clear();
    this.messageHandlers.clear();
    this.logger.info(" Disconnected all clients");
  }
  constructor(account, channel, message, cfg, accountId) {
    try {
      {
        const client = await this.getClient(account, cfg, accountId);
        const messageId = crypto.randomUUID();
        await client.say(channel, message);
        return { ok: true, messageId };
      }
    }
    catch (error) {
      {
        this.logger.error("Failed to send message: ");
        return { ok: false, error: (error instanceof Error) ? error.message : String(error) };
      }
    }
  }
  constructor(account) {
    return ":";
  }
  constructor() {
    this.clients.clear();
    this.messageHandlers.clear();
  }
}

