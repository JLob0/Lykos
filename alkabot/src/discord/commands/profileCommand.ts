import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { AuditService } from "../../application/audit/auditService.js";
import type { ProfileAggregationService } from "../../application/profile/profileAggregationService.js";
import { ProfileError } from "../../application/profile/profileTypes.js";
import type { ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { renderProfileCard } from "../ui/profileCards.js";

export const profileCommandData = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("Mostra seu perfil Minecraft vinculado.")
  .addStringOption((option) => option.setName("uuid").setDescription("UUID Minecraft para consulta direta.").setRequired(false));

export type ProfileCommandDependencies = {
  profileService: ProfileAggregationService;
  auditService: AuditService;
};

export function createProfileCommand(dependencies: ProfileCommandDependencies): ChatInputCommandHandler {
  return {
    data: profileCommandData,
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      const uuid = interaction.options.getString("uuid", false);

      try {
        const profile =
          uuid == null
            ? await dependencies.profileService.getOwnProfile({ discordUserId: interaction.user.id })
            : await dependencies.profileService.getProfileByMinecraftUuid({
                minecraftUuid: uuid,
                requesterDiscordUserId: interaction.user.id
              });

        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "PROFILE_VIEWED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "PROFILE",
            id: profile.minecraftUuid
          },
          source: uuid == null ? "discord:/profile" : "discord:/profile uuid",
          metadata: {
            self: uuid == null,
            sources: profile.sources.map((source) => `${source.source}:${source.state}`)
          }
        });

        await interaction.editReply(renderProfileCard(profile));
      } catch (error) {
        if (error instanceof ProfileError) {
          await dependencies.auditService.record({
            correlationId: interaction.id,
            eventType: "PROFILE_VIEW_DENIED",
            actor: {
              type: "DISCORD_USER",
              id: interaction.user.id
            },
            target: {
              type: "PROFILE",
              id: uuid ?? "self"
            },
            source: uuid == null ? "discord:/profile" : "discord:/profile uuid",
            severity: "WARNING",
            metadata: {
              reason: error.code
            }
          });
          await interaction.editReply(messageForProfileError(error));
          return;
        }

        throw error;
      }
    }
  };
}

function messageForProfileError(error: ProfileError): string {
  switch (error.code) {
    case "IDENTITY_NOT_LINKED":
      return "Voce ainda nao vinculou uma conta Minecraft. Use `/link codigo:ALKA-XXXXX` depois de gerar o codigo no servidor.";
    case "INVALID_MINECRAFT_UUID":
      return "UUID Minecraft invalido. Use o formato completo `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.";
  }
}
