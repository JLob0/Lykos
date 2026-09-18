import type { Redis } from "ioredis";
import type { AppConfig } from "../config/appConfig.js";
import { capabilitiesSchema, heartbeatSchema, type CapabilitiesPayload, type HeartbeatPayload } from "../contracts/envelopes.js";
import type { ServerNodeRepository } from "../infrastructure/database/serverNodeRepository.js";
import type { RedisProvider } from "../infrastructure/redis/redisProvider.js";
import type { AppLogger } from "../logging/logger.js";
import type { HealthCheck, HealthCheckResult } from "../shared/health.js";
import { parseSignedRedisMessage } from "./signedRedisMessage.js";
import { ServerRegistry } from "./serverRegistry.js";

export class BridgeRedisMonitor implements HealthCheck {
  public readonly name = "bridge-redis";

  private timer: NodeJS.Timeout | undefined;
  private lastScanAt: Date | undefined;
  private lastScanError: string | undefined;

  public constructor(
    private readonly config: AppConfig,
    private readonly redisProvider: RedisProvider,
    private readonly registry: ServerRegistry,
    private readonly repository: ServerNodeRepository,
    private readonly logger: AppLogger
  ) {}

  public start(): void {
    if (!this.config.bridge.transportEnabled) {
      this.logger.info("Bridge Redis monitor disabled by config.");
      return;
    }

    if (this.config.bridge.hmacSecret == null) {
      this.logger.warn("Bridge Redis monitor enabled without BRIDGE_HMAC_SECRET; monitor will stay degraded.");
      return;
    }

    this.timer = setInterval(() => {
      void this.scanOnce();
    }, this.config.bridge.scanIntervalMs);
    this.timer.unref();

    void this.scanOnce();
  }

  public stop(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public async check(): Promise<HealthCheckResult> {
    if (!this.config.bridge.transportEnabled) {
      return { state: "degraded", detail: "Bridge Redis monitor disabled." };
    }

    if (this.config.bridge.hmacSecret == null) {
      return { state: "degraded", detail: "BRIDGE_HMAC_SECRET is not configured." };
    }

    if (this.lastScanError != null) {
      return { state: "down", detail: this.lastScanError };
    }

    return { state: "ok", detail: this.lastScanAt == null ? "Waiting for first scan." : `Last scan at ${this.lastScanAt.toISOString()}` };
  }

  private async scanOnce(): Promise<void> {
    try {
      const redis = this.redisProvider.getClient();
      if (redis.status === "wait") {
        await redis.connect();
      }

      await this.scanHeartbeats(redis);
      await this.scanCapabilities(redis);

      this.lastScanAt = new Date();
      this.lastScanError = undefined;
    } catch (error) {
      this.lastScanError = error instanceof Error ? error.message : "Unknown bridge Redis scan failure.";
      this.logger.warn({ error }, "Bridge Redis scan failed.");
    }
  }

  private async scanHeartbeats(redis: Redis): Promise<void> {
    const keys = await scanKeys(redis, `${this.config.bridge.redisNamespace}:heartbeats:*`);
    for (const key of keys) {
      const payload = await this.readSignedPayload(redis, key, "heartbeat.v1", heartbeatSchema);
      if (payload == null) {
        continue;
      }

      this.registry.upsertHeartbeat(payload);
      await this.persistHeartbeat(payload);
    }
  }

  private async scanCapabilities(redis: Redis): Promise<void> {
    const keys = await scanKeys(redis, `${this.config.bridge.redisNamespace}:capabilities:*`);
    for (const key of keys) {
      const payload = await this.readSignedPayload(redis, key, "capabilities.v1", capabilitiesSchema);
      if (payload == null) {
        continue;
      }

      this.registry.upsertCapabilities(payload);
      await this.persistCapabilities(payload);
    }
  }

  private async readSignedPayload<T>(redis: Redis, key: string, schema: string, validator: { safeParse(input: unknown): { success: true; data: T } | { success: false } }): Promise<T | undefined> {
    const raw = await redis.get(key);
    if (raw == null || this.config.bridge.hmacSecret == null) {
      return undefined;
    }

    const signed = parseSignedRedisMessage(raw, this.config.bridge.hmacSecret);
    if (signed == null || signed.schema !== schema) {
      this.logger.warn({ key, schema }, "Rejected invalid bridge Redis payload.");
      return undefined;
    }

    const parsedPayload = validator.safeParse(JSON.parse(signed.payloadJson));
    if (!parsedPayload.success) {
      this.logger.warn({ key, schema }, "Rejected malformed bridge Redis payload.");
      return undefined;
    }

    return parsedPayload.data;
  }

  private async persistHeartbeat(payload: HeartbeatPayload): Promise<void> {
    try {
      await this.repository.upsertHeartbeat(payload);
    } catch (error) {
      this.logger.warn({ error, serverId: payload.serverId }, "Failed to persist bridge heartbeat.");
    }
  }

  private async persistCapabilities(payload: CapabilitiesPayload): Promise<void> {
    try {
      await this.repository.upsertCapabilities(payload);
    } catch (error) {
      this.logger.warn({ error, serverId: payload.serverId }, "Failed to persist bridge capabilities.");
    }
  }
}

async function scanKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";

  do {
    const [nextCursor, page] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    keys.push(...page);
  } while (cursor !== "0");

  return keys;
}

