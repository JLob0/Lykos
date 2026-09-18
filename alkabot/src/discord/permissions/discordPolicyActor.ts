import type { APIInteractionGuildMember } from "discord-api-types/v10";
import type { GuildMember } from "discord.js";
import type { PolicyActor } from "../../application/policy/policyTypes.js";

export function createDiscordPolicyActor(input: {
  userId: string;
  guildId?: string | null;
  guildOwnerId?: string | null | undefined;
  member: GuildMember | APIInteractionGuildMember | null;
}): PolicyActor {
  const actor: PolicyActor = {
    type: "DISCORD_USER",
    id: input.userId,
    roleIds: extractRoleIds(input.member),
    isGuildOwner: input.guildOwnerId === input.userId
  };

  if (input.guildId != null) {
    return {
      ...actor,
      guildId: input.guildId
    };
  }

  return actor;
}

function extractRoleIds(member: GuildMember | APIInteractionGuildMember | null): string[] {
  if (member == null) {
    return [];
  }

  if (Array.isArray(member.roles)) {
    return [...member.roles];
  }

  return [...member.roles.cache.keys()];
}
