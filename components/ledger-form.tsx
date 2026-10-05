'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { recordLedgerEntry, type LedgerFormState } from '../app/w/[slug]/admin/investors/actions';

const initialState: LedgerFormState = { ok: false, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn primary" disabled={pending}>
      {pending ? 'Recording…' : 'Record entry'}
    </button>
  );
}

export function LedgerForm({
  workspaceSlug,
  investorId,
  defaultDate,
}: {
  workspaceSlug: string;
  investorId: string;
  defaultDate: string;
}) {
  const [state, formAction] = useActionState(recordLedgerEntry, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form className="card" action={formAction} ref={formRef}>
      <input type="hidden" name="workspace" value={workspaceSlug} />
      <input type="hidden" name="investorId" value={investorId} />
      <h2 style={{ fontSize: '1.4rem' }}>Record an entry</h2>
      <p>
        Entries record what you report. No money moves through this product, and entries cannot be edited
        afterwards.
      </p>
      <div className="form-grid">
        <label className="field" htmlFor="ledger-type">
          Type
          <select id="ledger-type" name="type" defaultValue="commitment">
            <option value="commitment">Commitment</option>
            <option value="capital_call">Capital call</option>
            <option value="distribution">Distribution</option>
          </select>
        </label>
        <label className="field" htmlFor="ledger-amount">
          Amount (USD)
          <input id="ledger-amount" name="amount" inputMode="decimal" placeholder="25,000" maxLength={40} required />
        </label>
        <label className="field" htmlFor="ledger-date">
          Effective date
          <input id="ledger-date" name="date" type="date" defaultValue={defaultDate} required />
        </label>
        <label className="field" htmlFor="ledger-memo">
          Note (optional)
          <input id="ledger-memo" name="memo" maxLength={500} />
        </label>
        {state.message ? (
          <p className={`notice field full ${state.ok ? '' : 'notice-error'}`} role={state.ok ? 'status' : 'alert'}>
            {state.message}
          </p>
        ) : null}
        <div className="field full">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
