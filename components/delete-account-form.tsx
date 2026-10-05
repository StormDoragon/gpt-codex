'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { deleteAccountAction, type DeleteAccountState } from '../app/account/actions';

const initialState: DeleteAccountState = { error: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger" disabled={pending}>
      {pending ? 'Deleting…' : 'Delete my account permanently'}
    </button>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, formAction] = useFormState(deleteAccountAction, initialState);

  return (
    <form action={formAction}>
      <label className="field" htmlFor="delete-account-confirm">
        Type your email <strong>{email}</strong> to confirm
        <input id="delete-account-confirm" name="confirm" autoComplete="off" required />
      </label>
      {state.error ? (
        <p className="notice notice-error" role="alert" style={{ marginTop: 14 }}>
          {state.error}
        </p>
      ) : null}
      <div style={{ marginTop: 14 }}>
        <SubmitButton />
      </div>
    </form>
  );
}
