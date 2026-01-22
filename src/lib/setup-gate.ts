
export class SecurityGateError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'SecurityGateError';
  }
}

export function verifySetupGates() {
  // 1. Check for AUTH_SECRET
  if (!process.env.AUTH_SECRET) {
    throw new SecurityGateError(
      'MISSING_AUTH_SECRET',
      'Setup is disabled: AUTH_SECRET must be set in environment.'
    );
  }

  // 2. Check for Default Creds (This is a simplified check, ideally check DB or Auth config)
  // In a real app we'd check if the admin user has changed the hash.
  // For now, we assume if TALOS_SECURE_START is enabled, we are enforcing stricter checks.
  if (process.env.TALOS_DEFAULT_CREDS_ACTIVE === 'true') {
     throw new SecurityGateError(
      'DEFAULT_CREDS_ACTIVE',
      'Setup is disabled: You must change default admin credentials.'
    );
  }
  
  // 3. Localhost Only Check (Usually enforced at network layer, but we can check headers in API route)
  // This helper just validates the static configuration gates.
  
  return true;
}
