import Fastify, { type FastifyInstance } from "fastify";
import { BridgeRedisMonitor } from "../bridge/bridgeRedisMonitor.js";
import { registerServerRoutes } from "../bridge/serverRoutes.js";
import { ServerRegistry } from "../bridge/serverRegistry.js";
import type { AppConfig } from "../config/appConfig.js";
import { DiscordRuntime } from "../discord/discordRuntime.js";
import { registerHealthRoutes } from "../health/healthRoutes.js";
import { DatabaseProvider } from "../infrastructure/database/databaseProvider.js";
import { ServerNodeRepository } from "../infrastructure/database/serverNodeRepository.js";
import { RedisProvider } from "../infrastructure/redis/redisProvider.js";
import type { AppLogger } from "../logging/logger.js";

export class LykosApp {
  private readonly server: FastifyInstance;
  private readonly discord: DiscordRuntime;
  private readonly database: DatabaseProvider;
  private readonly redis: RedisProvider;
  private readonly serverRegistry: ServerRegistry;
  private readonly bridgeMonitor: BridgeRedisMonitor;

  public constructor(
    private readonly config: AppConfig,
    private readonly logger: AppLogger
  ) {
    this.server = Fastify({
      logger: false
    });

    this.discord = new DiscordRuntime(config, logger);
    this.database = new DatabaseProvider(config, logger);
    this.redis = new RedisProvider(config, logger);
    this.serverRegistry = new ServerRegistry(config.bridge.heartbeatStaleMs);
    this.bridgeMonitor = new BridgeRedisMonitor(
      config,
      this.redis,
      this.serverRegistry,
      new ServerNodeRepository(this.database),
      logger
    );

    registerHealthRoutes(this.server, config, [this.discord, this.database, this.redis, this.bridgeMonitor]);
    registerServerRoutes(this.server, config, this.serverRegistry);
  }

  public async start(): Promise<void> {
    await this.discord.start();
    this.bridgeMonitor.start();
    await this.server.listen({
      host: this.config.http.host,
      port: this.config.http.port
    });
  }

  public async stop(): Promise<void> {
    await this.server.close();
    this.bridgeMonitor.stop();
    await this.discord.stop();
    await this.redis.close();
    await this.database.close();
  }
}
