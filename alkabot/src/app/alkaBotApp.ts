import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { AuditService } from "../application/audit/auditService.js";
import { IdentityLinkService } from "../application/identity/identityLinkService.js";
import { PolicyEngine } from "../application/policy/policyEngine.js";
import { ProfileAggregationService } from "../application/profile/profileAggregationService.js";
import { IdentityProfileProvider } from "../application/profile/identityProfileProvider.js";
import { RoleSetupService } from "../application/roles/roleSetupService.js";
import { SetupService } from "../application/setup/setupService.js";
import { StaffDirectoryService } from "../application/staff/staffDirectoryService.js";
import { StaffOperationsService } from "../application/staff/staffOperationsService.js";
import { StaffSyncService } from "../application/staff/staffSyncService.js";
import { BridgeRedisMonitor } from "../bridge/bridgeRedisMonitor.js";
import { BridgeCommandDispatcher } from "../bridge/commandDispatcher.js";
import { registerServerRoutes } from "../bridge/serverRoutes.js";
import { ServerRegistry } from "../bridge/serverRegistry.js";
import type { AppConfig } from "../config/appConfig.js";
import { createDiscordCommandSet } from "../discord/commands/commandRegistry.js";
import { DiscordRuntime } from "../discord/discordRuntime.js";
import { InteractionRouter } from "../discord/interactions/interactionRouter.js";
import { registerHealthRoutes } from "../health/healthRoutes.js";
import { registerIdentityRoutes } from "../identity/identityRoutes.js";
import { AuditEventRepository } from "../infrastructure/database/auditEventRepository.js";
import { DatabaseProvider } from "../infrastructure/database/databaseProvider.js";
import { IdentityLinkRepository } from "../infrastructure/database/identityLinkRepository.js";
import { MigrationStatusRepository } from "../infrastructure/database/migrationStatusRepository.js";
import { RoleSetupRepository } from "../infrastructure/database/roleSetupRepository.js";
import { ServerNodeRepository } from "../infrastructure/database/serverNodeRepository.js";
import { StaffDirectoryRepository } from "../infrastructure/database/staffDirectoryRepository.js";
import { RedisProvider } from "../infrastructure/redis/redisProvider.js";
import type { AppLogger } from "../logging/logger.js";
import { registerProfileRoutes } from "../profile/profileRoutes.js";
import type { HealthCheck } from "../shared/health.js";

export class LykosApp {
  private readonly server: FastifyInstance;
  private readonly discord: DiscordRuntime;
  private readonly database: DatabaseProvider;
  private readonly redis: RedisProvider;
  private readonly serverRegistry: ServerRegistry;
  private readonly bridgeMonitor: BridgeRedisMonitor;
  private readonly commandDispatcher: BridgeCommandDispatcher;
  private readonly auditService: AuditService;
  private readonly identityLinkService: IdentityLinkService;
  private readonly profileService: ProfileAggregationService;
  private readonly policyEngine: PolicyEngine;
  private readonly setupService: SetupService;
  private readonly roleSetupService: RoleSetupService;
  private readonly staffDirectoryService: StaffDirectoryService;
  private readonly staffOperationsService: StaffOperationsService;
  private readonly staffSyncService: StaffSyncService;

  public constructor(
    private readonly config: AppConfig,
    private readonly logger: AppLogger
  ) {
    this.server = Fastify({
      logger: false
    });

    this.database = new DatabaseProvider(config, logger);
    this.redis = new RedisProvider(config, logger);
    this.serverRegistry = new ServerRegistry(config.bridge.heartbeatStaleMs);
    this.auditService = new AuditService(new AuditEventRepository(this.database), logger);
    this.identityLinkService = new IdentityLinkService(new IdentityLinkRepository(this.database), {
      codeTtlMs: config.identity.linkCodeTtlMs,
      rateLimitMs: config.identity.linkCodeRateLimitMs
    });
    this.profileService = new ProfileAggregationService(this.identityLinkService, [new IdentityProfileProvider(this.identityLinkService)]);
    this.policyEngine = new PolicyEngine(config);
    this.roleSetupService = new RoleSetupService(new RoleSetupRepository(this.database));
    const staffRepository = new StaffDirectoryRepository(this.database);
    this.staffDirectoryService = new StaffDirectoryService(staffRepository);
    this.staffOperationsService = new StaffOperationsService(staffRepository);
    this.bridgeMonitor = new BridgeRedisMonitor(
      config,
      this.redis,
      this.serverRegistry,
      new ServerNodeRepository(this.database),
      logger
    );
    this.commandDispatcher = new BridgeCommandDispatcher(config, this.redis, logger);
    this.staffSyncService = new StaffSyncService(staffRepository, this.commandDispatcher);
    this.setupService = new SetupService({
      config,
      healthChecks: [this.database, this.redis, this.bridgeMonitor],
      serverRegistry: this.serverRegistry,
      migrationStatusReader: new MigrationStatusRepository(this.database),
      migrationsDirectory: join(process.cwd(), "migrations")
    });
    const commandSet = createDiscordCommandSet({
      registry: this.serverRegistry,
      policyEngine: this.policyEngine,
      auditService: this.auditService,
      identityLinkService: this.identityLinkService,
      profileService: this.profileService,
      setupService: this.setupService,
      roleSetupService: this.roleSetupService,
      staffDirectoryService: this.staffDirectoryService,
      staffOperationsService: this.staffOperationsService,
      staffSyncService: this.staffSyncService
    });
    const interactionRouter = new InteractionRouter(commandSet.chatInputCommands, commandSet.buttonHandlers, logger);
    this.discord = new DiscordRuntime(config, logger, interactionRouter);

    const readinessChecks: HealthCheck[] = [this.discord, this.database, this.redis, this.bridgeMonitor];
    registerHealthRoutes(this.server, config, readinessChecks);
    registerServerRoutes(this.server, config, this.serverRegistry, this.commandDispatcher);
    registerIdentityRoutes(this.server, config, this.identityLinkService);
    registerProfileRoutes(this.server, config, this.profileService);
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
