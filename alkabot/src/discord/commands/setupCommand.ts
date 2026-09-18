import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction, type PermissionsBitField, type Role } from "discord.js";
import type { AuditService } from "../../application/audit/auditService.js";
import type { PolicyEngine } from "../../application/policy/policyEngine.js";
import { ALKA_PERMISSIONS, type PolicyActor, type PolicyResult } from "../../application/policy/policyTypes.js";
import type { RoleSetupService } from "../../application/roles/roleSetupService.js";
import type { CurrentDiscordRole, RolePlanMode } from "../../application/roles/rolePlannerTypes.js";
import type { SetupService } from "../../application/setup/setupService.js";
import type { SetupRuntimeContext } from "../../application/setup/setupTypes.js";
import { createDiscordPolicyActor } from "../permissions/discordPolicyActor.js";
import type { ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { renderRoleApplyCard, renderRolePlanCard, renderSetupDoctorCard, renderSetupPlanCard } from "../ui/setupCards.js";

const ROLE_MODE_CHOICES = [
  { name: "LEAN", value: "LEAN" },
  { name: "EXPANDED", value: "EXPANDED" },
  { name: "FULL", value: "FULL" }
] as const;

export const setupCommandData = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Diagnosticos e dry-run do setup do Lykos.")
  .addSubcommand((subcommand) => subcommand.setName("doctor").setDescription("Valida configuracao, dependencias e readiness do Lykos."))
  .addSubcommand((subcommand) => subcommand.setName("plan").setDescription("Mostra um dry-run seguro do setup sem aplicar mudancas."))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("roles")
      .setDescription("Mostra o role planner do setup sem aplicar mudancas.")
      .addStringOption((option) => option.setName("modo").setDescription("Modo do role planner.").setRequired(true).addChoices(...ROLE_MODE_CHOICES))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("import")
      .setDescription("Importa o blueprint de cargos para o banco, sem criar cargos Discord.")
      .addStringOption((option) => option.setName("modo").setDescription("Modo do role planner.").setRequired(true).addChoices(...ROLE_MODE_CHOICES))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("apply")
      .setDescription("Consolida blueprints de cargos no banco, sem mutacao fisica no Discord.")
      .addStringOption((option) => option.setName("modo").setDescription("Modo do role planner.").setRequired(true).addChoices(...ROLE_MODE_CHOICES))
  );

export type SetupCommandDependencies = {
  setupService: SetupService;
  roleSetupService: RoleSetupService;
  policyEngine: PolicyEngine;
  auditService: AuditService;
};

export function createSetupCommand(dependencies: SetupCommandDependencies): ChatInputCommandHandler {
  return {
    data: setupCommandData,
    async execute(interaction: ChatInputCommandInteraction) {
      const subcommand = interaction.options.getSubcommand();
      const actor = actorFromInteraction(interaction);
      const requiredPermission = isSetupWriteSubcommand(subcommand) ? ALKA_PERMISSIONS.SETUP_WRITE : ALKA_PERMISSIONS.SETUP_READ;
      const policyResult = authorizeSetup(dependencies.policyEngine, actor, requiredPermission, `discord:/setup ${subcommand}`);

      if (!policyResult.allowed) {
        await auditPolicyDenied(dependencies.auditService, interaction.id, actor, policyResult, requiredPermission, `discord:/setup ${subcommand}`);
        await interaction.reply({
          content: "Voce nao tem permissao para usar esse setup do Lykos.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      if (subcommand === "doctor") {
        const report = await dependencies.setupService.runDoctor(contextFromInteraction(interaction));
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "SETUP_DOCTOR_VIEWED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "SETUP",
            id: "doctor"
          },
          source: "discord:/setup doctor",
          metadata: {
            overall: report.overall,
            policyMatchedBy: policyResult.matchedBy
          }
        });
        await interaction.editReply(renderSetupDoctorCard(report));
        return;
      }

      if (subcommand === "plan") {
        const report = await dependencies.setupService.createPlan(contextFromInteraction(interaction));
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "SETUP_PLAN_VIEWED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "SETUP",
            id: "plan"
          },
          source: "discord:/setup plan",
          metadata: {
            doctorOverall: report.doctorOverall,
            summary: report.summary,
            policyMatchedBy: policyResult.matchedBy
          }
        });
        await interaction.editReply(renderSetupPlanCard(report));
        return;
      }

      if (subcommand === "roles") {
        const mode = roleModeFromInteraction(interaction);
        const plan = await dependencies.roleSetupService.planRoles({
          mode,
          currentRoles: rolesFromInteraction(interaction)
        });
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "SETUP_ROLE_PLAN_VIEWED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "SETUP_ROLE_PLAN",
            id: mode
          },
          source: "discord:/setup roles",
          metadata: {
            mode,
            summary: plan.summary,
            policyMatchedBy: policyResult.matchedBy
          }
        });
        await interaction.editReply(renderRolePlanCard(plan));
        return;
      }

      if (subcommand === "import") {
        const mode = roleModeFromInteraction(interaction);
        const result = await dependencies.roleSetupService.importRoles({
          mode,
          currentRoles: rolesFromInteraction(interaction),
          correlationId: interaction.id,
          actorType: actor.type,
          actorId: actor.id
        });
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "SETUP_ROLE_IMPORT_APPLIED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "SETUP_ROLE_PLAN",
            id: mode
          },
          source: "discord:/setup import",
          metadata: {
            runId: result.runId,
            mode,
            summary: result.plan.summary,
            discordMutation: false,
            policyMatchedBy: policyResult.matchedBy
          }
        });
        await interaction.editReply(renderRoleApplyCard(result, "IMPORT"));
        return;
      }

      if (subcommand === "apply") {
        const mode = roleModeFromInteraction(interaction);
        const result = await dependencies.roleSetupService.applyRoles({
          mode,
          currentRoles: rolesFromInteraction(interaction),
          correlationId: interaction.id,
          actorType: actor.type,
          actorId: actor.id
        });
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "SETUP_ROLE_APPLY_RECORDED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "SETUP_ROLE_PLAN",
            id: mode
          },
          source: "discord:/setup apply",
          metadata: {
            runId: result.runId,
            mode,
            summary: result.plan.summary,
            discordMutation: false,
            policyMatchedBy: policyResult.matchedBy
          }
        });
        await interaction.editReply(renderRoleApplyCard(result, "APPLY"));
        return;
      }

      await interaction.editReply("Subcomando desconhecido para /setup.");
    }
  };
}

function authorizeSetup(policyEngine: PolicyEngine, actor: PolicyActor, action: typeof ALKA_PERMISSIONS.SETUP_READ | typeof ALKA_PERMISSIONS.SETUP_WRITE, source: string): PolicyResult {
  return policyEngine.evaluate({
    action,
    actor,
    resourceType: "SETUP",
    resourceId: "global",
    source
  });
}

async function auditPolicyDenied(
  auditService: AuditService,
  correlationId: string,
  actor: PolicyActor,
  policyResult: PolicyResult,
  action: typeof ALKA_PERMISSIONS.SETUP_READ | typeof ALKA_PERMISSIONS.SETUP_WRITE,
  source: string
): Promise<void> {
  await auditService.record({
    correlationId,
    eventType: "POLICY_DENIED",
    actor: {
      type: actor.type,
      id: actor.id
    },
    target: {
      type: "SETUP",
      id: "global"
    },
    source,
    severity: "WARNING",
    metadata: {
      action,
      reason: policyResult.reason
    }
  });
}

function actorFromInteraction(interaction: ChatInputCommandInteraction): PolicyActor {
  return createDiscordPolicyActor({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    guildOwnerId: interaction.guild?.ownerId,
    member: interaction.member
  });
}

function contextFromInteraction(interaction: ChatInputCommandInteraction): SetupRuntimeContext {
  const context: SetupRuntimeContext = {
    botPermissionNames: permissionNames(interaction.appPermissions),
    isGuildOwner: interaction.guild?.ownerId === interaction.user.id
  };

  if (interaction.guildId != null) {
    context.guildId = interaction.guildId;
  }

  if (interaction.guild?.name != null) {
    context.guildName = interaction.guild.name;
  }

  return context;
}

function permissionNames(permissions: Readonly<PermissionsBitField> | null): string[] {
  return permissions?.toArray() ?? [];
}

function roleModeFromInteraction(interaction: ChatInputCommandInteraction): RolePlanMode {
  const raw = interaction.options.getString("modo", true);
  if (raw === "LEAN" || raw === "EXPANDED" || raw === "FULL") {
    return raw;
  }

  return "LEAN";
}

function rolesFromInteraction(interaction: ChatInputCommandInteraction): CurrentDiscordRole[] {
  const roles = interaction.guild?.roles.cache;
  if (roles == null) {
    return [];
  }

  return [...roles.values()].filter((role) => role.name !== "@everyone").map(roleFromDiscordRole);
}

function roleFromDiscordRole(role: Role): CurrentDiscordRole {
  return {
    id: role.id,
    name: role.name,
    managed: role.managed,
    position: role.position,
    editable: role.editable
  };
}

function isSetupWriteSubcommand(subcommand: string): boolean {
  return subcommand === "import" || subcommand === "apply";
}
