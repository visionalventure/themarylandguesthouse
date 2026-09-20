import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Regression test for C1 (rate limiting activation). Isolated in its own
 * file/process run: @nestjs/throttler keys by IP by default, so every
 * request from this suite's in-process supertest client shares one bucket —
 * running this alongside other specs would make them spuriously 429 once
 * the earlier requests here exhaust the limit.
 */

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api');
    app.enableVersioning();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/auth/login is rate limited after 5 attempts/min', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent-ratelimit-test@example.com', password: 'WrongPassword1!' });

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await attempt();
      statuses.push(res.status);
    }

    // First 5 are rejected as bad credentials (401); the 6th within the
    // same 60s window must be throttled (429), proving the guard is live.
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});
