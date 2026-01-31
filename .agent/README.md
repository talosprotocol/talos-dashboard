# Agent workspace: site/dashboard
> **Project**: site/dashboard

This folder contains agent-facing context, tasks, workflows, and planning artifacts for this submodule.

## Current State
Security dashboard with locked route rules. Browser must call only /api/* routes. Audit stream uses EventSource proxy patterns. Agent chat uses fetch streaming with abort propagation and meta-first semantics.

## Expected State
Strict proxy boundaries, no direct upstream calls, and stable SSE parsing. All data displayed should be traceable to audit integrity and contract versions.

## Behavior
Web UI for audit, agent interactions, and operational visibility. Uses BFF routes and enforces allowlisted proxy patterns.

## How to work here
- Run/tests:
- Local dev:
- CI notes:

## Interfaces and dependencies
- Owned APIs/contracts:
- Depends on:
- Data stores/events (if any):

## Global context
See `.agent/context.md` for monorepo-wide invariants and architecture.
