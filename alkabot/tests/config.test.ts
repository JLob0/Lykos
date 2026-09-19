import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/appConfig.js";

describe("loadConfig", () => {
  it("loads safe defaults for local foundation runs", () => {
    const config = loadConfig({});

    expect(config.app.name).toBe("Lykos");
    expect(config.app.environment).toBe("development");
    expect(config.http.port).toBe(3000);
    expect(config.discord.token).toBeUndefined();
    expect(config.bridge.transportEnabled).toBe(false);
    expect(config.bridge.commandTtlMs).toBe(30_000);
    expect(config.bridge.commandResultWaitMs).toBe(3_000);
    expect(config.identity.linkCodeTtlMs).toBe(300_000);
    expect(config.identity.linkCodeRateLimitMs).toBe(30_000);
    expect(config.policy.adminDiscordUserIds.size).toBe(0);
    expect(config.policy.networkReadRoleIds.size).toBe(0);
    expect(config.policy.setupReadRoleIds.size).toBe(0);
    expect(config.policy.setupWriteRoleIds.size).toBe(0);
    expect(config.policy.staffReadRoleIds.size).toBe(0);
    expect(config.policy.staffPromoteRoleIds.size).toBe(0);
    expect(config.policy.staffDemoteRoleIds.size).toBe(0);
    expect(config.policy.staffSyncRoleIds.size).toBe(0);
  });

  it("normalizes empty secrets to undefined", () => {
    const config = loadConfig({
      DISCORD_TOKEN: "   ",
      BRIDGE_HMAC_SECRET: ""
    });

    expect(config.discord.token).toBeUndefined();
    expect(config.bridge.hmacSecret).toBeUndefined();
  });

  it("parses comma-separated policy bindings", () => {
    const config = loadConfig({
      POLICY_ADMIN_DISCORD_IDS: "111, 222",
      POLICY_NETWORK_READ_ROLE_IDS: "333",
      POLICY_SETUP_READ_ROLE_IDS: "444, 555",
      POLICY_SETUP_WRITE_ROLE_IDS: "666",
      POLICY_STAFF_READ_ROLE_IDS: "777",
      POLICY_STAFF_PROMOTE_ROLE_IDS: "888",
      POLICY_STAFF_DEMOTE_ROLE_IDS: "999",
      POLICY_STAFF_SYNC_ROLE_IDS: "1010"
    });

    expect([...config.policy.adminDiscordUserIds]).toEqual(["111", "222"]);
    expect([...config.policy.networkReadRoleIds]).toEqual(["333"]);
    expect([...config.policy.setupReadRoleIds]).toEqual(["444", "555"]);
    expect([...config.policy.setupWriteRoleIds]).toEqual(["666"]);
    expect([...config.policy.staffReadRoleIds]).toEqual(["777"]);
    expect([...config.policy.staffPromoteRoleIds]).toEqual(["888"]);
    expect([...config.policy.staffDemoteRoleIds]).toEqual(["999"]);
    expect([...config.policy.staffSyncRoleIds]).toEqual(["1010"]);
  });

  it("parses link code timing settings in seconds", () => {
    const config = loadConfig({
      LINK_CODE_TTL_SECONDS: "600",
      LINK_CODE_RATE_LIMIT_SECONDS: "45"
    });

    expect(config.identity.linkCodeTtlMs).toBe(600_000);
    expect(config.identity.linkCodeRateLimitMs).toBe(45_000);
  });
});
