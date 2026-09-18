import { z } from "zod";

const dateTimeSchema = z.string().datetime();
const contractNameSchema = z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/u);
const correlationIdSchema = z.string().min(8);

export const eventEnvelopeSchema = z.object({
  eventId: z.string().min(8),
  correlationId: correlationIdSchema,
  event: contractNameSchema,
  version: z.number().int().min(1),
  source: z.string().min(1),
  timestamp: dateTimeSchema,
  actor: z.record(z.string(), z.unknown()).nullable().optional(),
  data: z.record(z.string(), z.unknown())
});

export const commandEnvelopeSchema = z.object({
  commandId: z.string().min(8),
  correlationId: correlationIdSchema,
  command: contractNameSchema,
  version: z.number().int().min(1),
  targetServer: z.string().min(1),
  issuedAt: dateTimeSchema,
  expiresAt: dateTimeSchema,
  actor: z.object({
    discordUserId: z.string().regex(/^[0-9]{17,22}$/u),
    staffMemberId: z.string().nullable().optional(),
    permissionsSnapshot: z.array(z.string())
  }),
  data: z.record(z.string(), z.unknown()),
  signature: z.string().min(32)
});

export const commandResultSchema = z.object({
  commandId: z.string().min(8),
  correlationId: correlationIdSchema,
  state: z.enum(["PENDING", "DISPATCHED", "ACKNOWLEDGED", "SUCCESS", "FAILED", "EXPIRED", "PARTIAL_FAILURE"]),
  targetServer: z.string().min(1),
  timestamp: dateTimeSchema,
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z
    .object({
      code: z.string().min(1),
      message: z.string().min(1),
      retryable: z.boolean().optional()
    })
    .nullable()
    .optional()
});

export const heartbeatSchema = z.object({
  version: z.literal(1),
  serverId: z.string().min(1),
  displayName: z.string().min(1),
  environment: z.enum(["development", "staging", "production"]),
  status: z.enum(["STARTING", "ONLINE", "DRAINING", "MAINTENANCE", "STOPPING"]),
  timestamp: dateTimeSchema,
  bridgeVersion: z.string().min(1),
  paperVersion: z.string().min(1),
  javaVersion: z.string().min(1),
  onlinePlayers: z.number().int().nonnegative().optional(),
  maxPlayers: z.number().int().nonnegative().optional()
});

export const capabilitiesSchema = z.object({
  version: z.literal(1),
  serverId: z.string().min(1),
  timestamp: dateTimeSchema,
  capabilities: z.array(contractNameSchema)
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;
export type CommandResult = z.infer<typeof commandResultSchema>;
export type HeartbeatPayload = z.infer<typeof heartbeatSchema>;
export type CapabilitiesPayload = z.infer<typeof capabilitiesSchema>;

