import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Regression tests for the cross-tenant IDOR fixes (C3): every record below
 * belongs to "Tenant B" (seed.ts's isolation fixture), and every request is
 * made as an admin of the primary tenant. Every one must 404 (or 403 for the
 * property-scoped dashboard/report endpoints) — never return or mutate data.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@marylandguesthouse.com';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin@123!';

const FOREIGN_GUEST_ID = 'guest-b-isolation-test';
const FOREIGN_RESERVATION_ID = 'reservation-b-isolation-test';
const FOREIGN_PROPERTY_ID = 'property-b-isolation-test';

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api');
    app.enableVersioning();
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
    accessToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  function auth() {
    const agent = request(app.getHttpServer());
    const withAuth = (test: request.Test) => test.set('Authorization', `Bearer ${accessToken}`);
    return {
      get: (url: string) => withAuth(agent.get(url)),
      put: (url: string) => withAuth(agent.put(url)),
      patch: (url: string) => withAuth(agent.patch(url)),
    };
  }

  it('GET a foreign tenant guest → 404', async () => {
    await auth().get(`/api/v1/guests/${FOREIGN_GUEST_ID}`).expect(404);
  });

  it('PUT (update) a foreign tenant guest → 404, no mutation', async () => {
    await auth()
      .put(`/api/v1/guests/${FOREIGN_GUEST_ID}`)
      .send({ firstName: 'Hacked' })
      .expect(404);
  });

  it('GET a foreign tenant reservation → 404', async () => {
    await auth().get(`/api/v1/reservations/${FOREIGN_RESERVATION_ID}`).expect(404);
  });

  it('PUT (update) a foreign tenant reservation → 404, no mutation', async () => {
    await auth()
      .put(`/api/v1/reservations/${FOREIGN_RESERVATION_ID}`)
      .send({ notes: 'Hacked' })
      .expect(404);
  });

  it('PATCH check-in a foreign tenant reservation → 404', async () => {
    await auth().patch(`/api/v1/reservations/${FOREIGN_RESERVATION_ID}/check-in`).expect(404);
  });

  it('GET a foreign tenant reservation folio → 404', async () => {
    await auth().get(`/api/v1/folio/${FOREIGN_RESERVATION_ID}`).expect(404);
  });

  it('GET dashboard KPIs for a foreign tenant property → 403', async () => {
    await auth().get(`/api/v1/dashboard/kpis?propertyId=${FOREIGN_PROPERTY_ID}`).expect(403);
  });

  it('GET reports for a foreign tenant property → 403', async () => {
    await auth().get(`/api/v1/reports/occupancy?propertyId=${FOREIGN_PROPERTY_ID}`).expect(403);
  });

  it('GET HR dashboard for a foreign tenant property → 403', async () => {
    await auth().get(`/api/v1/hr/dashboard?propertyId=${FOREIGN_PROPERTY_ID}`).expect(403);
  });

  it('GET rooms for a foreign tenant property → empty, not 500 or leaked data', async () => {
    const res = await auth().get(`/api/v1/rooms?propertyId=${FOREIGN_PROPERTY_ID}`).expect(200);
    expect(res.body).toEqual([]);
  });
});
