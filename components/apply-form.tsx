'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitApplication, type ApplyState } from '../app/apply/actions';
import { platform } from '../lib/platform-data';

const initialState: ApplyState = { ok: false, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn primary field full" disabled={pending}>
      {pending ? 'Submitting…' : 'Submit application preview'}
    </button>
  );
}

export function ApplyForm() {
  const [state, formAction] = useFormState(submitApplication, initialState);

  return (
    <form className="card" action={formAction}>
      <div className="form-grid">
        <label className="field" htmlFor="apply-name">
          Full name
          <input id="apply-name" name="name" placeholder="Your full name" required />
        </label>
        <label className="field" htmlFor="apply-email">
          Email
          <input id="apply-email" name="email" type="email" placeholder="you@example.com" required />
        </label>
        <label className="field" htmlFor="apply-phone">
          Phone
          <input id="apply-phone" name="phone" placeholder="Phone number" />
        </label>
        <label className="field" htmlFor="apply-country">
          Country
          <input id="apply-country" name="country" placeholder="Country" />
        </label>
        <label className="field" htmlFor="apply-amount">
          Desired investment amount
          <input id="apply-amount" name="amount" placeholder={`${platform.minimumInvestment} minimum`} />
        </label>
        <label className="field" htmlFor="apply-accredited">
          Accredited investor status
          <select id="apply-accredited" name="accredited" defaultValue="Not sure">
            <option>Not sure</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </label>
        <label className="field full" htmlFor="apply-notes">
          Notes
          <textarea id="apply-notes" name="notes" placeholder="Tell us your investment timeline and questions." />
        </label>
        <label className="field full inline" htmlFor="apply-risk">
          <input id="apply-risk" type="checkbox" name="risk-acknowledged" required />
          <span>I understand that investments involve risk, including possible loss of principal.</span>
        </label>
        {state.message ? (
          <p
            className={`notice field full ${state.ok ? '' : 'notice-error'}`}
            role={state.ok ? 'status' : 'alert'}
          >
            {state.message}
          </p>
        ) : null}
        <SubmitButton />
      </div>
    </form>
  );
}
