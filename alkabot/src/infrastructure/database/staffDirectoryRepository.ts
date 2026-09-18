import type { RowDataPacket } from "mysql2/promise";
import type { StaffDirectoryStore, StaffMemberRecord, StaffMemberStatus } from "../../application/staff/staffTypes.js";
import type { DatabaseProvider } from "./databaseProvider.js";

type StaffMemberRow = RowDataPacket & {
  staff_member_id: string;
  identity_id: string | null;
  discord_user_id: string | null;
  minecraft_uuid: string | null;
  display_name: string;
  status: StaffMemberStatus;
  joined_at: Date;
  left_at: Date | null;
  assignment_id: string | null;
  department_key: string | null;
  position_key: string | null;
  assigned_at: Date | null;
};

export class StaffDirectoryRepository implements StaffDirectoryStore {
  public constructor(private readonly database: DatabaseProvider) {}

  public async listActiveStaff(): Promise<StaffMemberRecord[]> {
    const [rows] = await this.database.getPool().query<StaffMemberRow[]>(`${STAFF_SELECT} WHERE sm.status = 'ACTIVE' ORDER BY sm.joined_at ASC`);
    return rows.map(toStaffMemberRecord);
  }

  public async findActiveStaffByDiscord(discordUserId: string): Promise<StaffMemberRecord | undefined> {
    const [rows] = await this.database
      .getPool()
      .execute<StaffMemberRow[]>(`${STAFF_SELECT} WHERE sm.discord_user_id = ? AND sm.status = 'ACTIVE' LIMIT 1`, [discordUserId]);
    return rows[0] == null ? undefined : toStaffMemberRecord(rows[0]);
  }

  public async findStaffByMemberId(memberId: string): Promise<StaffMemberRecord | undefined> {
    const [rows] = await this.database
      .getPool()
      .execute<StaffMemberRow[]>(`${STAFF_SELECT} WHERE sm.staff_member_id = ? LIMIT 1`, [memberId]);
    return rows[0] == null ? undefined : toStaffMemberRecord(rows[0]);
  }
}

const STAFF_SELECT = `
  SELECT
    sm.staff_member_id,
    sm.identity_id,
    sm.discord_user_id,
    sm.minecraft_uuid,
    sm.display_name,
    sm.status,
    sm.joined_at,
    sm.left_at,
    sa.assignment_id,
    sa.department_key,
    sa.position_key,
    sa.assigned_at
  FROM staff_members sm
  LEFT JOIN staff_assignments sa
    ON sa.staff_member_id = sm.staff_member_id
   AND sa.status = 'ACTIVE'
`;

function toStaffMemberRecord(row: StaffMemberRow): StaffMemberRecord {
  return {
    memberId: row.staff_member_id,
    displayName: row.display_name,
    status: row.status,
    joinedAt: row.joined_at,
    ...(row.identity_id == null ? {} : { identityId: row.identity_id }),
    ...(row.discord_user_id == null ? {} : { discordUserId: row.discord_user_id }),
    ...(row.minecraft_uuid == null ? {} : { minecraftUuid: row.minecraft_uuid }),
    ...(row.left_at == null ? {} : { leftAt: row.left_at }),
    ...(row.assignment_id == null ? {} : { assignmentId: row.assignment_id }),
    ...(row.department_key == null ? {} : { departmentKey: row.department_key }),
    ...(row.position_key == null ? {} : { positionKey: row.position_key }),
    ...(row.assigned_at == null ? {} : { assignedAt: row.assigned_at })
  };
}
