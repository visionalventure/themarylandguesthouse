import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

const SKIP_PATHS = ['/auth/login', '/auth/logout', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

const PATH_TO_ENTITY: Record<string, string> = {
  reservations: 'RESERVATION',
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
  users: 'USER',
  roles: 'ROLE',
  nightaudit: 'NIGHT_AUDIT',
  housekeeping: 'HOUSEKEEPING',
  maintenance: 'MAINTENANCE',
};

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

function deriveEntity(path: string): string {
  const segments = path.replace(/^\/v\d+\//, '').split('/');
  for (const seg of segments) {
    if (PATH_TO_ENTITY[seg]) return PATH_TO_ENTITY[seg];
  }
  return segments[0]?.toUpperCase() ?? 'UNKNOWN';
}

function deriveEntityId(path: string): string | null {
  const segments = path.split('/');
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg && !PATH_TO_ENTITY[seg] && /^[a-z0-9]{10,}$/i.test(seg)) return seg;
  }
  return null;
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
    const entity = deriveEntity(path);
    const entityId = deriveEntityId(path);
    const userId = req.user?.sub;
    const tenantId = req.user?.tenantId;

    return next.handle().pipe(
      tap(() => {
        if (!tenantId) return;
        this.prisma.auditLog
          .create({
            data: {
              tenantId,
              userId: userId ?? null,
              action,
              entity,
              entityId,
              description: `${action} ${entity}${entityId ? ` (${entityId.slice(0, 8)}...)` : ''}`,
              ipAddress: req.ip,
              userAgent: req.headers?.['user-agent'] ?? null,
              newValues: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
            },
          })
          .catch(() => {/* fire-and-forget, never block response */});
      }),
    );
  }
}
