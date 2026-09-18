import { getStaffCareerPath, getStaffDepartment, getStaffPosition, STAFF_DEPARTMENTS, STAFF_POSITIONS } from "./staffCareerCatalog.js";
import type {
  StaffCareerPath,
  StaffDirectoryStore,
  StaffDirectorySummary,
  StaffListInput,
  StaffMemberProfile,
  StaffMemberRecord,
  StaffPosition
} from "./staffTypes.js";
import { StaffError } from "./staffTypes.js";

export class StaffDirectoryService {
  public constructor(private readonly store: StaffDirectoryStore) {}

  public async listStaff(input: StaffListInput = {}): Promise<{ summary: StaffDirectorySummary; members: StaffMemberProfile[] }> {
    const records = await this.store.listActiveStaff();
    const profiles = records
      .map(enrichRecord)
      .filter((profile) => input.departmentKey == null || profile.department?.key === input.departmentKey)
      .sort(compareProfiles)
      .slice(0, input.limit ?? 25);

    if (input.departmentKey != null && getStaffDepartment(input.departmentKey) == null) {
      throw new StaffError("STAFF_DEPARTMENT_NOT_FOUND", "Departamento de staff nao encontrado.");
    }

    return {
      summary: createSummary(records.map(enrichRecord)),
      members: profiles
    };
  }

  public async getProfileByDiscord(discordUserId: string): Promise<StaffMemberProfile> {
    const record = await this.store.findActiveStaffByDiscord(discordUserId);
    if (record == null) {
      throw new StaffError("STAFF_MEMBER_NOT_FOUND", "Membro da staff nao encontrado.");
    }

    return enrichRecord(record);
  }

  public async getProfileByMemberId(memberId: string): Promise<StaffMemberProfile> {
    const record = await this.store.findStaffByMemberId(memberId);
    if (record == null) {
      throw new StaffError("STAFF_MEMBER_NOT_FOUND", "Membro da staff nao encontrado.");
    }

    return enrichRecord(record);
  }

  public getCareerPath(departmentKey: string): StaffCareerPath {
    const department = getStaffDepartment(departmentKey);
    if (department == null) {
      throw new StaffError("STAFF_DEPARTMENT_NOT_FOUND", "Departamento de staff nao encontrado.");
    }

    return {
      department,
      positions: getStaffCareerPath(departmentKey)
    };
  }
}

function enrichRecord(record: StaffMemberRecord): StaffMemberProfile {
  const position = record.positionKey == null ? undefined : getStaffPosition(record.positionKey);
  const departmentKey = record.departmentKey ?? position?.departmentKey;
  const department = departmentKey == null ? undefined : getStaffDepartment(departmentKey);
  const careerPath = departmentKey == null ? [] : getStaffCareerPath(departmentKey);
  const currentIndex = position == null ? -1 : careerPath.findIndex((entry) => entry.key === position.key);

  return {
    ...record,
    ...(department == null ? {} : { department }),
    ...(position == null ? {} : { position }),
    ...(currentIndex > 0 ? { previousPosition: careerPath[currentIndex - 1] } : {}),
    ...(currentIndex >= 0 && currentIndex < careerPath.length - 1 ? { nextPosition: careerPath[currentIndex + 1] } : {})
  };
}

function createSummary(profiles: StaffMemberProfile[]): StaffDirectorySummary {
  const seniorSeatsTotal = STAFF_POSITIONS.filter((position) => position.seniorSeat).length;
  const seniorSeatsFilled = profiles.filter((profile) => profile.position?.seniorSeat === true).length;

  return {
    generatedAt: new Date(),
    activeStaff: profiles.filter((profile) => profile.status === "ACTIVE").length,
    departments: STAFF_DEPARTMENTS.length,
    seniorSeatsTotal,
    seniorSeatsFilled,
    seniorSeatsVacant: Math.max(0, seniorSeatsTotal - seniorSeatsFilled)
  };
}

function compareProfiles(left: StaffMemberProfile, right: StaffMemberProfile): number {
  const leftDepartmentSort = left.department?.sortOrder ?? 0;
  const rightDepartmentSort = right.department?.sortOrder ?? 0;
  if (leftDepartmentSort !== rightDepartmentSort) {
    return rightDepartmentSort - leftDepartmentSort;
  }

  const leftPositionSort = left.position?.rankOrder ?? 0;
  const rightPositionSort = right.position?.rankOrder ?? 0;
  if (leftPositionSort !== rightPositionSort) {
    return rightPositionSort - leftPositionSort;
  }

  return left.displayName.localeCompare(right.displayName);
}
