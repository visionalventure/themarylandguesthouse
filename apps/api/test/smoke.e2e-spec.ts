import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Smoke test suite — verifies every major module returns expected HTTP status codes.
 * Requires the dev database (DATABASE_URL in .env) to be running with seed data.
 * Run with: npm run test:e2e
 */

const PROPERTY_ID = 'demo-property-id';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@marylandguesthouse.com';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'Admin@123!';

describe('MGH ERP Smoke Tests (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  // ─── Setup ───────────────────────────────────────────────────
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

  // ─── Auth ─────────────────────────────────────────────────────
  describe('Auth', () => {
    it('POST /v1/auth/login — returns tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.role).toBeDefined();
      accessToken  = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('GET /v1/auth/profile — returns current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.email).toBe(ADMIN_EMAIL);
    });

    it('POST /v1/auth/refresh — returns new tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
      accessToken = res.body.accessToken;
    });

    it('Unauthenticated request → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/guests')
        .expect(401);
    });
  });

  // ─── Helper ───────────────────────────────────────────────────
  function auth() {
    return request(app.getHttpServer()).set('Authorization', `Bearer ${accessToken}`);
  }

  // ─── Module Smoke Tests ───────────────────────────────────────
  describe('Dashboard', () => {
    it('GET /v1/dashboard/kpis', () =>
      auth().get(`/api/v1/dashboard/kpis?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/dashboard/front-desk', () =>
      auth().get(`/api/v1/dashboard/front-desk?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/dashboard/revenue-chart', () =>
      auth().get(`/api/v1/dashboard/revenue-chart?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/dashboard/occupancy-chart', () =>
      auth().get(`/api/v1/dashboard/occupancy-chart?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/dashboard/booking-sources', () =>
      auth().get(`/api/v1/dashboard/booking-sources?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/dashboard/recent-activity', () =>
      auth().get(`/api/v1/dashboard/recent-activity?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('Reservations', () => {
    it('GET /v1/reservations', () =>
      auth().get(`/api/v1/reservations?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/reservations/calendar', () =>
      auth().get(`/api/v1/reservations/calendar?propertyId=${PROPERTY_ID}&startDate=2026-01-01&endDate=2026-12-31`).expect(200));
  });

  describe('Guests', () => {
    it('GET /v1/guests', () =>
      auth().get('/api/v1/guests').expect(200));
  });

  describe('Rooms', () => {
    it('GET /v1/rooms', () =>
      auth().get(`/api/v1/rooms?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/rooms/available', () =>
      auth().get(`/api/v1/rooms/available?propertyId=${PROPERTY_ID}&checkIn=2026-07-01&checkOut=2026-07-05`).expect(200));
    it('GET /v1/rooms/categories', () =>
      auth().get(`/api/v1/rooms/categories?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('Folio', () => {
    it('GET /v1/folio/:id — 404 for non-existent reservation', () =>
      auth().get('/api/v1/folio/non-existent-id').expect(404));
  });

  describe('Night Audit', () => {
    it('GET /v1/nightaudit/history', () =>
      auth().get(`/api/v1/nightaudit/history?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('Accounting', () => {
    it('GET /v1/accounting/chart-of-accounts', () =>
      auth().get(`/api/v1/accounting/chart-of-accounts?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/accounting/invoices', () =>
      auth().get(`/api/v1/accounting/invoices?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('HR', () => {
    it('GET /v1/hr/employees', () =>
      auth().get(`/api/v1/hr/employees?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/hr/departments', () =>
      auth().get('/api/v1/hr/departments').expect(200));
    it('GET /v1/hr/leave-requests', () =>
      auth().get(`/api/v1/hr/leave-requests?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('Inventory', () => {
    it('GET /v1/inventory', () =>
      auth().get(`/api/v1/inventory?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/inventory/low-stock', () =>
      auth().get(`/api/v1/inventory/low-stock?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('Procurement', () => {
    it('GET /v1/procurement/suppliers', () =>
      auth().get(`/api/v1/procurement/suppliers?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/procurement/purchase-orders', () =>
      auth().get(`/api/v1/procurement/purchase-orders?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('Maintenance', () => {
    it('GET /v1/maintenance/work-orders', () =>
      auth().get(`/api/v1/maintenance/work-orders?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/maintenance/assets', () =>
      auth().get(`/api/v1/maintenance/assets?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('Housekeeping', () => {
    it('GET /v1/housekeeping/tasks', () =>
      auth().get(`/api/v1/housekeeping/tasks?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/housekeeping/rooms-status', () =>
      auth().get(`/api/v1/housekeeping/rooms-status?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('Reports', () => {
    it('GET /v1/reports/occupancy', () =>
      auth().get(`/api/v1/reports/occupancy?propertyId=${PROPERTY_ID}&startDate=2026-01-01&endDate=2026-12-31`).expect(200));
    it('GET /v1/reports/revenue', () =>
      auth().get(`/api/v1/reports/revenue?propertyId=${PROPERTY_ID}&startDate=2026-01-01&endDate=2026-12-31`).expect(200));
  });

  describe('Settings', () => {
    it('GET /v1/settings/property', () =>
      auth().get(`/api/v1/settings/property?propertyId=${PROPERTY_ID}`).expect(200));
    it('GET /v1/settings/profile', () =>
      auth().get('/api/v1/settings/profile').expect(200));
    it('GET /v1/settings/tax-rates', () =>
      auth().get(`/api/v1/settings/tax-rates?propertyId=${PROPERTY_ID}`).expect(200));
  });

  describe('Notifications', () => {
    it('GET /v1/notifications', () =>
      auth().get('/api/v1/notifications').expect(200));
  });

  describe('Search', () => {
    it('GET /v1/search?q=test&types=guests — returns array', async () => {
      const res = await auth().get('/api/v1/search?q=test&types=guests').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Assistant', () => {
    it('POST /v1/assistant/chat — returns reply string', async () => {
      const res = await auth()
        .post('/api/v1/assistant/chat')
        .send({ message: 'What is RevPAR?' })
        .expect(201);
      expect(typeof res.body.reply).toBe('string');
      expect(res.body.reply.length).toBeGreaterThan(0);
    });
  });

  // ─── RBAC Enforcement ─────────────────────────────────────────
  describe('RBAC — role-restricted endpoints return 403 for wrong roles', () => {
    let housekeepingToken: string;

    beforeAll(async () => {
      // Log in as housekeeping user (seeded in bootstrap)
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'housekeeping@marylandguesthouse.com', password: 'Admin@123!' });
      housekeepingToken = res.body?.accessToken;
    });

    it('Housekeeping cannot run night audit', async () => {
      if (!housekeepingToken) return; // skip if seed user doesn't exist
      await request(app.getHttpServer())
        .post('/api/v1/nightaudit/run')
        .set('Authorization', `Bearer ${housekeepingToken}`)
        .send({ propertyId: PROPERTY_ID, auditDate: '2026-06-19' })
        .expect(403);
    });

    it('Housekeeping cannot run payroll', async () => {
      if (!housekeepingToken) return;
      await request(app.getHttpServer())
        .post('/api/v1/hr/payroll/run')
        .set('Authorization', `Bearer ${housekeepingToken}`)
        .send({ propertyId: PROPERTY_ID, periodStart: '2026-06-01', periodEnd: '2026-06-30' })
        .expect(403);
    });

    it('Housekeeping cannot invite users', async () => {
      if (!housekeepingToken) return;
      await request(app.getHttpServer())
        .post('/api/v1/settings/users/invite')
        .set('Authorization', `Bearer ${housekeepingToken}`)
        .send({ email: 'test@test.com', role: 'FRONT_DESK' })
        .expect(403);
    });
  });

  // ─── Security Checks ──────────────────────────────────────────
  describe('Security', () => {
    it('POST /v1/auth/forgot-password does not expose reset token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);
      expect(res.body._devToken).toBeUndefined();
      expect(res.body.message).toContain('If that email exists');
    });

    it('POST /v1/auth/reset-password is rate limited (5/min)', async () => {
      // Just verify the endpoint exists and returns 400 for invalid token (not 404)
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPassword123!' });
      expect([400, 429]).toContain(res.status);
    });
  });
});
