import type { LedgerEntryType } from './db/schema';
import type { InvestorStatus } from './investors';

export const statusBadge: Record<InvestorStatus, { label: string; className: string }> = {
  not_invited: { label: 'Not invited', className: 'badge muted' },
  invited: { label: 'Invited', className: 'badge warning' },
  active: { label: 'Active', className: 'badge' },
};

export const ledgerTypeLabel: Record<LedgerEntryType, string> = {
  commitment: 'Commitment',
  capital_call: 'Capital call',
  distribution: 'Distribution',
};
