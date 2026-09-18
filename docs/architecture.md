# Lykos Architecture

Lykos is the central Discord platform service. AlkaBridge is the Minecraft-side Paper plugin. They communicate through versioned contracts and authenticated internal transport.

## Boundaries

- Lykos owns Discord, HTTP health endpoints, policy, audit, jobs, identity, and staff workflows.
- AlkaBridge owns Minecraft runtime access and exposes capabilities to Lykos.
- Contracts live in `contracts/` and are versioned before either side depends on them.
- The bridge does not contain a Discord token.
- Discord roles are projections of state, not the only source of authorization.

## Foundation Scope

This foundation contains only the safe base:

- TypeScript strict ESM application shell.
- Config validation and secret redaction.
- Discord client lifecycle with minimal intents.
- MySQL and Redis providers with readiness checks.
- Health endpoints.
- JSON schemas and fixtures for the first bridge contracts.
- Paper plugin skeleton using AlkaCore as a hard dependency.
- Redis heartbeat/capabilities transport with HMAC-signed payloads.

Feature domains such as identity linking, staff promotions, role sync, tickets, appeals, booster rewards, and chat bridge must be added in vertical slices after this base is stable.
