import { and, count, desc, eq } from 'drizzle-orm';
import { getDb, schema } from './db';
import type { ApplicationStatus } from './db/schema';

const { applications, auditLog, users } = schema;

// Tenant isolation rule: every function here takes the workspace id and puts it
// in the WHERE clause of every statement. Callers get that id from a verified
// membership (see lib/tenancy.ts), never from a request parameter alone.

export type ApplicationInput = {
  name: string;
  email: string;
  phone: string;
  country: string;
  amount: string;
  accredited: string;
  notes: string;
};

export type ApplicationRow = ApplicationInput & {
  id: string;
  status: ApplicationStatus;
  submittedAt: Date;
};

export async function listApplications(workspaceId: string): Promise<ApplicationRow[]> {
  const db = await getDb();
  return db
    .select({
      id: applications.id,
      name: applications.name,
      email: applications.email,
      phone: applications.phone,
      country: applications.country,
      amount: applications.amount,
      accredited: applications.accredited,
      notes: applications.notes,
      status: applications.status,
      submittedAt: applications.submittedAt,
    })
    .from(applications)
    .where(eq(applications.workspaceId, workspaceId))
    .orderBy(desc(applications.submittedAt));
}

export async function countApplicationsByStatus(workspaceId: string): Promise<Record<ApplicationStatus, number>> {
  const db = await getDb();
  const rows = await db
    .select({ status: applications.status, total: count() })
    .from(applications)
    .where(eq(applications.workspaceId, workspaceId))
    .groupBy(applications.status);
  const totals: Record<ApplicationStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const row of rows) totals[row.status] = row.total;
  return totals;
}

export async function addApplication(workspaceId: string, input: ApplicationInput): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .insert(applications)
    .values({ ...input, workspaceId })
    .returning({ id: applications.id });
  return row.id;
}

/**
 * Approves or rejects a pending application and records it in the audit log,
 * atomically. Returns false if no pending application with that id exists in
 * this workspace, including when the id belongs to a different workspace.
 */
export async function reviewApplication(params: {
  workspaceId: string;
  applicationId: string;
  decision: Exclude<ApplicationStatus, 'pending'>;
  actorUserId: string;
}): Promise<boolean> {
  const { workspaceId, applicationId, decision, actorUserId } = params;
  const db = await getDb();
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(applications)
      .set({ status: decision, reviewedAt: new Date(), reviewedBy: actorUserId })
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.workspaceId, workspaceId),
          eq(applications.status, 'pending'),
        ),
      )
      .returning({ id: applications.id, name: applications.name });
    if (updated.length === 0) return false;

    await tx.insert(auditLog).values({
      workspaceId,
      actorUserId,
      action: `application.${decision}`,
      targetType: 'application',
      targetId: applicationId,
      metadata: { applicant: updated[0].name },
    });
    return true;
  });
}

export type ActivityRow = {
  id: string;
  action: string;
  actorName: string | null;
  createdAt: Date;
  metadata: unknown;
};

export async function listRecentActivity(workspaceId: string, limit = 10): Promise<ActivityRow[]> {
  const db = await getDb();
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      actorName: users.name,
      createdAt: auditLog.createdAt,
      metadata: auditLog.metadata,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorUserId, users.id))
    .where(eq(auditLog.workspaceId, workspaceId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
