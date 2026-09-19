import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { IdentityLinkError } from "../src/application/identity/identityTypes.js";
import type { IdentityLinkService } from "../src/application/identity/identityLinkService.js";
import type { AppConfig } from "../src/config/appConfig.js";
import { registerIdentityRoutes } from "../src/identity/identityRoutes.js";

const MINECRAFT_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("identity routes", () => {
  it("creates Minecraft link codes through the authenticated internal route", async () => {
    const service = {
      createMinecraftLinkCode: vi.fn(async () => ({
        code: "ALKA-ABCDE",
        expiresAt: new Date("2026-09-18T15:05:00.000Z"),
        minecraftUuid: MINECRAFT_UUID,
        minecraftName: "MestreBR"
      }))
    } as unknown as IdentityLinkService;
    const server = Fastify();
    registerIdentityRoutes(server, config({ internalApiToken: "secret" }), service);

    const response = await server.inject({
      method: "POST",
      url: "/internal/v1/link-codes",
      headers: {
        authorization: "Bearer secret"
      },
      payload: {
        minecraftUuid: MINECRAFT_UUID,
        minecraftName: "MestreBR",
        serverId: "rankup-01"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      code: "ALKA-ABCDE",
      expiresAt: "2026-09-18T15:05:00.000Z",
      minecraftUuid: MINECRAFT_UUID
    });
    expect(service.createMinecraftLinkCode).toHaveBeenCalledWith({
      minecraftUuid: MINECRAFT_UUID,
      minecraftName: "MestreBR",
      serverId: "rankup-01"
    });
  });

  it("rejects unauthenticated internal requests in production", async () => {
    const server = Fastify();
    registerIdentityRoutes(server, config({ environment: "production", internalApiToken: "secret" }), identityServiceStub());

    const response = await server.inject({
      method: "POST",
      url: "/internal/v1/link-codes",
      payload: {
        minecraftUuid: MINECRAFT_UUID
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("maps domain rate limits to HTTP 429", async () => {
    const service = {
      createMinecraftLinkCode: vi.fn(async () => {
        throw new IdentityLinkError("RATE_LIMITED", "Aguarde antes de gerar outro codigo de vinculacao.");
      })
    } as unknown as IdentityLinkService;
    const server = Fastify();
    registerIdentityRoutes(server, config({}), service);

    const response = await server.inject({
      method: "POST",
      url: "/internal/v1/link-codes",
      payload: {
        minecraftUuid: MINECRAFT_UUID
      }
    });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({
      error: "RATE_LIMITED"
    });
  });
});

function identityServiceStub(): IdentityLinkService {
  return {
    createMinecraftLinkCode: vi.fn()
  } as unknown as IdentityLinkService;
}

function config(overrides: { environment?: AppConfig["app"]["environment"]; internalApiToken?: string }): AppConfig {
  return {
    app: {
      name: "Lykos",
      version: "0.1.0",
      environment: overrides.environment ?? "test"
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
    internalApi: overrides.internalApiToken == null ? {} : { token: overrides.internalApiToken },
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
}
