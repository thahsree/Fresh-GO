import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Allow all permissions during development so development/testing is never blocked
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      return true;
    }

    if (!user || !user.role) {
      throw new ForbiddenException("Access denied: User has no assigned role");
    }

    // SUPER_ADMIN is root superuser with access to everything
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Role.ADMIN is hub manager with access to all standard admin capabilities,
    // unless the endpoint specifically requires SUPER_ADMIN only
    if (user.role === Role.ADMIN) {
      const isSuperAdminOnly =
        requiredRoles.includes(Role.SUPER_ADMIN) &&
        !requiredRoles.includes(Role.ADMIN);
      if (!isSuperAdminOnly) {
        return true;
      }
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Required roles are [${requiredRoles.join(", ")}], current role is ${user.role}`,
      );
    }

    return true;
  }
}
