# talos-dashboard API

## Overview

The dashboard owns server-side routes under `src/app/api/*`. These routes handle auth/session state locally and proxy selected upstream calls to the rest of the Talos stack.

## Route Groups

### Auth

- `/api/auth/webauthn/login/options`
- `/api/auth/webauthn/login/verify`
- `/api/auth/webauthn/register/options`
- `/api/auth/webauthn/register/verify`
- `/api/auth/session`
- `/api/auth/logout`

### Status and Events

- `/api/status`
- `/api/status/aggregate`
- `/api/gateway/status`
- `/api/events`
- `/api/audit/stream`

### Admin and Configuration

- `/api/admin/me`
- `/api/admin/secrets`
- `/api/admin/audit/stats`
- `/api/admin/telemetry/stats`
- `/api/config/ui-bootstrap`
- `/api/config/[...path]`
- `/api/mcp/resources`

### Setup Helper

- `/api/setup/status`
- `/api/setup/agents/token`
- `/api/setup/agents/register`
- `/api/setup/agents/[id]/poll`
- `/api/setup/jobs`

### Examples and Agent UX

- `/api/examples/manifest`
- `/api/examples/chat/*`
- `/api/examples/devops/*`
- `/api/agent/chat`
- `/api/agent/models`
- `/api/agent/tools`
- `/api/agent/local-ollama`

## Ownership Rule

Browser-facing code should prefer dashboard-owned `/api/*` routes over direct calls to backend services so auth/session handling and proxy policy stay centralized in the dashboard package.
