import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../database/prisma.service";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import type { AuthenticatedRequest } from "./types/authenticated-request";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { globalRole, role, roleId } = request.user || {};

    // SUPER_ADMIN and tenant ADMIN inherently bypass permission checks
    if (globalRole === "SUPER_ADMIN" || role === "ADMIN") {
      return true;
    }

    if (!roleId) {
      return false;
    }

    const tenantRole = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        companyId: request.user.tenantId,
      },
      include: { permissions: true },
    });

    const grantedPermissions =
      tenantRole?.permissions?.map((p: any) => `${p.resource}:${p.action}`) || [];
    return requiredPermissions.every((permission) =>
      grantedPermissions.includes(permission),
    );
  }
}
