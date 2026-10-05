'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { acceptInvite, type AcceptState } from '../app/invite/[token]/actions';
import { MIN_PASSWORD_LENGTH } from '../lib/auth/password-policy';

const initialState: AcceptState = { error: '' };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn primary field full" disabled={pending}>
      {pending ? 'Please wait…' : label}
    </button>
  );
}

export function AcceptInviteForm({
  token,
  email,
  defaultName,
  needsAccount,
}: {
  token: string;
  email: string;
  defaultName: string;
  /** True when the visitor is not signed in and must create an account. */
  needsAccount: boolean;
}) {
  const [state, formAction] = useActionState(acceptInvite, initialState);

  return (
    <form className="card" action={formAction}>
      <input type="hidden" name="token" value={token} />
      <div className="form-grid">
        <p className="field full" style={{ margin: 0 }}>
          Invitation for <strong>{email}</strong>
        </p>
        {needsAccount ? (
          <>
            <label className="field full" htmlFor="accept-name">
              Your name
              <input id="accept-name" name="name" defaultValue={defaultName} autoComplete="name" maxLength={120} required />
            </label>
            <label className="field full" htmlFor="accept-password">
              Choose a password
              <input
                id="accept-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
              <span style={{ fontSize: '.8rem' }}>At least {MIN_PASSWORD_LENGTH} characters.</span>
            </label>
          </>
        ) : null}
        {state.error ? (
          <p className="notice notice-error field full" role="alert">
            {state.error}
          </p>
        ) : null}
        <SubmitButton label={needsAccount ? 'Create account and accept' : 'Accept invitation'} />
      </div>
    </form>
  );
}
