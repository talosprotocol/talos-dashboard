import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  bigint,
  index,
  customType,
  jsonb,
} from "drizzle-orm/pg-core";

export const setupAgents = pgTable('setup_agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  hostname: text('hostname').notNull(),
  version: text('version').notNull(),
  secretHash: text('secret_hash').notNull(), // Hashed agent_secret
  lastSeenAt: timestamp('last_seen_at'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  labels: jsonb('labels'),
  paired: boolean('paired').default(true).notNull(),
});

export const setupJobs = pgTable('setup_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => setupAgents.id),
  recipeId: text('recipe_id').notNull(),
  status: text('status').notNull(), // queued, leased, running, completed, failed, canceled
  args: jsonb('args').notNull(),
  leaseId: uuid('lease_id'),
  leaseExpiresAt: timestamp('lease_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  result: jsonb('result'),
  logs: jsonb('logs'), // Array of log events (simple storage for now)
});

export const pairingTokens = pgTable('pairing_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(), // Hashed or plain? For Phase 2 POC plain is 'ok' but hashed better.
  description: text('description'),
  expiresAt: timestamp('expires_at').notNull(),
  consumed: boolean('consumed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by'), // User email or ID
});

// Custom Bytea type for handling Buffer/Uint8Array
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: Buffer): Buffer {
    return value;
  },
});

// Users Table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(), // Nullable by default
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

// Authenticators Table (Passkeys)
export const authenticators = pgTable("authenticators", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  credentialID: text("credential_id").unique().notNull(), // Base64URL string
  credentialPublicKey: bytea("public_key").notNull(),
  counter: bigint("counter", { mode: "number" }).notNull(),
  transports: text("transports").array(),
  deviceType: text("device_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
});

// Challenges Table (Replay Protection)
export const webauthnChallenges = pgTable(
  "webauthn_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for discoverable login
    challenge: text("challenge").notNull(), // Base64URL string
    purpose: text("purpose").notNull(), // 'registration' | 'authentication'
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      lookupIdx: index("challenge_lookup_idx").on(
        table.purpose,
        table.expiresAt,
        table.consumedAt
      ),
    };
  }
);

// Sessions Table (DB-backed, tokens hashed)
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: bytea("token_hash").unique().notNull(), // SHA-256 of raw token
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at"),
});
