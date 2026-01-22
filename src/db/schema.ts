import { pgTable, text, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';

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
