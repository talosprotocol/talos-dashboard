export type TemplateCategory = 'development' | 'production' | 'compliance' | 'gateway';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Template {
    id: string;
    label: string;
    description: string;
    category: TemplateCategory;
    tags: string[];
    riskLevel: RiskLevel;
    minContractsVersion: string;
    isDevOnly?: boolean;
    requiresExternalDeps?: string[]; // e.g. ["postgres", "redis"]
    yaml: string;
}

export const CONFIG_TEMPLATES: Template[] = [
    // --- DEVELOPMENT ---
    {
        id: "dev-minimal",
        label: "Minimal Development",
        description: "Lightweight setup. Memory audit, no auth. Fast iteration.",
        category: "development",
        tags: ["local", "fast", "no-auth"],
        riskLevel: "medium", 
        minContractsVersion: "1.0",
        isDevOnly: true,
        yaml: `# Minimal Development
config_version: "1.0"
global:
  env: "dev"
  log_level: "INFO"
audit:
  storage_backend: "memory"
extensions:
  auth: { enabled: false }
  persistence: { enabled: false }
`
    },
    {
        id: "dev-debug",
        label: "Debug Mode",
        description: "Verbose logging enablement and memory backend.",
        category: "development",
        tags: ["debug", "verbose", "inspection"],
        riskLevel: "medium",
        minContractsVersion: "1.0",
        isDevOnly: true,
        yaml: `# Debug Mode
config_version: "1.0"
global:
  env: "dev"
  log_level: "DEBUG"
audit:
  storage_backend: "memory"
extensions:
  auth: { enabled: false }
  logging_format: "json"
`
    },
    {
        id: "dev-local-deps",
        label: "Local with Docker Deps",
        description: "Development setup expecting local Postgres/Redis containers.",
        category: "development",
        tags: ["docker", "postgres", "redis"],
        riskLevel: "low",
        minContractsVersion: "1.1",
        requiresExternalDeps: ["postgres", "redis"],
        yaml: `# Local with Deps
config_version: "1.0"
global:
  env: "dev"
audit:
  storage_backend: "postgres"
  database_url_ref: "postgresql://talos:dev@localhost:5432/talos"
extensions:
  auth: { enabled: false }
`
    },

    // --- PRODUCTION ---
    {
        id: "prod-standard",
        label: "Standard Production",
        description: "Secure defaults. Postgres audit, OIDC auth, strict validation.",
        category: "production",
        tags: ["standard", "secure", "postgres"],
        riskLevel: "low",
        minContractsVersion: "1.0",
        requiresExternalDeps: ["postgres"],
        isDevOnly: false,
        yaml: `# Standard Production
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
extensions:
  auth:
    enabled: true
    provider: "oidc"
    issuer: "\${OIDC_ISSUER}"
    client_id: "\${OIDC_CLIENT_ID}"
`
    },
    {
        id: "prod-ha",
        label: "High Availability",
        description: "Redundant audit backends and distributed caching enabled.",
        category: "production",
        tags: ["ha", "redundancy", "scale"],
        riskLevel: "low",
        minContractsVersion: "1.2",
        requiresExternalDeps: ["postgres", "redis-cluster"],
        yaml: `# High Availability
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
extensions:
  read_replica_url: "\${DATABASE_READ_URL}"
  cache:
    backend: "redis"
    cluster: true
`
    },
    {
        id: "prod-strict-egress",
        label: "Strict Egress Control",
        description: "Production setup with allowlisted external domains only.",
        category: "production",
        tags: ["security", "egress", "network"],
        riskLevel: "low",
        minContractsVersion: "1.1",
        yaml: `# Strict Egress
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
extensions:
  network:
    egress:
      mode: "allowlist"
      allow:
        - "api.stripe.com"
        - "auth0.com"
`
    },

    // --- COMPLIANCE ---
    {
        id: "comp-hipaa",
        label: "HIPAA-supporting Baseline",
        description: "Baseline configuration with enhanced audit retention and encryption.",
        category: "compliance",
        tags: ["hipaa", "healthcare", "audit-logs"],
        riskLevel: "low",
        minContractsVersion: "1.0",
        yaml: `# HIPAA-supporting Baseline
# DISCLAIMER: Compliance depends on deployment controls.
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
  retention_days: 2555 # 7 years
extensions:
  encrypt_at_rest: true
`
    },
    {
        id: "comp-gdpr",
        label: "GDPR-supporting Baseline",
        description: "Enables PII masking and user data export endpoints.",
        category: "compliance",
        tags: ["gdpr", "privacy", "pii"],
        riskLevel: "low",
        minContractsVersion: "1.0",
        yaml: `# GDPR-supporting Baseline
# DISCLAIMER: Complaince depends on deployment controls.
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
extensions:
  pii_masking: true
  mask_fields: ["email", "ssn", "ip_address"]
`
    },
    {
        id: "comp-pci",
        label: "Financial Services Baseline",
        description: "Baseline for PCI-DSS scope. Strict TLS and audit logging.",
        category: "compliance",
        tags: ["pci", "finance", "tls"],
        riskLevel: "low",
        minContractsVersion: "1.0",
        yaml: `# Financial Services Baseline
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
extensions:
  network:
    tls:
      min_version: "1.3"
      ciphers: ["TLS_AES_256_GCM_SHA384"]
`
    },
    {
        id: "comp-fedramp",
        label: "FedRAMP High Baseline",
        description: "FIPS compliant crypto settings and strict auth timeouts.",
        category: "compliance",
        tags: ["fedramp", "government", "fips"],
        riskLevel: "low",
        minContractsVersion: "1.2",
        yaml: `# FedRAMP High Baseline
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
extensions:
  auth:
    session_timeout: 15m
    mfa_required: true
  crypto:
    fips_mode: true
`
    },

    // --- GATEWAY ---
    {
        id: "gw-api-public",
        label: "Public API Gateway",
        description: "Rate limited, key-auth enabled gateway for public consumers.",
        category: "gateway",
        tags: ["public", "api-key", "rate-limit"],
        riskLevel: "low",
        minContractsVersion: "1.0",
        yaml: `# Public API Gateway
config_version: "1.0"
global:
  env: "prod"
gateway:
  port: 8001
  host: "0.0.0.0"
  database_url_ref: "\${GATEWAY_DB_URL}"
extensions:
  gateway_mode: "public"
  auth_method: "api-key"
  rate_limit:
    strategy: "ip"
    requests_per_minute: 60
`
    },
    {
        id: "gw-internal-mesh",
        label: "Internal Mesh Sidecar",
        description: "mTLS enabled sidecar for service-to-service config.",
        category: "gateway",
        tags: ["mtls", "internal", "microservices"],
        riskLevel: "low",
        minContractsVersion: "1.0",
        yaml: `# Internal Mesh Sidecar
config_version: "1.0"
global:
  env: "prod"
gateway:
  port: 8080
  host: "0.0.0.0"
  database_url_ref: "\${GATEWAY_DB_URL}"
extensions:
  gateway_mode: "sidecar"
  mtls:
    enabled: true
    ca_cert: "/etc/talos/certs/ca.pem"
`
    },
    {
        id: "gw-graphql",
        label: "GraphQL Federation",
        description: "Optimized for GraphQL query complexity limiting.",
        category: "gateway",
        tags: ["graphql", "federation"],
        riskLevel: "medium", // Complexity attacks possible
        minContractsVersion: "1.1",
        yaml: `# GraphQL Federation
config_version: "1.0"
global:
  env: "prod"
gateway:
  port: 8001
  database_url_ref: "\${GATEWAY_DB_URL}"
extensions:
  protocol: "graphql"
  security:
    max_depth: 5
    max_complexity: 100
`
    },
    {
        id: "gw-websocket",
        label: "WebSocket Relay",
        description: "Long-lived connection tuning for socket services.",
        category: "gateway",
        tags: ["websocket", "realtime"],
        riskLevel: "medium",
        minContractsVersion: "1.1",
        yaml: `# WebSocket Relay
config_version: "1.0"
global:
  env: "prod"
gateway:
  port: 8080
  database_url_ref: "\${GATEWAY_DB_URL}"
extensions:
  protocol: "websocket"
  timeouts:
    idle: 3600s
`
    },
    
    // --- SPECIALIZED VARIANTS ---
    {
        id: "spec-perf",
        label: "Performance Tuned",
        description: "High throughput settings. Batching enabled.",
        category: "production",
        tags: ["performance", "throughput"],
        riskLevel: "medium",
        minContractsVersion: "1.1",
        yaml: `# Performance Tuned
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
extensions:
  audit_tuning:
    batch_size: 1000
    flush_interval: "5s"
`
    },
    {
        id: "spec-cost",
        label: "Cost Optimized",
        description: "Aggressive caching and sampling to reduce backend load.",
        category: "production",
        tags: ["cost", "optimization"],
        riskLevel: "low",
        minContractsVersion: "1.0",
        yaml: `# Cost Optimized
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
extensions:
  audit_sampling_rate: 0.1 # 10%
  cache:
    ttl: "1h"
`
    },
    {
        id: "spec-iot",
        label: "IoT Edge",
        description: "Low footprint for edge devices. MQTT support.",
        category: "gateway",
        tags: ["iot", "edge", "mqtt"],
        riskLevel: "medium",
        minContractsVersion: "1.2",
        yaml: `# IoT Edge
config_version: "1.0"
global:
  env: "local"
gateway:
  port: 1883
  host: "0.0.0.0"
  database_url_ref: "\${GATEWAY_DB_URL}"
extensions:
  protocol: "mqtt"
  max_connections: 100
`
    },
    {
        id: "spec-legacy",
        label: "Legacy Wrapper",
        description: "Loose validation for legacy system migration.",
        category: "development",
        tags: ["legacy", "migration"],
        riskLevel: "high",
        minContractsVersion: "1.0",
        yaml: `# Legacy Wrapper
config_version: "1.0"
global:
  env: "dev"
audit:
  storage_backend: "sqlite"
  database_url_ref: "sqlite:///legacy.db"
extensions:
  validation:
    mode: "permissive"
  network:
    tls:
      allow_insecure: true # WARNING
`
    },
    {
        id: "spec-canary",
        label: "Canary Deployment",
        description: "Traffic splitting configuration.",
        category: "production",
        tags: ["canary", "deployment"],
        riskLevel: "low",
        minContractsVersion: "1.1",
        yaml: `# Canary Deployment
config_version: "1.0"
global:
  env: "prod"
gateway:
  port: 8001
  host: "0.0.0.0"
  database_url_ref: "\${GATEWAY_DB_URL}"
extensions:
  routing:
    rules:
      - weight: 5
        target: "v2-service"
      - weight: 95
        target: "v1-service"
`
    },
    {
        id: "spec-readonly",
        label: "Read-Only Replica",
        description: "Configuration for read-only interface nodes.",
        category: "production",
        tags: ["readonly", "safety"],
        riskLevel: "low",
        minContractsVersion: "1.0",
        yaml: `# Read-Only Replica
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
  database_url_ref: "\${DATABASE_URL}"
extensions:
  permissions:
    mode: "readonly"
  api:
    methods: ["GET", "HEAD"]
`
    }
];
