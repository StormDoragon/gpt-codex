'use client';

import { useState } from 'react';
import { platform } from '../lib/platform-data';

export function ApplyForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className="form-grid">
        <label className="field">
          Full name
          <input name="name" placeholder="Your full name" required />
        </label>
        <label className="field">
          Email
          <input name="email" type="email" placeholder="you@example.com" required />
        </label>
        <label className="field">
          Phone
          <input name="phone" placeholder="Phone number" />
        </label>
        <label className="field">
          Country
          <input name="country" placeholder="Country" />
        </label>
        <label className="field">
          Desired investment amount
          <input name="amount" placeholder={`${platform.minimumInvestment} minimum`} />
        </label>
        <label className="field">
          Accredited investor status
          <select name="accredited" defaultValue="Not sure">
            <option>Not sure</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </label>
        <label className="field full">
          Notes
          <textarea name="notes" placeholder="Tell us your investment timeline and questions." />
        </label>
        <label className="field full inline">
          <input type="checkbox" name="risk-acknowledged" required />
          <span>I understand that investments involve risk, including possible loss of principal.</span>
        </label>
        {submitted ? (
          <p className="notice field full" role="status">
            Application preview received. Nothing was submitted or stored — this prototype does not create
            accounts, accept investments, or authorize transfers.
          </p>
        ) : null}
        <button type="submit" className="btn primary field full">
          Submit application preview
        </button>
      </div>
    </form>
  );
}
