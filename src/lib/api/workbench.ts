export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type ApiWorkbenchParam = {
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
};

export type ApiWorkbenchRoute = {
  id: string;
  path: string;
  title: string;
  description: string;
  group:
    | "Admin"
    | "Agent"
    | "Audit"
    | "Auth"
    | "Config"
    | "Examples"
    | "Setup"
    | "Status";
  methods: readonly HttpMethod[];
  defaultMethod?: HttpMethod;
  params?: readonly ApiWorkbenchParam[];
  bodyTemplate?: string;
};

const json = (value: unknown): string => JSON.stringify(value, null, 2);

export const API_WORKBENCH_ROUTES: readonly ApiWorkbenchRoute[] = [
  {
    id: "admin-rbac-roles",
    path: "/api/admin/v1/rbac/roles",
    title: "RBAC Roles",
    description: "List all defined RBAC roles and permissions.",
    group: "Admin",
    methods: ["GET"],
  },
  {
    id: "admin-rbac-role-upsert",
    path: "/api/admin/v1/rbac/roles",
    title: "RBAC Role Upsert",
    description: "Create or update an RBAC role definition.",
    group: "Admin",
    methods: ["POST"],
    bodyTemplate: json({
      role_id: "role-analyst",
      name: "Data Analyst",
      permissions: ["audit:read", "telemetry:read"],
      built_in: false
    }),
  },
  {
    id: "admin-rbac-bindings",
    path: "/api/admin/v1/rbac/bindings",
    title: "RBAC Bindings",
    description: "List all principal-to-role bindings.",
    group: "Admin",
    methods: ["GET"],
  },
  {
    id: "admin-rbac-binding-upsert",
    path: "/api/admin/v1/rbac/bindings",
    title: "RBAC Binding Upsert",
    description: "Bind a principal (user/service) to a role.",
    group: "Admin",
    methods: ["POST"],
    bodyTemplate: json({
      principal_id: "user:alice",
      bindings: [{
        binding_id: "bind_123",
        role_id: "role-admin",
        scope: { scope_type: "global", attributes: {} }
      }]
    }),
  },
  {
    id: "admin-budgets-scopes",
    path: "/api/admin/v1/budgets/scopes",
    title: "Budget Scopes",
    description: "List all active budget scopes (global, team, etc.).",
    group: "Admin",
    methods: ["GET"],
  },
  {
    id: "admin-budgets-keys",
    path: "/api/admin/v1/budgets/keys",
    title: "Virtual Keys",
    description: "List all virtual keys and their usage status.",
    group: "Admin",
    methods: ["GET"],
  },
  {
    id: "admin-secrets-list",
    path: "/api/admin/v1/secrets",
    title: "Secrets List",
    description: "List all encrypted secrets stored in the KMS.",
    group: "Admin",
    methods: ["GET"],
  },
  {
    id: "admin-kek-status",
    path: "/api/admin/v1/secrets/kek/status",
    title: "KEK Status",
    description: "Read the current Key Encryption Key (KEK) status and stale secret counts.",
    group: "Admin",
    methods: ["GET"],
  },
  {
    id: "admin-secret-create",
    path: "/api/admin/v1/secrets",
    title: "Secret Create",
    description: "Encrypt and store a new named secret.",
    group: "Admin",
    methods: ["POST"],
    bodyTemplate: json({
      name: "example-key",
      value: "secret-value-to-encrypt",
    }),
  },
  {
    id: "admin-secret-delete",
    path: "/api/admin/v1/secrets/:name",
    title: "Secret Delete",
    description: "Permanently delete a secret from the KMS.",
    group: "Admin",
    methods: ["DELETE"],
    params: [{ name: "name", label: "Secret Name", placeholder: "example-key" }],
  },
  {
    id: "admin-secrets-rotate",
    path: "/api/admin/v1/secrets/rotate",
    title: "Rotate All Secrets",
    description: "Start a background operation to re-encrypt all secrets under the current KEK.",
    group: "Admin",
    methods: ["POST"],
  },
  {
    id: "admin-proxy",
    path: "/api/admin/v1/*",
    title: "Admin Proxy",
    description: "Generic gateway admin proxy. Use a relative admin path such as `me` or `llm/upstreams`.",
    group: "Admin",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    defaultMethod: "GET",
    params: [{ name: "path", label: "Admin Path", placeholder: "me", defaultValue: "me" }],
    bodyTemplate: json({}),
  },
  {
    id: "admin-audit-stream",
    path: "/api/admin/v1/audit/stream",
    title: "Admin Audit Stream",
    description: "Server-sent event stream for the admin namespace.",
    group: "Audit",
    methods: ["GET"],
  },
  {
    id: "agent-chat",
    path: "/api/agent/chat",
    title: "Agent Chat",
    description: "Proxy a secure agent request through the dashboard session boundary.",
    group: "Agent",
    methods: ["POST"],
    bodyTemplate: json({
      model: "llama3",
      session_id: "demo-session-v1",
      messages: [{ role: "user", content: "Summarize current Talos health." }],
    }),
  },
  {
    id: "agent-local-ollama",
    path: "/api/agent/local-ollama",
    title: "Local Ollama Proxy",
    description: "Stream a local Ollama completion when the local proxy feature gate is enabled.",
    group: "Agent",
    methods: ["POST"],
    bodyTemplate: json({
      model: "llama3",
      messages: [{ role: "user", content: "Explain the current audit posture." }],
    }),
  },
  {
    id: "agent-models",
    path: "/api/agent/models",
    title: "Agent Models",
    description: "Return the dashboard-facing agent model list.",
    group: "Agent",
    methods: ["GET"],
  },
  {
    id: "agent-tools",
    path: "/api/agent/tools",
    title: "Agent Tools",
    description: "Return the secure agent tool catalogue shown in the dashboard chat surface.",
    group: "Agent",
    methods: ["GET"],
  },
  {
    id: "audit-proof",
    path: "/api/audit/proof/:id",
    title: "Audit Proof",
    description: "Fetch a proof bundle for a specific audit event.",
    group: "Audit",
    methods: ["GET"],
    params: [{ name: "id", label: "Event ID", placeholder: "evt_123", defaultValue: "evt_demo_1" }],
  },
  {
    id: "audit-stream",
    path: "/api/audit/stream",
    title: "Audit Stream",
    description: "Open the same-origin audit SSE stream.",
    group: "Audit",
    methods: ["GET"],
  },
  {
    id: "auth-dev-login",
    path: "/api/auth/dev-login",
    title: "Dev Login",
    description: "Issue a development session cookie using email and password.",
    group: "Auth",
    methods: ["POST"],
    bodyTemplate: json({
      email: "admin@talosprotocol.com",
      password: "change-me",
    }),
  },
  {
    id: "auth-logout",
    path: "/api/auth/logout",
    title: "Logout",
    description: "Clear the current dashboard session.",
    group: "Auth",
    methods: ["POST"],
  },
  {
    id: "auth-session",
    path: "/api/auth/session",
    title: "Session",
    description: "Read current dashboard session state.",
    group: "Auth",
    methods: ["GET"],
  },
  {
    id: "auth-login-options",
    path: "/api/auth/webauthn/login/options",
    title: "WebAuthn Login Options",
    description: "Generate WebAuthn login options for an email principal.",
    group: "Auth",
    methods: ["POST"],
    bodyTemplate: json({ email: "admin@talosprotocol.com" }),
  },
  {
    id: "auth-login-verify",
    path: "/api/auth/webauthn/login/verify",
    title: "WebAuthn Login Verify",
    description: "Verify a WebAuthn authentication response.",
    group: "Auth",
    methods: ["POST"],
    bodyTemplate: json({
      response: {
        id: "credential-id",
        clientDataJSON: "base64url-client-data",
      },
    }),
  },
  {
    id: "auth-register-options",
    path: "/api/auth/webauthn/register/options",
    title: "WebAuthn Register Options",
    description: "Generate WebAuthn registration options for bootstrap or authenticated flows.",
    group: "Auth",
    methods: ["POST"],
  },
  {
    id: "auth-register-verify",
    path: "/api/auth/webauthn/register/verify",
    title: "WebAuthn Register Verify",
    description: "Verify a WebAuthn registration response.",
    group: "Auth",
    methods: ["POST"],
    bodyTemplate: json({
      response: {
        id: "credential-id",
        clientDataJSON: "base64url-client-data",
      },
    }),
  },
  {
    id: "config-proxy",
    path: "/api/config/*",
    title: "Configuration Proxy",
    description: "Generic same-origin proxy into the configuration service route space.",
    group: "Config",
    methods: ["GET", "POST", "PUT", "DELETE"],
    defaultMethod: "GET",
    params: [{ name: "path", label: "Config Path", placeholder: "health", defaultValue: "health" }],
    bodyTemplate: json({}),
  },
  {
    id: "config-bootstrap",
    path: "/api/config/ui-bootstrap",
    title: "Configuration UI Bootstrap",
    description: "Fetch the configuration bootstrap bundle used by the dashboard editor.",
    group: "Config",
    methods: ["GET"],
  },
  {
    id: "debug-reset",
    path: "/api/debug/reset",
    title: "Debug Reset",
    description: "Reset local dashboard debug state.",
    group: "Config",
    methods: ["POST"],
  },
  {
    id: "events",
    path: "/api/events",
    title: "Events",
    description: "Fetch paginated audit events from the audit service proxy.",
    group: "Audit",
    methods: ["GET"],
  },
  {
    id: "examples-chat-feedback",
    path: "/api/examples/chat/feedback",
    title: "Example Chat Feedback",
    description: "Submit feedback to the secure chat example backend.",
    group: "Examples",
    methods: ["POST"],
    bodyTemplate: json({
      rating: "up",
      message_id: "msg_123",
      note: "Operator approved the response.",
    }),
  },
  {
    id: "examples-chat-health",
    path: "/api/examples/chat/health",
    title: "Example Chat Health",
    description: "Read the secure chat example health endpoint.",
    group: "Examples",
    methods: ["GET"],
  },
  {
    id: "examples-chat-send",
    path: "/api/examples/chat/send",
    title: "Example Chat Send",
    description: "Send a secure chat message through the example adapter.",
    group: "Examples",
    methods: ["POST"],
    bodyTemplate: json({
      message: "Summarize last 24h audit denials.",
      session_id: "example-chat-session",
    }),
  },
  {
    id: "examples-chat-stats",
    path: "/api/examples/chat/stats",
    title: "Example Chat Stats",
    description: "Read secure chat example usage stats.",
    group: "Examples",
    methods: ["GET"],
  },
  {
    id: "examples-chat-summary",
    path: "/api/examples/chat/summary",
    title: "Example Chat Summary",
    description: "Fetch summary metadata for the secure chat example.",
    group: "Examples",
    methods: ["GET"],
  },
  {
    id: "examples-devops-health",
    path: "/api/examples/devops/health",
    title: "Example DevOps Health",
    description: "Read the DevOps example health endpoint.",
    group: "Examples",
    methods: ["GET"],
  },
  {
    id: "examples-devops-logs",
    path: "/api/examples/devops/logs",
    title: "Example DevOps Logs",
    description: "Fetch recent DevOps example log entries.",
    group: "Examples",
    methods: ["GET"],
  },
  {
    id: "examples-devops-status",
    path: "/api/examples/devops/status",
    title: "Example DevOps Status",
    description: "Read the current DevOps example status payload.",
    group: "Examples",
    methods: ["GET"],
  },
  {
    id: "examples-devops-trigger",
    path: "/api/examples/devops/trigger",
    title: "Example DevOps Trigger",
    description: "Trigger a DevOps example action.",
    group: "Examples",
    methods: ["POST"],
    bodyTemplate: json({
      action: "deploy",
      environment: "staging",
    }),
  },
  {
    id: "examples-manifest",
    path: "/api/examples/manifest",
    title: "Examples Manifest",
    description: "Return the dashboard examples manifest.",
    group: "Examples",
    methods: ["GET"],
  },
  {
    id: "gateway-status",
    path: "/api/gateway/status",
    title: "Gateway Status",
    description: "Read gateway status via the dashboard-owned proxy.",
    group: "Status",
    methods: ["GET"],
  },
  {
    id: "mcp-resources",
    path: "/api/mcp/resources",
    title: "MCP Resources",
    description: "List resources exposed by the MCP connector.",
    group: "Status",
    methods: ["GET"],
  },
  {
    id: "runtime-config",
    path: "/api/runtime-config",
    title: "Runtime Config",
    description: "Read dashboard runtime metadata and feature flags.",
    group: "Config",
    methods: ["GET"],
  },
  {
    id: "setup-agent-poll",
    path: "/api/setup/agents/:id/poll",
    title: "Setup Agent Poll",
    description: "Lease queued setup jobs for a paired helper agent.",
    group: "Setup",
    methods: ["POST"],
    params: [{ name: "id", label: "Agent ID", placeholder: "agent_123", defaultValue: "agent_123" }],
  },
  {
    id: "setup-agent-register",
    path: "/api/setup/agents/register",
    title: "Setup Agent Register",
    description: "Register a setup helper agent using a pairing token.",
    group: "Setup",
    methods: ["POST"],
    bodyTemplate: json({
      pairing_token: "talos_pairing_example",
      hostname: "operator-macbook",
      version: "0.1.0",
    }),
  },
  {
    id: "setup-agent-token",
    path: "/api/setup/agents/token",
    title: "Setup Agent Token",
    description: "Mint a short-lived helper pairing token.",
    group: "Setup",
    methods: ["POST"],
  },
  {
    id: "setup-jobs",
    path: "/api/setup/jobs",
    title: "Setup Jobs",
    description: "Queue a setup job for a registered helper agent.",
    group: "Setup",
    methods: ["POST"],
    bodyTemplate: json({
      recipe_id: "install-dependencies",
      agent_id: "agent_123",
      args: { package_manager: "brew" },
    }),
  },
  {
    id: "setup-status",
    path: "/api/setup/status",
    title: "Setup Status",
    description: "Read the state of setup helper gates and pairing readiness.",
    group: "Setup",
    methods: ["GET"],
  },
  {
    id: "status-aggregate",
    path: "/api/status/aggregate",
    title: "Aggregate Status",
    description: "Read aggregated control-plane service health.",
    group: "Status",
    methods: ["GET"],
  },
  {
    id: "status",
    path: "/api/status",
    title: "Dashboard Status",
    description: "Read dashboard-local health and metadata.",
    group: "Status",
    methods: ["GET"],
  },
] as const;

const BODYLESS_METHODS = new Set<HttpMethod>(["GET", "DELETE"]);

function encodePathSegments(value: string): string {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function resolveApiWorkbenchPath(
  route: ApiWorkbenchRoute,
  params: Record<string, string>,
): string {
  let resolved = route.path;

  for (const [name, value] of Object.entries(params)) {
    const encoded = encodeURIComponent(value.trim());
    resolved = resolved.replace(`:${name}`, encoded);
  }

  if (resolved.includes("*")) {
    const splat = params.path ?? params.slug ?? "";
    resolved = resolved.replace("*", encodePathSegments(splat));
  }

  return resolved.replace(/\/$/, "");
}

export function parseApiWorkbenchBody(
  method: HttpMethod,
  bodyText: string,
): string | undefined {
  if (BODYLESS_METHODS.has(method)) {
    return undefined;
  }

  const trimmed = bodyText.trim();
  if (!trimmed) {
    return undefined;
  }

  JSON.parse(trimmed);
  return trimmed;
}
