import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user, method } = context.switchToHttp().getRequest();

    // OWNER is a read-only oversight role: it can view any GET endpoint
    // regardless of that route's allow-list, but never bypasses the
    // allow-list on a mutating request, so it can't create/edit/delete
    // anywhere unless explicitly granted like any other role.
    if (user?.role === 'OWNER' && method === 'GET') {
      return true;
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.includes(user?.role);
  }
}
