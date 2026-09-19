import { describe, expect, it } from "vitest";
import { PolicyEngine } from "../src/application/policy/policyEngine.js";
import { ALKA_PERMISSIONS, type AlkaPermission, type PolicyActor } from "../src/application/policy/policyTypes.js";
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

  it("allows a setup read role for setup diagnostics", () => {
    const engine = new PolicyEngine(configWithPolicy({ setupReadRoleIds: new Set(["role_setup"]) }));

    expect(engine.evaluate(request(actor({ roleIds: ["role_setup"] }), ALKA_PERMISSIONS.SETUP_READ))).toMatchObject({
      decision: "ALLOW",
      matchedBy: "ACTION_ROLE"
    });
  });

  it("allows a setup write role for setup import and apply", () => {
    const engine = new PolicyEngine(configWithPolicy({ setupWriteRoleIds: new Set(["role_setup_write"]) }));

    expect(engine.evaluate(request(actor({ roleIds: ["role_setup_write"] }), ALKA_PERMISSIONS.SETUP_WRITE))).toMatchObject({
      decision: "ALLOW",
      matchedBy: "ACTION_ROLE"
    });
  });

  it("allows a staff read role for staff visibility", () => {
    const engine = new PolicyEngine(configWithPolicy({ staffReadRoleIds: new Set(["role_staff_read"]) }));

    expect(engine.evaluate(request(actor({ roleIds: ["role_staff_read"] }), ALKA_PERMISSIONS.STAFF_READ))).toMatchObject({
      decision: "ALLOW",
      matchedBy: "ACTION_ROLE"
    });
  });

  it("allows staff operation roles only for their mapped action", () => {
    const engine = new PolicyEngine(
      configWithPolicy({
        staffPromoteRoleIds: new Set(["role_staff_promote"]),
        staffDemoteRoleIds: new Set(["role_staff_demote"])
      })
    );

    expect(engine.evaluate(request(actor({ roleIds: ["role_staff_promote"] }), ALKA_PERMISSIONS.STAFF_PROMOTE))).toMatchObject({
      decision: "ALLOW",
      matchedBy: "ACTION_ROLE"
    });
    expect(engine.evaluate(request(actor({ roleIds: ["role_staff_demote"] }), ALKA_PERMISSIONS.STAFF_DEMOTE))).toMatchObject({
      decision: "ALLOW",
      matchedBy: "ACTION_ROLE"
    });
    expect(engine.evaluate(request(actor({ roleIds: ["role_staff_read"] }), ALKA_PERMISSIONS.STAFF_PROMOTE))).toMatchObject({
      decision: "DENY"
    });
  });

  it("allows a staff sync role for reconciliation", () => {
    const engine = new PolicyEngine(configWithPolicy({ staffSyncRoleIds: new Set(["role_staff_sync"]) }));

    expect(engine.evaluate(request(actor({ roleIds: ["role_staff_sync"] }), ALKA_PERMISSIONS.STAFF_SYNC))).toMatchObject({
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

function request(actorInput: PolicyActor, action: AlkaPermission = ALKA_PERMISSIONS.NETWORK_READ) {
  return {
    action,
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
  setupReadRoleIds?: ReadonlySet<string>;
  setupWriteRoleIds?: ReadonlySet<string>;
  staffReadRoleIds?: ReadonlySet<string>;
  staffPromoteRoleIds?: ReadonlySet<string>;
  staffDemoteRoleIds?: ReadonlySet<string>;
  staffSyncRoleIds?: ReadonlySet<string>;
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
      auditReadRoleIds: overrides.auditReadRoleIds ?? new Set(),
      setupReadRoleIds: overrides.setupReadRoleIds ?? new Set(),
      setupWriteRoleIds: overrides.setupWriteRoleIds ?? new Set(),
      staffReadRoleIds: overrides.staffReadRoleIds ?? new Set(),
      staffPromoteRoleIds: overrides.staffPromoteRoleIds ?? new Set(),
      staffDemoteRoleIds: overrides.staffDemoteRoleIds ?? new Set(),
      staffSyncRoleIds: overrides.staffSyncRoleIds ?? new Set()
    },
    identity: {
      linkCodeTtlMs: 300_000,
      linkCodeRateLimitMs: 30_000
    }
  };
}
