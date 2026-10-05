import type { Metadata } from 'next';
import Link from 'next/link';
import { AcceptInviteForm } from '../../../components/accept-invite-form';
import { normalizeEmail } from '../../../lib/accounts';
import { getSessionUser } from '../../../lib/auth/session';
import { previewInvitation } from '../../../lib/invitations';
import { logout } from '../../login/actions';

// The token is in this page's URL, so keep it out of Referer headers.
export const metadata: Metadata = { title: 'Accept invitation', referrer: 'no-referrer' };

const DEAD_LINK: Record<'unknown' | 'used' | 'revoked' | 'expired', { title: string; body: string }> = {
  unknown: { title: 'This invitation link is not valid.', body: 'Check that you copied the whole link, or ask your fund manager to send a new one.' },
  used: { title: 'This invitation has already been used.', body: 'If that was you, sign in to reach your account. Otherwise ask your fund manager for a new link.' },
  revoked: { title: 'This invitation was replaced.', body: 'Your fund manager sent a newer link. Use the most recent one, or ask them to send it again.' },
  expired: { title: 'This invitation has expired.', body: 'Invitations last 7 days. Ask your fund manager to send a new one.' },
};

export default async function InvitePage({ params }: { params: { token: string } }) {
  const [preview, sessionUser] = await Promise.all([previewInvitation(params.token), getSessionUser()]);

  if (preview.status !== 'valid') {
    const message = DEAD_LINK[preview.status];
    return (
      <main className="section">
        <div className="container">
          <p className="eyebrow">Invitation</p>
          <h1 className="page-title">{message.title}</h1>
          <p className="lede">{message.body}</p>
          <div className="actions">
            <Link href="/login" className="btn primary">
              Sign in
            </Link>
            <Link href="/" className="btn">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const signedInAsInvitee = sessionUser ? normalizeEmail(sessionUser.email) === preview.email : false;

  return (
    <main className="section">
      <div className="container split-grid">
        <section>
          <p className="eyebrow">{preview.workspaceName}</p>
          <h1 className="page-title">You&apos;re invited to your investor portal.</h1>
          <p className="lede">
            {preview.workspaceName} has invited you to see your commitments, capital calls and distributions in
            one private place.
          </p>
          <p className="notice">
            This portal shows figures recorded by {preview.workspaceName}. It does not hold or move money.
          </p>
        </section>

        {sessionUser && !signedInAsInvitee ? (
          <section className="card">
            <h2 style={{ fontSize: '1.4rem' }}>Signed in as someone else</h2>
            <p>
              You are signed in as <strong>{sessionUser.email}</strong>, but this invitation is for{' '}
              <strong>{preview.email}</strong>. Sign out, then open the link again.
            </p>
            <form action={logout}>
              <button type="submit" className="btn primary">
                Sign out
              </button>
            </form>
          </section>
        ) : signedInAsInvitee ? (
          <AcceptInviteForm
            token={params.token}
            email={preview.email}
            defaultName={preview.investorName}
            needsAccount={false}
          />
        ) : preview.accountExists ? (
          <section className="card">
            <h2 style={{ fontSize: '1.4rem' }}>Sign in to accept</h2>
            <p>
              An account already exists for <strong>{preview.email}</strong>. Sign in with it to accept this
              invitation.
            </p>
            <Link className="btn primary" href={`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`}>
              Sign in
            </Link>
          </section>
        ) : (
          <AcceptInviteForm
            token={params.token}
            email={preview.email}
            defaultName={preview.investorName}
            needsAccount
          />
        )}
      </div>
    </main>
  );
}
