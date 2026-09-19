import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SetupService } from "../src/application/setup/setupService.js";
import type { MigrationStatusReader, SetupRuntimeContext } from "../src/application/setup/setupTypes.js";
import { ServerRegistry } from "../src/bridge/serverRegistry.js";
import type { AppConfig } from "../src/config/appConfig.js";
import type { HealthCheck } from "../src/shared/health.js";

describe("SetupService", () => {
  it("returns READY when dependencies, policy, bridge, permissions and migrations are healthy", async () => {
    const migrationsDirectory = await createMigrationsDirectory(["0001_test"]);
    try {
      const registry = registryWithHeartbeat();
      const service = new SetupService({
        config: config({
          discordToken: "discord-token",
          bridgeTransportEnabled: true,
          bridgeHmacSecret: "bridge-secret",
          setupReadRoleIds: new Set(["role_setup"])
        }),
        healthChecks: [healthCheck("mysql", "ok"), healthCheck("redis", "ok")],
        serverRegistry: registry,
        migrationStatusReader: migrationReader(["0001_test"]),
        migrationsDirectory
      });

      const report = await service.runDoctor(context());

      expect(report.overall).toBe("READY");
      expect(report.checks.every((check) => check.state === "PASS")).toBe(true);
    } finally {
      await rm(migrationsDirectory, { recursive: true, force: true });
    }
  });

  it("marks the doctor as BLOCKED when a local migration is missing in the database", async () => {
    const migrationsDirectory = await createMigrationsDirectory(["0001_test", "0002_missing"]);
    try {
      const service = new SetupService({
        config: config({
          discordToken: "discord-token",
          bridgeTransportEnabled: true,
          bridgeHmacSecret: "bridge-secret",
          setupReadRoleIds: new Set(["role_setup"])
        }),
        healthChecks: [healthCheck("mysql", "ok")],
        serverRegistry: registryWithHeartbeat(),
        migrationStatusReader: migrationReader(["0001_test"]),
        migrationsDirectory
      });

      const report = await service.runDoctor(context());

      expect(report.overall).toBe("BLOCKED");
      expect(report.checks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "migrations",
            state: "FAIL"
          })
        ])
      );
    } finally {
      await rm(migrationsDirectory, { recursive: true, force: true });
    }
  });

  it("creates a dry-run plan with safe database-only apply guidance", async () => {
    const migrationsDirectory = await createMigrationsDirectory(["0001_test"]);
    try {
      const service = new SetupService({
        config: config({ discordToken: "discord-token" }),
        healthChecks: [healthCheck("mysql", "ok")],
        serverRegistry: new ServerRegistry(30_000),
        migrationStatusReader: migrationReader(["0001_test"]),
        migrationsDirectory
      });

      const plan = await service.createPlan(context());

      expect(plan.mode).toBe("DRY_RUN");
      expect(plan.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "setup.apply",
            state: "CONFIGURE"
          })
        ])
      );
    } finally {
      await rm(migrationsDirectory, { recursive: true, force: true });
    }
  });
});

async function createMigrationsDirectory(versions: string[]): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "lykos-migrations-"));
  await Promise.all(versions.map((version) => writeFile(join(directory, `${version}.sql`), "SELECT 1;")));
  return directory;
}

function healthCheck(name: string, state: "ok" | "degraded" | "down"): HealthCheck {
  return {
    name,
    async check() {
      return { state };
    }
  };
}

function migrationReader(versions: string[]): MigrationStatusReader {
  return {
    async listAppliedVersions() {
      return new Set(versions);
    }
  };
}

function context(): SetupRuntimeContext {
  return {
    guildId: "guild_test",
    guildName: "AlkaStudio",
    botPermissionNames: ["ManageRoles", "ManageChannels"],
    isGuildOwner: false
  };
}

function registryWithHeartbeat(): ServerRegistry {
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
    onlinePlayers: 42,
    maxPlayers: 200
  });
  return registry;
}

function config(overrides: {
  discordToken?: string;
  bridgeTransportEnabled?: boolean;
  bridgeHmacSecret?: string;
  setupReadRoleIds?: ReadonlySet<string>;
}): AppConfig {
  const bridge: AppConfig["bridge"] = {
    transportEnabled: overrides.bridgeTransportEnabled ?? false,
    redisNamespace: "alka",
    scanIntervalMs: 5_000,
    heartbeatStaleMs: 30_000,
    commandTtlMs: 30_000,
    commandResultWaitMs: 3_000
  };

  if (overrides.bridgeHmacSecret != null) {
    bridge.hmacSecret = overrides.bridgeHmacSecret;
  }

  return {
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
    discord: overrides.discordToken == null ? {} : { token: overrides.discordToken },
    mysql: {
      uri: "mysql://alkabot:alkabot@127.0.0.1:3306/alkabot"
    },
    redis: {
      url: "redis://127.0.0.1:6379"
    },
    bridge,
    internalApi: {},
    policy: {
      adminDiscordUserIds: new Set(),
      adminRoleIds: new Set(),
      networkReadRoleIds: new Set(),
      auditReadRoleIds: new Set(),
      setupReadRoleIds: overrides.setupReadRoleIds ?? new Set(),
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
