import type { RowDataPacket } from "mysql2/promise";
import type {
  StaffAssignmentChangeInput,
  StaffAssignmentChangeRecord,
  StaffMemberRecord,
  StaffMemberStatus,
  StaffOperationsStore
} from "../../application/staff/staffTypes.js";
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

export class StaffDirectoryRepository implements StaffOperationsStore {
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

  public async applyAssignmentChange(input: StaffAssignmentChangeInput): Promise<StaffAssignmentChangeRecord> {
    const connection = await this.database.getPool().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          UPDATE staff_assignments
          SET status = 'ENDED',
              ended_at = ?,
              updated_at = CURRENT_TIMESTAMP(3)
          WHERE staff_member_id = ?
            AND status = 'ACTIVE'
        `,
        [input.appliedAt, input.staffMemberId]
      );
      await connection.execute(
        `
          INSERT INTO staff_assignments (
            assignment_id, staff_member_id, department_key, position_key, status, assigned_at
          )
          VALUES (?, ?, ?, ?, 'ACTIVE', ?)
        `,
        [input.assignmentId, input.staffMemberId, input.toDepartmentKey, input.toPositionKey, input.appliedAt]
      );
      await connection.execute(
        `
          INSERT INTO staff_history (
            history_id, staff_member_id, event_type, actor_discord_user_id,
            from_department_key, from_position_key, to_department_key, to_position_key,
            reason, metadata_json, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          input.historyId,
          input.staffMemberId,
          input.eventType,
          input.actorDiscordUserId,
          input.fromDepartmentKey ?? null,
          input.fromPositionKey ?? null,
          input.toDepartmentKey,
          input.toPositionKey,
          input.reason,
          JSON.stringify(input.metadata),
          input.appliedAt
        ]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      assignmentId: input.assignmentId,
      historyId: input.historyId,
      appliedAt: input.appliedAt
    };
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
