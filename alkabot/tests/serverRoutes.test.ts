import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerServerRoutes } from "../src/bridge/serverRoutes.js";
import { ServerRegistry } from "../src/bridge/serverRegistry.js";
import type { AppConfig } from "../src/config/appConfig.js";

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
    heartbeatStaleMs: 30_000
  },
  internalApi: {}
};

describe("server routes", () => {
  it("returns registered bridge servers", async () => {
    const server = Fastify();
    const registry = new ServerRegistry(30_000);
    registry.upsertHeartbeat({
      version: 1,
      serverId: "rankup-01",
      displayName: "RankUP",
      environment: "development",
      status: "ONLINE",
      timestamp: new Date().toISOString(),
      bridgeVersion: "0.1.0",
      paperVersion: "1.21.8",
      javaVersion: "21.0.11",
      onlinePlayers: 7,
      maxPlayers: 200
    });

    registerServerRoutes(server, config, registry);

    const response = await server.inject({ method: "GET", url: "/internal/v1/servers" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      servers: [
        {
          serverId: "rankup-01",
          status: "ONLINE",
          onlinePlayers: 7
        }
      ]
    });
  });
});
