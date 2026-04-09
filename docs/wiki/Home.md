# Talos Security Dashboard Wiki

> Local architecture and contributor notes for the dashboard package.

## Pages

| Page | Description |
|------|-------------|
| [Home](Home.md) | Overview and quick links |
| [Architecture](Architecture.md) | App boundaries, data flow, and dependencies |
| [Features](Features.md) | Current operator-facing surfaces in the app |
| [API](API.md) | Dashboard-owned API routes and proxy surfaces |
| [Development](Development.md) | Local run, test, and environment notes |

## Current Shape

The dashboard is a Next.js App Router application with:

- passkey bootstrap/login and signed session cookies
- Postgres-backed auth and setup state
- server-side proxy routes for gateway, audit, config, MCP, setup, and examples
- operator pages for console, audit, status, setup, configuration, sessions, gateway, agent, and examples

For current package usage, start with the package [README](../../README.md).
