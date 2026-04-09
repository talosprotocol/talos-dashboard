# talos-dashboard Features

## Current Operator Surfaces

The active `(shell)` app currently includes:

- `console`: mission-control summary, KPIs, activity feed, and quick actions
- `audit`: event stream and audit exploration UI
- `status`: service-status surface
- `gateway`: gateway status/details view
- `configuration`: configuration editor and template-driven draft flow
- `setup`: setup-helper pairing and job orchestration
- `sessions`: session-centric event views
- `agent`: secure-agent / chat-oriented shell
- `examples`: demo catalog and secure-chat example

## Auth and Control Plane

- passkey bootstrap and login from `/login`
- signed session cookies validated in middleware
- Postgres-backed users, authenticators, challenges, sessions, setup agents, setup jobs, and pairing tokens

## Dashboard-Owned API Areas

- `/api/auth/*`: WebAuthn, session, logout
- `/api/status/*`: aggregate and gateway-facing status
- `/api/events` and `/api/audit/stream`: event list plus SSE
- `/api/setup/*`: helper pairing and job control
- `/api/admin/*`: operator/admin proxy routes
- `/api/config/*`: configuration proxy/bootstrap
- `/api/examples/*`: secure-chat and devops demo proxies

## Notes

- The local start path forces HTTP mode by default.
- Some UI areas are still under active reconciliation with the broader repo tracker; use `implementation.md` at the repo root for outstanding parity gaps.
