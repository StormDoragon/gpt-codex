'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { issueInvitation, type InviteState } from '../app/w/[slug]/admin/investors/actions';
import type { InvestorStatus } from '../lib/investors';

const initialState: InviteState = { error: '', path: '', expiresAt: '' };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn primary" disabled={pending}>
      {pending ? 'Creating…' : label}
    </button>
  );
}

export function InvitePanel({
  workspaceSlug,
  investorId,
  status,
}: {
  workspaceSlug: string;
  investorId: string;
  status: InvestorStatus;
}) {
  const [state, formAction] = useFormState(issueInvitation, initialState);
  const [copied, setCopied] = useState(false);

  if (status === 'active') {
    return (
      <section className="card">
        <h2 style={{ fontSize: '1.4rem' }}>Investor access</h2>
        <p>
          <span className="badge">Active</span> This investor has accepted their invitation and can sign in.
        </p>
      </section>
    );
  }

  // The link is only ever built in the browser, after the one response that contains the token.
  const url = state.path ? `${window.location.origin}${state.path}` : '';

  return (
    <section className="card">
      <h2 style={{ fontSize: '1.4rem' }}>Investor access</h2>
      <p>
        {status === 'invited'
          ? 'An invitation is outstanding. Creating a new link revokes the previous one.'
          : 'This investor has not been invited yet.'}
      </p>
      <form action={formAction}>
        <input type="hidden" name="workspace" value={workspaceSlug} />
        <input type="hidden" name="investorId" value={investorId} />
        <SubmitButton label={status === 'invited' ? 'Create a new invite link' : 'Create invite link'} />
      </form>
      {state.error ? (
        <p className="notice notice-error" role="alert" style={{ marginTop: 16 }}>
          {state.error}
        </p>
      ) : null}
      {url ? (
        <div className="notice" role="status" style={{ marginTop: 16 }}>
          <p style={{ marginTop: 0 }}>
            <strong>Send this link to the investor.</strong> It is shown only once, works once, and expires on{' '}
            {new Date(state.expiresAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}. Email delivery is not
            available yet, so you send it yourself.
          </p>
          <input readOnly value={url} aria-label="Invitation link" onFocus={(event) => event.currentTarget.select()} />
          <button
            type="button"
            className="btn btn-sm"
            style={{ marginTop: 10 }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
