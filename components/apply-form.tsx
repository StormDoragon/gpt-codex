'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitApplication, type ApplyState } from '../app/w/[slug]/apply/actions';

const initialState: ApplyState = { ok: false, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn primary field full" disabled={pending}>
      {pending ? 'Submitting…' : 'Submit application'}
    </button>
  );
}

export function ApplyForm({ workspaceSlug }: { workspaceSlug: string }) {
  const [state, formAction] = useFormState(submitApplication, initialState);

  return (
    <form className="card" action={formAction}>
      <input type="hidden" name="workspace" value={workspaceSlug} />
      {/* Honeypot for bots: hidden from people and assistive tech. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
        <label htmlFor="apply-website">
          Website
          <input id="apply-website" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="form-grid">
        <label className="field" htmlFor="apply-name">
          Full name
          <input id="apply-name" name="name" placeholder="Your full name" maxLength={120} required />
        </label>
        <label className="field" htmlFor="apply-email">
          Email
          <input id="apply-email" name="email" type="email" placeholder="you@example.com" maxLength={254} required />
        </label>
        <label className="field" htmlFor="apply-phone">
          Phone
          <input id="apply-phone" name="phone" placeholder="Phone number" maxLength={40} />
        </label>
        <label className="field" htmlFor="apply-country">
          Country
          <input id="apply-country" name="country" placeholder="Country" maxLength={80} />
        </label>
        <label className="field" htmlFor="apply-amount">
          Desired investment amount
          <input id="apply-amount" name="amount" placeholder="e.g. $25,000" maxLength={40} />
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
          <textarea id="apply-notes" name="notes" placeholder="Tell us your investment timeline and questions." maxLength={2000} />
        </label>
        <label className="field full inline" htmlFor="apply-risk">
          <input id="apply-risk" type="checkbox" name="risk-acknowledged" required />
          <span>I understand that investments involve risk, including possible loss of principal.</span>
        </label>
        {state.message ? (
          <p className={`notice field full ${state.ok ? '' : 'notice-error'}`} role={state.ok ? 'status' : 'alert'}>
            {state.message}
          </p>
        ) : null}
        <SubmitButton />
      </div>
    </form>
  );
}
