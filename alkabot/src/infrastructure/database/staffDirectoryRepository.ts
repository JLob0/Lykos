import type { RowDataPacket } from "mysql2/promise";
import type {
  StaffAssignmentChangeInput,
  StaffAssignmentChangeRecord,
  StaffMemberRecord,
  StaffMemberStatus,
  StaffOperationsStore,
  StaffSyncJob,
  StaffSyncStatus
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

type StaffSyncJobRow = RowDataPacket & {
  sync_job_id: string;
  staff_member_id: string;
  assignment_id: string;
  history_id: string;
  status: StaffSyncStatus;
  target_server_id: string | null;
  command_id: string | null;
  attempts: number;
  last_error_code: string | null;
  last_error_message: string | null;
  payload_json: string | Record<string, unknown>;
  created_at: Date;
  dispatched_at: Date | null;
  completed_at: Date | null;
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
      await connection.execute(
        `
          INSERT INTO staff_sync_jobs (
            sync_job_id, staff_member_id, assignment_id, history_id, status, payload_json, created_at
          )
          VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
        `,
        [input.syncJobId, input.staffMemberId, input.assignmentId, input.historyId, JSON.stringify(input.syncPayload), input.appliedAt]
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
      syncJobId: input.syncJobId,
      appliedAt: input.appliedAt
    };
  }

  public async listPendingStaffSyncJobs(limit: number): Promise<StaffSyncJob[]> {
    const [rows] = await this.database.getPool().execute<StaffSyncJobRow[]>(
      `
        SELECT
          sync_job_id,
          staff_member_id,
          assignment_id,
          history_id,
          status,
          target_server_id,
          command_id,
          attempts,
          last_error_code,
          last_error_message,
          payload_json,
          created_at,
          dispatched_at,
          completed_at
        FROM staff_sync_jobs
        WHERE status IN ('PENDING', 'DISPATCHED', 'FAILED', 'PARTIAL_FAILURE')
        ORDER BY created_at ASC
        LIMIT ?
      `,
      [limit]
    );

    return rows.map(toStaffSyncJob);
  }

  public async markStaffSyncDispatched(input: { syncJobId: string; targetServerId: string; commandId: string; dispatchedAt: Date }): Promise<void> {
    await this.database.getPool().execute(
      `
        UPDATE staff_sync_jobs
        SET status = 'DISPATCHED',
            target_server_id = ?,
            command_id = ?,
            attempts = attempts + 1,
            dispatched_at = ?,
            last_error_code = NULL,
            last_error_message = NULL,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE sync_job_id = ?
      `,
      [input.targetServerId, input.commandId, input.dispatchedAt, input.syncJobId]
    );
  }

  public async markStaffSyncCompleted(input: {
    syncJobId: string;
    status: Exclude<StaffSyncStatus, "PENDING" | "DISPATCHED">;
    completedAt: Date;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<void> {
    await this.database.getPool().execute(
      `
        UPDATE staff_sync_jobs
        SET status = ?,
            completed_at = ?,
            last_error_code = ?,
            last_error_message = ?,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE sync_job_id = ?
      `,
      [input.status, input.completedAt, input.errorCode ?? null, input.errorMessage ?? null, input.syncJobId]
    );
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

function toStaffSyncJob(row: StaffSyncJobRow): StaffSyncJob {
  return {
    syncJobId: row.sync_job_id,
    staffMemberId: row.staff_member_id,
    assignmentId: row.assignment_id,
    historyId: row.history_id,
    status: row.status,
    attempts: row.attempts,
    payload: parsePayload(row.payload_json),
    createdAt: row.created_at,
    ...(row.target_server_id == null ? {} : { targetServerId: row.target_server_id }),
    ...(row.command_id == null ? {} : { commandId: row.command_id }),
    ...(row.last_error_code == null ? {} : { lastErrorCode: row.last_error_code }),
    ...(row.last_error_message == null ? {} : { lastErrorMessage: row.last_error_message }),
    ...(row.dispatched_at == null ? {} : { dispatchedAt: row.dispatched_at }),
    ...(row.completed_at == null ? {} : { completedAt: row.completed_at })
  };
}

function parsePayload(value: StaffSyncJobRow["payload_json"]): StaffSyncJob["payload"] {
  return (typeof value === "string" ? JSON.parse(value) : value) as StaffSyncJob["payload"];
}
