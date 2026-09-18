import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { ProfileAggregationService } from "../src/application/profile/profileAggregationService.js";
import { ProfileError } from "../src/application/profile/profileTypes.js";
import type { AppConfig } from "../src/config/appConfig.js";
import { registerProfileRoutes } from "../src/profile/profileRoutes.js";

const MINECRAFT_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("profile routes", () => {
  it("returns an internal player profile snapshot", async () => {
    const profileService = profileServiceStub();
    const server = Fastify();
    registerProfileRoutes(server, config({ internalApiToken: "secret" }), profileService);

    const response = await server.inject({
      method: "GET",
      url: `/internal/v1/players/${MINECRAFT_UUID}/profile`,
      headers: {
        authorization: "Bearer secret"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      minecraftUuid: MINECRAFT_UUID,
      nickname: "MestreBR",
      rank: "Imperador",
      generatedAt: "2026-09-18T15:00:00.000Z"
    });
    expect(profileService.getProfileByMinecraftUuid).toHaveBeenCalledWith({
      minecraftUuid: MINECRAFT_UUID
    });
  });

  it("rejects unauthenticated production profile requests", async () => {
    const server = Fastify();
    registerProfileRoutes(server, config({ environment: "production", internalApiToken: "secret" }), profileServiceStub());

    const response = await server.inject({
      method: "GET",
      url: `/internal/v1/players/${MINECRAFT_UUID}/profile`
    });

    expect(response.statusCode).toBe(401);
  });

  it("maps profile domain errors to bad requests", async () => {
    const profileService = {
      getProfileByMinecraftUuid: vi.fn(async () => {
        throw new ProfileError("INVALID_MINECRAFT_UUID", "UUID Minecraft invalido.");
      })
    } as unknown as ProfileAggregationService;
    const server = Fastify();
    registerProfileRoutes(server, config({}), profileService);

    const response = await server.inject({
      method: "GET",
      url: "/internal/v1/players/not-a-uuid/profile"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "INVALID_MINECRAFT_UUID"
    });
  });
});

function profileServiceStub(): ProfileAggregationService {
  return {
    getProfileByMinecraftUuid: vi.fn(async () => ({
      minecraftUuid: MINECRAFT_UUID,
      nickname: "MestreBR",
      rank: "Imperador",
      privacy: "PUBLIC",
      generatedAt: new Date("2026-09-18T15:00:00.000Z"),
      sources: [
        {
          source: "identity",
          state: "AVAILABLE"
        }
      ]
    }))
  } as unknown as ProfileAggregationService;
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
      staffDemoteRoleIds: new Set()
    },
    identity: {
      linkCodeTtlMs: 300_000,
      linkCodeRateLimitMs: 30_000
    }
  };
}
