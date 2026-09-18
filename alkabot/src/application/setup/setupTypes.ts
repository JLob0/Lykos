import type { HealthState } from "../../shared/health.js";

export type SetupCheckState = "PASS" | "WARN" | "FAIL";

export type SetupCheck = {
  id: string;
  label: string;
  state: SetupCheckState;
  detail: string;
};

export type SetupDoctorOverall = "READY" | "DEGRADED" | "BLOCKED";

export type SetupDoctorReport = {
  generatedAt: Date;
  overall: SetupDoctorOverall;
  checks: SetupCheck[];
};

export type SetupPlanActionState = "CREATE" | "REUSE" | "CONFIGURE" | "WAIT" | "NOOP";

export type SetupPlanAction = {
  id: string;
  state: SetupPlanActionState;
  target: string;
  detail: string;
};

export type SetupPlanReport = {
  generatedAt: Date;
  mode: "DRY_RUN";
  doctorOverall: SetupDoctorOverall;
  actions: SetupPlanAction[];
  summary: Record<SetupPlanActionState, number>;
};

export type SetupRuntimeContext = {
  guildId?: string;
  guildName?: string;
  botPermissionNames: readonly string[];
  isGuildOwner: boolean;
};

export interface MigrationStatusReader {
  listAppliedVersions(): Promise<ReadonlySet<string>>;
}

export function healthStateToSetupState(state: HealthState): SetupCheckState {
  switch (state) {
    case "ok":
      return "PASS";
    case "degraded":
      return "WARN";
    case "down":
      return "FAIL";
  }
}
