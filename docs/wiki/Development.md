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
