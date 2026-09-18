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

Bridge heartbeats and capabilities are stored in Redis as signed wrappers. Lykos verifies the HMAC before accepting the payload into its in-memory server registry.
