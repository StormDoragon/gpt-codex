'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login, type LoginState } from '../app/login/actions';

const initialState: LoginState = { error: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn primary field full" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form className="card" action={formAction}>
      <input type="hidden" name="next" value={next} />
      <div className="form-grid">
        <label className="field full" htmlFor="login-email">
          Email
          <input id="login-email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <label className="field full" htmlFor="login-password">
          Password
          <input id="login-password" name="password" type="password" autoComplete="current-password" required />
        </label>
        {state.error ? (
          <p className="notice notice-error field full" role="alert">
            {state.error}
          </p>
        ) : null}
        <SubmitButton />
        <p className="field full" style={{ margin: 0 }}>
          New here? <Link href="/signup"><u>Create a workspace</u></Link>
        </p>
      </div>
    </form>
  );
}
