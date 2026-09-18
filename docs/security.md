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
