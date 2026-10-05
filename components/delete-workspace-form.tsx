'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteWorkspaceAction, type DeleteWorkspaceState } from '../app/w/[slug]/admin/settings/actions';

const initialState: DeleteWorkspaceState = { error: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger" disabled={pending}>
      {pending ? 'Deleting…' : 'Delete this workspace permanently'}
    </button>
  );
}

export function DeleteWorkspaceForm({ workspaceSlug, workspaceName }: { workspaceSlug: string; workspaceName: string }) {
  const [state, formAction] = useActionState(deleteWorkspaceAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspace" value={workspaceSlug} />
      <label className="field" htmlFor="delete-workspace-confirm">
        Type <strong>{workspaceName}</strong> to confirm
        <input id="delete-workspace-confirm" name="confirm" autoComplete="off" required />
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
