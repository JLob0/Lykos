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

export interface StaffDirectoryStore {
  listActiveStaff(): Promise<StaffMemberRecord[]>;
  findActiveStaffByDiscord(discordUserId: string): Promise<StaffMemberRecord | undefined>;
  findStaffByMemberId(memberId: string): Promise<StaffMemberRecord | undefined>;
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
