# Talos Security Dashboard

The dashboard is the Next.js operator console for Talos. It combines audit/event views, gateway and service status, configuration and secrets surfaces, setup-helper workflows, and interactive example pages behind a passkey-first auth boundary.

## Current Scope

- App Router UI under `src/app`
- Server-side proxy routes under `src/app/api`
- WebAuthn bootstrap/login plus signed session cookies
- Postgres-backed auth and setup state via Drizzle
- Operator pages for console, audit, status, setup, gateway, configuration, sessions, agent, and examples

## Runtime Model

The local dev path starts the dashboard in HTTP mode and points the browser at a Talos gateway/API base URL.

Key environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8001` | Client-side API base for HTTP mode |
| `TALOS_GATEWAY_URL` | `http://localhost:8001` | Server-side gateway health/control plane proxy |
| `TALOS_AUDIT_URL` | `http://localhost:8001` | Audit/event proxy target |
| `TALOS_CONNECTOR_URL` | `http://localhost:8082` | MCP resource proxy target |
| `TALOS_CHAT_URL` | `http://localhost:8100` | Secure chat example backend |
| `TALOS_AIOPS_URL` | `http://localhost:8200` | DevOps example backend |
| `APP_ORIGIN` | `http://localhost:3000` | Server-side origin checks for WebAuthn |
| `NEXT_PUBLIC_APP_ORIGIN` | `http://localhost:3000` | Browser origin for auth flows |
| `NEXT_PUBLIC_RP_ID` | `localhost` | WebAuthn relying party ID |
| `AUTH_SECRET` | unset by default | Required by setup/security gates |
| `AUTH_COOKIE_HMAC_SECRET` | unset by default | Required for signed session cookies |
| `TALOS_BOOTSTRAP_TOKEN` | unset by default | Required for first-device admin bootstrap |
| `DATABASE_URL` | `postgres://postgres:password@localhost:5432/talos` fallback in code | Postgres for auth/setup persistence |

Auth and setup flows are stateful. The dashboard uses Postgres-backed `users`, `authenticators`, `webauthn_challenges`, `sessions`, `setup_agents`, `setup_jobs`, and `pairing_tokens` tables defined in `src/db/schema.ts`.

## Local Development

Minimal local start:

```bash
npm ci
npm run db:migrate
npm run dev
```

The default dashboard dev server uses Webpack to keep local file watching and memory usage bounded in the Talos monorepo. Turbopack remains available with `npm run dev:turbopack` when you need to test that engine specifically.

The dashboard persists auth and setup state in Postgres. Before the first passkey/bootstrap run, point `DATABASE_URL` at a reachable Postgres instance and apply the checked-in Drizzle migrations with `npm run db:migrate`. Use `npm run db:generate` only when the schema changes and a new migration needs to be created.

When the full Talos workspace is too heavy for local laptop iteration, use `make dev-lite` from the repo root. Offload Docker-heavy/full-compose work to `nilesh@nileshs-macbook-pro.local` with `bash scripts/remote-run.sh docker "<command>"`, and ARM64/Linux or live-device checks to `rpi@rpi.local` with `bash scripts/remote-run.sh rpi "<command>"`.

Repo-owned helper:

```bash
bash scripts/start.sh
```

Primary verification path:

```bash
bash scripts/test.sh
```

## Auth Model

The dashboard is secured with a passkey-first auth model. The live auth path is:

1. WebAuthn bootstrap or login via `src/app/api/auth/webauthn/*`
2. Signed session cookies validated in `src/middleware.ts`
3. DB-backed session and authenticator state in `src/db/schema.ts`

The supported bootstrap path is the passkey/device flow on `/login`, which supports first-device admin enrollment using the `TALOS_BOOTSTRAP_TOKEN`.

## Health Endpoints

- `/healthz`: process liveness
- `/readyz`: config plus database readiness
- `/version`: build metadata
- `/metrics`: Prometheus-style health metrics

## References

- [Wiki Home](https://github.com/talosprotocol/talos/wiki/Home)
- [Architecture](https://github.com/talosprotocol/talos/wiki/Architecture)
- [Development](https://github.com/talosprotocol/talos/wiki/Development)
- [Features](https://github.com/talosprotocol/talos/wiki/Features)
- [API](https://github.com/talosprotocol/talos/wiki/API)

## License

Talos Security Dashboard is distributed under the Apache License 2.0. See
`LICENSE` and `NOTICE` in this repository for details.
