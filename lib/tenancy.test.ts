import { describe, expect, it } from 'vitest';
import {
  addApplication,
  countApplicationsByStatus,
  listApplications,
  listRecentActivity,
  reviewApplication,
} from './applications';
import { getMembership, getWorkspaceBySlug, listMemberships } from './workspaces';
import { makeTenant, sampleApplication } from './test-helpers';

async function twoTenants() {
  const a = await makeTenant('alpha');
  const b = await makeTenant('bravo');
  const wsA = (await getWorkspaceBySlug(a.slug))!;
  const wsB = (await getWorkspaceBySlug(b.slug))!;
  return { a, b, wsA, wsB };
}

describe('tenant isolation', () => {
  it("lists only a workspace's own applications", async () => {
    const { wsA, wsB } = await twoTenants();
    await addApplication(wsA.id, sampleApplication('Alice Alpha'));
    await addApplication(wsA.id, sampleApplication('Adam Alpha'));
    await addApplication(wsB.id, sampleApplication('Beth Bravo'));

    expect((await listApplications(wsA.id)).map((row) => row.name).sort()).toEqual(['Adam Alpha', 'Alice Alpha']);
    expect((await listApplications(wsB.id)).map((row) => row.name)).toEqual(['Beth Bravo']);
    expect((await countApplicationsByStatus(wsA.id)).pending).toBe(2);
    expect((await countApplicationsByStatus(wsB.id)).pending).toBe(1);
  });

  it('cannot review another workspace’s application, even with its exact id', async () => {
    const { a, wsA, wsB } = await twoTenants();
    const victimId = await addApplication(wsB.id, sampleApplication('Victim Bravo'));

    // Workspace A's owner tries to approve and reject B's application by id.
    for (const decision of ['approved', 'rejected'] as const) {
      const changed = await reviewApplication({
        workspaceId: wsA.id,
        applicationId: victimId,
        decision,
        actorUserId: a.userId,
      });
      expect(changed).toBe(false);
    }

    const [victim] = await listApplications(wsB.id);
    expect(victim.status).toBe('pending');
    expect(await listRecentActivity(wsA.id)).toHaveLength(0);
    expect(await listRecentActivity(wsB.id)).toHaveLength(0);
  });

  it('records an audit entry only in the workspace that did the review', async () => {
    const { a, wsA, wsB } = await twoTenants();
    const id = await addApplication(wsA.id, sampleApplication('Carol Alpha'));
    await addApplication(wsB.id, sampleApplication('Dave Bravo'));

    expect(
      await reviewApplication({ workspaceId: wsA.id, applicationId: id, decision: 'approved', actorUserId: a.userId }),
    ).toBe(true);

    const activityA = await listRecentActivity(wsA.id);
    expect(activityA).toHaveLength(1);
    expect(activityA[0].action).toBe('application.approved');
    expect(activityA[0].actorName).toBe('alpha owner');
    expect(await listRecentActivity(wsB.id)).toHaveLength(0);
    expect((await countApplicationsByStatus(wsB.id)).approved).toBe(0);
  });

  it('does not let an application be reviewed twice', async () => {
    const { a, wsA } = await twoTenants();
    const id = await addApplication(wsA.id, sampleApplication('Erin Alpha'));
    const review = (decision: 'approved' | 'rejected') =>
      reviewApplication({ workspaceId: wsA.id, applicationId: id, decision, actorUserId: a.userId });

    expect(await review('approved')).toBe(true);
    expect(await review('rejected')).toBe(false);
    expect((await listApplications(wsA.id))[0].status).toBe('approved');
    expect(await listRecentActivity(wsA.id)).toHaveLength(1);
  });

  it('only resolves memberships a user actually holds', async () => {
    const { a, b } = await twoTenants();

    expect((await getMembership(a.userId, a.slug))?.role).toBe('owner');
    expect(await getMembership(a.userId, b.slug)).toBeNull();
    expect(await getMembership(b.userId, a.slug)).toBeNull();

    expect((await listMemberships(a.userId)).map((m) => m.workspace.slug)).toEqual([a.slug]);
    expect((await listMemberships(b.userId)).map((m) => m.workspace.slug)).toEqual([b.slug]);
  });
});
