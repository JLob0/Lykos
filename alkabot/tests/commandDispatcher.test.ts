import { describe, expect, it, vi } from "vitest";
import { BridgeCommandDispatcher } from "../src/bridge/commandDispatcher.js";
import { parseSignedRedisMessage } from "../src/bridge/signedRedisMessage.js";
import type { AppConfig } from "../src/config/appConfig.js";
import { commandEnvelopeSchema, type CommandResult } from "../src/contracts/envelopes.js";
import type { RedisProvider } from "../src/infrastructure/redis/redisProvider.js";
import type { AppLogger } from "../src/logging/logger.js";
import { signPayload } from "../src/security/hmacSigner.js";

const config: AppConfig = {
  app: {
    name: "Lykos",
    version: "0.1.0",
    environment: "test"
  },
  log: {
    level: "silent"
  },
  http: {
    host: "127.0.0.1",
    port: 0
  },
  discord: {},
  mysql: {
    uri: "mysql://alkabot:alkabot@127.0.0.1:3306/alkabot"
  },
  redis: {
    url: "redis://127.0.0.1:6379"
  },
  bridge: {
    hmacSecret: "test-secret",
    transportEnabled: true,
    redisNamespace: "alka",
    scanIntervalMs: 5_000,
    heartbeatStaleMs: 30_000,
    commandTtlMs: 30_000,
    commandResultWaitMs: 250
  },
  internalApi: {},
  policy: {
    adminDiscordUserIds: new Set(),
    adminRoleIds: new Set(),
    networkReadRoleIds: new Set(),
    auditReadRoleIds: new Set()
  }
};

describe("BridgeCommandDispatcher", () => {
  it("publishes bridge.ping to the targeted Redis command queue", async () => {
    const redis = new FakeRedisClient();
    const dispatcher = createDispatcher(redis);

    const command = await dispatcher.dispatchBridgePing("rankup-01");

    expect(redis.pushes).toHaveLength(1);
    expect(redis.pushes[0]?.key).toBe("alka:commands:rankup-01");

    const signed = parseSignedRedisMessage(redis.pushes[0]?.value ?? "", "test-secret");
    expect(signed?.schema).toBe("command-envelope.v1");
    const payload = commandEnvelopeSchema.parse(JSON.parse(signed?.payloadJson ?? "{}"));
    expect(payload).toMatchObject({
      commandId: command.commandId,
      command: "bridge.ping",
      targetServer: "rankup-01"
    });
  });

  it("reads signed command results from the Redis result key", async () => {
    const redis = new FakeRedisClient();
    const dispatcher = createDispatcher(redis);
    const result: CommandResult = {
      commandId: "cmd_test_result",
      correlationId: "corr_test_result",
      state: "SUCCESS",
      targetServer: "rankup-01",
      timestamp: new Date().toISOString(),
      data: {
        pong: true
      }
    };
    redis.values.set("alka:command-results:cmd_test_result", JSON.stringify(signRedisPayload("command-result.v1", result)));

    await expect(dispatcher.waitForResult("cmd_test_result")).resolves.toMatchObject({
      commandId: "cmd_test_result",
      state: "SUCCESS",
      data: {
        pong: true
      }
    });
  });
});

function createDispatcher(redis: FakeRedisClient): BridgeCommandDispatcher {
  const provider = {
    getClient() {
      return redis;
    }
  } as unknown as RedisProvider;
  const logger = {
    info: vi.fn(),
    warn: vi.fn()
  } as unknown as AppLogger;

  return new BridgeCommandDispatcher(config, provider, logger);
}

function signRedisPayload(schema: string, payload: unknown): unknown {
  const payloadJson = JSON.stringify(payload);
  return {
    schema,
    payloadJson,
    signature: signPayload(payloadJson, "test-secret"),
    signedAt: new Date().toISOString()
  };
}

class FakeRedisClient {
  public readonly status = "ready";
  public readonly pushes: Array<{ key: string; value: string }> = [];
  public readonly values = new Map<string, string>();

  public async lpush(key: string, value: string): Promise<number> {
    this.pushes.push({ key, value });
    return this.pushes.length;
  }

  public async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }
}
