import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const memberRole = pgEnum('member_role', ['owner', 'admin', 'investor']);
export const applicationStatus = pgEnum('application_status', ['pending', 'approved', 'rejected']);
export const ledgerEntryType = pgEnum('ledger_entry_type', ['commitment', 'capital_call', 'distribution']);

export type MemberRole = (typeof memberRole.enumValues)[number];
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
export type LedgerEntryType = (typeof ledgerEntryType.enumValues)[number];

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Stored lowercased; uniqueness is enforced on the normalized value.
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('users_email_key').on(table.email)],
);

// A workspace is one manager's branded portal (one fund or sponsor). It is the
// tenant boundary: every row that belongs to a customer carries a workspace_id.
export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('workspaces_slug_key').on(table.slug)],
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('memberships_user_workspace_key').on(table.userId, table.workspaceId),
    index('memberships_workspace_idx').on(table.workspaceId),
  ],
);

// Only a SHA-256 of the session token is stored, so a database leak does not
// hand out usable sessions.
export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('sessions_user_idx').on(table.userId)],
);

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull().default(''),
    country: text('country').notNull().default(''),
    amount: text('amount').notNull().default(''),
    accredited: text('accredited').notNull().default('Not sure'),
    notes: text('notes').notNull().default(''),
    status: applicationStatus('status').notNull().default('pending'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('applications_workspace_submitted_idx').on(table.workspaceId, table.submittedAt),
    // Target for the composite foreign key from investors, which ties an
    // investor's application to the same workspace.
    unique('applications_id_workspace_key').on(table.id, table.workspaceId),
  ],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    metadata: jsonb('metadata'),
    createdAt: createdAt(),
  },
  (table) => [index('audit_log_workspace_created_idx').on(table.workspaceId, table.createdAt)],
);

// An investor is a person or entity in one fund, as the manager records them.
// It exists before (and independently of) any login: `userId` is filled in
// when the investor accepts an invitation.
export const investors = pgTable(
  'investors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // Stored lowercased.
    email: text('email').notNull(),
    applicationId: uuid('application_id'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (table) => [
    // Target for the composite foreign keys below: lets other tables prove an
    // investor belongs to the same workspace as the row that references it.
    unique('investors_id_workspace_key').on(table.id, table.workspaceId),
    uniqueIndex('investors_workspace_email_key').on(table.workspaceId, table.email),
    // One login maps to at most one investor record per workspace.
    uniqueIndex('investors_workspace_user_key').on(table.workspaceId, table.userId),
    // An application becomes at most one investor.
    uniqueIndex('investors_workspace_application_key').on(table.workspaceId, table.applicationId),
    foreignKey({
      name: 'investors_application_workspace_fk',
      columns: [table.applicationId, table.workspaceId],
      foreignColumns: [applications.id, applications.workspaceId],
    }),
  ],
);

// Tokens are stored hashed, are single-use, and expire. The composite foreign
// key guarantees an invitation can only point at an investor in its own workspace.
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    investorId: uuid('investor_id').notNull(),
    email: text('email').notNull(),
    role: memberRole('role').notNull().default('investor'),
    tokenHash: text('token_hash').notNull(),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('invitations_token_hash_key').on(table.tokenHash),
    index('invitations_workspace_investor_idx').on(table.workspaceId, table.investorId),
    foreignKey({
      name: 'invitations_investor_workspace_fk',
      columns: [table.investorId, table.workspaceId],
      foreignColumns: [investors.id, investors.workspaceId],
    }).onDelete('cascade'),
  ],
);

// Append-only record of commitments, capital calls and distributions, in USD
// cents. It RECORDS what the manager reports; no money moves through the
// product. Entries are never edited or deleted.
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    investorId: uuid('investor_id').notNull(),
    type: ledgerEntryType('type').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    effectiveDate: date('effective_date', { mode: 'string' }).notNull(),
    memo: text('memo').notNull().default(''),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('ledger_entries_workspace_investor_idx').on(table.workspaceId, table.investorId, table.effectiveDate),
    check('ledger_entries_amount_positive', sql`${table.amountCents} > 0`),
    foreignKey({
      name: 'ledger_entries_investor_workspace_fk',
      columns: [table.investorId, table.workspaceId],
      foreignColumns: [investors.id, investors.workspaceId],
    }).onDelete('cascade'),
  ],
);

// Fixed-window counters for rate limiting. Kept in Postgres rather than process
// memory so the limits hold across serverless instances. `key` is namespaced by
// limit name; `bucket` is the window index; expired rows are swept opportunistically.
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    bucket: bigint('bucket', { mode: 'number' }).notNull(),
    count: integer('count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.bucket] }),
    index('rate_limits_expires_idx').on(table.expiresAt),
  ],
);
