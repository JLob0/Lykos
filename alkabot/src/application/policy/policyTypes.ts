export const ALKA_PERMISSIONS = {
  NETWORK_READ: "alka.network.read",
  AUDIT_READ: "alka.audit.read",
  SETUP_READ: "alka.setup.read",
  SETUP_WRITE: "alka.setup.write",
  STAFF_READ: "alka.staff.read",
  STAFF_PROMOTE: "alka.staff.promote",
  STAFF_DEMOTE: "alka.staff.demote",
  STAFF_SYNC: "alka.staff.sync"
} as const;

export type AlkaPermission = (typeof ALKA_PERMISSIONS)[keyof typeof ALKA_PERMISSIONS];

export type PolicyDecision = "ALLOW" | "DENY" | "REQUIRE_CONFIRMATION" | "REQUIRE_SECOND_APPROVAL";

export type PolicyActor = {
  type: "DISCORD_USER" | "SYSTEM";
  id: string;
  guildId?: string;
  roleIds: string[];
  isGuildOwner: boolean;
};

export type PolicyRequest = {
  action: AlkaPermission;
  actor: PolicyActor;
  resourceType?: string;
  resourceId?: string;
  source: string;
};

export type PolicyResult = {
  decision: PolicyDecision;
  allowed: boolean;
  reason: string;
  matchedBy?: "ADMIN_USER" | "ADMIN_ROLE" | "ACTION_ROLE" | "DEV_FALLBACK";
};
