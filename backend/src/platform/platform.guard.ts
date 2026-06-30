import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.globalRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to platform administrators only');
    }
    return true;
  }
}
