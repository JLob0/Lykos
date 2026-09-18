# ADR 0002: Versioned Contracts Between Bot And Bridge

## Status

Accepted

## Decision

TypeScript and Java do not share runtime classes. They share versioned JSON contracts, schemas, and fixtures from `contracts/`.

## Consequences

Every command, event, result, heartbeat, and capability payload needs a version. Breaking changes require a new contract version instead of silent mutation.

