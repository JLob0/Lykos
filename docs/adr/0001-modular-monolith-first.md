# ADR 0001: Modular Monolith First

## Status

Accepted

## Decision

AlkaBot starts as a modular monolith in TypeScript. Domain, application, Discord adapter, infrastructure, contracts, and HTTP layers are separated by folders and interfaces.

## Consequences

This keeps deployment simple during MVP while leaving clear seams for future extraction of gateway, jobs, or dashboard services.

