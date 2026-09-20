import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
import helmet from 'helmet';
import { AppModule } from './app.module';

// Shared by the local/Docker entrypoint (main.ts) and the Vercel serverless
// entrypoint (api/index.ts) so both boot an identically configured app.
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Trust the first proxy hop (Vercel's edge) so req.ip / @Ip() reflect the
  // real client address instead of the proxy's, needed for login rate-limit
  // keying and audit log IPs to be meaningful.
  app.set('trust proxy', 1);

  // Serve uploaded files statically at /uploads (local/dev fallback only —
  // production uploads go through StorageService to R2, not local disk).
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Body size limits — must be set before any body-parsing middleware
  // Default Express limit is 100KB which is too small for legitimate payloads.
  // 5MB covers bulk imports; images must go through the file-upload endpoint, not JSON.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express');
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Security
  // In non-production, relax CSP just enough for Swagger UI's inline
  // scripts/styles to render at /api/docs; production keeps helmet's
  // strict defaults untouched.
  app.use(
    nodeEnv === 'production'
      ? helmet()
      : helmet({
          contentSecurityPolicy: {
            directives: {
              ...helmet.contentSecurityPolicy.getDefaultDirectives(),
              'script-src': ["'self'", "'unsafe-inline'"],
              'style-src': ["'self'", "'unsafe-inline'"],
            },
          },
        }),
  );
  app.use(compression());

  // CORS — CORS_ORIGIN supports comma-separated values for multiple allowed origins
  const rawOrigins = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const corsOrigins = rawOrigins.split(',').map((o) => o.trim());
  if (corsOrigins.includes('*')) {
    throw new Error(
      'CORS_ORIGIN must not be "*" — credentials:true with a wildcard origin is an invalid/unsafe CORS config. Set explicit origin(s) instead.',
    );
  }
  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global prefix & versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global exception filter for consistent error shapes
  app.useGlobalFilters(new HttpExceptionFilter());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger - only in non-production
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Maryland Guesthouse ERP API')
      .setDescription('Enterprise Hospitality Management Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & Authorization')
      .addTag('dashboard', 'Dashboard KPIs & Analytics')
      .addTag('reservations', 'Reservation Management')
      .addTag('guests', 'Guest CRM')
      .addTag('rooms', 'Room Management')
      .addTag('housekeeping', 'Housekeeping Operations')
      .addTag('restaurant', 'Restaurant & Bar POS')
      .addTag('inventory', 'Inventory Management')
      .addTag('procurement', 'Procurement & Purchasing')
      .addTag('hr', 'Human Resources')
      .addTag('maintenance', 'Maintenance & Assets')
      .addTag('accounting', 'Accounting & Finance')
      .addTag('documents', 'Document Management')
      .addTag('loyalty', 'Loyalty Program')
      .addTag('reports', 'Reports & Analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  return app;
}
