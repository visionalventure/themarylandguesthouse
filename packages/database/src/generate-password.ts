import { randomBytes } from 'crypto';

// Used by both the API's first-boot bootstrap seed and the standalone
// `prisma db seed` script so a fresh deploy never falls back to a
// hardcoded password when ADMIN_PASSWORD/MANAGER_PASSWORD aren't set.
export function generateStrongPassword(): string {
  return randomBytes(12).toString('base64url');
}
