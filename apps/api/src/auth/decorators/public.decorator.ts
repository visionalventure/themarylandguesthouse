import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route as exempt from the global JwtAuthGuard (see app.module.ts's
// APP_GUARD binding) — used for the handful of routes that must work
// without a token: login, refresh, forgot/reset-password.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
