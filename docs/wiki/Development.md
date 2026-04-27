# talos-dashboard Development

## Local Start

Recommended local start:

```bash
bash scripts/start.sh
```

Direct Next.js start:

```bash
npm ci
npm run dev
```

`npm run dev` intentionally uses Webpack for local development. On this monorepo it is lower-resource and avoids Turbopack watching too much of the workspace. Use `npm run dev:turbopack` only when explicitly validating Turbopack behavior.

For root-level work on a memory-constrained laptop, prefer:

```bash
make dev-lite
```

That starts the gateway plus dashboard path instead of the full service set. The dashboard launcher also enables polling-based file watching by default to avoid macOS `EMFILE` watcher failures.

## Offloaded Heavy Work

From the repo root, use the SSH helper when Docker builds, full-stack runs, or live-device checks are too expensive for the laptop:

```bash
bash scripts/remote-run.sh docker "docker compose up -d --build"
bash scripts/remote-run.sh docker "make docker-build-all"
bash scripts/remote-run.sh rpi "uname -a"
```

The root Makefile also exposes remote Docker targets:

```bash
make docker-remote-contexts
make docker-remote-sync REMOTE=all
make docker-vpc
make docker-remote-up REMOTE=docker
make docker-remote-up REMOTE=rpi
make docker-remote-status
```

`make docker-vpc` creates a Docker bridge network named `talos-vpc` on both remote hosts. Compose runs use `docker-compose.remote.yml` to attach Talos services to that external network. Containers on the same host communicate through Docker DNS on `talos-vpc`; containers on different hosts communicate through the host LAN names and published service ports, for example `nileshs-macbook-pro.local:8000` or `rpi.local:8000`.

Default targets:

- `docker`: `nilesh@nileshs-macbook-pro.local`, MacBook Pro 16-inch 2019, Intel i9, 1 TB SSD, 36 GB RAM. Prefer this for Docker-heavy validation, full compose runs, and x86_64 compatibility checks.
- `rpi`: `rpi@rpi.local`, Raspberry Pi 5, 256 GB SSD, 16 GB RAM. Prefer this for ARM64/Linux smoke checks, live-device validation, and lower-power long-running tests.

Set `TALOS_REMOTE_WORKDIR` if the remote checkout is not at `~/workspace/talos`. Remote helpers default to `TALOS_REMOTE_SSH_OPTS="-o BatchMode=yes -o ConnectTimeout=10 -o AddressFamily=inet"` to avoid `.local` hosts occasionally resolving to a slow IPv6 SSH route. Remote Docker commands default to `TALOS_REMOTE_DOCKER_HOME=~/.talos-docker-home` so non-interactive SSH sessions do not depend on a macOS login keychain credential helper for public image pulls.

## Test Path

Primary package test entrypoint:

```bash
bash scripts/test.sh
```

This runs:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build` unless `TALOS_SKIP_BUILD=true`

## Runtime Prerequisites

- `APP_ORIGIN`, `NEXT_PUBLIC_APP_ORIGIN`, and `NEXT_PUBLIC_RP_ID` for WebAuthn flows
- `AUTH_COOKIE_HMAC_SECRET` for signed sessions
- `TALOS_BOOTSTRAP_TOKEN` for first-device bootstrap
- `DATABASE_URL` for auth/setup persistence
- downstream service URLs such as `TALOS_GATEWAY_URL`, `TALOS_AUDIT_URL`, `TALOS_CONNECTOR_URL`, `TALOS_CHAT_URL`, and `TALOS_AIOPS_URL`

## Notes

- The package ships checked-in Drizzle schema assets, but DB lifecycle ownership is tracked separately in the root `implementation.md`.
- The repo root remains the best place to run multi-component validation after dashboard-local changes.
