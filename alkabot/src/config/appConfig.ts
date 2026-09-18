import { z } from "zod";

const environmentSchema = z.enum(["development", "test", "staging", "production"]);
const logLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]);

const portSchema = z.coerce.number().int().min(1).max(65_535);
const durationMsSchema = z.coerce.number().int().min(250);
const booleanSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => ["1", "true", "yes", "on"].includes(value))
  .or(z.boolean())
  .default(false);

const optionalSecretSchema = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const envSchema = z.object({
  APP_NAME: z.string().trim().min(1).default("Lykos"),
  APP_VERSION: z.string().trim().min(1).default("0.1.0"),
  NODE_ENV: environmentSchema.default("development"),
  LOG_LEVEL: logLevelSchema.default("info"),
  HTTP_HOST: z.string().trim().min(1).default("127.0.0.1"),
  HTTP_PORT: portSchema.default(3000),
  DISCORD_TOKEN: optionalSecretSchema,
  DISCORD_CLIENT_ID: z.string().trim().optional(),
  DISCORD_GUILD_ID: z.string().trim().optional(),
  MYSQL_URI: z.string().trim().url().default("mysql://alkabot:alkabot_dev_password@127.0.0.1:3306/alkabot"),
  REDIS_URL: z.string().trim().url().default("redis://127.0.0.1:6379"),
  BRIDGE_HMAC_SECRET: optionalSecretSchema,
  BRIDGE_TRANSPORT_ENABLED: booleanSchema,
  BRIDGE_REDIS_NAMESPACE: z.string().trim().min(1).default("alka"),
  BRIDGE_SCAN_INTERVAL_MS: durationMsSchema.default(5_000),
  BRIDGE_HEARTBEAT_STALE_MS: durationMsSchema.default(30_000),
  INTERNAL_API_TOKEN: optionalSecretSchema
});

export type AppEnvironment = z.infer<typeof environmentSchema>;
export type AppConfig = {
  app: {
    name: string;
    version: string;
    environment: AppEnvironment;
  };
  log: {
    level: z.infer<typeof logLevelSchema>;
  };
  http: {
    host: string;
    port: number;
  };
  discord: {
    token?: string;
    clientId?: string;
    guildId?: string;
  };
  mysql: {
    uri: string;
  };
  redis: {
    url: string;
  };
  bridge: {
    hmacSecret?: string;
    transportEnabled: boolean;
    redisNamespace: string;
    scanIntervalMs: number;
    heartbeatStaleMs: number;
  };
  internalApi: {
    token?: string;
  };
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const discord: AppConfig["discord"] = {};
  const clientId = normalizeOptional(parsed.DISCORD_CLIENT_ID);
  const guildId = normalizeOptional(parsed.DISCORD_GUILD_ID);
  const bridge: AppConfig["bridge"] = {
    transportEnabled: parsed.BRIDGE_TRANSPORT_ENABLED,
    redisNamespace: parsed.BRIDGE_REDIS_NAMESPACE,
    scanIntervalMs: parsed.BRIDGE_SCAN_INTERVAL_MS,
    heartbeatStaleMs: parsed.BRIDGE_HEARTBEAT_STALE_MS
  };

  if (parsed.DISCORD_TOKEN !== undefined) {
    discord.token = parsed.DISCORD_TOKEN;
  }

  if (clientId !== undefined) {
    discord.clientId = clientId;
  }

  if (guildId !== undefined) {
    discord.guildId = guildId;
  }

  if (parsed.BRIDGE_HMAC_SECRET !== undefined) {
    bridge.hmacSecret = parsed.BRIDGE_HMAC_SECRET;
  }

  const internalApi: AppConfig["internalApi"] = {};
  if (parsed.INTERNAL_API_TOKEN !== undefined) {
    internalApi.token = parsed.INTERNAL_API_TOKEN;
  }

  return {
    app: {
      name: parsed.APP_NAME,
      version: parsed.APP_VERSION,
      environment: parsed.NODE_ENV
    },
    log: {
      level: parsed.LOG_LEVEL
    },
    http: {
      host: parsed.HTTP_HOST,
      port: parsed.HTTP_PORT
    },
    discord,
    mysql: {
      uri: parsed.MYSQL_URI
    },
    redis: {
      url: parsed.REDIS_URL
    },
    bridge,
    internalApi
  };
}

function normalizeOptional(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
