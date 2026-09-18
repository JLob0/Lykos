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
gradle -p alkabridge build
```

Runtime secrets must be provided through environment variables or host secret management. Do not commit real tokens, webhook URLs, OAuth secrets, bridge secrets, or database credentials.
