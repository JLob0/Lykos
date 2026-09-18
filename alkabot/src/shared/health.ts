export type HealthState = "ok" | "degraded" | "down";

export type HealthCheckResult = {
  state: HealthState;
  detail?: string;
};

export interface HealthCheck {
  name: string;
  check(): Promise<HealthCheckResult>;
}

