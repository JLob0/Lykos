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
    expect(config.policy.adminDiscordUserIds.size).toBe(0);
    expect(config.policy.networkReadRoleIds.size).toBe(0);
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
      POLICY_NETWORK_READ_ROLE_IDS: "333"
    });

    expect([...config.policy.adminDiscordUserIds]).toEqual(["111", "222"]);
    expect([...config.policy.networkReadRoleIds]).toEqual(["333"]);
  });
});
