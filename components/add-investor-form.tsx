'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addInvestor, type AddInvestorState } from '../app/w/[slug]/admin/investors/actions';

const initialState: AddInvestorState = { error: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn primary" disabled={pending}>
      {pending ? 'Adding…' : 'Add investor'}
    </button>
  );
}

export function AddInvestorForm({ workspaceSlug }: { workspaceSlug: string }) {
  const [state, formAction] = useFormState(addInvestor, initialState);

  return (
    <form className="card" action={formAction}>
      <input type="hidden" name="workspace" value={workspaceSlug} />
      <h2 style={{ fontSize: '1.4rem' }}>Add an investor</h2>
      <p>Record an investor directly. Applicants you approve can also be added from the Applications tab.</p>
      <div className="form-grid">
        <label className="field" htmlFor="investor-name">
          Name
          <input id="investor-name" name="name" maxLength={120} required />
        </label>
        <label className="field" htmlFor="investor-email">
          Email
          <input id="investor-email" name="email" type="email" maxLength={254} required />
        </label>
        {state.error ? (
          <p className="notice notice-error field full" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="field full">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
