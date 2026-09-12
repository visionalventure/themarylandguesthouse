import type { IncomingMessage, ServerResponse } from 'http';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApp } from '../src/create-app';

// Vercel Node functions speak plain (req, res) — unlike AWS Lambda's event
// object — so the Express instance Nest builds can be called directly as
// the handler. The app is cached across invocations on the same warm
// instance; Supabase's pooled (pgbouncer) connection string is what makes
// concurrent cold starts safe (see DATABASE_URL / DIRECT_URL in .env.example).
let appPromise: Promise<NestExpressApplication> | null = null;

async function getApp(): Promise<NestExpressApplication> {
  if (!appPromise) {
    appPromise = createApp().then(async (app) => {
      await app.init();
      return app;
    });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance(req, res);
}
