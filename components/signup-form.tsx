'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { signup, type SignupState } from '../app/signup/actions';
import { MIN_PASSWORD_LENGTH } from '../lib/auth/password-policy';

const initialState: SignupState = { error: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn primary field full" disabled={pending}>
      {pending ? 'Creating workspace…' : 'Create workspace'}
    </button>
  );
}

export function SignupForm({ codeRequired }: { codeRequired: boolean }) {
  const [state, formAction] = useFormState(signup, initialState);

  return (
    <form className="card" action={formAction}>
      <div className="form-grid">
        <label className="field full" htmlFor="signup-name">
          Your name
          <input id="signup-name" name="name" autoComplete="name" maxLength={120} required />
        </label>
        <label className="field full" htmlFor="signup-workspace">
          Fund or firm name
          <input
            id="signup-workspace"
            name="workspaceName"
            placeholder="Acme Capital Partners"
            autoComplete="organization"
            maxLength={120}
            required
          />
        </label>
        <label className="field full" htmlFor="signup-email">
          Work email
          <input id="signup-email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <label className="field full" htmlFor="signup-password">
          Password
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
          <span style={{ fontSize: '.8rem' }}>At least {MIN_PASSWORD_LENGTH} characters.</span>
        </label>
        {codeRequired ? (
          <label className="field full" htmlFor="signup-code">
            Beta access code
            <input id="signup-code" name="inviteCode" autoComplete="off" required />
          </label>
        ) : null}
        {state.error ? (
          <p className="notice notice-error field full" role="alert">
            {state.error}
          </p>
        ) : null}
        <SubmitButton />
        <p className="field full" style={{ margin: 0 }}>
          Already have an account? <Link href="/login"><u>Sign in</u></Link>
        </p>
      </div>
    </form>
  );
}
