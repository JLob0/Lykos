import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import type { AppConfig } from "../config/appConfig.js";
import { commandResultSchema, type CommandEnvelope, type CommandResult } from "../contracts/envelopes.js";
import type { RedisProvider } from "../infrastructure/redis/redisProvider.js";
import type { AppLogger } from "../logging/logger.js";
import { signPayload } from "../security/hmacSigner.js";
import { parseSignedRedisMessage, type SignedRedisMessage } from "./signedRedisMessage.js";

const COMMAND_SCHEMA = "command-envelope.v1";
const COMMAND_RESULT_SCHEMA = "command-result.v1";
const SYSTEM_DISCORD_USER_ID = "000000000000000000";

export interface BridgeCommandDispatcherPort {
  dispatchBridgePing(serverId: string): Promise<CommandEnvelope>;
  waitForResult(commandId: string): Promise<CommandResult | undefined>;
}

export class BridgeCommandDispatcher implements BridgeCommandDispatcherPort {
  public constructor(
    private readonly config: AppConfig,
    private readonly redisProvider: RedisProvider,
    private readonly logger: AppLogger
  ) {}

  public async dispatchBridgePing(serverId: string): Promise<CommandEnvelope> {
    const secret = this.requireBridgeSecret();
    const redis = await this.getRedisClient();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + this.config.bridge.commandTtlMs);
    const command: CommandEnvelope = {
      commandId: `cmd_${randomUUID()}`,
      correlationId: `corr_${randomUUID()}`,
      command: "bridge.ping",
      version: 1,
      targetServer: serverId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      actor: {
        discordUserId: SYSTEM_DISCORD_USER_ID,
        staffMemberId: null,
        permissionsSnapshot: ["alka.internal.bridge.ping"]
      },
      data: {
        sentAt: issuedAt.toISOString()
      }
    };

    const signed = signRedisPayload(COMMAND_SCHEMA, command, secret);
    const queueKey = this.commandQueueKey(serverId);
    await redis.lpush(queueKey, JSON.stringify(signed));
    this.logger.info({ commandId: command.commandId, serverId }, "Bridge ping command dispatched.");
    return command;
  }

  public async waitForResult(commandId: string): Promise<CommandResult | undefined> {
    const secret = this.requireBridgeSecret();
    const redis = await this.getRedisClient();
    const deadline = Date.now() + this.config.bridge.commandResultWaitMs;
    const resultKey = this.commandResultKey(commandId);

    while (Date.now() <= deadline) {
      const raw = await redis.get(resultKey);
      if (raw != null) {
        const result = parseCommandResult(raw, secret);
        if (result != null) {
          return result;
        }

        this.logger.warn({ commandId }, "Rejected malformed bridge command result.");
        return undefined;
      }

      await sleep(100);
    }

    return undefined;
  }

  private async getRedisClient(): Promise<Redis> {
    if (!this.config.bridge.transportEnabled) {
      throw new Error("Bridge transport is disabled.");
    }

    const redis = this.redisProvider.getClient();
    if (redis.status === "wait") {
      await redis.connect();
    }

    return redis;
  }

  private requireBridgeSecret(): string {
    if (this.config.bridge.hmacSecret == null) {
      throw new Error("BRIDGE_HMAC_SECRET is not configured.");
    }

    return this.config.bridge.hmacSecret;
  }

  private commandQueueKey(serverId: string): string {
    return `${this.config.bridge.redisNamespace}:commands:${serverId}`;
  }

  private commandResultKey(commandId: string): string {
    return `${this.config.bridge.redisNamespace}:command-results:${commandId}`;
  }
}

function signRedisPayload(schema: string, payload: unknown, secret: string): SignedRedisMessage {
  const payloadJson = JSON.stringify(payload);
  return {
    schema,
    payloadJson,
    signature: signPayload(payloadJson, secret),
    signedAt: new Date().toISOString()
  };
}

function parseCommandResult(raw: string, secret: string): CommandResult | undefined {
  const signed = parseSignedRedisMessage(raw, secret);
  if (signed == null || signed.schema !== COMMAND_RESULT_SCHEMA) {
    return undefined;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(signed.payloadJson);
  } catch {
    return undefined;
  }

  const parsed = commandResultSchema.safeParse(payload);
  return parsed.success ? parsed.data : undefined;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
