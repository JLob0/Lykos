import type { IdentityLinkService } from "../identity/identityLinkService.js";
import type { ProfileProvider, ProfileProviderContribution, ProfileProviderInput } from "./profileTypes.js";
import { profileSource } from "./profileAggregationService.js";

export class IdentityProfileProvider implements ProfileProvider {
  public readonly id = "identity";

  public constructor(private readonly identityLinkService: IdentityLinkService) {}

  public async snapshot(input: ProfileProviderInput): Promise<ProfileProviderContribution | undefined> {
    const identity = await this.identityLinkService.getLinkedIdentityByMinecraft(input.minecraftUuid);
    if (identity == null) {
      return {
        sources: [profileSource(this.id, "MISSING", "Nenhum vinculo Discord ativo para este UUID.")]
      };
    }

    return {
      linkedDiscordUserId: identity.discordUserId,
      linkedAt: identity.linkedAt,
      sources: [profileSource(this.id, "AVAILABLE")],
      ...(identity.minecraftName == null ? {} : { nickname: identity.minecraftName })
    };
  }
}
