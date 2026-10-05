import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const memberRole = pgEnum('member_role', ['owner', 'admin', 'investor']);
export const applicationStatus = pgEnum('application_status', ['pending', 'approved', 'rejected']);

export type MemberRole = (typeof memberRole.enumValues)[number];
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];

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
  (table) => [index('applications_workspace_submitted_idx').on(table.workspaceId, table.submittedAt)],
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
