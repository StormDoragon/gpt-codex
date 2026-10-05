import type { Limit } from './rate-limit';

// Tuned for a closed beta: tight enough to stop guessing and spam, loose
// enough that a real person or a small office never notices. Revisit with real traffic.

export const LIMITS = {
  // Failed sign-ins. Layered so that no single identifier can be abused:
  // - per (account, address): stops one address guessing a password, and
  //   cannot be used to lock the real owner out from their own address;
  // - per account: caps guessing against one account from many addresses;
  // - per address: stops credential stuffing across many accounts.
  loginFailuresByAccountAndIp: { name: 'login-fail-account-ip', max: 8, windowSeconds: 15 * 60 },
  loginFailuresByAccount: { name: 'login-fail-account', max: 40, windowSeconds: 60 * 60 },
  loginFailuresByIp: { name: 'login-fail-ip', max: 30, windowSeconds: 15 * 60 },

  signupByIp: { name: 'signup-ip', max: 5, windowSeconds: 60 * 60 },
  intakeByIp: { name: 'intake-ip', max: 10, windowSeconds: 60 * 60 },
  intakeByWorkspace: { name: 'intake-workspace', max: 100, windowSeconds: 60 * 60 },
  inviteAcceptByIp: { name: 'invite-accept-ip', max: 20, windowSeconds: 60 * 60 },
} satisfies Record<string, Limit>;

/** "about 12 minutes", never revealing more precision than needed. */
export function describeWait(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? 'about a minute' : `about ${minutes} minutes`;
}
