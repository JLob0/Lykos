import { Redis } from "ioredis";
import type { AppConfig } from "../../config/appConfig.js";
import type { AppLogger } from "../../logging/logger.js";
import type { HealthCheck, HealthCheckResult } from "../../shared/health.js";

export class RedisProvider implements HealthCheck {
  public readonly name = "redis";

  private client: Redis | undefined;

  public constructor(
    private readonly config: AppConfig,
    private readonly logger: AppLogger
  ) {}

  public getClient(): Redis {
    if (this.client == null) {
      this.client = new Redis(this.config.redis.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: true
      });

      this.client.on("error", (error: Error) => {
        this.logger.warn({ error }, "Redis client error.");
      });
    }

    return this.client;
  }

  public async check(): Promise<HealthCheckResult> {
    try {
      const client = this.getClient();
      if (client.status === "wait") {
        await client.connect();
      }

      const response = await client.ping();
      return response === "PONG" ? { state: "ok" } : { state: "down", detail: `Unexpected Redis PING response: ${response}` };
    } catch (error) {
      this.logger.warn({ error }, "Redis health check failed.");
      return { state: "down", detail: "Redis ping failed." };
    }
  }

  public async close(): Promise<void> {
    if (this.client == null) {
      return;
    }

    this.client.disconnect();
    this.client = undefined;
  }
}
