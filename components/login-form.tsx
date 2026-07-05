'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login, type LoginState } from '../app/login/actions';

const initialState: LoginState = { error: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn primary field full" disabled={pending}>
      {pending ? 'Verifying…' : 'Enter demo portal'}
    </button>
  );
}

export function LoginForm({ next, defaultRole }: { next: string; defaultRole: 'investor' | 'admin' }) {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <form className="card" action={formAction}>
      <input type="hidden" name="next" value={next} />
      <div className="form-grid">
        <label className="field full" htmlFor="login-role">
          Sign in as
          <select id="login-role" name="role" defaultValue={defaultRole}>
            <option value="investor">Investor</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <label className="field full" htmlFor="login-code">
          Access code
          <input id="login-code" name="code" type="password" placeholder="Demo access code" required autoComplete="off" />
        </label>
        {state.error ? (
          <p className="notice notice-error field full" role="alert">
            {state.error}
          </p>
        ) : null}
        <SubmitButton />
      </div>
    </form>
  );
}
