import type { AppConfig } from "../../config/appConfig.js";
import type { AlkaPermission, PolicyRequest, PolicyResult } from "./policyTypes.js";

export class PolicyEngine {
  public constructor(private readonly config: AppConfig) {}

  public evaluate(request: PolicyRequest): PolicyResult {
    if (request.actor.type === "SYSTEM") {
      return allow("System actor.", "ADMIN_USER");
    }

    if (this.config.policy.adminDiscordUserIds.has(request.actor.id)) {
      return allow("Discord user is configured as a Lykos admin.", "ADMIN_USER");
    }

    if (intersects(request.actor.roleIds, this.config.policy.adminRoleIds)) {
      return allow("Discord member has a configured Lykos admin role.", "ADMIN_ROLE");
    }

    const actionRoleIds = roleIdsForAction(this.config, request.action);
    if (intersects(request.actor.roleIds, actionRoleIds)) {
      return allow("Discord member has a role mapped to this Alka permission.", "ACTION_ROLE");
    }

    if (this.config.app.environment !== "production" && this.hasNoPolicyBindings()) {
      return allow("Non-production fallback because no policy bindings are configured.", "DEV_FALLBACK");
    }

    return {
      decision: "DENY",
      allowed: false,
      reason: `Missing permission ${request.action}.`
    };
  }

  private hasNoPolicyBindings(): boolean {
    return (
      this.config.policy.adminDiscordUserIds.size === 0 &&
      this.config.policy.adminRoleIds.size === 0 &&
      this.config.policy.networkReadRoleIds.size === 0 &&
      this.config.policy.auditReadRoleIds.size === 0 &&
      this.config.policy.setupReadRoleIds.size === 0 &&
      this.config.policy.setupWriteRoleIds.size === 0 &&
      this.config.policy.staffReadRoleIds.size === 0 &&
      this.config.policy.staffPromoteRoleIds.size === 0 &&
      this.config.policy.staffDemoteRoleIds.size === 0 &&
      this.config.policy.staffSyncRoleIds.size === 0
    );
  }
}

function roleIdsForAction(config: AppConfig, action: AlkaPermission): ReadonlySet<string> {
  switch (action) {
    case "alka.network.read":
      return config.policy.networkReadRoleIds;
    case "alka.audit.read":
      return config.policy.auditReadRoleIds;
    case "alka.setup.read":
      return config.policy.setupReadRoleIds;
    case "alka.setup.write":
      return config.policy.setupWriteRoleIds;
    case "alka.staff.read":
      return config.policy.staffReadRoleIds;
    case "alka.staff.promote":
      return config.policy.staffPromoteRoleIds;
    case "alka.staff.demote":
      return config.policy.staffDemoteRoleIds;
    case "alka.staff.sync":
      return config.policy.staffSyncRoleIds;
  }
}

function allow(reason: string, matchedBy: NonNullable<PolicyResult["matchedBy"]>): PolicyResult {
  return {
    decision: "ALLOW",
    allowed: true,
    reason,
    matchedBy
  };
}

function intersects(values: string[], allowed: ReadonlySet<string>): boolean {
  return values.some((value) => allowed.has(value));
}
