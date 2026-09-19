# Lykos Security Notes

## Non-Negotiables

- Never commit Discord tokens, OAuth secrets, webhook URLs, bridge HMAC secrets, or production database credentials.
- Do not create a generic Discord `/console` command.
- Validate external input with schemas.
- Critical actions require policy checks, correlation IDs, immutable audit records, and idempotency.
- Discord IDs are strings.
- Minecraft identity uses UUIDs.
- Nicknames are never primary keys.

## Bridge Transport

Commands from Lykos to AlkaBridge must be signed, expiring, idempotent, and scoped to a target server. Pub/Sub may be used for non-critical notifications, but important commands and results need durable queue/stream handling before production use.

Bridge heartbeats, capabilities, commands, and command results are stored or queued in Redis as signed wrappers. Lykos and AlkaBridge verify the HMAC before accepting payloads.

The current command bus uses an expiring `command-envelope.v1` payload inside the signed wrapper. AlkaBridge rejects invalid signatures, expired commands, commands for another `server.id`, unsupported command names, and duplicate command IDs observed inside the replay retention window.

## Policy And Audit

- Discord actions must pass through `PolicyEngine` before touching privileged runtime state.
- Production authorization is deny-by-default unless the actor matches a configured admin user, admin role, or action role.
- `/network status` records successful views, button refreshes, and denied attempts in `audit_events`.
- Audit metadata is structured JSON so future dashboards can filter by event type, actor, target, source, severity, and correlation ID.
- `/setup doctor` and `/setup plan` require `alka.setup.read` and are audited. They are read-only and must not create roles, channels, permission overwrites, or database rows beyond audit records.
- `/setup import` and `/setup apply` require `alka.setup.write`; in this block they only persist intended role blueprints and apply-run records. Physical Discord role creation still requires a later confirmation/snapshot workflow.

## Identity Linking

- Minecraft link codes are generated with cryptographic randomness and normalized as `ALKA-XXXXX`.
- Lykos stores only a SHA-256 hash of the code, never the full temporary code.
- Codes are single-use, expire through `LINK_CODE_TTL_SECONDS`, and are rate-limited per Minecraft UUID through `LINK_CODE_RATE_LIMIT_SECONDS`.
- `/link codigo:...` blocks replay, expired codes, already-linked Discord users, and already-linked Minecraft UUIDs.
- `/link`, successful links, denied links, and `/unlink` are recorded in `audit_events` with correlation IDs.
- The internal code creation route must use `INTERNAL_API_TOKEN` outside development/test and should only be reachable by trusted Minecraft-side infrastructure.

## Profile Privacy

- Profile snapshots must never include IPs, staff notes, security flags, fraud flags, private evidence, or alt-account data.
- `/profile` replies are ephemeral in this foundation block.
- Provider failures are represented as source status instead of leaking stack traces or raw backend errors to Discord users.
- Internal profile routes use the same `/internal` bearer-token gate as bridge and identity routes.

## Staff Operations

- Staff directory commands require `alka.staff.read`.
- `/staff promote` and `/staff demote` require `alka.staff.promote` and `alka.staff.demote`; staff read roles alone cannot mutate career state.
- Promotion/demotion commands preview by default and require `confirmar:true` before writing assignments or history.
- Senior-seat conflicts block the operation before mutation.
- Admin bindings still bypass action-specific role bindings through the central `PolicyEngine`.
- Confirmed career mutations create a durable `staff_sync_jobs` row in the same transaction as assignment/history changes.
- `/staff sync` requires `alka.staff.sync` through `POLICY_STAFF_SYNC_ROLE_IDS` or an admin binding, checks the requested Bridge server, dispatches only typed `staff.sync` commands, and audits the run summary.
- The current Bridge implementation is a projection acknowledgement path, not a generic console or free-form command executor. It validates required staff sync payload fields and returns `PROJECTION_ACK`.
- Physical Discord role mutation and LuckPerms writes remain reserved for dedicated adapters with their own hierarchy and idempotency checks.
