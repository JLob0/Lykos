export type StaffMemberStatus = "ACTIVE" | "SUSPENDED" | "ON_LEAVE" | "INACTIVE";

export type StaffAssignmentStatus = "ACTIVE" | "ENDED";

export type StaffSeniorityLevel = "TRAINEE" | "MEMBER" | "SENIOR" | "LEAD" | "MANAGER" | "DIRECTOR" | "OWNER";

export type StaffDepartment = {
  key: string;
  name: string;
  description?: string;
  sortOrder: number;
};

export type StaffPosition = {
  key: string;
  departmentKey: string;
  name: string;
  seniorityLevel: StaffSeniorityLevel;
  rankOrder: number;
  seniorSeat: boolean;
};

export type StaffMemberRecord = {
  memberId: string;
  identityId?: string;
  discordUserId?: string;
  minecraftUuid?: string;
  displayName: string;
  status: StaffMemberStatus;
  joinedAt: Date;
  leftAt?: Date;
  assignmentId?: string;
  departmentKey?: string;
  positionKey?: string;
  assignedAt?: Date;
};

export type StaffMemberProfile = StaffMemberRecord & {
  department?: StaffDepartment;
  position?: StaffPosition;
  previousPosition?: StaffPosition;
  nextPosition?: StaffPosition;
};

export type StaffDirectorySummary = {
  generatedAt: Date;
  activeStaff: number;
  departments: number;
  seniorSeatsTotal: number;
  seniorSeatsFilled: number;
  seniorSeatsVacant: number;
};

export type StaffListInput = {
  departmentKey?: string;
  limit?: number;
};

export type StaffCareerPath = {
  department: StaffDepartment;
  positions: StaffPosition[];
};

export type StaffOperationKind = "PROMOTE" | "DEMOTE";

export type StaffOperationStatus = "PREVIEW" | "APPLIED" | "BLOCKED";

export type StaffOperationBlockReason = "NO_ACTIVE_ASSIGNMENT" | "NO_TARGET_POSITION" | "SENIOR_SEAT_OCCUPIED";

export type StaffSyncStatus = "PENDING" | "DISPATCHED" | "SUCCESS" | "FAILED" | "PARTIAL_FAILURE";

export type StaffSyncPayload = {
  version: 1;
  syncJobId: string;
  staffMemberId: string;
  assignmentId: string;
  historyId: string;
  discordUserId?: string;
  minecraftUuid?: string;
  displayName: string;
  target: {
    departmentKey: string;
    positionKey: string;
    seniorityLevel: StaffSeniorityLevel;
    seniorSeat: boolean;
  };
  projection: {
    discordRoleKeys: string[];
    minecraftPermissionGroups: string[];
  };
};

export type StaffAssignmentChangeInput = {
  assignmentId: string;
  historyId: string;
  syncJobId: string;
  staffMemberId: string;
  actorDiscordUserId: string;
  eventType: "STAFF_PROMOTED" | "STAFF_DEMOTED";
  fromDepartmentKey?: string;
  fromPositionKey?: string;
  toDepartmentKey: string;
  toPositionKey: string;
  reason: string;
  metadata: Record<string, unknown>;
  syncPayload: StaffSyncPayload;
  appliedAt: Date;
};

export type StaffAssignmentChangeRecord = {
  assignmentId: string;
  historyId: string;
  syncJobId: string;
  appliedAt: Date;
};

export type StaffOperationResult = {
  kind: StaffOperationKind;
  status: StaffOperationStatus;
  member: StaffMemberProfile;
  fromPosition?: StaffPosition;
  toPosition?: StaffPosition;
  seniorSeatHolder?: StaffMemberProfile;
  blockReason?: StaffOperationBlockReason;
  reason: string;
  requiresConfirmation: boolean;
  pendingExternalSync: boolean;
  assignmentId?: string;
  historyId?: string;
  syncJobId?: string;
  appliedAt?: Date;
};

export type StaffSyncJob = {
  syncJobId: string;
  staffMemberId: string;
  assignmentId: string;
  historyId: string;
  status: StaffSyncStatus;
  targetServerId?: string;
  commandId?: string;
  attempts: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  payload: StaffSyncPayload;
  createdAt: Date;
  dispatchedAt?: Date;
  completedAt?: Date;
};

export type StaffSyncRunItem = {
  job: StaffSyncJob;
  status: StaffSyncStatus;
  commandId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type StaffSyncRunResult = {
  targetServerId: string;
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  partial: number;
  items: StaffSyncRunItem[];
};

export interface StaffDirectoryStore {
  listActiveStaff(): Promise<StaffMemberRecord[]>;
  findActiveStaffByDiscord(discordUserId: string): Promise<StaffMemberRecord | undefined>;
  findStaffByMemberId(memberId: string): Promise<StaffMemberRecord | undefined>;
}

export interface StaffOperationsStore extends StaffDirectoryStore {
  applyAssignmentChange(input: StaffAssignmentChangeInput): Promise<StaffAssignmentChangeRecord>;
}

export interface StaffSyncStore {
  listPendingStaffSyncJobs(limit: number): Promise<StaffSyncJob[]>;
  markStaffSyncDispatched(input: { syncJobId: string; targetServerId: string; commandId: string; dispatchedAt: Date }): Promise<void>;
  markStaffSyncCompleted(input: {
    syncJobId: string;
    status: Exclude<StaffSyncStatus, "PENDING" | "DISPATCHED">;
    completedAt: Date;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<void>;
}

export type StaffErrorCode = "STAFF_MEMBER_NOT_FOUND" | "STAFF_DEPARTMENT_NOT_FOUND";

export class StaffError extends Error {
  public constructor(
    public readonly code: StaffErrorCode,
    message: string
  ) {
    super(message);
  }
}
