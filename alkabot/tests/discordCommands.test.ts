import { ComponentType, MessageFlags } from "discord-api-types/v10";
import type { ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import type { AuditService } from "../src/application/audit/auditService.js";
import type { IdentityLinkService } from "../src/application/identity/identityLinkService.js";
import type { LinkedIdentity } from "../src/application/identity/identityTypes.js";
import { PolicyEngine } from "../src/application/policy/policyEngine.js";
import type { RoleSetupService } from "../src/application/roles/roleSetupService.js";
import type { RoleApplyResult, RolePlan } from "../src/application/roles/rolePlannerTypes.js";
import type { SetupService } from "../src/application/setup/setupService.js";
import type { SetupDoctorReport } from "../src/application/setup/setupTypes.js";
import { ServerRegistry, type ServerNodeView } from "../src/bridge/serverRegistry.js";
import type { AppConfig } from "../src/config/appConfig.js";
import { createApplicationCommandPayloads } from "../src/discord/commands/commandRegistry.js";
import { createLinkCommand, createUnlinkCommand } from "../src/discord/commands/identityCommands.js";
import { createNetworkStatusCommand } from "../src/discord/commands/networkStatusCommand.js";
import { createSetupCommand } from "../src/discord/commands/setupCommand.js";
import { NETWORK_STATUS_REFRESH_ID, renderNetworkStatusCard } from "../src/discord/ui/networkStatusCard.js";

describe("Discord command registry", () => {
  it("exports the network, setup and identity slash command payloads", () => {
    const payloads = createApplicationCommandPayloads();

    expect(payloads.map((payload) => payload.name)).toEqual(["network", "setup", "link", "unlink"]);
    expect(payloads[0]).toMatchObject({
      name: "network",
      description: "Operacoes e diagnosticos da Network Alka.",
      options: [
        {
          name: "status"
        }
      ]
    });
    expect(payloads[1]).toMatchObject({
      name: "setup",
      options: expect.arrayContaining([
        expect.objectContaining({
          name: "doctor"
        }),
        expect.objectContaining({
          name: "plan"
        }),
        expect.objectContaining({
          name: "roles"
        }),
        expect.objectContaining({
          name: "import"
        }),
        expect.objectContaining({
          name: "apply"
        })
      ])
    });
    expect(payloads[2]).toMatchObject({
      name: "link"
    });
    expect(payloads[3]).toMatchObject({
      name: "unlink"
    });
  });
});

describe("network status Components V2 card", () => {
  it("renders a Components V2 response with a refresh button", () => {
    const message = renderNetworkStatusCard(
      [
        serverNode({
          serverId: "rankup-01",
          displayName: "RankUP",
          status: "ONLINE",
          onlinePlayers: 42,
          maxPlayers: 200,
          capabilities: ["bridge.ping", "server.heartbeat"]
        })
      ],
      new Date("2026-09-18T15:00:10.000Z")
    );

    expect(message.flags).toBe(MessageFlags.IsComponentsV2);
    expect(message.allowedMentions.parse).toEqual([]);
    expect(message.components[0]).toMatchObject({
      type: ComponentType.Container,
      components: expect.arrayContaining([
        expect.objectContaining({
          type: ComponentType.TextDisplay,
          content: expect.stringContaining("ALKASTUDIO - NETWORK")
        }),
        expect.objectContaining({
          type: ComponentType.ActionRow,
          components: [
            expect.objectContaining({
              custom_id: NETWORK_STATUS_REFRESH_ID,
              label: "Atualizar"
            })
          ]
        })
      ])
    });
  });
});

describe("network status command policy", () => {
  it("renders status and audits when the actor has network read permission", async () => {
    const registry = new ServerRegistry(30_000);
    registry.upsertHeartbeat({
      version: 1,
      serverId: "rankup-01",
      displayName: "RankUP",
      environment: "development",
      status: "ONLINE",
      timestamp: "2026-09-18T15:00:00.000Z",
      bridgeVersion: "0.1.0",
      paperVersion: "1.21.8",
      javaVersion: "21.0.11",
      onlinePlayers: 42,
      maxPlayers: 200
    });
    const auditService = auditServiceStub();
    const command = createNetworkStatusCommand({
      registry,
      policyEngine: new PolicyEngine(policyConfig({ networkReadRoleIds: new Set(["role_network"]) })),
      auditService
    });
    const interaction = chatInputInteraction({ roleIds: ["role_network"] });

    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.IsComponentsV2 }));
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "NETWORK_STATUS_VIEWED",
        target: {
          type: "NETWORK",
          id: "global"
        }
      })
    );
  });

  it("denies status and audits when the actor lacks permission", async () => {
    const auditService = auditServiceStub();
    const command = createNetworkStatusCommand({
      registry: new ServerRegistry(30_000),
      policyEngine: new PolicyEngine(policyConfig({ networkReadRoleIds: new Set(["role_network"]) })),
      auditService
    });
    const interaction = chatInputInteraction({ roleIds: ["role_other"] });

    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Voce nao tem permissao para ver o status da Network.",
      flags: MessageFlags.Ephemeral
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "POLICY_DENIED",
        severity: "WARNING",
        metadata: expect.objectContaining({
          action: "alka.network.read"
        })
      })
    );
  });
});

describe("setup command policy", () => {
  it("runs setup doctor and audits when the actor has setup read permission", async () => {
    const auditService = auditServiceStub();
    const setupService = setupServiceStub();
    const roleSetupService = roleSetupServiceStub();
    const command = createSetupCommand({
      setupService,
      roleSetupService,
      policyEngine: new PolicyEngine(policyConfig({ setupReadRoleIds: new Set(["role_setup"]) })),
      auditService
    });
    const interaction = chatInputInteraction({
      roleIds: ["role_setup"],
      subcommand: "doctor",
      botPermissionNames: ["ManageRoles", "ManageChannels"]
    });

    await command.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({
      flags: MessageFlags.Ephemeral
    });
    expect(setupService.runDoctor).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild_test",
        botPermissionNames: ["ManageRoles", "ManageChannels"]
      })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.IsComponentsV2 }));
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SETUP_DOCTOR_VIEWED",
        target: {
          type: "SETUP",
          id: "doctor"
        }
      })
    );
  });

  it("renders role planner when the actor has setup read permission", async () => {
    const auditService = auditServiceStub();
    const roleSetupService = roleSetupServiceStub();
    const command = createSetupCommand({
      setupService: setupServiceStub(),
      roleSetupService,
      policyEngine: new PolicyEngine(policyConfig({ setupReadRoleIds: new Set(["role_setup"]) })),
      auditService
    });
    const interaction = chatInputInteraction({
      roleIds: ["role_setup"],
      subcommand: "roles",
      optionMode: "LEAN",
      guildRoles: [
        {
          id: "role_existing",
          name: "Alka Staff"
        }
      ]
    });

    await command.execute(interaction);

    expect(roleSetupService.planRoles).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "LEAN",
        currentRoles: expect.arrayContaining([
          expect.objectContaining({
            id: "role_existing",
            name: "Alka Staff"
          })
        ])
      })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.IsComponentsV2 }));
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: "SETUP_ROLE_PLAN_VIEWED" }));
  });

  it("imports role blueprint when the actor has setup write permission", async () => {
    const auditService = auditServiceStub();
    const roleSetupService = roleSetupServiceStub();
    const command = createSetupCommand({
      setupService: setupServiceStub(),
      roleSetupService,
      policyEngine: new PolicyEngine(policyConfig({ setupWriteRoleIds: new Set(["role_setup_write"]) })),
      auditService
    });
    const interaction = chatInputInteraction({
      roleIds: ["role_setup_write"],
      subcommand: "import",
      optionMode: "EXPANDED"
    });

    await command.execute(interaction);

    expect(roleSetupService.importRoles).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "EXPANDED",
        correlationId: "interaction_test",
        actorId: "111"
      })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.IsComponentsV2 }));
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: "SETUP_ROLE_IMPORT_APPLIED" }));
  });
});

describe("identity link commands", () => {
  it("renders link help and audits when Discord is not linked yet", async () => {
    const auditService = auditServiceStub();
    const identityLinkService = identityLinkServiceStub();
    const command = createLinkCommand({ identityLinkService, auditService });
    const interaction = chatInputInteraction({ roleIds: [], stringOption: null });

    await command.execute(interaction);

    expect(identityLinkService.getLinkedIdentity).toHaveBeenCalledWith("111");
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 }));
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: "IDENTITY_LINK_STATUS_VIEWED" }));
  });

  it("claims a Minecraft link code and audits the identity link", async () => {
    const auditService = auditServiceStub();
    const identity = linkedIdentity();
    const identityLinkService = identityLinkServiceStub({ claimResult: identity });
    const command = createLinkCommand({ identityLinkService, auditService });
    const interaction = chatInputInteraction({ roleIds: [], stringOption: "ALKA-ABCDE" });

    await command.execute(interaction);

    expect(identityLinkService.claimLinkCode).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "ALKA-ABCDE",
        discordUserId: "111",
        discordUsername: "MestreDEV"
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 }));
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "IDENTITY_LINKED",
        target: {
          type: "IDENTITY",
          id: identity.identityId
        }
      })
    );
  });

  it("unlinks the active Discord identity and audits the removal", async () => {
    const auditService = auditServiceStub();
    const identity = linkedIdentity();
    const identityLinkService = identityLinkServiceStub({ unlinkResult: identity });
    const command = createUnlinkCommand({ identityLinkService, auditService });
    const interaction = chatInputInteraction({ roleIds: [] });

    await command.execute(interaction);

    expect(identityLinkService.unlinkDiscord).toHaveBeenCalledWith({
      discordUserId: "111"
    });
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 }));
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "IDENTITY_UNLINKED",
        target: {
          type: "IDENTITY",
          id: identity.identityId
        }
      })
    );
  });
});

function serverNode(overrides: Partial<ServerNodeView>): ServerNodeView {
  return {
    serverId: "rankup-01",
    displayName: "RankUP",
    environment: "development",
    status: "ONLINE",
    bridgeVersion: "0.1.0",
    paperVersion: "1.21.8",
    javaVersion: "21.0.11",
    onlinePlayers: 0,
    maxPlayers: 0,
    lastHeartbeatAt: "2026-09-18T15:00:00.000Z",
    capabilities: [],
    stale: false,
    ...overrides
  };
}

function chatInputInteraction(input: {
  roleIds: string[];
  subcommand?: string;
  botPermissionNames?: string[];
  optionMode?: string;
  stringOption?: string | null;
  guildRoles?: Array<{ id: string; name: string; managed?: boolean; position?: number; editable?: boolean }>;
}): ChatInputCommandInteraction {
  return {
    id: "interaction_test",
    user: {
      id: "111",
      username: "MestreDEV",
      globalName: "Mestre"
    },
    guildId: "guild_test",
    guild: {
      ownerId: "owner_test",
      roles: {
        cache: new Map(
          (input.guildRoles ?? []).map((role) => [
            role.id,
            {
              id: role.id,
              name: role.name,
              managed: role.managed ?? false,
              position: role.position ?? 1,
              editable: role.editable ?? true
            }
          ])
        )
      }
    },
    member: {
      roles: input.roleIds
    },
    appPermissions: {
      toArray: () => input.botPermissionNames ?? []
    },
    options: {
      getSubcommand: () => input.subcommand ?? "status",
      getString: () => (Object.prototype.hasOwnProperty.call(input, "stringOption") ? input.stringOption : (input.optionMode ?? "LEAN"))
    },
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn()
  } as unknown as ChatInputCommandInteraction;
}

function linkedIdentity(overrides: Partial<LinkedIdentity> = {}): LinkedIdentity {
  return {
    identityId: "identity_test",
    discordUserId: "111",
    minecraftUuid: "123e4567-e89b-12d3-a456-426614174000",
    minecraftName: "MestreBR",
    linkedAt: new Date("2026-09-18T15:00:00.000Z"),
    ...overrides
  };
}

function identityLinkServiceStub(overrides: { linkedIdentity?: LinkedIdentity; claimResult?: LinkedIdentity; unlinkResult?: LinkedIdentity } = {}): IdentityLinkService {
  return {
    getLinkedIdentity: vi.fn(async () => overrides.linkedIdentity),
    claimLinkCode: vi.fn(async () => overrides.claimResult ?? linkedIdentity()),
    unlinkDiscord: vi.fn(async () => overrides.unlinkResult ?? linkedIdentity())
  } as unknown as IdentityLinkService;
}

function auditServiceStub(): AuditService {
  return {
    record: vi.fn(async (event) => ({
      ...event,
      auditId: "audit_test",
      severity: event.severity ?? "INFO",
      createdAt: new Date("2026-09-18T15:00:00.000Z")
    }))
  } as unknown as AuditService;
}

function setupServiceStub(): SetupService {
  const doctorReport: SetupDoctorReport = {
    generatedAt: new Date("2026-09-18T15:00:00.000Z"),
    overall: "READY",
    checks: [
      {
        id: "discord.config",
        label: "Discord guild",
        state: "PASS",
        detail: "Guild pronta."
      }
    ]
  };

  return {
    runDoctor: vi.fn(async () => doctorReport),
    createPlan: vi.fn()
  } as unknown as SetupService;
}

function roleSetupServiceStub(): RoleSetupService {
  const plan: RolePlan = {
    mode: "LEAN",
    maxRoles: 250,
    generatedAt: new Date("2026-09-18T15:00:00.000Z"),
    actions: [
      {
        state: "REUSE",
        blueprint: {
          key: "alka.staff",
          mode: "LEAN",
          name: "Alka Staff",
          colorHex: "#8B5CF6",
          hoist: true,
          mentionable: false,
          group: "staff",
          priority: 100
        },
        discordRoleId: "role_existing",
        detail: "Cargo existente pode ser reaproveitado."
      }
    ],
    summary: {
      CREATE: 0,
      REUSE: 1,
      MANAGED: 0,
      CONFLICT: 0,
      currentRoles: 1,
      projectedRoles: 1,
      remainingCapacity: 239
    }
  };
  const result: RoleApplyResult = {
    runId: "setup_role_import_test",
    plan
  };

  return {
    planRoles: vi.fn(async () => plan),
    importRoles: vi.fn(async () => result),
    applyRoles: vi.fn(async () => result)
  } as unknown as RoleSetupService;
}

function policyConfig(overrides: {
  networkReadRoleIds?: ReadonlySet<string>;
  setupReadRoleIds?: ReadonlySet<string>;
  setupWriteRoleIds?: ReadonlySet<string>;
}): AppConfig {
  return {
    app: {
      name: "Lykos",
      version: "0.1.0",
      environment: "production"
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
      adminDiscordUserIds: new Set(),
      adminRoleIds: new Set(),
      networkReadRoleIds: overrides.networkReadRoleIds ?? new Set(),
      auditReadRoleIds: new Set(),
      setupReadRoleIds: overrides.setupReadRoleIds ?? new Set(),
      setupWriteRoleIds: overrides.setupWriteRoleIds ?? new Set()
    },
    identity: {
      linkCodeTtlMs: 300_000,
      linkCodeRateLimitMs: 30_000
    }
  };
}
