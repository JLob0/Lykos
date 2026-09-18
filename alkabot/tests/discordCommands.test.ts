import { ComponentType, MessageFlags } from "discord-api-types/v10";
import type { ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import type { AuditService } from "../src/application/audit/auditService.js";
import { PolicyEngine } from "../src/application/policy/policyEngine.js";
import type { SetupService } from "../src/application/setup/setupService.js";
import type { SetupDoctorReport } from "../src/application/setup/setupTypes.js";
import { ServerRegistry, type ServerNodeView } from "../src/bridge/serverRegistry.js";
import type { AppConfig } from "../src/config/appConfig.js";
import { createApplicationCommandPayloads } from "../src/discord/commands/commandRegistry.js";
import { createNetworkStatusCommand } from "../src/discord/commands/networkStatusCommand.js";
import { createSetupCommand } from "../src/discord/commands/setupCommand.js";
import { NETWORK_STATUS_REFRESH_ID, renderNetworkStatusCard } from "../src/discord/ui/networkStatusCard.js";

describe("Discord command registry", () => {
  it("exports the network and setup slash command payloads", () => {
    const payloads = createApplicationCommandPayloads();

    expect(payloads.map((payload) => payload.name)).toEqual(["network", "setup"]);
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
        })
      ])
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
    const command = createSetupCommand({
      setupService,
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

function chatInputInteraction(input: { roleIds: string[]; subcommand?: string; botPermissionNames?: string[] }): ChatInputCommandInteraction {
  return {
    id: "interaction_test",
    user: {
      id: "111"
    },
    guildId: "guild_test",
    guild: {
      ownerId: "owner_test"
    },
    member: {
      roles: input.roleIds
    },
    appPermissions: {
      toArray: () => input.botPermissionNames ?? []
    },
    options: {
      getSubcommand: () => input.subcommand ?? "status"
    },
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn()
  } as unknown as ChatInputCommandInteraction;
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

function policyConfig(overrides: { networkReadRoleIds?: ReadonlySet<string>; setupReadRoleIds?: ReadonlySet<string> }): AppConfig {
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
      setupReadRoleIds: overrides.setupReadRoleIds ?? new Set()
    }
  };
}
