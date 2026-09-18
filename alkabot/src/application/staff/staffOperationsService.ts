import { randomUUID } from "node:crypto";
import { getStaffCareerPath } from "./staffCareerCatalog.js";
import type {
  StaffMemberProfile,
  StaffMemberRecord,
  StaffOperationKind,
  StaffOperationResult,
  StaffOperationsStore,
  StaffPosition
} from "./staffTypes.js";
import { StaffError } from "./staffTypes.js";
import { enrichStaffRecord } from "./staffDirectoryService.js";

export type StaffOperationInput = {
  memberId: string;
  actorDiscordUserId: string;
  reason: string;
  confirmed: boolean;
};

export class StaffOperationsService {
  public constructor(private readonly store: StaffOperationsStore) {}

  public async promote(input: StaffOperationInput): Promise<StaffOperationResult> {
    return this.createOperation("PROMOTE", input);
  }

  public async demote(input: StaffOperationInput): Promise<StaffOperationResult> {
    return this.createOperation("DEMOTE", input);
  }

  private async createOperation(kind: StaffOperationKind, input: StaffOperationInput): Promise<StaffOperationResult> {
    const member = await this.getActiveProfile(input.memberId);
    const targetPosition = targetPositionFor(kind, member);
    const base = baseResult(kind, member, targetPosition, input.reason);

    if (member.position == null || member.department == null) {
      return {
        ...base,
        status: "BLOCKED",
        blockReason: "NO_ACTIVE_ASSIGNMENT",
        requiresConfirmation: false
      };
    }

    if (targetPosition == null) {
      return {
        ...base,
        status: "BLOCKED",
        blockReason: "NO_TARGET_POSITION",
        requiresConfirmation: false
      };
    }

    const seniorSeatHolder = targetPosition.seniorSeat ? await this.findSeniorSeatHolder(targetPosition, member.memberId) : undefined;
    if (seniorSeatHolder != null) {
      return {
        ...base,
        status: "BLOCKED",
        seniorSeatHolder,
        blockReason: "SENIOR_SEAT_OCCUPIED",
        requiresConfirmation: false
      };
    }

    if (!input.confirmed) {
      return {
        ...base,
        status: "PREVIEW",
        requiresConfirmation: true
      };
    }

    const appliedAt = new Date();
    const mutation = await this.store.applyAssignmentChange({
      assignmentId: `staff_assignment_${randomUUID()}`,
      historyId: `staff_history_${randomUUID()}`,
      staffMemberId: member.memberId,
      actorDiscordUserId: input.actorDiscordUserId,
      eventType: kind === "PROMOTE" ? "STAFF_PROMOTED" : "STAFF_DEMOTED",
      ...(member.department == null ? {} : { fromDepartmentKey: member.department.key }),
      ...(member.position == null ? {} : { fromPositionKey: member.position.key }),
      toDepartmentKey: targetPosition.departmentKey,
      toPositionKey: targetPosition.key,
      reason: input.reason,
      appliedAt,
      metadata: {
        operation: kind,
        pendingExternalSync: true
      }
    });

    return {
      ...base,
      status: "APPLIED",
      requiresConfirmation: false,
      assignmentId: mutation.assignmentId,
      historyId: mutation.historyId,
      appliedAt: mutation.appliedAt
    };
  }

  private async getActiveProfile(memberId: string): Promise<StaffMemberProfile> {
    const record = await this.store.findStaffByMemberId(memberId);
    if (record == null || record.status !== "ACTIVE") {
      throw new StaffError("STAFF_MEMBER_NOT_FOUND", "Membro da staff nao encontrado.");
    }

    return enrichStaffRecord(record);
  }

  private async findSeniorSeatHolder(targetPosition: StaffPosition, targetMemberId: string): Promise<StaffMemberProfile | undefined> {
    const records = await this.store.listActiveStaff();
    return records
      .map(enrichStaffRecord)
      .find(
        (profile) =>
          profile.memberId !== targetMemberId &&
          profile.department?.key === targetPosition.departmentKey &&
          profile.position?.seniorSeat === true
      );
  }
}

function baseResult(kind: StaffOperationKind, member: StaffMemberProfile, targetPosition: StaffPosition | undefined, reason: string): StaffOperationResult {
  return {
    kind,
    status: "PREVIEW",
    member,
    ...(member.position == null ? {} : { fromPosition: member.position }),
    ...(targetPosition == null ? {} : { toPosition: targetPosition }),
    reason,
    requiresConfirmation: false,
    pendingExternalSync: true
  };
}

function targetPositionFor(kind: StaffOperationKind, member: StaffMemberProfile): StaffPosition | undefined {
  if (member.position == null) {
    return undefined;
  }

  const careerPath = getStaffCareerPath(member.position.departmentKey);
  const currentIndex = careerPath.findIndex((position) => position.key === member.position?.key);
  if (currentIndex < 0) {
    return undefined;
  }

  return kind === "PROMOTE" ? careerPath[currentIndex + 1] : careerPath[currentIndex - 1];
}
