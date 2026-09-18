import { describe, expect, it } from "vitest";
import { StaffDirectoryService } from "../src/application/staff/staffDirectoryService.js";
import { StaffError, type StaffDirectoryStore, type StaffMemberRecord } from "../src/application/staff/staffTypes.js";

describe("StaffDirectoryService", () => {
  it("lists active staff with career path context and senior seat summary", async () => {
    const service = new StaffDirectoryService(
      store([
        {
          memberId: "staff_1",
          discordUserId: "111",
          displayName: "MestreBR",
          status: "ACTIVE",
          joinedAt: new Date("2026-09-18T15:00:00.000Z"),
          departmentKey: "moderation",
          positionKey: "moderation.moderator",
          assignedAt: new Date("2026-09-18T15:00:00.000Z")
        },
        {
          memberId: "staff_2",
          discordUserId: "222",
          displayName: "Bnzinn",
          status: "ACTIVE",
          joinedAt: new Date("2026-09-18T15:00:00.000Z"),
          departmentKey: "moderation",
          positionKey: "moderation.senior"
        }
      ])
    );

    const result = await service.listStaff({ departmentKey: "moderation" });

    expect(result.summary.activeStaff).toBe(2);
    expect(result.summary.seniorSeatsFilled).toBe(1);
    expect(result.members[0]).toMatchObject({
      memberId: "staff_2",
      position: {
        key: "moderation.senior"
      }
    });
    expect(result.members[1]).toMatchObject({
      memberId: "staff_1",
      nextPosition: {
        key: "moderation.senior"
      },
      previousPosition: {
        key: "moderation.helper"
      }
    });
  });

  it("opens profile by Discord user id", async () => {
    const service = new StaffDirectoryService(
      store([
        {
          memberId: "staff_1",
          discordUserId: "111",
          displayName: "MestreBR",
          status: "ACTIVE",
          joinedAt: new Date("2026-09-18T15:00:00.000Z"),
          departmentKey: "support",
          positionKey: "support.agent"
        }
      ])
    );

    await expect(service.getProfileByDiscord("111")).resolves.toMatchObject({
      memberId: "staff_1",
      department: {
        key: "support"
      },
      nextPosition: {
        key: "support.senior"
      }
    });
  });

  it("returns a department career path", () => {
    const service = new StaffDirectoryService(store([]));

    expect(service.getCareerPath("technical")).toMatchObject({
      department: {
        key: "technical"
      },
      positions: [
        {
          key: "technical.developer"
        },
        {
          key: "technical.senior"
        }
      ]
    });
  });

  it("rejects unknown staff members and departments", async () => {
    const service = new StaffDirectoryService(store([]));

    await expect(service.getProfileByDiscord("missing")).rejects.toBeInstanceOf(StaffError);
    await expect(service.listStaff({ departmentKey: "unknown" })).rejects.toMatchObject({
      code: "STAFF_DEPARTMENT_NOT_FOUND"
    });
  });
});

function store(records: StaffMemberRecord[]): StaffDirectoryStore {
  return {
    async listActiveStaff() {
      return records.filter((record) => record.status === "ACTIVE");
    },
    async findActiveStaffByDiscord(discordUserId) {
      return records.find((record) => record.discordUserId === discordUserId && record.status === "ACTIVE");
    },
    async findStaffByMemberId(memberId) {
      return records.find((record) => record.memberId === memberId);
    }
  };
}
