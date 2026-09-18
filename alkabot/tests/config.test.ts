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
  });

  it("normalizes empty secrets to undefined", () => {
    const config = loadConfig({
      DISCORD_TOKEN: "   ",
      BRIDGE_HMAC_SECRET: ""
    });

    expect(config.discord.token).toBeUndefined();
    expect(config.bridge.hmacSecret).toBeUndefined();
  });
});
