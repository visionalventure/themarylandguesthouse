import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

const SKIP_PATHS = ['/auth/login', '/auth/logout', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

const PATH_TO_ENTITY: Record<string, string> = {
  reservations: 'RESERVATION',
  inquiries: 'INQUIRY',
  guests: 'GUEST',
  rooms: 'ROOM',
  invoices: 'INVOICE',
  'journal-entries': 'JOURNAL_ENTRY',
  'bank-accounts': 'BANK_ACCOUNT',
  payments: 'PAYMENT',
  employees: 'EMPLOYEE',
  'purchase-orders': 'PURCHASE_ORDER',
  'purchase-requests': 'PURCHASE_REQUEST',
  suppliers: 'SUPPLIER',
  items: 'INVENTORY_ITEM',
  budgets: 'BUDGET',
  properties: 'PROPERTY',
  property: 'PROPERTY',
  users: 'USER',
  roles: 'ROLE',
  nightaudit: 'NIGHT_AUDIT',
  housekeeping: 'HOUSEKEEPING',
  maintenance: 'MAINTENANCE',
  'tax-rates': 'TAX_RATE',
  policy: 'PROPERTY_POLICY',
  email: 'EMAIL_CONFIG',
  departments: 'DEPARTMENT',
  members: 'LOYALTY_MEMBER',
  rules: 'LOYALTY_RULE',
  categories: 'DOCUMENT_CATEGORY',
  orders: 'RESTAURANT_ORDER',
  'work-orders': 'WORK_ORDER',
  folio: 'FOLIO',
};

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

// Every route this app serves is mounted under NestJS's global prefix + version,
// e.g. /api/v1/settings/property - strip both, not just /v1/, or every path
// not covered by PATH_TO_ENTITY silently falls through to an empty segments[0]
// (from the leading slash) and produces entity: "" / description: "UPDATE ".
function pathSegments(path: string): string[] {
  return path.replace(/^\/api\/v\d+\//, '').split('/').filter(Boolean);
}

function deriveEntity(segments: string[]): string {
  for (const seg of segments) {
    if (PATH_TO_ENTITY[seg]) return PATH_TO_ENTITY[seg];
  }
  return segments[0]?.toUpperCase().replace(/-/g, '_') || 'UNKNOWN';
}

function deriveEntityId(segments: string[]): string | null {
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg && !PATH_TO_ENTITY[seg] && /^[a-z0-9]{10,}$/i.test(seg)) return seg;
  }
  return null;
}

const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'currentPassword', 'newPassword',
  'secret', 'token', 'refreshToken', 'accessToken',
  'apiKey', 'api_key', 'twoFactorSecret', 'totpCode',
]);

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const result: any = {};
  for (const [key, value] of Object.entries(body)) {
    result[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : value;
  }
  return result;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;
    const path = req.path as string;

    if (
      !METHOD_TO_ACTION[method] ||
      SKIP_PATHS.some((p) => path.includes(p)) ||
      !req.user
    ) {
      return next.handle();
    }

    const action = METHOD_TO_ACTION[method] as any;
    const segments = pathSegments(path);
    const entity = deriveEntity(segments);
    const entityIdFromPath = deriveEntityId(segments);
    const userId = req.user?.sub;
    const tenantId = req.user?.tenantId;
    const xff = req.headers?.['x-forwarded-for'] as string | undefined;
    const ipAddress = xff ? xff.split(',')[0].trim() : req.ip;

    const write = (entityId: string | null, extra?: Record<string, any>) => {
      if (!tenantId) return;
      const body = req.body && Object.keys(req.body).length > 0 ? sanitizeBody(req.body) : undefined;
      this.prisma.auditLog
        .create({
          data: {
            tenantId,
            userId: userId ?? null,
            action,
            entity,
            entityId,
            description: `${action} ${entity}${entityId ? ` (${entityId.slice(0, 8)}...)` : ''}`,
            ipAddress: ipAddress ?? null,
            userAgent: req.headers?.['user-agent'] ?? null,
            newValues: body,
            ...extra,
          },
        })
        .catch(() => {/* fire-and-forget, never block response */});
    };

    return next.handle().pipe(
      tap((responseBody) => {
        // POST creates have no :id in the URL yet - pull it from the response
        // so a CREATE entry still links to the record it just made.
        const entityId = entityIdFromPath ?? (method === 'POST' && responseBody?.id ? responseBody.id : null);
        write(entityId);
      }),
      catchError((err) => {
        write(entityIdFromPath, { description: `${action} ${entity} (failed)` });
        throw err;
      }),
    );
  }
}
