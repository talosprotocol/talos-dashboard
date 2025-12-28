# Talos Security Dashboard

> **Visualization & Control Plane for Talos Protocol**

This dashboard provides real-time visibility into the Talos Security Gateway, utilizing strict contract-driven data validation.

## Architecture

```mermaid
graph TD
    Gateway[Talos Gateway] -->|Events/Status| Dashboard[Security Dashboard]
    Dashboard -->|Reads| Contracts[@talos-protocol/contracts]
    Dashboard -->|Strict Mode| SQLite[Dev Only Fixtures]
```

## Features

- **Live Activity Stream**: Real-time audit log visualization.
- **Integrity Validation**: Strict cryptographic cursor verification (v3.2 Spec).
- **Glassmorphism UI**: Premium dark-mode aesthetics.

## Development

See `.agent/workflows/run-dashboard.md` for run instructions.

```bash
# Install
npm install

# Run Dev Server
npm run dev
```

## Production

```bash
# Build
npm run build

# Start
npm start
```

