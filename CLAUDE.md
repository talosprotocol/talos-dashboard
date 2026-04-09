# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Context

This is a submodule of the [Talos Protocol](https://github.com/talosprotocol/talos) multi-repository project.

Main repository: https://github.com/talosprotocol/talos
Primary docs in this workspace: `docs/` and `site/dashboard/docs/wiki/`

## About This Component

This package contains the Next.js-based operator console for Talos. It owns the authenticated shell UI, dashboard-owned `/api/*` proxy routes, passkey bootstrap/login, and Postgres-backed auth/setup state.

Key features include:
- Audit/event exploration and live status surfaces
- Setup-helper pairing and job orchestration
- Configuration, secrets, gateway, session, and example pages
- Secure authentication via WebAuthn plus signed session cookies

## Development Workflow

Standard Talos development practices apply:

1. Make changes in this submodule
2. Run tests with `scripts/test.sh`
3. Validate with the parent repository's test suite
4. Submit changes as PR to this submodule repository
5. Parent repository will update the submodule pin after merge

To run the dashboard locally:
```bash
bash scripts/start.sh
# Open http://localhost:3000
```

## Common Commands

```bash
# Run tests
./scripts/test.sh

# Run frontend tests specifically
npm test

# Run linter
npm run lint

# Run type checking
npm run typecheck

# Build for production
npm run build

# Development server
npm run dev
```

## Integration Points

This component integrates with:
- Talos Gateway (for API data)
- Audit Service (for audit logs)
- Secure Chat Agent
- DevOps Agent

Environment variables for configuration:
- `TALOS_GATEWAY_URL`: URL of the main Talos Gateway (default: http://localhost:8000)
- `TALOS_AUDIT_URL`: URL of the audit service (default: http://localhost:8001)
- `TALOS_CONNECTOR_URL`: URL of the MCP connector (default: http://localhost:8082)
- `TALOS_CHAT_URL`: URL of the Secure Chat Agent (default: http://localhost:8100)
- `TALOS_AIOPS_URL`: URL of the DevOps Agent (default: http://localhost:8200)
- `APP_ORIGIN` / `NEXT_PUBLIC_APP_ORIGIN`: required for WebAuthn origin checks
- `NEXT_PUBLIC_RP_ID`: relying-party id for passkeys
- `AUTH_COOKIE_HMAC_SECRET`: required for signed session cookies
- `TALOS_BOOTSTRAP_TOKEN`: required for initial admin-device bootstrap
- `DATABASE_URL`: Postgres for auth/setup state

## Testing

Each submodule follows the standardized test interface:
- `scripts/test.sh` for complete testing
- Reports results to `artifacts/test/results.json` (when run from parent repository)

Dashboard-specific testing:
- Unit tests with Vitest (`npm test`)
- Type checking (`npm run typecheck`)
- Linting (`npm run lint`)
- Build validation (`npm run build`)

See main repository CLAUDE.md for orchestrating multi-submodule testing.
