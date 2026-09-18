import { Client, GatewayIntentBits } from "discord.js";
import type { AppConfig } from "../config/appConfig.js";
import type { AppLogger } from "../logging/logger.js";
import type { HealthCheck, HealthCheckResult } from "../shared/health.js";

export class DiscordRuntime implements HealthCheck {
  public readonly name = "discord";

  private readonly client: Client;
  private started = false;

  public constructor(
    private readonly config: AppConfig,
    private readonly logger: AppLogger
  ) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
    });

    this.client.once("ready", (readyClient) => {
      this.logger.info({ botUserId: readyClient.user.id, botTag: readyClient.user.tag }, "Discord client ready.");
    });

    this.client.on("error", (error) => {
      this.logger.error({ error }, "Discord client emitted an error.");
    });
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;

    if (this.config.discord.token == null) {
      this.logger.warn("DISCORD_TOKEN is not configured; Discord gateway startup skipped.");
      return;
    }

    try {
      await this.client.login(this.config.discord.token);
    } catch (error) {
      this.logger.error({ error }, "Discord login failed.");
    }
  }

  public async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.client.destroy();
    this.started = false;
  }

  public async check(): Promise<HealthCheckResult> {
    if (this.config.discord.token == null) {
      return { state: "down", detail: "DISCORD_TOKEN is not configured." };
    }

    if (!this.client.isReady()) {
      return { state: "down", detail: "Discord client is not ready." };
    }

    return { state: "ok" };
  }
}

