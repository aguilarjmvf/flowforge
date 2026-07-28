import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) throw new ForbiddenException('Access denied');
    if (user.isSuperAdmin) return true;

    const hasAll = required.every((p) => (user.permissions as string[]).includes(p));
    if (!hasAll) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
