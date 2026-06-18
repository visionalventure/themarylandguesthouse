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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Serve uploaded files statically at /uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
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

  await app.listen(port);
  console.log(`🚀 Maryland Guesthouse ERP API running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
