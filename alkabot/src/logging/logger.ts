import pino from "pino";
import type { AppConfig } from "../config/appConfig.js";

export type AppLogger = pino.Logger;

export function createLogger(config: AppConfig): AppLogger {
  return pino({
    name: config.app.name,
    level: config.log.level,
    redact: {
      paths: [
        "discord.token",
        "bridge.hmacSecret",
        "DISCORD_TOKEN",
        "BRIDGE_HMAC_SECRET",
        "*.password",
        "*.secret",
        "*.token",
        "*.authorization"
      ],
      censor: "[redacted]"
    },
    base: {
      service: config.app.name,
      version: config.app.version,
      environment: config.app.environment
    }
  });
}

