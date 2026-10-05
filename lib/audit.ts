import { schema, type Db } from './db';

export type AuditEntry = {
  workspaceId: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

/** Appends to the audit log. Pass a transaction so the entry commits atomically with the change. */
export async function recordAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.insert(schema.auditLog).values({ ...entry, metadata: entry.metadata ?? null });
}
