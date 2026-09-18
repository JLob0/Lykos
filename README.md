# Lykos

Foundation workspace for Lykos, the Alka Discord platform.

## Layout

- `alkabot/` - Node.js/TypeScript Discord service for Lykos.
- `alkabridge/` - Paper/Java bridge plugin for Minecraft servers.
- `contracts/` - Versioned JSON schemas and fixtures shared by TypeScript and Java.
- `docs/` - Architecture, security notes, and ADRs.

## Runtime Targets

- Node.js `>=24.17.0`
- Java 21
- Paper 1.21.8+
- Discord.js `14.27.0`

## First Local Checks

```bash
npm install
npm run bot:test
npm run bot:build
npm run bot:discord:register
gradle -p alkabridge build
```

Runtime secrets must be provided through environment variables or host secret management. Do not commit real tokens, webhook URLs, OAuth secrets, bridge secrets, or database credentials.

## Bridge Ping

With Redis transport enabled on both sides and matching `BRIDGE_HMAC_SECRET` / `transport.security.hmac-secret`, the internal diagnostic endpoint can test the command bus:

```bash
POST /internal/v1/servers/{serverId}/ping
```

Lykos publishes a signed `bridge.ping` command to `alka:commands:{serverId}`. AlkaBridge validates the wrapper, target server, expiration, and replay window, then stores a signed result at `alka:command-results:{commandId}` and appends it to `alka:results`.

## Discord Commands

The first registered Discord command is `/network status`. It renders a Components V2 status card from the in-memory bridge server registry and includes a namespaced refresh button: `alka:network:status:refresh`.

`/network status` is guarded by the policy engine and writes immutable audit rows to `audit_events`. In production, configure at least one of `POLICY_ADMIN_DISCORD_IDS`, `POLICY_ADMIN_ROLE_IDS`, or `POLICY_NETWORK_READ_ROLE_IDS`; development/test keep a fallback allow mode only while no policy bindings exist.

`/setup doctor` and `/setup plan` provide the first safe setup workflow. They validate readiness and render a dry-run plan only; no Discord roles, channels, permissions, or database resources are applied by this block. In production, grant setup visibility through admin policy or `POLICY_SETUP_READ_ROLE_IDS`.

Register commands with:

```bash
npm run bot:discord:register
```
