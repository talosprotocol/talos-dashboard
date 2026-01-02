# Architecture

## Overview

The Talos Security Dashboard is a Next.js 14 application that provides real-time visibility into the Talos Security Gateway.

## Data Flow

```mermaid
sequenceDiagram
    participant UI as Dashboard UI
    participant DS as DataSource
    participant API as Gateway API
    participant BC as blockchain.json
    
    UI->>DS: Request events
    DS->>API: GET /api/events
    API->>BC: Reload from disk
    BC-->>API: Block data
    API->>API: Map MCP → AuditEvent
    API-->>DS: Events array
    DS-->>UI: Render charts
```

## Components

```mermaid
graph TD
    subgraph Pages
        Home["/"]
        Audit["/audit"]
    end
    
    subgraph Components
        KPI[KPIGrid]
        Denial[DenialTaxonomyChart]
        Volume[RequestVolumeChart]
        Feed[ActivityFeed]
        Drawer[ProofDrawer]
        Table[AuditTable]
    end
    
    subgraph DataLayer
        DS[DataSource]
        HttpDS[HttpDataSource]
        MockDS[MockDataSource]
    end
    
    Home --> KPI & Denial & Volume & Feed
    Audit --> Table
    Feed --> Drawer
    KPI & Denial & Volume & Feed & Table --> DS
    DS --> HttpDS
    DS --> MockDS
```

## Persistence

Data persists to `~/.talos/blockchain.json`:

1. **External traffic** (TrafficGen, P2P, Connector) writes `mcp_request` events
2. **API Server** reloads blockchain on each query
3. **BlockchainAuditStore** maps raw MCP → AuditEvent format
4. **Dashboard** displays unified event stream

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| UI | React 18, Tailwind CSS |
| Charts | Recharts |
| State | React hooks |
| API | FastAPI (separate service) |
