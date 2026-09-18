import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { AuditService } from "../../application/audit/auditService.js";
import { IdentityLinkError } from "../../application/identity/identityTypes.js";
import type { IdentityLinkService } from "../../application/identity/identityLinkService.js";
import type { ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { renderLinkedIdentityCard, renderLinkHelpCard, renderLinkSuccessCard, renderUnlinkSuccessCard } from "../ui/identityCards.js";

export const linkCommandData = new SlashCommandBuilder()
  .setName("link")
  .setDescription("Vincula ou consulta sua conta Minecraft.")
  .addStringOption((option) => option.setName("codigo").setDescription("Codigo temporario gerado no Minecraft.").setRequired(false));

export const unlinkCommandData = new SlashCommandBuilder()
  .setName("unlink")
  .setDescription("Remove o vinculo da sua conta Discord com o Minecraft.");

export type IdentityCommandDependencies = {
  identityLinkService: IdentityLinkService;
  auditService: AuditService;
};

export function createLinkCommand(dependencies: IdentityCommandDependencies): ChatInputCommandHandler {
  return {
    data: linkCommandData,
    async execute(interaction: ChatInputCommandInteraction) {
      const code = interaction.options.getString("codigo", false);

      if (code == null) {
        const identity = await dependencies.identityLinkService.getLinkedIdentity(interaction.user.id);
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "IDENTITY_LINK_STATUS_VIEWED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "IDENTITY",
            id: identity?.identityId ?? "none"
          },
          source: "discord:/link"
        });

        await interaction.reply({
          ...(identity == null ? renderLinkHelpCard() : renderLinkedIdentityCard(identity)),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
      }

      try {
        const discordGlobalName = interaction.user.globalName ?? undefined;
        const identity = await dependencies.identityLinkService.claimLinkCode({
          code,
          discordUserId: interaction.user.id,
          discordUsername: interaction.user.username,
          ...(discordGlobalName == null ? {} : { discordGlobalName })
        });
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "IDENTITY_LINKED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "IDENTITY",
            id: identity.identityId
          },
          source: "discord:/link codigo",
          metadata: {
            minecraftUuid: identity.minecraftUuid
          }
        });
        await interaction.reply({
          ...renderLinkSuccessCard(identity),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } catch (error) {
        if (error instanceof IdentityLinkError) {
          await auditIdentityError(dependencies.auditService, interaction, error, "discord:/link codigo");
          await interaction.reply({
            content: messageForIdentityError(error),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        throw error;
      }
    }
  };
}

export function createUnlinkCommand(dependencies: IdentityCommandDependencies): ChatInputCommandHandler {
  return {
    data: unlinkCommandData,
    async execute(interaction: ChatInputCommandInteraction) {
      try {
        const identity = await dependencies.identityLinkService.unlinkDiscord({
          discordUserId: interaction.user.id
        });
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "IDENTITY_UNLINKED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "IDENTITY",
            id: identity.identityId
          },
          source: "discord:/unlink",
          metadata: {
            minecraftUuid: identity.minecraftUuid
          }
        });
        await interaction.reply({
          ...renderUnlinkSuccessCard(identity),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } catch (error) {
        if (error instanceof IdentityLinkError) {
          await auditIdentityError(dependencies.auditService, interaction, error, "discord:/unlink");
          await interaction.reply({
            content: messageForIdentityError(error),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        throw error;
      }
    }
  };
}

async function auditIdentityError(
  auditService: AuditService,
  interaction: ChatInputCommandInteraction,
  error: IdentityLinkError,
  source: string
): Promise<void> {
  await auditService.record({
    correlationId: interaction.id,
    eventType: "IDENTITY_LINK_DENIED",
    actor: {
      type: "DISCORD_USER",
      id: interaction.user.id
    },
    target: {
      type: "IDENTITY",
      id: "self"
    },
    source,
    severity: "WARNING",
    metadata: {
      reason: error.code
    }
  });
}

function messageForIdentityError(error: IdentityLinkError): string {
  switch (error.code) {
    case "INVALID_CODE":
      return "Codigo invalido. Confira se ele esta no formato ALKA-XXXXX.";
    case "EXPIRED_CODE":
      return "Esse codigo expirou. Gere outro no Minecraft.";
    case "CODE_ALREADY_USED":
      return "Esse codigo ja foi usado.";
    case "DISCORD_ALREADY_LINKED":
      return "Sua conta Discord ja esta vinculada.";
    case "MINECRAFT_ALREADY_LINKED":
      return "Essa conta Minecraft ja esta vinculada.";
    case "RATE_LIMITED":
      return "Aguarde um pouco antes de gerar outro codigo.";
    case "NOT_LINKED":
      return "Sua conta Discord ainda nao esta vinculada.";
  }
}
