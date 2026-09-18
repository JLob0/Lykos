import { describe, expect, it } from "vitest";
import { IdentityLinkService, hashCode } from "../src/application/identity/identityLinkService.js";
import {
  IdentityLinkError,
  type ConsumeLinkCodeInput,
  type CreateLinkCodeRecordInput,
  type IdentityLinkStore,
  type LinkCodeRecord,
  type LinkedIdentity
} from "../src/application/identity/identityTypes.js";

const MINECRAFT_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("IdentityLinkService", () => {
  it("generates hash-only Minecraft link codes and consumes them once", async () => {
    const store = new MemoryIdentityLinkStore();
    const service = serviceWithStore(store);
    const now = new Date("2026-09-18T15:00:00.000Z");

    const created = await service.createMinecraftLinkCode({
      minecraftUuid: MINECRAFT_UUID,
      minecraftName: "MestreBR",
      serverId: "rankup-01",
      now
    });

    expect(created.code).toMatch(/^ALKA-[A-Z2-9]{5}$/u);
    expect(store.codes[0]?.codeHash).toBe(hashCode(created.code));
    expect(store.codes[0]?.codeHash).not.toBe(created.code);
    expect(store.codes[0]).toMatchObject({
      minecraftUuid: MINECRAFT_UUID,
      minecraftName: "MestreBR",
      requestedByServerId: "rankup-01",
      expiresAt: new Date("2026-09-18T15:05:00.000Z")
    });

    const identity = await service.claimLinkCode({
      code: created.code.toLowerCase(),
      discordUserId: "111",
      discordUsername: "mestre",
      discordGlobalName: "Mestre",
      now: new Date("2026-09-18T15:01:00.000Z")
    });

    expect(identity).toMatchObject({
      discordUserId: "111",
      minecraftUuid: MINECRAFT_UUID,
      minecraftName: "MestreBR"
    });
    await expect(service.getLinkedIdentityByMinecraft(MINECRAFT_UUID.toUpperCase())).resolves.toMatchObject({
      identityId: identity.identityId
    });
    expect(store.codes[0]?.consumedByDiscordId).toBe("111");
    await expect(service.claimLinkCode({ code: created.code, discordUserId: "222", now })).rejects.toMatchObject({
      code: "CODE_ALREADY_USED"
    });
  });

  it("blocks rapid duplicate code generation for the same Minecraft account", async () => {
    const store = new MemoryIdentityLinkStore();
    const service = serviceWithStore(store);
    const now = new Date("2026-09-18T15:00:00.000Z");

    await service.createMinecraftLinkCode({ minecraftUuid: MINECRAFT_UUID, now });

    await expect(
      service.createMinecraftLinkCode({
        minecraftUuid: MINECRAFT_UUID,
        now: new Date("2026-09-18T15:00:10.000Z")
      })
    ).rejects.toMatchObject({
      code: "RATE_LIMITED"
    });
  });

  it("expires old codes before linking", async () => {
    const store = new MemoryIdentityLinkStore();
    const service = serviceWithStore(store);
    const created = await service.createMinecraftLinkCode({
      minecraftUuid: MINECRAFT_UUID,
      now: new Date("2026-09-18T15:00:00.000Z")
    });

    await expect(
      service.claimLinkCode({
        code: created.code,
        discordUserId: "111",
        now: new Date("2026-09-18T15:05:01.000Z")
      })
    ).rejects.toMatchObject({
      code: "EXPIRED_CODE"
    });
  });

  it("unlinks active identities and rejects missing links", async () => {
    const store = new MemoryIdentityLinkStore();
    const service = serviceWithStore(store);
    const created = await service.createMinecraftLinkCode({
      minecraftUuid: MINECRAFT_UUID,
      minecraftName: "MestreBR",
      now: new Date("2026-09-18T15:00:00.000Z")
    });
    const identity = await service.claimLinkCode({
      code: created.code,
      discordUserId: "111",
      now: new Date("2026-09-18T15:01:00.000Z")
    });

    await expect(service.getLinkedIdentity("111")).resolves.toMatchObject({
      identityId: identity.identityId
    });
    await expect(service.unlinkDiscord({ discordUserId: "111", now: new Date("2026-09-18T15:02:00.000Z") })).resolves.toMatchObject({
      identityId: identity.identityId
    });
    await expect(service.getLinkedIdentity("111")).resolves.toBeUndefined();
    await expect(service.unlinkDiscord({ discordUserId: "111" })).rejects.toMatchObject({
      code: "NOT_LINKED"
    });
  });

  it("rejects invalid Minecraft UUIDs before creating a code", async () => {
    const service = serviceWithStore(new MemoryIdentityLinkStore());

    await expect(service.createMinecraftLinkCode({ minecraftUuid: "not-a-uuid" })).rejects.toBeInstanceOf(IdentityLinkError);
  });
});

function serviceWithStore(store: MemoryIdentityLinkStore): IdentityLinkService {
  return new IdentityLinkService(store, {
    codeTtlMs: 300_000,
    rateLimitMs: 30_000
  });
}

class MemoryIdentityLinkStore implements IdentityLinkStore {
  public readonly codes: LinkCodeRecord[] = [];
  public readonly links: LinkedIdentity[] = [];

  public async findActiveLinkByDiscord(discordUserId: string): Promise<LinkedIdentity | undefined> {
    return this.links.find((link) => link.discordUserId === discordUserId);
  }

  public async findActiveLinkByMinecraft(minecraftUuid: string): Promise<LinkedIdentity | undefined> {
    return this.links.find((link) => link.minecraftUuid === minecraftUuid);
  }

  public async countRecentCodesForMinecraft(minecraftUuid: string, since: Date): Promise<number> {
    return this.codes.filter(
      (code) => code.minecraftUuid === minecraftUuid && code.createdAt.getTime() >= since.getTime() && code.consumedAt == null
    ).length;
  }

  public async createLinkCode(input: CreateLinkCodeRecordInput): Promise<void> {
    this.codes.push({ ...input });
  }

  public async findLinkCodeByHash(codeHash: string): Promise<LinkCodeRecord | undefined> {
    return this.codes.find((code) => code.codeHash === codeHash);
  }

  public async consumeLinkCodeAndLink(input: ConsumeLinkCodeInput): Promise<LinkedIdentity> {
    const code = this.codes.find((record) => record.codeId === input.code.codeId);
    if (code == null || code.consumedAt != null) {
      throw new IdentityLinkError("CODE_ALREADY_USED", "Codigo de vinculacao ja usado.");
    }

    code.consumedAt = input.now;
    code.consumedByDiscordId = input.discordUserId;
    const identity: LinkedIdentity = {
      identityId: input.identityId,
      discordUserId: input.discordUserId,
      minecraftUuid: code.minecraftUuid,
      linkedAt: input.now,
      ...(code.minecraftName == null ? {} : { minecraftName: code.minecraftName })
    };
    this.links.push(identity);
    return identity;
  }

  public async unlinkDiscord(input: { discordUserId: string; now: Date }): Promise<LinkedIdentity | undefined> {
    const index = this.links.findIndex((link) => link.discordUserId === input.discordUserId);
    if (index < 0) {
      return undefined;
    }

    const [identity] = this.links.splice(index, 1);
    return identity;
  }
}
