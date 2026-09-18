import { randomBytes } from 'crypto';

// Used by BootstrapService's first-boot seed so a fresh deploy never falls
// back to a hardcoded password when ADMIN_PASSWORD/MANAGER_PASSWORD aren't
// set. Kept local (not imported from @mgh/database) because pulling a
// cross-package source file into apps/api widens TypeScript's rootDir
// inference and breaks Nest's flat dist/main.js build output.
export function generateStrongPassword(): string {
  return randomBytes(12).toString('base64url');
}
