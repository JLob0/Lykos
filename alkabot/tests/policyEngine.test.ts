import { describe, expect, it } from "vitest";
import { PolicyEngine } from "../src/application/policy/policyEngine.js";
import { ALKA_PERMISSIONS, type PolicyActor } from "../src/application/policy/policyTypes.js";
import type { AppConfig } from "../src/config/appConfig.js";

describe("PolicyEngine", () => {
  it("allows a configured admin Discord user", () => {
    const engine = new PolicyEngine(configWithPolicy({ adminDiscordUserIds: new Set(["111"]) }));

    expect(engine.evaluate(request(actor({ id: "111" })))).toMatchObject({
      decision: "ALLOW",
      matchedBy: "ADMIN_USER"
    });
  });

  it("allows a role mapped to the action", () => {
    const engine = new PolicyEngine(configWithPolicy({ networkReadRoleIds: new Set(["role_network"]) }));

    expect(engine.evaluate(request(actor({ roleIds: ["role_network"] })))).toMatchObject({
      decision: "ALLOW",
      matchedBy: "ACTION_ROLE"
    });
  });

  it("denies in production when no binding matches", () => {
    const engine = new PolicyEngine(configWithPolicy({ environment: "production", networkReadRoleIds: new Set(["other"]) }));

    expect(engine.evaluate(request(actor({ roleIds: ["missing"] })))).toMatchObject({
      decision: "DENY",
      allowed: false
    });
  });
});

function request(actorInput: PolicyActor) {
  return {
    action: ALKA_PERMISSIONS.NETWORK_READ,
    actor: actorInput,
    source: "test"
  };
}

function actor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    type: "DISCORD_USER",
    id: "123",
    roleIds: [],
    isGuildOwner: false,
    ...overrides
  };
}

function configWithPolicy(overrides: {
  environment?: AppConfig["app"]["environment"];
  adminDiscordUserIds?: ReadonlySet<string>;
  adminRoleIds?: ReadonlySet<string>;
  networkReadRoleIds?: ReadonlySet<string>;
  auditReadRoleIds?: ReadonlySet<string>;
}): AppConfig {
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
    internalApi: {},
    policy: {
      adminDiscordUserIds: overrides.adminDiscordUserIds ?? new Set(),
      adminRoleIds: overrides.adminRoleIds ?? new Set(),
      networkReadRoleIds: overrides.networkReadRoleIds ?? new Set(),
      auditReadRoleIds: overrides.auditReadRoleIds ?? new Set()
    }
  };
}
