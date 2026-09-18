import { describe, expect, it, vi } from "vitest";
import type { IdentityLinkService } from "../src/application/identity/identityLinkService.js";
import { ProfileAggregationService } from "../src/application/profile/profileAggregationService.js";
import { IdentityProfileProvider } from "../src/application/profile/identityProfileProvider.js";
import { ProfileError, type ProfileProvider } from "../src/application/profile/profileTypes.js";

const MINECRAFT_UUID = "123e4567-e89b-12d3-a456-426614174000";
const NOW = new Date("2026-09-18T15:00:00.000Z");

describe("ProfileAggregationService", () => {
  it("builds an own profile from linked identity plus provider contributions", async () => {
    const identityLinkService = identityServiceStub();
    const provider: ProfileProvider = {
      id: "rank",
      snapshot: vi.fn(async () => ({
        rank: "Imperador",
        coins: "393990",
        level: "54"
      }))
    };
    const service = new ProfileAggregationService(identityLinkService, [new IdentityProfileProvider(identityLinkService), provider]);

    const profile = await service.getOwnProfile({
      discordUserId: "111",
      now: NOW
    });

    expect(profile).toMatchObject({
      minecraftUuid: MINECRAFT_UUID,
      nickname: "MestreBR",
      linkedDiscordUserId: "111",
      rank: "Imperador",
      coins: "393990",
      level: "54",
      privacy: "PUBLIC",
      generatedAt: NOW
    });
    expect(profile.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "identity", state: "AVAILABLE" }),
        expect.objectContaining({ source: "rank", state: "AVAILABLE" })
      ])
    );
  });

  it("requires a Discord link before rendering own profile", async () => {
    const service = new ProfileAggregationService(identityServiceStub({ linkedDiscord: undefined }), []);

    await expect(service.getOwnProfile({ discordUserId: "111" })).rejects.toMatchObject({
      code: "IDENTITY_NOT_LINKED"
    });
  });

  it("marks failed providers without failing the full profile", async () => {
    const provider: ProfileProvider = {
      id: "stats",
      snapshot: vi.fn(async () => {
        throw new Error("stats unavailable");
      })
    };
    const service = new ProfileAggregationService(identityServiceStub(), [provider]);

    const profile = await service.getProfileByMinecraftUuid({
      minecraftUuid: MINECRAFT_UUID,
      now: NOW
    });

    expect(profile.sources).toEqual([
      expect.objectContaining({
        source: "stats",
        state: "ERROR",
        detail: "stats unavailable"
      })
    ]);
  });

  it("rejects invalid Minecraft UUID lookups", async () => {
    const service = new ProfileAggregationService(identityServiceStub(), []);

    await expect(service.getProfileByMinecraftUuid({ minecraftUuid: "MestreBR" })).rejects.toBeInstanceOf(ProfileError);
  });
});

function identityServiceStub(overrides: { linkedDiscord?: Awaited<ReturnType<IdentityLinkService["getLinkedIdentity"]>> } = {}): IdentityLinkService {
  const linkedDiscord =
    Object.prototype.hasOwnProperty.call(overrides, "linkedDiscord")
      ? overrides.linkedDiscord
      : {
          identityId: "identity_test",
          discordUserId: "111",
          minecraftUuid: MINECRAFT_UUID,
          minecraftName: "MestreBR",
          linkedAt: new Date("2026-09-18T14:00:00.000Z")
        };

  return {
    getLinkedIdentity: vi.fn(async () => linkedDiscord),
    getLinkedIdentityByMinecraft: vi.fn(async (minecraftUuid: string) =>
      minecraftUuid === MINECRAFT_UUID
        ? {
            identityId: "identity_test",
            discordUserId: "111",
            minecraftUuid: MINECRAFT_UUID,
            minecraftName: "MestreBR",
            linkedAt: new Date("2026-09-18T14:00:00.000Z")
          }
        : undefined
    )
  } as unknown as IdentityLinkService;
}
