import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { AppConfig } from "../src/config/appConfig.js";
import { registerHealthRoutes } from "../src/health/healthRoutes.js";
import type { HealthCheck } from "../src/shared/health.js";

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
    transportEnabled: false,
    redisNamespace: "alka",
    scanIntervalMs: 5_000,
    heartbeatStaleMs: 30_000,
    commandTtlMs: 30_000,
    commandResultWaitMs: 3_000
  },
  internalApi: {},
  policy: {
    adminDiscordUserIds: new Set(),
    adminRoleIds: new Set(),
    networkReadRoleIds: new Set(),
    auditReadRoleIds: new Set(),
    setupReadRoleIds: new Set(),
    setupWriteRoleIds: new Set(),
    staffReadRoleIds: new Set(),
    staffPromoteRoleIds: new Set(),
    staffDemoteRoleIds: new Set(),
    staffSyncRoleIds: new Set()
  },
  identity: {
    linkCodeTtlMs: 300_000,
    linkCodeRateLimitMs: 30_000
  }
};

describe("health routes", () => {
  it("returns live status without external dependencies", async () => {
    const server = Fastify();
    registerHealthRoutes(server, config, []);

    const response = await server.inject({ method: "GET", url: "/health/live" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "Lykos"
    });
  });

  it("returns 503 when any readiness check is down", async () => {
    const downCheck: HealthCheck = {
      name: "redis",
      async check() {
        return { state: "down", detail: "offline" };
      }
    };

    const server = Fastify();
    registerHealthRoutes(server, config, [downCheck]);

    const response = await server.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "down",
      checks: {
        redis: {
          state: "down",
          detail: "offline"
        }
      }
    });
  });
});
