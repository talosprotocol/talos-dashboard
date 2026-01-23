# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Context

This is a submodule of the [Talos Protocol](https://github.com/talosprotocol/talos) multi-repository project.

Main repository: https://github.com/talosprotocol/talos
Documentation: https://github.com/talosprotocol/talos-docs

## About This Component

This submodule contains the Next.js-based security console UI for the Talos Protocol. It serves as the visualization and management interface for the Talos Network state and audit logs. The dashboard provides operators with a human-readable interface into the complex state of the autonomous agent network, visualizing network topology, message flows, and audit logs.

Key features include:
- Real-time visualization of network topology and message flows
- Audit log monitoring and analysis
- Integration with Gateway metrics for system health monitoring
- Secure authentication via NextAuth v5

## Development Workflow

Standard Talos development practices apply:

1. Make changes in this submodule
2. Run tests with `scripts/test.sh`
3. Validate with the parent repository's test suite
4. Submit changes as PR to this submodule repository
5. Parent repository will update the submodule pin after merge

To run the dashboard locally:
```bash
npm run dev
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
- `TALOS_CHAT_URL`: URL of the Secure Chat Agent (default: http://localhost:8100)
- `TALOS_AIOPS_URL`: URL of the DevOps Agent (default: http://localhost:8200)

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